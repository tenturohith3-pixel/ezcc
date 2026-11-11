"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MoveHorizontal } from "lucide-react";
import {
  createStage,
  paintSource,
  renderGrade,
  type Stage,
} from "@/lib/grade/stage";
import { applyLook, LOOKS } from "@/lib/grade/looks";
import { defaultParams } from "@/lib/grade/params";
import { cn } from "@/lib/cn";

const PICKED = ["natural", "teal-orange", "golden-hour", "noir", "bleach-bypass", "faded-70s"] as const;
const W = 1280;
const H = 720;

export function CompareShowcase() {
  const stageRef = useRef<Stage | null>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const gradedRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(62);
  const [lookId, setLookId] = useState<string>("teal-orange");
  const [grabbing, setGrabbing] = useState(false);

  useEffect(() => {
    /* phones: half-resolution canvases CSS-scales back up — same look,
       a quarter of the memory and paint cost */
    const small = window.matchMedia("(max-width: 640px)").matches;
    const sw = small ? Math.round(W / 2) : W;
    const sh = small ? Math.round(H / 2) : H;
    const b = baseRef.current;
    const g = gradedRef.current;
    if (b) { b.width = sw; b.height = sh; }
    if (g) { g.width = sw; g.height = sh; }
    const stage = createStage(sw, sh);
    if (!stage) return;
    stageRef.current = stage;
    paintSource(stage);
    const bctx = baseRef.current?.getContext("2d");
    bctx?.drawImage(stage.source, 0, 0);
    const look = LOOKS.find((l) => l.id === lookId);
    if (look) {
      renderGrade(stage, applyLook(defaultParams(), look, 1));
      const gctx = gradedRef.current?.getContext("2d");
      gctx?.drawImage(stage.graded, 0, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyLookId = useCallback((id: string) => {
    setLookId(id);
    const stage = stageRef.current;
    if (!stage) return;
    const look = LOOKS.find((l) => l.id === id);
    if (!look) return;
    // Graded side shows the full look; left of split stays original.
    renderGrade(stage, applyLook(defaultParams(), look, 1));
    const gctx = gradedRef.current?.getContext("2d");
    gctx?.drawImage(stage.graded, 0, 0);
  }, []);

  const moveTo = (clientX: number) => {
    const el = cardRef.current?.querySelector<HTMLElement>("[data-stage]") ?? null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pct = ((clientX - r.left) / r.width) * 100;
    setSplit(Math.min(95, Math.max(5, pct)));
  };

  /* Touch-safe dragging: a touch down never steals the gesture — the drag
     engages only after clear horizontal intent, so vertical swipes keep
     scrolling the page. */
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const engaged = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startPos.current = { x: e.clientX, y: e.clientY };
    engaged.current = e.pointerType !== "touch";
    if (!engaged.current) return;
    setGrabbing(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    moveTo(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const sp = startPos.current;
    if (!sp) return;
    if (!engaged.current) {
      const dx = Math.abs(e.clientX - sp.x);
      const dy = Math.abs(e.clientY - sp.y);
      if (dx > 10 && dx > dy * 1.4) {
        engaged.current = true;
        setGrabbing(true);
        (e.target as Element).setPointerCapture?.(e.pointerId);
      } else if (dy > 12 && dy > dx) {
        startPos.current = null; // vertical intent → let the page scroll
        return;
      } else {
        return;
      }
    }
    moveTo(e.clientX);
  };
  const end = () => {
    engaged.current = false;
    startPos.current = null;
    setGrabbing(false);
  };

  const activeLook = LOOKS.find((l) => l.id === lookId);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-line bg-bg/50 p-1 backdrop-blur-xl">
          {LOOKS.filter((l) => (PICKED as readonly string[]).includes(l.id)).map(
            (l) => (
              <button
                key={l.id}
                onClick={() => applyLookId(l.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[11px] transition-all duration-200",
                  lookId === l.id
                    ? "bg-bronze font-semibold text-[color:var(--btn-ink)]"
                    : "text-ink-muted hover:bg-tint hover:text-ink",
                )}
              >
                {l.name}
              </button>
            ),
          )}
        </div>
        <span className="hud-label flex items-center gap-2">
          <span className="size-1.5 animate-pulse rounded-full bg-bronze" />
          Live engine · {activeLook?.name ?? "Look"}
        </span>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-[1.5rem] border border-line-strong/70 bg-bg-raised select-none",
          grabbing && "cursor-grabbing",
        )}
        ref={cardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerLeave={end}
        style={{ touchAction: grabbing ? "none" : "pan-y" }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="hud-label">Split view</span>
            <span className="hud-label hidden sm:inline">1280 × 720</span>
          </div>
          <span className="hud-label hidden !text-bronze-bright/80 sm:inline">
            Rust kernel · local
          </span>
        </div>

        <div data-stage className="relative aspect-[16/9]">
          <canvas
            ref={baseRef}
            width={W}
            height={H}
            className="absolute inset-0 h-full w-full"
          />
          <canvas
            ref={gradedRef}
            width={W}
            height={H}
            className="absolute inset-0 h-full w-full"
            style={{ clipPath: `inset(0 0 0 ${split}%)` }}
          />
          <div
            className="absolute bottom-0 top-0 w-px"
            style={{
              left: `${split}%`,
              background:
                "linear-gradient(to bottom, transparent, var(--color-bronze), transparent)",
              boxShadow:
                "0 0 26px color-mix(in srgb, var(--color-bronze) 60%, transparent)",
            }}
          >
            <div
              data-handle=""
              className="absolute top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-bronze/60 bg-black/70 shadow-[0_0_30px_rgba(201,255,63,0.3)] backdrop-blur-md"
            >
              <MoveHorizontal className="size-4 text-[#e6ff96]" />
            </div>
          </div>
          <span className="hud-label absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1.5 !text-white/75 backdrop-blur-md">
            Original
          </span>
          <span className="hud-label absolute right-4 top-4 rounded-full bg-black/55 px-3 py-1.5 !text-[#e6ff96] backdrop-blur-md">
            {activeLook?.name ?? "Look"} · engine live
          </span>
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
          <span className="hud-label">Drag to compare</span>
          <span className="hud-label hidden sm:inline">
            Same engine as the Studio · deterministic output
          </span>
        </div>
      </div>
      <p className="hud-label mt-5 text-center">
        Real grades, rendered in your browser — not a screenshot
      </p>
    </div>
  );
}
