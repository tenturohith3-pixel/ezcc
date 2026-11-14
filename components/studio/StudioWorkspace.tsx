"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ImagePlus,
  Undo2,
  Redo2,
  RotateCcw,
  Download,
  KeyRound,
  Columns2,
  Eye,
  EyeOff,
  Sparkles,
  Settings2,
  Palette,
  SlidersHorizontal,
  Aperture,
  Blend,
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  BrainCircuit,
  ArrowUpRight,
} from "lucide-react";
import {
  createStage,
  paintSource,
  renderGrade,
  type Stage,
} from "@/lib/grade/stage";
import { defaultParams, type GradeParams } from "@/lib/grade/params";
import { applyLook, getLook, LOOKS } from "@/lib/grade/looks";
import { parseCube, type CubeLut } from "@/lib/grade/cube";
import {
  renderExportBlob,
  downloadBlob,
} from "@/lib/grade/export";
import { useLicense } from "@/hooks/useLicense";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { canUpscale, recordUpscale } from "@/lib/upscale/quota";
import type { ExportOutcome, ExportPayload } from "./ExportPanel";
import { UpscalePanel } from "./UpscalePanel";
import type { UpscaleEngine, UpscaleLevel } from "@/lib/grade/upscale";
import {
  loadSettings,
  saveSettings,
  PREVIEW_LONG_MAP,
  type MotionPref,
  type PreviewQuality,
} from "@/lib/settings";
import { TIER_LABEL, TIER_MAX_EXPORT, tierRankOf, type Tier } from "@/lib/license";
import { paramsSignature } from "@/lib/grade/params";
import { cn } from "@/lib/cn";
import {
  PrimaryPanel,
  WheelsPanel,
  HslPanel,
  FxPanel,
} from "./Inspector";
import { LooksRail } from "./LooksRail";
import { ExportPanel } from "./ExportPanel";
import { KeyEntryModal } from "./KeyEntryModal";
import { Panel } from "./ui";

type Mode = "split" | "graded" | "original";

const MOBILE_TABS = [
  ["looks", "Looks", Palette],
  ["primary", "Image", SlidersHorizontal],
  ["wheels", "Wheels", Aperture],
  ["hsl", "HSL", Blend],
  ["fx", "FX", Sparkles],
  ["upscale", "Upscale", Maximize2],
] as [MobileTab, string, typeof Palette][];

const MOBILE_TITLES: Record<Exclude<MobileTab, "upscale">, string> = {
  looks: "Looks",
  primary: "Image",
  wheels: "Color wheels",
  hsl: "HSL bands",
  fx: "Effects & LUTs",
  settings: "Studio settings",
};

interface SourceState {
  img: HTMLImageElement | null;
  name: string;
  w: number;
  h: number;
}

type MobileTab = "looks" | "primary" | "wheels" | "hsl" | "fx" | "upscale" | "settings";

export function StudioWorkspace() {
  const { license, hydrated } = useLicense();
  const tier: Tier = license?.tier ?? "basic";
  const rank = tierRankOf(license);

  const [source, setSource] = useState<SourceState | null>(null);
  const [params, setParams] = useState<GradeParams>(defaultParams());
  const [mode, setMode] = useState<Mode>("split");
  const [split, setSplit] = useState(50);
  const [cube, setCube] = useState<CubeLut | null>(null);
  const [cubeName, setCubeName] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [level, setLevel] = useState<UpscaleLevel>(0);
  const [detail, setDetail] = useState(65);
  const [denoise, setDenoise] = useState(20);
  const [engine, setEngine] = useState<UpscaleEngine>("detail");
  const [upscaleOpen, setUpscaleOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [tab, setTab] = useState<MobileTab>("primary");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewQ, setPreviewQ] = useState<PreviewQuality>("balanced");
  const [motion, setMotion] = useState<MotionPref>("smooth");

  /* stage viewport + zoom */
  const viewportRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const pan = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);

  // history
  const past = useRef<GradeParams[]>([]);
  const future = useRef<GradeParams[]>([]);
  const histTimer = useRef<number | null>(null);
  const [histLen, setHistLen] = useState({ p: 0, f: 0 });

  // stage + canvas for display
  const stageRef = useRef<Stage | null>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const gradedRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef(false);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const cubeRef = useRef(cube);
  cubeRef.current = cube;
  const sourceRef = useRef(source);
  sourceRef.current = source;

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Render pipeline (rAF-coalesced) ───────── */

  const doRender = useCallback(() => {
    rafRef.current = null;
    const stage = stageRef.current;
    if (!stage || !sourceRef.current) return;
    renderGrade(stage, paramsRef.current, { cube: cubeRef.current });
    const gctx = gradedRef.current?.getContext("2d");
    gctx?.drawImage(stage.graded, 0, 0);
  }, []);

  const schedule = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(doRender);
  }, [doRender]);

  useEffect(() => {
    schedule();
  }, [params, cube, schedule]);

  /* ── Source loading ───────────────────────── */

  const buildStageFor = useCallback(
    (src: SourceState): Stage | null => {
      if (!src.img) return null;
      const long = Math.max(src.w, src.h) || 1;
      const scale = Math.min(1, previewLongRef.current / long);
      const w = Math.max(2, Math.round(src.w * scale));
      const h = Math.max(2, Math.round(src.h * scale));
      const stage = createStage(w, h);
      if (!stage) return null;
      paintSource(stage, src.img);
      if (baseRef.current) {
        const bctx = baseRef.current.getContext("2d");
        bctx?.clearRect(0, 0, w, h);
        bctx?.drawImage(stage.source, 0, 0);
      }
      stageRef.current = stage;
      // draw bases at new dims
      if (gradedRef.current) {
        const img = gradedRef.current;
        img.width = w;
        img.height = h;
      }
      if (baseRef.current) {
        baseRef.current.width = w;
        baseRef.current.height = h;
      }
      const bctx2 = baseRef.current?.getContext("2d");
      bctx2?.drawImage(stage.source, 0, 0);
      return stage;
    },
    [],
  );

  const pushHistory = useCallback((snap: GradeParams) => {
    const last = past.current[past.current.length - 1];
    if (last && paramsSignature(last) === paramsSignature(snap)) return;
    past.current.push(snap);
    if (past.current.length > 60) past.current.shift();
    future.current = [];
    setHistLen({ p: past.current.length, f: 0 });
  }, [paramsSignature]);

  /* ── Misc actions ─────────────────────────── */

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(paramsRef.current);
    setParams(prev);
    setHistLen({ p: past.current.length, f: future.current.length });
  }, []);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(paramsRef.current);
    setParams(next);
    setHistLen({ p: past.current.length, f: future.current.length });
  }, []);

  const resetAll = useCallback(() => {
    pushHistory(paramsRef.current);
    setParams(defaultParams());
  }, [pushHistory]);

  const patch = useCallback(
    (p: Partial<GradeParams>) => {
      const prev = paramsRef.current;
      const next: GradeParams = { ...prev, ...p };
      if (p.hsl) next.hsl = p.hsl;
      if (rank < 3) {
        next.filmGrain = 0;
        next.halation = 0;
        next.bloom = 0;
        next.hdr = 0;
        next.highlightRecovery = 0;
      }
      pushHistory(prev);
      setParams(next);
    },
    [pushHistory, rank],
  );

  const loadSource = useCallback(
    (file: File) => {
      if (file.type && !file.type.startsWith("image/")) {
        setStatus({ kind: "err", msg: "Drop an image file (PNG / JPEG / WEBP)." });
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const src: SourceState = {
          img,
          name: file.name,
          w: img.naturalWidth || img.width,
          h: img.naturalHeight || img.height,
        };
        setSource(src);
        setParams(defaultParams());
        past.current = [];
        future.current = [];
        setHistLen({ p: 0, f: 0 });
        buildStageFor(src);
        schedule();
        setStatus({ kind: "ok", msg: `${file.name} loaded — grade away.` });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setStatus({ kind: "err", msg: "That image could not be decoded." });
      };
      img.src = url;
    },
    [buildStageFor, schedule],
  );

  /* Demo-paint after source set (cover the graded path once) */
  useEffect(() => {
    if (!source) return;
    paintSourceIntoDisplay(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const paintSourceIntoDisplay = useCallback((s: SourceState | null) => {
    const stage = stageRef.current;
    if (!stage || !s) return;
    if (baseRef.current) {
      baseRef.current.width = stage.w;
      baseRef.current.height = stage.h;
      const bctx = baseRef.current.getContext("2d");
      bctx?.drawImage(stage.source, 0, 0);
    }
  }, []);

  /* ── Misc actions ─────────────────────────── */


  const pickLook = useCallback(
    (id: string) => {
      const look = getLook(id);
      if (!look) return;
      pushHistory(paramsRef.current);
      const next = defaultParams();
      applyLook(next, look, paramsRef.current.lookIntensity / 100);
      next.look = look.id;
      setParams(next);
    },
    [pushHistory],
  );

  const intensity = useCallback(
    (v: number) => {
      const lookId = paramsRef.current.look;
      patch({ lookIntensity: v });
      if (!lookId) return;
      const look = getLook(lookId);
      if (!look) return;
      const next = defaultParams();
      applyLook(next, look, v / 100);
      setParams(next);
    },
    [patch],
  );

  const importCube = useCallback(
    (file: File) => {
      void file.text().then((text) => {
        const res = parseCube(text);
        if (!res.ok || !res.cube) {
          setStatus({ kind: "err", msg: res.error ?? "Cube parse failed." });
          return;
        }
        setCube(res.cube);
        setCubeName(res.cube.title || file.name);
        setStatus({ kind: "ok", msg: `3D LUT "${res.cube.title}" mounted.` });
      });
    },
    [],
  );

  const runExport = useCallback(
    async (t: ExportPayload, signal?: AbortSignal): Promise<ExportOutcome> => {
      const src = sourceRef.current;
      if (!src?.img) throw new Error("Open an image before exporting.");
      if (t.upscale && !canUpscale(tier)) {
        throw new Error(
          "Free level-ups used for this 24h window — a paid key makes them unlimited.",
        );
      }
      const result = await renderExportBlob({
        img: src.img,
        params: paramsRef.current,
        cube: cubeRef.current,
        format: t.format,
        quality: t.quality,
        maxLongEdge: Math.min(t.maxLongEdge, TIER_MAX_EXPORT[tier] ?? 1920),
        filenameBase: "effectcraft",
        upscale: t.upscale,
        onProgress: t.onProgress,
        signal,
      });
      downloadBlob(result.blob, result.filename);
      if (t.upscale && result.upscaled) recordUpscale();
      return {
        w: result.w,
        h: result.h,
        upscaled: result.upscaled,
        engine: result.engine,
        fellBack: result.fellBack,
      };
    },
    [tier],
  );

  /* ── Settings: hydrate once, then react ── */
  const qRef = useRef<PreviewQuality>("balanced");
  const previewLongRef = useRef<number>(PREVIEW_LONG_MAP.balanced);
  useEffect(() => {
    const st = loadSettings();
    setPreviewQ(st.preview);
    setMotion(st.motion);
    previewLongRef.current = PREVIEW_LONG_MAP[st.preview];
    qRef.current = st.preview;
  }, []);

  /* changing preview quality rebuilds the live stage */
  useEffect(() => {
    if (qRef.current === previewQ) return;
    qRef.current = previewQ;
    previewLongRef.current = PREVIEW_LONG_MAP[previewQ];
    if (source) {
      void buildStageFor(source);
      schedule();
    }
  }, [previewQ, source, buildStageFor, schedule]);

  /* phones default to the calmer "graded" view — split stays one tap away */
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) setMode("graded");
  }, []);

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if ((e.key === "z" || e.key === "Z") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "e" || e.key === "E") {
        if (sourceRef.current) setExportOpen(true);
      } else if (e.key === "b" || e.key === "B") {
        setMode((m) =>
          m === "split" ? "graded" : m === "graded" ? "original" : "split",
        );
      } else if (e.key === "u" || e.key === "U") {
        setLevel((v) => (v === 0 ? 2 : 0));
      } else if (e.key === "r" || e.key === "R") {
        resetAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, resetAll]);

  const clipStyle =
    mode === "split"
      ? { clipPath: `inset(0 0 0 ${split}%)` }
      : mode === "graded"
        ? undefined
        : { opacity: 0 };

  const previewLong = source ? Math.max(source.w, source.h) : 1;
  const previewScale = Math.min(1, previewLongRef.current / previewLong);
  const dispW = source ? Math.round(source.w * previewScale) : 0;
  const dispH = source ? Math.round(source.h * previewScale) : 0;

  /* ── Fit the stage to the available box, in both axes ─────────────
     A 9:16 frame used to be laid out by width only, so it grew taller
     than the viewport and the page had to scroll. Measuring the stage
     lets portrait and landscape sit at the same optical size, and gives
     the zoom control a real 1:1 reference. */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setVp({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [source]);

  useEffect(() => {
    setZoom(1);
  }, [source?.name, source?.w, source?.h]);

  const STAGE_PAD = 22;
  const fitScale =
    dispW > 0 && dispH > 0 && vp.w > 60 && vp.h > 60
      ? Math.min((vp.w - STAGE_PAD * 2) / dispW, (vp.h - STAGE_PAD * 2) / dispH, 1)
      : 0.5;
  const displayScale = Math.max(0.02, fitScale * zoom);
  const contentW = Math.max(1, Math.round(dispW * displayScale));
  const contentH = Math.max(1, Math.round(dispH * displayScale));
  const zoomPct = Math.max(1, Math.round(fitScale * zoom * 100));
  const clampZoom = (z: number) => Math.min(8, Math.max(1, z));
  const setZoomFit = () => setZoom(1);
  const setZoom100 = () =>
    setZoom(clampZoom(1 / Math.max(0.05, fitScale)));
  const nudgeZoom = (dir: 1 | -1) =>
    setZoom((z) => clampZoom(dir > 0 ? z * 1.25 : z * 0.8));

  /* trackpad / ctrl-wheel zoom */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setZoom((z) => clampZoom(e.deltaY < 0 ? z * 1.12 : z * 0.89));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [source]);

  const onStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!source) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a!.x - b!.x, a!.y - b!.y),
        zoom,
      };
      pan.current = null;
      return;
    }
    if (mode === "split" || zoom <= 1.01) return;
    const el = viewportRef.current;
    if (!el) return;
    pan.current = {
      x: e.clientX,
      y: e.clientY,
      sl: el.scrollLeft,
      st: el.scrollTop,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointer */
    }
  };

  const onStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinch.current.dist > 0) {
        setZoom(clampZoom((pinch.current.zoom * dist) / pinch.current.dist));
      }
      return;
    }
    const el = viewportRef.current;
    if (!el || !pan.current) return;
    el.scrollLeft = pan.current.sl - (e.clientX - pan.current.x);
    el.scrollTop = pan.current.st - (e.clientY - pan.current.y);
  };

  const onStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) pan.current = null;
  };

  /* ── Settings (shared by mobile sheet & desktop modal) ── */
  const settingsContent = (
    <div className="space-y-4">
      <div>
        <p className="mono-label !text-[9px] mb-2.5">APPEARANCE</p>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
          <div>
            <p className="text-[12px]">Light · Standard · Dark</p>
            <p className="mono-label !text-[8px] mt-1 !text-ink-faint">
              THE LIGHT TABLE ↔ THE DARKROOM
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div>
        <p className="mono-label !text-[9px] mb-2.5">PREVIEW QUALITY</p>
        <div className="grid grid-cols-3 gap-2">
          {(["fast", "balanced", "sharp"] as PreviewQuality[]).map((q) => (
            <button
              key={q}
              onClick={() => {
                setPreviewQ(q);
                saveSettings({ preview: q });
              }}
              className={cn(
                "py-3 rounded-lg border text-center transition-colors",
                previewQ === q
                  ? "border-bronze/50 bg-bronze/10 text-bronze-bright"
                  : "border-line text-ink-muted hover:text-ink",
              )}
            >
              <span className="mono-num text-[11px] block">
                {q === "fast" ? "FAST" : q === "balanced" ? "BALANCED" : "SHARP"}
              </span>
              <span className="mono-label !text-[8px] mt-1 block !text-ink-faint">
                {PREVIEW_LONG_MAP[q]}PX
              </span>
            </button>
          ))}
        </div>
        <p className="mono-label !text-[8px] mt-2 !text-ink-faint">
          CANVAS PREVIEW ONLY — EXPORTS ALWAYS RENDER FULL RESOLUTION
        </p>
      </div>

      <div>
        <p className="mono-label !text-[9px] mb-2.5">SCROLL FEEL — MARKETING PAGES</p>
        <div className="grid grid-cols-2 gap-2">
          {(["smooth", "off"] as MotionPref[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMotion(m);
                saveSettings({ motion: m });
              }}
              className={cn(
                "py-3 rounded-lg border text-[12px] transition-colors",
                motion === m
                  ? "border-bronze/50 bg-bronze/10 text-bronze-bright"
                  : "border-line text-ink-muted hover:text-ink",
              )}
            >
              {m === "smooth" ? "Smooth (momentum)" : "Instant (native)"}
            </button>
          ))}
        </div>
        <p className="mono-label !text-[8px] mt-2 !text-ink-faint">
          THE STUDIO ALWAYS RESPONDS NATIVELY — THIS ONLY TOUCHES THE STORY PAGES
        </p>
      </div>

      <div>
        <p className="mono-label !text-[9px] mb-2.5">SESSION</p>
        <button onClick={resetAll} className="btn-ghost w-full justify-center !py-2.5 text-[12px] gap-2">
          <RotateCcw className="size-3.5" />
          Reset every parameter
        </button>
        <button onClick={() => setKeyOpen(true)} className="btn-ghost w-full justify-center !py-2.5 text-[12px] gap-2 mt-2">
          <Sparkles className="size-3.5 text-bronze-bright" />
          {hydrated && license ? `${TIER_LABEL[license.tier]} key — manage` : "Manage license key"}
        </button>
      </div>
    </div>
  );

  /* ── Mobile sheet panel (one tab's content at a time) ── */
  const mobilePanel = (() => {
    switch (tab) {
      case "looks":
        return (
          <LooksRail
            activeLook={params.look}
            lookIntensity={params.lookIntensity}
            onSelect={pickLook}
            onIntensity={intensity}
            tier={tier}
          />
        );
      case "primary":
        return <PrimaryPanel params={params} patch={patch} />;
      case "wheels":
        return <WheelsPanel params={params} patch={patch} hasKey={rank >= 2} />;
      case "hsl":
        return <HslPanel params={params} patch={patch} hasKey={rank >= 2} />;
      case "fx":
        return (
          <FxPanel
            params={params}
            patch={patch}
            tier={tier}
            hasKey={rank >= 2}
            cubeName={cubeName}
            onCubeFile={importCube}
            clearCube={() => {
              setCube(null);
              setCubeName(null);
            }}
          />
        );
      case "settings":
        return settingsContent;
    }
  })();

  return (
    <div className="pt-14 h-[100svh] overflow-hidden flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) loadSource(f);
          e.target.value = "";
        }}
      />

      {/* ── Top bar ── */}
      <div className="h-12 shrink-0 border-b border-line flex items-center justify-between px-3 md:px-6 gap-2 bg-bg/80 backdrop-blur-xl fixed top-0 inset-x-0 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="text-ink-muted hover:text-ink shrink-0" aria-label="Back to platform">
            <ArrowLeft className="size-4" />
          </Link>
          <span className="mono-label !text-[10px] shrink-0">STUDIO</span>
          {source ? (
            <span className="hidden md:block mono-num text-[11px] text-ink-faint truncate max-w-[220px]">
              {source.name} — {source.w}×{source.h}
            </span>
          ) : null}
        </div>

        <div className="hidden md:flex rounded-lg border border-line overflow-hidden">
          {(
            [
              ["original", EyeOff, "Original"],
              ["split", Columns2, "Split"],
              ["graded", Eye, "Graded"],
            ] as [Mode, typeof Eye, string][]
          ).map(([m, Icon, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              title={`${label} (B)`}
              className={cn(
                "px-3 py-2 flex items-center gap-1.5 text-[12px]",
                mode === m ? "bg-bronze/15 text-bronze-bright" : "text-ink-muted hover:text-ink",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 md:gap-1.5">
          {/* Level-Up is its own destination — always one tap away */}
          <button
            onClick={() => (source ? setUpscaleOpen(true) : fileInputRef.current?.click())}
            className="upscale-bounce group relative flex items-center gap-1.5 rounded-lg border border-bronze/45 bg-gradient-to-br from-bronze/20 to-bronze/[0.04] px-2.5 py-2 text-[12px] text-bronze-bright transition-colors hover:border-bronze/70 md:px-3.5"
            title="Level-Up Studio (U)"
            aria-label="Open Level-Up Studio"
          >
            <BrainCircuit className="size-4" />
            <span className="hidden sm:inline">Upscale</span>
            <span className="rounded bg-bronze/25 px-1 py-px text-[7px] tracking-[0.1em]">AI</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-bronze-bright hover:text-ink sm:hidden"
            title="Open image"
            aria-label="Open image"
          >
            <ImagePlus className="size-4" />
          </button>
          <button
            onClick={() =>
              setMode((m) => (m === "split" ? "graded" : m === "graded" ? "original" : "split"))
            }
            className="p-2 text-ink-muted hover:text-ink md:hidden"
            title="View mode"
            aria-label="Cycle view mode"
          >
            {mode === "split" ? (
              <Columns2 className="size-4" />
            ) : mode === "graded" ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4" />
            )}
          </button>

          <button onClick={undo} disabled={histLen.p === 0} className="hidden md:inline-flex p-2 text-ink-muted disabled:opacity-30 hover:text-ink" title="Undo (⌘Z)">
            <Undo2 className="size-4" />
          </button>
          <button onClick={redo} disabled={histLen.f === 0} className="hidden md:inline-flex p-2 text-ink-muted disabled:opacity-30 hover:text-ink" title="Redo (⌘⇧Z)">
            <Redo2 className="size-4" />
          </button>
          <button onClick={resetAll} className="hidden md:inline-flex p-2 text-ink-muted hover:text-ink" title="Reset (R)">
            <RotateCcw className="size-4" />
          </button>
          <span className="hidden sm:inline-flex">
            <ThemeToggle compact />
          </span>
          <span className="hidden md:inline-flex">
            <button
              onClick={() => setKeyOpen(true)}
              className={cn(
                "pill-badge !py-1.5 !px-3 !text-[9px] hover:border-bronze/40 transition-colors",
                hydrated && license ? "border-bronze/40 text-bronze-bright" : "",
              )}
            >
              <KeyRound className="size-3" />
              {hydrated && license ? TIER_LABEL[license.tier] : "Free — add key"}
            </button>
          </span>
          <span className="hidden sm:inline-flex">
            <button
              onClick={() => source && setExportOpen(true)}
              disabled={!source}
              className="btn-primary !py-2 !px-4 text-[13px] gap-2 disabled:opacity-40"
            >
              <Download className="size-4" />
              Export
            </button>
          </span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 text-ink-muted hover:text-ink lg:hidden"
            title="Studio settings"
            aria-label="Studio settings"
          >
            <Settings2 className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[260px_minmax(0,1fr)_330px]">
        {/* Left rail */}
        <aside className="hidden lg:block h-full overflow-y-auto border-r border-line">
          {/* Spotlight: the upscaler is a headline feature, not a slider */}
          <button
            onClick={() => (source ? setUpscaleOpen(true) : fileInputRef.current?.click())}
            className="upscale-bounce group relative mx-4 mt-4 mb-1 block w-[calc(100%-2rem)] overflow-hidden rounded-xl border border-bronze/30 bg-gradient-to-br from-bronze/15 via-bronze/[0.05] to-transparent p-4 text-left transition-colors hover:border-bronze/55"
          >
            <span className="mono-label !text-[8px] !text-bronze-bright">NEW · NEURAL AI</span>
            <p className="display mt-1 text-base leading-tight">Level-Up Studio</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
              A learned ESRGAN ×2 pass that reconstructs real texture — up to 2K free, 4K on paid keys.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-bronze-bright">
              Open upscaler
              <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </button>
          <LooksRail
            activeLook={params.look}
            lookIntensity={params.lookIntensity}
            onSelect={pickLook}
            onIntensity={intensity}
            tier={tier}
          />
        </aside>

        {/* Canvas */}
        <div
          className="relative flex h-full min-h-0 flex-col"
          onDragOver={(e: DragEvent) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e: DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) loadSource(f);
          }}
        >
          {status ? (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-[92%]">
              <button
                onClick={() => setStatus(null)}
                className={cn(
                  "mono-num text-[11px] px-4 py-2 rounded-lg border backdrop-blur-md",
                  status.kind === "ok"
                    ? "border-[#68c96a]/40 bg-[#68c96a]/10 text-[#68c96a]"
                    : "border-[#f05545]/40 bg-[#f05545]/10 text-[#f05545]",
                )}
              >
                {status.msg} — dismiss
              </button>
            </div>
          ) : null}

          <div
            ref={viewportRef}
            className="relative min-h-0 flex-1 overflow-auto overscroll-contain"
            style={{ touchAction: source ? "none" : undefined }}
            onPointerDown={onStagePointerDown}
            onPointerMove={onStagePointerMove}
            onPointerUp={onStagePointerUp}
            onPointerCancel={onStagePointerUp}
          >
            {source ? (
              <div className="flex min-h-full min-w-full p-[22px]">
                <div
                  className="relative m-auto shrink-0 overflow-hidden rounded-xl border border-line bg-bg-raised shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)]"
                  style={{ width: contentW, height: contentH }}
                >
                  <canvas
                    ref={baseRef}
                    width={dispW}
                    height={dispH}
                    className="absolute inset-0 w-full h-full block"
                  />
                  <canvas
                    ref={gradedRef}
                    width={dispW}
                    height={dispH}
                    className="absolute inset-0 w-full h-full block"
                    style={{ ...clipStyle, transition: "clip-path 160ms ease" }}
                  />
                  {mode === "split" ? (
                    <>
                      <div
                        className="absolute top-0 bottom-0 w-px"
                        style={{
                          left: `${split}%`,
                          background:
                            "linear-gradient(to bottom, transparent, rgba(232,207,162,0.9), transparent)",
                          boxShadow: "0 0 18px rgba(232,207,162,0.5)",
                        }}
                      >
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-8 rounded-full border border-bronze-bright/60 bg-black/60 backdrop-blur grid place-items-center"
                          style={{ left: "50%" }}
                        >
                          <Columns2 className="size-3.5 text-bronze-bright" />
                        </div>
                      </div>
                      <span className="absolute left-3 bottom-3 pill-badge !bg-black/50 !text-[8px]">
                        ORIG
                      </span>
                      <span className="absolute right-3 bottom-3 pill-badge !bg-black/50 !text-[8px] !text-bronze-bright">
                        GRADED
                      </span>
                    </>
                  ) : null}
                  {/* split drag surface */}
                  <div
                    className={cn("absolute inset-0", mode === "split" && "cursor-ew-resize")}
                    style={{ touchAction: mode === "split" ? "pan-y" : "auto" }}
                    onPointerDown={(e) => {
                      if (mode !== "split") return;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      dragRef.current = true;
                      const rect = e.currentTarget.getBoundingClientRect();
                      setSplit(Math.min(95, Math.max(5, ((e.clientX - rect.left) / rect.width) * 100)));
                    }}
                    onPointerMove={(e) => {
                      if (!dragRef.current) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      setSplit(Math.min(95, Math.max(5, ((e.clientX - rect.left) / rect.width) * 100)));
                    }}
                    onPointerUp={() => { dragRef.current = false; }}
                    onPointerCancel={() => { dragRef.current = false; }}
                    title={mode === "split" ? "Drag to compare" : undefined}
                  />
                </div>
              </div>
            ) : (
              <div className="grid min-h-full place-items-center p-4 md:p-8">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "group relative w-full max-w-2xl rounded-2xl border border-dashed p-14 md:p-20 text-center transition-colors",
                    dragOver
                      ? "border-bronze/70 bg-bronze/[0.06]"
                      : "border-line/80 bg-bg-raised/30 hover:border-bronze/40",
                  )}
                >
                  {dragOver ? (
                    <span className="mono-label !text-[9px] absolute top-4 right-4 text-bronze-bright">
                      DROP TO OPEN
                    </span>
                  ) : null}
                  <ImagePlus
                    className={cn(
                      "size-6 mx-auto transition-colors",
                      dragOver ? "text-bronze-bright" : "text-ink-faint group-hover:text-bronze-bright",
                    )}
                    strokeWidth={1.5}
                  />
                  <p className="display text-xl mt-4">Drop a frame here</p>
                  <p className="mono-label mt-2 !text-[9px] !text-ink-faint">PNG · JPEG · WEBP</p>
                  <span className="btn-primary !py-2.5 !px-5 text-[13px] inline-flex mt-6">
                    Open image
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* mobile zoom pill */}
          {source ? (
            <div className="absolute bottom-[4.6rem] right-3 z-20 flex items-center gap-0.5 rounded-full border border-line bg-bg/90 px-1 py-1 shadow-lg backdrop-blur-xl lg:hidden">
              <button
                onClick={() => nudgeZoom(-1)}
                className="p-1.5 text-ink-muted hover:text-ink"
                aria-label="Zoom out"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <button
                onClick={setZoomFit}
                className="mono-num min-w-[3.1rem] px-1 text-center text-[10px] text-ink-muted hover:text-bronze-bright"
                title="Tap to fit"
              >
                {zoomPct}%
              </button>
              <button
                onClick={() => nudgeZoom(1)}
                className="p-1.5 text-ink-muted hover:text-ink"
                aria-label="Zoom in"
              >
                <ZoomIn className="size-3.5" />
              </button>
            </div>
          ) : null}

          {/* desktop status bar with zoom */}
          {source ? (
            <div className="hidden h-10 shrink-0 items-center justify-between border-t border-line px-4 lg:flex">
              <div className="flex items-center gap-3">
                <span className="mono-label !text-[9px]">
                  {LOOKS.find((l) => l.id === params.look)?.name ?? "No look"}
                </span>
                <span className="mono-label !text-[9px] hidden xl:block">
                  B SPLIT · E EXPORT · U LEVEL-UP · ⌘Z UNDO
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center overflow-hidden rounded-lg border border-line">
                  <button
                    onClick={setZoomFit}
                    className={cn(
                      "px-2.5 py-1 text-[10px] transition-colors",
                      zoom <= 1.01
                        ? "bg-bronze/15 text-bronze-bright"
                        : "text-ink-muted hover:text-ink",
                    )}
                  >
                    Fit
                  </button>
                  <button onClick={() => nudgeZoom(-1)} className="px-2 py-1 text-ink-muted hover:text-ink" aria-label="Zoom out">
                    <ZoomOut className="size-3.5" />
                  </button>
                  <button
                    onClick={setZoomFit}
                    className="mono-num min-w-[3.4rem] px-1 text-center text-[10px] text-ink-muted hover:text-bronze-bright"
                    title="Reset zoom"
                  >
                    {zoomPct}%
                  </button>
                  <button onClick={() => nudgeZoom(1)} className="px-2 py-1 text-ink-muted hover:text-ink" aria-label="Zoom in">
                    <ZoomIn className="size-3.5" />
                  </button>
                  <button
                    onClick={setZoom100}
                    className={cn(
                      "px-2.5 py-1 text-[10px] transition-colors",
                      zoom > 1.01
                        ? "bg-bronze/15 text-bronze-bright"
                        : "text-ink-muted hover:text-ink",
                    )}
                  >
                    100%
                  </button>
                </div>
                <span className="mono-label !text-[9px] text-bronze-bright">
                  MAX {(TIER_MAX_EXPORT[tier] ?? 1920) >= 7680 ? "SOURCE" : `${TIER_MAX_EXPORT[tier] ?? 1920}PX`}
                </span>
              </div>
            </div>
          ) : null}

          {/* clearance — the mobile editor dock lives here */}
          <div className="h-[4.25rem] shrink-0 lg:hidden" aria-hidden />
        </div>

        {/* Right rail (desktop) */}
        <aside className="hidden lg:block h-full overflow-y-auto border-l border-line">
          <PrimaryPanel params={params} patch={patch} />
          <WheelsPanel params={params} patch={patch} hasKey={rank >= 2} />
          <HslPanel params={params} patch={patch} hasKey={rank >= 2} />
          <FxPanel
            params={params}
            patch={patch}
            tier={tier}
            hasKey={rank >= 2}
            cubeName={cubeName}
            onCubeFile={importCube}
            clearCube={() => {
              setCube(null);
              setCubeName(null);
            }}
          />
          <div className="px-5 py-5 grid grid-cols-2 gap-2.5">
            <button onClick={() => setKeyOpen(true)} className="btn-ghost w-full justify-center !py-2.5 text-[13px] gap-2">
              <Sparkles className="size-4 text-bronze-bright" />
              Manage key
            </button>
            <button onClick={() => setSettingsOpen(true)} className="btn-ghost w-full justify-center !py-2.5 text-[13px] gap-2">
              <Settings2 className="size-4" />
              Settings
            </button>
          </div>
        </aside>

        {/* ── Mobile editor dock + sheet ── */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-line bg-bg/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
          {sheetOpen ? (
            <div className="absolute bottom-full inset-x-0 overflow-hidden rounded-t-2xl border-t border-line bg-bg-raised shadow-[0_-40px_90px_-20px_rgba(0,0,0,0.85)]">
              <div className="flex justify-center pt-2 pb-1">
                <span className="h-1 w-9 rounded-full bg-line" />
              </div>
              <div className="flex items-center justify-between gap-2 px-3 pb-2.5 border-b border-line">
                <span className="mono-label !text-[9px] hidden sm:block">
                  {tab === "upscale" ? "Upscale" : MOBILE_TITLES[tab]}
                </span>
                <div className="flex items-center gap-0.5 ml-auto">
                  <div className="mr-1 flex overflow-hidden rounded-lg border border-line">
                    {(
                      [
                        ["original", EyeOff],
                        ["split", Columns2],
                        ["graded", Eye],
                      ] as [Mode, typeof Eye][]
                    ).map(([m, Icon]) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        title={m}
                        className={cn(
                          "px-2.5 py-1.5",
                          mode === m ? "bg-bronze/15 text-bronze-bright" : "text-ink-muted",
                        )}
                      >
                        <Icon className="size-3.5" />
                      </button>
                    ))}
                  </div>
                  <button onClick={undo} disabled={histLen.p === 0} className="p-1.5 text-ink-muted disabled:opacity-30" aria-label="Undo">
                    <Undo2 className="size-4" />
                  </button>
                  <button onClick={redo} disabled={histLen.f === 0} className="p-1.5 text-ink-muted disabled:opacity-30" aria-label="Redo">
                    <Redo2 className="size-4" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-bronze-bright"
                    aria-label="Open image"
                  >
                    <ImagePlus className="size-4" />
                  </button>
                  <button
                    onClick={() => source && setExportOpen(true)}
                    disabled={!source}
                    className="p-1.5 text-bronze-bright disabled:opacity-40"
                    aria-label="Export"
                  >
                    <Download className="size-4" />
                  </button>
                  <button onClick={() => setSheetOpen(false)} className="p-1.5 text-ink-muted hover:text-ink" aria-label="Close panel">
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[52svh] px-1 pb-2" style={{ WebkitOverflowScrolling: "touch" }}>
                {mobilePanel}
              </div>
            </div>
          ) : null}

          {/* the dock itself */}
          <div className="grid grid-cols-6">
            {MOBILE_TABS.map(([id, label, Icon]) => {
              const active = id === "upscale" ? upscaleOpen : tab === id && sheetOpen;
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (id === "upscale") {
                      setSheetOpen(false);
                      if (source) setUpscaleOpen(true);
                      else fileInputRef.current?.click();
                      return;
                    }
                    if (tab === id && sheetOpen) setSheetOpen(false);
                    else {
                      setTab(id);
                      setSheetOpen(true);
                    }
                  }}
                  className={cn(
                    "relative py-2.5 flex flex-col items-center gap-1 text-[9.5px] tracking-[0.12em] uppercase",
                    active ? "text-bronze-bright" : "text-ink-faint hover:text-ink-muted",
                  )}
                >
                  <Icon className={cn("size-4", id === "upscale" && "upscale-bounce")} strokeWidth={1.75} />
                  {label}
                  {id === "upscale" ? (
                    <span className="absolute right-[calc(50%-1.35rem)] top-1.5 size-1.5 rounded-full bg-bronze-bright shadow-[0_0_8px_rgba(232,207,162,0.9)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Dedicated Level-Up Studio ── */}
      {upscaleOpen ? (
        <div className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Level-Up Studio">
          <div className="absolute inset-0 scrim backdrop-blur-sm" onClick={() => setUpscaleOpen(false)} />
          <div className="relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-bg-raised shadow-2xl sm:max-w-md sm:rounded-2xl">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3">
              <div>
                <p className="mono-label !text-[8px] !text-bronze-bright">
                  UPSCALE · SEPARATE FROM GRADING
                </p>
                <h2 className="display text-lg leading-tight">Level-Up Studio</h2>
              </div>
              <button
                onClick={() => setUpscaleOpen(false)}
                className="p-1.5 text-ink-muted hover:text-ink"
                aria-label="Close Level-Up Studio"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto pb-1">
              <UpscalePanel
                sourceDims={source ? { w: source.w, h: source.h } : null}
                sourceImage={source?.img ?? null}
                tier={tier}
                level={level}
                detail={detail}
                denoise={denoise}
                engine={engine}
                onLevel={setLevel}
                onDetail={setDetail}
                onDenoise={setDenoise}
                onEngine={setEngine}
                onOpenExport={() => {
                  setUpscaleOpen(false);
                  setExportOpen(true);
                }}
                onQuickExport={runExport}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Desktop settings modal ── */}
      {settingsOpen ? (
        <div className="fixed inset-0 z-[70] grid place-items-center px-4" role="dialog">
          <div className="absolute inset-0 scrim backdrop-blur-sm" onClick={() => setSettingsOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-bg-raised shadow-2xl overflow-hidden">
            <header className="px-6 py-4 border-b border-line flex items-center justify-between">
              <div>
                <p className="mono-label !text-[9px]">STUDIO SETTINGS</p>
                <h2 className="display text-base mt-1">Tune your workspace</h2>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="text-ink-muted hover:text-ink text-xl" aria-label="Close settings">
                ×
              </button>
            </header>
            <div className="px-6 py-5 max-h-[70svh] overflow-y-auto">{settingsContent}</div>
          </div>
        </div>
      ) : null}

      {/* ── Modals ── */}
      {exportOpen && source ? (
        <ExportPanel
          sourceDims={{ w: source.w, h: source.h }}
          tier={tier}
          onClose={() => setExportOpen(false)}
          onExport={runExport}
          level={level}
          detail={detail}
          denoise={denoise}
          engine={engine}
          onLevel={setLevel}
          onDetail={setDetail}
          onDenoise={setDenoise}
          onEngine={setEngine}
        />
      ) : null}
      {keyOpen ? <KeyEntryModal onClose={() => setKeyOpen(false)} /> : null}
    </div>
  );
}
