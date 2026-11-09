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
  ["settings", "Setup", Settings2],
] as [MobileTab, string, typeof Palette][];

interface SourceState {
  img: HTMLImageElement | null;
  name: string;
  w: number;
  h: number;
}

type MobileTab = "looks" | "primary" | "wheels" | "hsl" | "fx" | "settings";

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
  const [keyOpen, setKeyOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [tab, setTab] = useState<MobileTab>("primary");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewQ, setPreviewQ] = useState<PreviewQuality>("balanced");
  const [motion, setMotion] = useState<MotionPref>("smooth");

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
    async (t: ExportPayload): Promise<ExportOutcome> => {
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
      });
      downloadBlob(result.blob, result.filename);
      if (t.upscale && result.upscaled) recordUpscale();
      return { w: result.w, h: result.h, upscaled: result.upscaled };
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
    <div className="pt-14 min-h-screen flex flex-col">
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
      <div className="h-12 shrink-0 border-b border-line flex items-center justify-between px-4 md:px-6 gap-3 bg-bg/80 backdrop-blur-xl fixed top-0 inset-x-0 z-40">
        <div className="flex items-center gap-4 min-w-0">
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

        <div className="flex items-center gap-1.5">
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
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-bronze-bright hover:text-ink"
            title="Open image"
            aria-label="Open image"
          >
            <ImagePlus className="size-4" />
          </button>
          <button onClick={undo} disabled={histLen.p === 0} className="p-2 text-ink-muted disabled:opacity-30 hover:text-ink" title="Undo (⌘Z)">
            <Undo2 className="size-4" />
          </button>
          <button onClick={redo} disabled={histLen.f === 0} className="p-2 text-ink-muted disabled:opacity-30 hover:text-ink" title="Redo (⌘⇧Z)">
            <Redo2 className="size-4" />
          </button>
          <button onClick={resetAll} className="p-2 text-ink-muted hover:text-ink" title="Reset (R)">
            <RotateCcw className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle compact className="hidden sm:inline-flex" />
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
          <button
            onClick={() => source && setExportOpen(true)}
            disabled={!source}
            className="btn-primary !py-2 !px-4 text-[13px] gap-2 hidden sm:inline-flex disabled:opacity-40"
          >
            <Download className="size-4" />
            Export
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 lg:grid lg:grid-cols-[260px_1fr_330px] min-h-[calc(100vh-7rem)]">
        {/* Left rail */}
        <aside className="hidden lg:block border-r border-line overflow-y-auto max-h-[calc(100vh-7rem)]">
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
          className="relative flex flex-col"
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
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
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

          <div className="flex-1 grid place-items-center p-4 md:p-8">
            {source ? (
            <div
              className="relative w-full rounded-2xl border border-line bg-bg-raised overflow-hidden transition-colors shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)]"
              style={{ aspectRatio: dispW && dispH ? `${dispW} / ${dispH}` : "16 / 9" }}
            >
                <>
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
                </>
            </div>
            ) : (
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
            )}
          </div>

          {/* status bar — only once a source is loaded */}
          {source ? (
          <div className="shrink-0 border-t border-line px-4 md:px-6 h-9 flex items-center justify-between">
            <span className="mono-label !text-[9px]">
              {LOOKS.find((l) => l.id === params.look)?.name ?? "No look"}
            </span>
            <div className="flex items-center gap-3">
              <span className="mono-label !text-[9px] hidden sm:block">
                B SPLIT · E EXPORT · ⌘Z UNDO
              </span>
              <span className="mono-label !text-[9px] text-bronze-bright">
                MAX {(TIER_MAX_EXPORT[tier] ?? 1920) >= 7680 ? "SOURCE" : `${TIER_MAX_EXPORT[tier] ?? 1920}PX`}
              </span>
              <button onClick={() => setExportOpen(true)} disabled={!source} className="sm:hidden p-1 text-bronze-bright disabled:opacity-40">
                <Download className="size-4" />
              </button>
            </div>
          </div>
          ) : null}

          {/* clearance — the mobile editor dock lives here */}
          <div className="h-16 lg:hidden shrink-0" aria-hidden />
        </div>

        {/* Right rail (desktop) */}
        <aside className="hidden lg:block border-l border-line overflow-y-auto max-h-[calc(100vh-7rem)]">
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
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-line bg-bg/95 backdrop-blur-xl">
          {/* panel sheet */}
          {sheetOpen ? (
            <div className="absolute bottom-full inset-x-0 border-t border-line bg-bg-raised shadow-[0_-40px_90px_-20px_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
                <div className="flex rounded-lg border border-line overflow-hidden">
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
                        "px-3 py-1.5",
                        mode === m ? "bg-bronze/15 text-bronze-bright" : "text-ink-muted",
                      )}
                    >
                      <Icon className="size-3.5" />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-ghost !py-1.5 !px-3 text-[12px] gap-1.5"
                  >
                    <ImagePlus className="size-3.5" />
                    Open
                  </button>
                  <button
                    onClick={() => source && setExportOpen(true)}
                    disabled={!source}
                    className="btn-primary !py-1.5 !px-3 text-[12px] gap-1.5 disabled:opacity-40"
                  >
                    <Download className="size-3.5" />
                    Export
                  </button>
                  <button onClick={() => setSheetOpen(false)} className="p-1.5 text-ink-muted hover:text-ink" aria-label="Close panel">
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[48svh] px-1 pb-2" style={{ WebkitOverflowScrolling: "touch" }}>
                {mobilePanel}
              </div>
            </div>
          ) : null}

          {/* the dock itself */}
          <div className="grid grid-cols-6">
            {MOBILE_TABS.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => {
                  if (tab === id && sheetOpen) setSheetOpen(false);
                  else {
                    setTab(id);
                    setSheetOpen(true);
                  }
                }}
                className={cn(
                  "py-2.5 flex flex-col items-center gap-1 text-[9.5px] tracking-[0.12em] uppercase",
                  tab === id && sheetOpen ? "text-bronze-bright" : "text-ink-faint hover:text-ink-muted",
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

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
        />
      ) : null}
      {keyOpen ? <KeyEntryModal onClose={() => setKeyOpen(false)} /> : null}
    </div>
  );
}
