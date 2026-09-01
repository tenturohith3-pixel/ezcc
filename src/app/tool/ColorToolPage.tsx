"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Download,
  RotateCcw,
  SunMedium,
  Contrast,
  Droplets,
  CircleDot,
  Waves,
  Sparkles,
  Film,
  Palette,
  SlidersHorizontal,
  Eye,
  EyeOff,
  X,
  Key,
  AlertTriangle,
  Wand2,
  Lock,
  Crown,
  RefreshCw,
  Play,
  Pause,
} from "lucide-react";
import { applyColorGrading, autoColorCorrect, type GradeSettings } from "@/lib/colorGrading";
import { getCurrentTier, hasTierAccess, TIER_LABELS, getExpirationLevel, getTimeRemaining, type KeyTier, type ExpirationLevel } from "@/lib/keys";
import KeyEntry from "@/components/KeyEntry";
import KeyBadge from "@/components/KeyBadge";
import ExportUpsell from "@/components/ExportUpsell";

// ── Defaults ─────────────────────────────────────

const DEFAULT_SETTINGS: GradeSettings = {
  lutPreset: "none",
  whiteBalance: 0, exposure: 0, contrast: 0, saturation: 0,
  brightness: 0, temperature: 0,
  shadowsHue: 0, midtonesHue: 0, highlightsHue: 0,
  shadowsSat: 100, midtonesSat: 100, highlightsSat: 100,
  hdrStrength: 0, highlightRecovery: 0,
  filmGrain: 0, halation: 0, bloom: 0,
  hslRedHue: 0, hslRedSat: 100, hslRedLum: 100,
  hslOrangeHue: 0, hslOrangeSat: 100, hslOrangeLum: 100,
  hslYellowHue: 0, hslYellowSat: 100, hslYellowLum: 100,
  hslGreenHue: 0, hslGreenSat: 100, hslGreenLum: 100,
  hslAquaHue: 0, hslAquaSat: 100, hslAquaLum: 100,
  hslBlueHue: 0, hslBlueSat: 100, hslBlueLum: 100,
  hslPurpleHue: 0, hslPurpleSat: 100, hslPurpleLum: 100,
  hslMagentaHue: 0, hslMagentaSat: 100, hslMagentaLum: 100,
};

const LUT_PRESETS = [
  { id: "none", name: "None", colors: ["#666", "#888", "#666"] },
  { id: "moody", name: "Moody", colors: ["#1a4a5a", "#d4845a", "#0d3040"] },
  { id: "warm", name: "Warm", colors: ["#d4a54a", "#e8c070", "#c08030"] },
  { id: "clean", name: "Clean", colors: ["#e0e0e0", "#d0d0d0", "#c8c8c8"] },
  { id: "vintage", name: "Vintage", colors: ["#c8a870", "#e0c898", "#a08050"] },
  { id: "cool", name: "Cool", colors: ["#4a8ab0", "#6ab0d0", "#3a7090"] },
  { id: "neon", name: "Neon", colors: ["#ff00ff", "#00ffff", "#ff4080"] },
  { id: "pastel", name: "Pastel", colors: ["#c8a0b8", "#a0c8d0", "#b8c8a0"] },
];

const HSL_CHANNELS = [
  { name: "Red", key: "Red" as const, color: "#ef4444" },
  { name: "Orange", key: "Orange" as const, color: "#f97316" },
  { name: "Yellow", key: "Yellow" as const, color: "#eab308" },
  { name: "Green", key: "Green" as const, color: "#22c55e" },
  { name: "Aqua", key: "Aqua" as const, color: "#06b6d4" },
  { name: "Blue", key: "Blue" as const, color: "#3b82f6" },
  { name: "Purple", key: "Purple" as const, color: "#a855f7" },
  { name: "Magenta", key: "Magenta" as const, color: "#ec4899" },
];

type ToolTab = "basic" | "3way" | "hsl" | "effects";

const TAB_TIER: Record<ToolTab, KeyTier | null> = {
  basic: null, "3way": "pro", hsl: "pro", effects: "studio",
};

const LOCKED_SLIDERS = ["exposure", "contrast", "saturation", "brightness", "temperature"] as const;

// ── Main Component ───────────────────────────────────

export default function ColorToolPage() {
  const [settings, setSettings] = useState<GradeSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<ToolTab>("basic");
  const [showPreview, setShowPreview] = useState(true);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [keyEntryOpen, setKeyEntryOpen] = useState(false);
  const [exportUpsellOpen, setExportUpsellOpen] = useState(false);
  const [expiryLevel, setExpiryLevel] = useState<ExpirationLevel>(() => getExpirationLevel());
  const [timeLeft, setTimeLeft] = useState<string | null>(() => getTimeRemaining());
  const [currentTier, setCurrentTier] = useState<KeyTier | null>(() => getCurrentTier());
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoFrameRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  // Drag tracking for low-res preview
  const isDragging = useRef(false);
  const pendingRender = useRef(false);
  const lastSettingsStr = useRef("");

  const isPro = currentTier !== null;
  const hasMedia = !!uploadedImage || !!uploadedVideo;

  // Resize
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Expiry
  useEffect(() => {
    const id = setInterval(() => {
      setExpiryLevel(getExpirationLevel());
      setTimeLeft(getTimeRemaining());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Core render function — supports quality levels ──
  const renderAtQuality = useCallback((quality: "low" | "high") => {
    if (uploadedVideo) return;
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !showPreview) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Max dimension: low=300px (instant), high=1600px (full quality)
    const maxDim = quality === "low" ? 300 : (isMobile ? 800 : 1600);
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    canvas.width = w;
    canvas.height = h;
    const start = performance.now();
    ctx.drawImage(img, 0, 0, w, h);
    applyColorGrading(ctx, w, h, settings);
    setProcessingTime(Math.round(performance.now() - start));
  }, [settings, showPreview, uploadedVideo, isMobile]);

  // Low-res render (for slider drag — fast)
  const renderLowRes = useCallback(() => {
    if (isDragging.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => renderAtQuality("low"));
    }
  }, [renderAtQuality]);

  // High-res render (on release or after settle)
  const renderHighRes = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => renderAtQuality("high"));
  }, [renderAtQuality]);

  // Re-render when settings change — low-res during drag, high-res otherwise
  useEffect(() => {
    if (!uploadedImage || uploadedVideo) return;
    const s = JSON.stringify(settings);
    if (s === lastSettingsStr.current) return;
    lastSettingsStr.current = s;

    if (isDragging.current) {
      renderLowRes();
    } else {
      renderHighRes();
    }
  }, [settings, uploadedImage, uploadedVideo, renderLowRes, renderHighRes]);

  // Full-res render after drag ends
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        // Switch to full quality after a tiny delay to let state settle
        setTimeout(() => renderHighRes(), 16);
      }
    };

    window.addEventListener("pointerup", onPointerUp);
    return () => window.removeEventListener("pointerup", onPointerUp);
  }, [renderHighRes]);

  // ── Video frame loop ──
  useEffect(() => {
    if (!uploadedVideo || !showPreview) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    const processFrame = () => {
      if (!running || video.paused || video.ended) return;
      // Process video at lower res for performance
      const maxDim = isMobile ? 480 : 720;
      const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);
      const start = performance.now();
      applyColorGrading(ctx, w, h, settings);
      setProcessingTime(Math.round(performance.now() - start));
      videoFrameRef.current = requestAnimationFrame(processFrame);
    };

    const onPlay = () => { setIsPlaying(true); processFrame(); };
    const onPause = () => setIsPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    if (!video.paused) processFrame();

    return () => {
      running = false;
      cancelAnimationFrame(videoFrameRef.current);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [uploadedVideo, settings, showPreview, isMobile]);

  const update = useCallback(
    <K extends keyof GradeSettings>(key: K, value: GradeSettings[K]) =>
      setSettings((s) => ({ ...s, [key]: value })),
    []
  );

  // Mark drag start on any slider interaction
  const onSliderPointerDown = useCallback(() => { isDragging.current = true; }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const clearMedia = useCallback(() => {
    setUploadedImage(null);
    setUploadedVideo(null);
    setSettings(DEFAULT_SETTINGS);
    setIsPlaying(false);
    setShowControls(false);
    lastSettingsStr.current = "";
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = ""; }
  }, []);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setUploadedVideo(url);
      setUploadedImage(null);
      const video = document.createElement("video");
      video.src = url;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.onloadeddata = () => {
        videoRef.current = video;
        setShowControls(true);
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) { ctx.drawImage(video, 0, 0); applyColorGrading(ctx, canvas.width, canvas.height, settings); }
        }
      };
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        setUploadedImage(src);
        setUploadedVideo(null);
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          setShowControls(true);
          lastSettingsStr.current = "";
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [settings]);

  const handleDownload = useCallback(() => {
    if (!isPro) { setExportUpsellOpen(true); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `colorgraded-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [isPro]);

  const handleAutoCC = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (uploadedVideo && videoRef.current) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
    } else if (imageRef.current) {
      canvas.width = imageRef.current.naturalWidth || imageRef.current.width;
      canvas.height = imageRef.current.naturalHeight || imageRef.current.height;
      ctx.drawImage(imageRef.current, 0, 0);
    } else {
      return;
    }

    const autoSettings = autoColorCorrect(ctx, canvas.width, canvas.height);
    setSettings(autoSettings);
  }, [uploadedVideo]);

  const toggleVideoPlay = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
  }, []);

  const handleKeyValidated = useCallback((tier: KeyTier) => setCurrentTier(tier), []);
  const handleKeyRemoved = useCallback(() => { setCurrentTier(null); setActiveTab("basic"); }, []);
  const isTabLocked = useCallback((tab: ToolTab) => (TAB_TIER[tab] ?? null) !== null && !hasTierAccess(TAB_TIER[tab]!), []);

  const tabs = useMemo(() => [
    { id: "basic" as ToolTab, label: "Basic", icon: SlidersHorizontal, locked: false },
    { id: "3way" as ToolTab, label: "3-Way", icon: CircleDot, locked: isTabLocked("3way") },
    { id: "hsl" as ToolTab, label: "HSL", icon: Droplets, locked: isTabLocked("hsl") },
    { id: "effects" as ToolTab, label: "FX", icon: Sparkles, locked: isTabLocked("effects") },
  ], [isTabLocked]);

  // ── Shared props for slider components ──
  const sliderHandlers = useMemo(() => ({
    onPointerDown: onSliderPointerDown,
  }), [onSliderPointerDown]);

  // ── Tab content ──
  const tabContent = (
    <div className="p-4">
      <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: "var(--bg-deep)", boxShadow: "var(--neo-inset)" }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => !tab.locked && setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              activeTab === tab.id ? "text-[var(--text-primary)]" :
              tab.locked ? "text-[var(--text-ghost)] cursor-not-allowed opacity-40" :
              "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
            style={activeTab === tab.id ? { background: "var(--bg-elevated)", boxShadow: "var(--neo-soft)" } : undefined}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            {tab.locked && <Lock className="w-2.5 h-2.5 opacity-50" />}
          </button>
        ))}
      </div>
      {activeTab === "basic" && <BasicTab settings={settings} update={update} isPro={isPro} onUnlock={() => setKeyEntryOpen(true)} sliderHandlers={sliderHandlers} />}
      {activeTab === "3way" && (isTabLocked("3way") ? <LockedPanel feature="3-Way Color Wheels" tier="pro" onUnlock={() => setKeyEntryOpen(true)} /> : <ThreeWayTab settings={settings} update={update} sliderHandlers={sliderHandlers} />)}
      {activeTab === "hsl" && (isTabLocked("hsl") ? <LockedPanel feature="HSL Target Isolation" tier="pro" onUnlock={() => setKeyEntryOpen(true)} /> : <HSLTab settings={settings} update={update} sliderHandlers={sliderHandlers} />)}
      {activeTab === "effects" && (isTabLocked("effects") ? <LockedPanel feature="Film Grain & Effects" tier="studio" onUnlock={() => setKeyEntryOpen(true)} /> : <EffectsTab settings={settings} update={update} sliderHandlers={sliderHandlers} />)}
      {!isPro && (
        <div className="mt-6 p-4 rounded-xl text-center" style={{ background: "linear-gradient(135deg, rgba(6,148,148,0.08), rgba(6,148,148,0.02))", border: "1px solid rgba(6,148,148,0.15)", boxShadow: "var(--neo-soft)" }}>
          <Crown className="w-5 h-5 text-[var(--accent-teal)] mx-auto mb-2 opacity-70" />
          <p className="text-[10px] font-semibold text-[var(--text-primary)] mb-1">Go Pro</p>
          <p className="text-[9px] text-[var(--text-muted)] mb-3 leading-relaxed">Unlock all sliders, 4K export, and premium effects</p>
          <button onClick={() => setKeyEntryOpen(true)} className="w-full py-2 rounded-lg text-[10px] font-semibold transition-all duration-150" style={{ background: "linear-gradient(135deg, #069494, #047A7A)", color: "#EDE8D0", boxShadow: "var(--neo-soft)" }}>
            Enter Key
          </button>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════
  // MOBILE LAYOUT
  // ══════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[var(--bg-deep)]">
        <KeyEntry isOpen={keyEntryOpen} onClose={() => setKeyEntryOpen(false)} onKeyValidated={handleKeyValidated} />
        <ExportUpsell isOpen={exportUpsellOpen} onClose={() => setExportUpsellOpen(false)} onUnlock={() => { setExportUpsellOpen(false); setKeyEntryOpen(true); }} />

        {currentTier && (expiryLevel === "warning" || expiryLevel === "urgent") && (
          <div className="sticky top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-medium" style={{ background: expiryLevel === "urgent" ? "rgba(239,68,68,0.1)" : "rgba(6,148,148,0.08)", color: expiryLevel === "urgent" ? "#EF4444" : "#0AB5B5" }}>
            <AlertTriangle className="w-3 h-3" />
            <span>{expiryLevel === "urgent" ? `Expires within 24h. ${timeLeft}` : `Expires soon. ${timeLeft}`}</span>
          </div>
        )}

        <header className="h-12 backdrop-blur-xl flex items-center justify-between px-3 sticky top-0 z-50" style={{ background: "rgba(24,24,24,0.85)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
            <KeyBadge currentTier={currentTier} onKeyRemoved={handleKeyRemoved} onChangeKey={() => setKeyEntryOpen(true)} />
          </div>
          <div className="flex items-center gap-2">
            {processingTime > 0 && <span className="text-[9px] text-[var(--text-ghost)] font-mono">{processingTime}ms</span>}
            <button onClick={reset} className="p-1.5 rounded-lg text-[var(--text-muted)]" style={{ background: "var(--bg-elevated)" }}><RotateCcw className="w-3.5 h-3.5" /></button>
          </div>
        </header>

        <div className="relative" style={{ height: "40vh", minHeight: 200 }}>
          <div className="absolute inset-0 flex items-center justify-center p-3" style={{ background: "#0F0F0F" }}>
            {hasMedia ? (
              <div className="relative w-full h-full rounded-xl overflow-hidden">
                <canvas ref={canvasRef} className="w-full h-full object-contain" />
                {uploadedVideo && <video ref={videoRef} className="hidden" src={uploadedVideo} muted loop playsInline />}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  {uploadedVideo && (
                    <button onClick={toggleVideoPlay} className="p-2 rounded-full text-white" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                  <div className="flex-1" />
                  <div className="flex gap-1.5">
                    <button onClick={clearMedia} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold text-white" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                      <RefreshCw className="w-3 h-3" /> New
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold text-white" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                      <Upload className="w-3 h-3" /> Add
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="w-full h-full flex items-center justify-center rounded-xl" style={{ background: "radial-gradient(ellipse at center, rgba(6,148,148,0.08), transparent)" }}>
                <div className="text-center px-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "var(--bg-elevated)", boxShadow: "var(--neo-inset)" }}>
                    <Upload className="w-7 h-7 text-[var(--accent-teal)] opacity-60" />
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">Tap to upload</p>
                  <p className="text-[10px] text-[var(--text-ghost)] mt-1">Image or video</p>
                </div>
              </button>
            )}
          </div>
        </div>

        {hasMedia && (
          <div className="px-3 py-2" style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--border-subtle)" }}>
            <button onClick={handleAutoCC} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.98]" style={{ background: "linear-gradient(135deg, #069494, #047A7A)", color: "#EDE8D0", boxShadow: "0 4px 20px rgba(6,148,148,0.35)" }}>
              <Wand2 className="w-5 h-5" />
              Auto Color Correct
            </button>
          </div>
        )}

        {showControls && (
          <div className="border-t" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-primary)" }}>
            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <button onClick={() => setShowPreview(!showPreview)} className="p-1.5 rounded-lg" style={{ background: showPreview ? "rgba(6,148,148,0.1)" : "transparent" }}>
                {showPreview ? <Eye className="w-3.5 h-3.5 text-[var(--accent-teal)]" /> : <EyeOff className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-[var(--text-muted)]" style={{ background: "var(--bg-elevated)" }}>
                <Upload className="w-3 h-3" /> Upload
              </button>
              <div className="flex-1" />
              <button onClick={() => setKeyEntryOpen(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: "rgba(6,148,148,0.1)", color: "var(--accent-teal)" }}>
                <Key className="w-3 h-3" /> {isPro ? "Pro ✓" : "Enter Key"}
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 40vh - 120px)" }}>
              {tabContent}
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // DESKTOP LAYOUT
  // ══════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[var(--bg-deep)]">
      <KeyEntry isOpen={keyEntryOpen} onClose={() => setKeyEntryOpen(false)} onKeyValidated={handleKeyValidated} />
      <ExportUpsell isOpen={exportUpsellOpen} onClose={() => setExportUpsellOpen(false)} onUnlock={() => { setExportUpsellOpen(false); setKeyEntryOpen(true); }} />

      {currentTier && (expiryLevel === "warning" || expiryLevel === "urgent") && (
        <div className="sticky top-14 z-40 flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-medium" style={{ background: expiryLevel === "urgent" ? "rgba(239,68,68,0.1)" : "rgba(6,148,148,0.08)", borderBottom: `1px solid ${expiryLevel === "urgent" ? "rgba(239,68,68,0.2)" : "rgba(6,148,148,0.15)"}`, color: expiryLevel === "urgent" ? "#EF4444" : "#0AB5B5" }}>
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{expiryLevel === "urgent" ? `Expires within 24h. ${timeLeft}` : `Expires soon. ${timeLeft}`}</span>
          <button onClick={() => setKeyEntryOpen(true)} className="ml-2 underline underline-offset-2">Enter new key</button>
        </div>
      )}

      <header className="h-14 backdrop-blur-xl flex items-center justify-between px-4 sticky top-0 z-50" style={{ background: "rgba(24,24,24,0.85)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><ArrowLeft className="w-4 h-4" /><span className="text-sm">Back</span></Link>
          <div className="w-px h-5" style={{ background: "var(--border-medium)" }} />
          <span className="text-sm font-medium text-[var(--text-secondary)]">Color Grading Tool</span>
        </div>
        <div className="flex items-center gap-3">
          {processingTime > 0 && <span className="text-[10px] text-[var(--text-ghost)] font-mono">{processingTime}ms</span>}
          <KeyBadge currentTier={currentTier} onKeyRemoved={handleKeyRemoved} onChangeKey={() => setKeyEntryOpen(true)} />
          {!currentTier && (
            <button onClick={() => setKeyEntryOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold" style={{ background: "linear-gradient(135deg, rgba(6,148,148,0.15), rgba(6,148,148,0.05))", border: "1px solid rgba(6,148,148,0.25)", color: "var(--accent-teal-light)" }}>
              <Key className="w-3 h-3" /> Enter Key
            </button>
          )}
          <button onClick={reset} className="p-2 rounded-xl text-[var(--text-muted)]" style={{ background: "var(--bg-elevated)" }} title="Reset"><RotateCcw className="w-4 h-4" /></button>
          <button onClick={handleAutoCC} disabled={!hasMedia} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-30" style={{ background: hasMedia ? "linear-gradient(135deg, #069494, #047A7A)" : "var(--bg-elevated)", color: hasMedia ? "#EDE8D0" : "var(--text-muted)", boxShadow: hasMedia ? "0 4px 20px rgba(6,148,148,0.35)" : undefined }}>
            <Wand2 className="w-4 h-4" /> Auto CC
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
            <Upload className="w-4 h-4" /> Upload
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "linear-gradient(135deg, #069494, #047A7A)", color: "#EDE8D0", boxShadow: "0 0 16px rgba(6,148,148,0.2)" }}>
            <Download className="w-4 h-4" /> Export {!isPro && <Lock className="w-3 h-3 opacity-60" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        <aside className="w-72 overflow-y-auto flex-shrink-0" style={{ background: "var(--bg-primary)", borderRight: "1px solid var(--border-subtle)" }}>
          {tabContent}
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          <div className="h-10 flex items-center justify-between px-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span>Preview</span>
              <button onClick={() => setShowPreview(!showPreview)} className="p-1 rounded-lg" style={{ background: showPreview ? "rgba(6,148,148,0.1)" : "transparent" }}>
                {showPreview ? <Eye className="w-3.5 h-3.5 text-[var(--accent-teal)]" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--text-ghost)]">
              {uploadedVideo && <button onClick={toggleVideoPlay} className="p-1 rounded-lg text-[var(--accent-teal)]" style={{ background: "rgba(6,148,148,0.1)" }}>{isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}</button>}
              <span>Client-Side • Canvas 2D</span>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden" style={{ background: "#0F0F0F" }}>
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px var(--border-subtle)" }}>
              {hasMedia ? (
                <>
                  <canvas ref={canvasRef} className="w-full h-full object-contain" />
                  {uploadedVideo && <video ref={videoRef} className="hidden" src={uploadedVideo} muted loop playsInline />}
                  <button onClick={clearMedia} className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold opacity-70 hover:opacity-100 transition-all" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--text-primary)" }}>
                    <RefreshCw className="w-3 h-3" /> New File
                  </button>
                </>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full h-full flex items-center justify-center hover:bg-[rgba(6,148,148,0.05)] transition-all" style={{ background: "radial-gradient(ellipse at 30% 40%, rgba(6,148,148,0.08), transparent 50%), linear-gradient(135deg, #1a1a1a, #181818, #1a1a1a)" }}>
                  <div className="text-center px-4">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-transform" style={{ background: "var(--bg-elevated)", boxShadow: "var(--neo-inset)" }}>
                      <Upload className="w-8 h-8 text-[var(--accent-teal)] opacity-60" />
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mb-1">Drop an image or video here</p>
                    <p className="text-xs text-[var(--text-ghost)]">Click to browse • PNG, JPG, MP4, MOV</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className="h-24 px-6 flex items-center gap-6" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div className="flex-1 h-14 flex items-end gap-px opacity-60">
              {Array.from({ length: 64 }, (_, i) => {
                const h = Math.sin(i * 0.15 + settings.contrast * 0.01) * 0.3 + Math.sin(i * 0.08) * 0.2 + 0.4;
                return <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.max(5, h * 100)}%`, background: "linear-gradient(to top, rgba(6,148,148,0.3), rgba(6,148,148,0.1))" }} />;
              })}
            </div>
            <div className="text-xs text-[var(--text-ghost)]">
              <div className="text-[var(--text-muted)]">RGB Histogram</div>
              <div className="font-mono mt-1">256 levels</div>
            </div>
          </div>
        </main>

        <aside className="w-60 overflow-y-auto flex-shrink-0 p-4" style={{ background: "var(--bg-primary)", borderLeft: "1px solid var(--border-subtle)" }}>
          <AdjustmentsPanel settings={settings} currentTier={currentTier} onUnlock={() => setKeyEntryOpen(true)} />
        </aside>
      </div>
    </div>
  );
}

// ── Slider helper: thin wrapper that fires onPointerDown ──
function PSlider({ value, min, max, step, onChange, sliderHandlers, disabled, className }: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
  sliderHandlers: { onPointerDown: () => void };
  disabled?: boolean; className?: string;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      onPointerDown={sliderHandlers.onPointerDown}
      disabled={disabled}
      className={className ?? "w-full touch-manipulation"}
    />
  );
}

// ── Tab Panels ────────────────────────────────────

function BasicTab({ settings, update, isPro, onUnlock, sliderHandlers }: { settings: GradeSettings; update: <K extends keyof GradeSettings>(k: K, v: GradeSettings[K]) => void; isPro: boolean; onUnlock: () => void; sliderHandlers: { onPointerDown: () => void } }) {
  const sliders = [
    { key: "whiteBalance" as const, label: "White Balance", icon: SunMedium, locked: false },
    { key: "exposure" as const, label: "Exposure", icon: SunMedium, locked: !isPro },
    { key: "contrast" as const, label: "Contrast", icon: Contrast, locked: !isPro },
    { key: "saturation" as const, label: "Saturation", icon: Droplets, locked: !isPro },
    { key: "brightness" as const, label: "Brightness", icon: SunMedium, locked: !isPro },
    { key: "temperature" as const, label: "Temperature", icon: Palette, locked: !isPro },
  ];

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3 block">LUT Presets</label>
        <div className="grid grid-cols-4 gap-2">
          {LUT_PRESETS.map((lut) => (
            <button key={lut.id} onClick={() => update("lutPreset", lut.id as GradeSettings["lutPreset"])} className={`aspect-square rounded-xl overflow-hidden border-2 transition-all duration-150 ${settings.lutPreset === lut.id ? "border-[var(--accent-teal)]" : "border-transparent hover:border-[var(--border-medium)]"}`} style={settings.lutPreset === lut.id ? { boxShadow: "0 0 12px rgba(6,148,148,0.3)" } : undefined} title={lut.name}>
              <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${lut.colors[0]}, ${lut.colors[1]}, ${lut.colors[2]})` }} />
            </button>
          ))}
        </div>
      </div>
      <div className="h-px" style={{ background: "var(--border-subtle)" }} />
      {!isPro && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: "rgba(6,148,148,0.06)", border: "1px solid rgba(6,148,148,0.12)" }}>
          <Crown className="w-3.5 h-3.5 text-[var(--accent-teal)] flex-shrink-0" />
          <span className="text-[10px] text-[var(--accent-teal-light)]">Below sliders require Pro key</span>
        </div>
      )}
      {sliders.map((s) => (
        <div key={s.key} className={`relative ${s.locked ? "opacity-50" : ""}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <s.icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-secondary)]">{s.label}</span>
              {s.locked && <Lock className="w-2.5 h-2.5 text-[var(--accent-teal)] opacity-50" />}
            </div>
            <span className="text-xs text-[var(--text-ghost)] font-mono">{settings[s.key] > 0 ? "+" : ""}{settings[s.key]}</span>
          </div>
          <PSlider min={-100} max={100} value={settings[s.key]} onChange={(v) => update(s.key, v)} sliderHandlers={sliderHandlers} disabled={s.locked} />
          {s.locked && <button onClick={onUnlock} className="absolute inset-0 flex items-center justify-center cursor-pointer z-10 rounded-xl" style={{ background: "rgba(24,24,24,0.4)" }}><span className="text-[9px] font-semibold px-2 py-0.5 rounded-md" style={{ background: "rgba(6,148,148,0.2)", color: "var(--accent-teal-light)", border: "1px solid rgba(6,148,148,0.25)" }}>🔒 Pro</span></button>}
        </div>
      ))}
    </div>
  );
}

function ThreeWayTab({ settings, update, sliderHandlers }: { settings: GradeSettings; update: <K extends keyof GradeSettings>(k: K, v: GradeSettings[K]) => void; sliderHandlers: { onPointerDown: () => void } }) {
  const wheels = [
    { label: "Shadows", hueKey: "shadowsHue" as const, satKey: "shadowsSat" as const, color: "var(--accent-slate)" },
    { label: "Midtones", hueKey: "midtonesHue" as const, satKey: "midtonesSat" as const, color: "var(--accent-teal)" },
    { label: "Highlights", hueKey: "highlightsHue" as const, satKey: "highlightsSat" as const, color: "var(--accent-clay)" },
  ];

  return (
    <div className="space-y-5">
      {wheels.map((w) => (
        <div key={w.label}>
          <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3 block">{w.label}</label>
          <div className="rounded-2xl p-4" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(var(--glass-blur))", boxShadow: "var(--neo-soft)" }}>
            <div className="w-full aspect-square rounded-full mb-3 relative overflow-hidden" style={{ background: "var(--bg-deep)", boxShadow: "var(--neo-inset)" }}>
              <div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 0deg, hsl(0,80%,50%), hsl(60,80%,50%), hsl(120,80%,50%), hsl(180,80%,50%), hsl(240,80%,50%), hsl(300,80%,50%), hsl(360,80%,50%))", opacity: 0.3 }} />
              <div className="absolute w-4 h-4 rounded-full border-2 border-white" style={{ background: w.color, top: "50%", left: "50%", transform: `translate(-50%, -50%) rotate(${settings[w.hueKey]}deg) translateY(-${settings[w.satKey] / 5}px)`, boxShadow: `0 0 8px ${w.color}` }} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><span className="text-xs text-[var(--text-muted)]">Hue</span><span className="text-xs text-[var(--text-ghost)] font-mono">{settings[w.hueKey]}°</span></div>
              <PSlider min={-180} max={180} value={settings[w.hueKey]} onChange={(v) => update(w.hueKey, v)} sliderHandlers={sliderHandlers} />
              <div className="flex items-center justify-between"><span className="text-xs text-[var(--text-muted)]">Saturation</span><span className="text-xs text-[var(--text-ghost)] font-mono">{settings[w.satKey]}%</span></div>
              <PSlider min={0} max={200} value={settings[w.satKey]} onChange={(v) => update(w.satKey, v)} sliderHandlers={sliderHandlers} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HSLTab({ settings, update, sliderHandlers }: { settings: GradeSettings; update: <K extends keyof GradeSettings>(k: K, v: GradeSettings[K]) => void; sliderHandlers: { onPointerDown: () => void } }) {
  return (
    <div className="space-y-4">
      <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3 block">HSL Target Isolation</label>
      <p className="text-[11px] text-[var(--text-muted)] mb-3">Adjust hue, saturation, and luminance for specific color ranges.</p>
      {HSL_CHANNELS.map((c) => {
        const prefix = `hsl${c.key}`;
        const hueKey = `${prefix}Hue` as keyof GradeSettings;
        const satKey = `${prefix}Sat` as keyof GradeSettings;
        const lumKey = `${prefix}Lum` as keyof GradeSettings;
        const hueVal = settings[hueKey] as number;
        const satVal = settings[satKey] as number;
        const lumVal = settings[lumKey] as number;

        return (
          <div key={c.key} className="rounded-xl p-3 mb-3" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", boxShadow: "var(--neo-soft)" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
              <span className="text-xs font-medium text-[var(--text-secondary)]">{c.name}</span>
              {hueVal !== 0 && <span className="text-[9px] text-[var(--accent-teal)] font-mono">H:{hueVal > 0 ? "+" : ""}{hueVal}</span>}
              {satVal !== 100 && <span className="text-[9px] text-[var(--accent-teal)] font-mono">S:{satVal}%</span>}
              {lumVal !== 100 && <span className="text-[9px] text-[var(--accent-teal)] font-mono">L:{lumVal}%</span>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-[10px] text-[var(--text-muted)]">Hue</span><span className="text-[10px] text-[var(--text-ghost)] font-mono">{hueVal > 0 ? "+" : ""}{hueVal}°</span></div>
              <PSlider min={-180} max={180} value={hueVal} onChange={(v) => update(hueKey, v)} sliderHandlers={sliderHandlers} />
              <div className="flex items-center justify-between"><span className="text-[10px] text-[var(--text-muted)]">Saturation</span><span className="text-[10px] text-[var(--text-ghost)] font-mono">{satVal}%</span></div>
              <PSlider min={0} max={200} value={satVal} onChange={(v) => update(satKey, v)} sliderHandlers={sliderHandlers} />
              <div className="flex items-center justify-between"><span className="text-[10px] text-[var(--text-muted)]">Luminance</span><span className="text-[10px] text-[var(--text-ghost)] font-mono">{lumVal}%</span></div>
              <PSlider min={0} max={200} value={lumVal} onChange={(v) => update(lumKey, v)} sliderHandlers={sliderHandlers} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EffectsTab({ settings, update, sliderHandlers }: { settings: GradeSettings; update: <K extends keyof GradeSettings>(k: K, v: GradeSettings[K]) => void; sliderHandlers: { onPointerDown: () => void } }) {
  return (
    <div className="space-y-5">
      {[
        { key: "hdrStrength" as const, label: "HDR Emulation", icon: Waves },
        { key: "highlightRecovery" as const, label: "Highlight Recovery", icon: SunMedium },
        { key: "filmGrain" as const, label: "Film Grain", icon: Film },
        { key: "halation" as const, label: "Halation", icon: Sparkles },
        { key: "bloom" as const, label: "Bloom", icon: Eye },
      ].map((s) => (
        <div key={s.key}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><s.icon className="w-3.5 h-3.5 text-[var(--text-muted)]" /><span className="text-xs text-[var(--text-secondary)]">{s.label}</span></div>
            <span className="text-xs text-[var(--text-ghost)] font-mono">{settings[s.key]}%</span>
          </div>
          <PSlider min={0} max={100} value={settings[s.key]} onChange={(v) => update(s.key, v)} sliderHandlers={sliderHandlers} />
        </div>
      ))}
    </div>
  );
}

function LockedPanel({ feature, tier, onUnlock }: { feature: string; tier: KeyTier; onUnlock: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--bg-deep)", boxShadow: "var(--neo-inset)" }}><Lock className="w-6 h-6 text-[var(--accent-teal)] opacity-60" /></div>
      <p className="text-sm text-[var(--text-muted)] mb-1">{feature}</p>
      <p className="text-[10px] text-[var(--text-ghost)] mb-4">Requires {TIER_LABELS[tier]} access key</p>
      <button onClick={onUnlock} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150" style={{ background: "linear-gradient(135deg, #069494, #047A7A)", color: "#EDE8D0", boxShadow: "0 0 16px rgba(6,148,148,0.2)" }}>
        <Key className="w-3.5 h-3.5" /> Enter Access Key
      </button>
    </div>
  );
}

function AdjustmentsPanel({ settings, currentTier, onUnlock }: { settings: GradeSettings; currentTier: KeyTier | null; onUnlock: () => void }) {
  const active = Object.entries(settings).filter(([_, v]) => v !== 0 && v !== "none" && v !== 100);
  return (
    <>
      <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">Active Adjustments</h3>
      <div className="space-y-3">
        {active.length > 0 ? active.map(([key, value]) => (
          <div key={key} className="rounded-xl px-3 py-2" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", boxShadow: "var(--neo-soft)" }}>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{key.replace(/([A-Z])/g, " $1").trim()}</div>
            <div className="text-sm text-[var(--text-primary)] font-mono">{typeof value === "number" ? (value > 0 ? `+${value}` : value) : String(value)}</div>
          </div>
        )) : <p className="text-xs text-[var(--text-ghost)] text-center py-8">No adjustments yet.<br />Start tweaking.</p>}
      </div>
      {!currentTier && (
        <div className="mt-8 p-4 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(6,148,148,0.08), rgba(6,148,148,0.02))", border: "1px solid rgba(6,148,148,0.15)" }}>
          <Crown className="w-5 h-5 text-[var(--accent-teal)] mb-2 opacity-70" />
          <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-1">Unlock Pro Tools</h4>
          <p className="text-[10px] text-[var(--text-secondary)] mb-3">3-Way wheels, HSL, HDR, grain & 4K export</p>
          <button onClick={onUnlock} className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #069494, #047A7A)", color: "#EDE8D0" }}>
            <Key className="w-3 h-3" /> Enter Access Key
          </button>
        </div>
      )}
    </>
  );
}
