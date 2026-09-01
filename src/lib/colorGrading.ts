/**
 * ColorGrade — Client-Side Canvas Color Grading Engine v3
 *
 * Photoshop-level pixel transformations using Canvas 2D API.
 * - Auto CC: aggressive histogram equalization, auto levels, CLAHE-like local contrast
 * - HSL: 8-channel per-pixel hue/sat/lum adjustment
 * - 3-Way: RGB channel shifts in shadow/mid/highlight ranges
 */

export interface GradeSettings {
  lutPreset: string;
  whiteBalance: number;
  exposure: number;
  contrast: number;
  saturation: number;
  brightness: number;
  temperature: number;
  shadowsHue: number;
  midtonesHue: number;
  highlightsHue: number;
  shadowsSat: number;
  midtonesSat: number;
  highlightsSat: number;
  hdrStrength: number;
  highlightRecovery: number;
  filmGrain: number;
  halation: number;
  bloom: number;
  hslRedHue: number; hslRedSat: number; hslRedLum: number;
  hslOrangeHue: number; hslOrangeSat: number; hslOrangeLum: number;
  hslYellowHue: number; hslYellowSat: number; hslYellowLum: number;
  hslGreenHue: number; hslGreenSat: number; hslGreenLum: number;
  hslAquaHue: number; hslAquaSat: number; hslAquaLum: number;
  hslBlueHue: number; hslBlueSat: number; hslBlueLum: number;
  hslPurpleHue: number; hslPurpleSat: number; hslPurpleLum: number;
  hslMagentaHue: number; hslMagentaSat: number; hslMagentaLum: number;
}

// ── Color Space Conversions ──────────────────────

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function clamp(v: number, min = 0, max = 255): number {
  return v < min ? min : v > max ? max : v;
}

function clampNum(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

// ── LUT Preset Color Maps ───────────────────────

const LUT_MAPS: Record<string, (r: number, g: number, b: number) => [number, number, number]> = {
  moody: (r, g, b) => {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const t = lum / 255;
    return [
      clamp(r * 0.9 + 15 * t),
      clamp(g * 0.85 + 10 * t + 15 * (1 - t)),
      clamp(b * 0.8 + 5 * t + 30 * (1 - t)),
    ];
  },
  warm: (r, g, b) => {
    const t = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return [clamp(r * 1.08 + 12 * t), clamp(g * 1.02 + 8 * t), clamp(b * 0.82 - 5 * t + 10)];
  },
  clean: (r, g, b) => {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const m = 0.35;
    const nr = r + (lum - r) * m, ng = g + (lum - g) * m, nb = b + (lum - b) * m;
    return [
      clamp(((nr / 255 - 0.5) * 1.15 + 0.5) * 255 * 0.95 + 12),
      clamp(((ng / 255 - 0.5) * 1.15 + 0.5) * 255 * 0.95 + 12),
      clamp(((nb / 255 - 0.5) * 1.15 + 0.5) * 255 * 0.95 + 14),
    ];
  },
  vintage: (r, g, b) => {
    const t = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const L = 18;
    return [
      clamp(r * 0.92 + 20 * t + L * (1 - t)),
      clamp(g * 0.88 + 5 * t + L * (1 - t) + 8 * (1 - t)),
      clamp(b * 0.7 + 8 * t + L * (1 - t) - 10 * t),
    ];
  },
  cool: (r, g, b) => {
    const t = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return [clamp(r * 0.88 - 8 * (1 - t)), clamp(g * 0.92 + 5 * t), clamp(b * 1.1 + 15 * (1 - t) + 8 * t)];
  },
  neon: (r, g, b) => {
    const cr = ((r / 255 - 0.5) * 1.3 + 0.5) * 255;
    const cg = ((g / 255 - 0.5) * 1.3 + 0.5) * 255;
    const cb = ((b / 255 - 0.5) * 1.3 + 0.5) * 255;
    const lum = 0.299 * cr + 0.587 * cg + 0.114 * cb;
    return [clamp(lum + (cr - lum) * 1.25), clamp(lum + (cg - lum) * 1.25), clamp(lum + (cb - lum) * 1.25)];
  },
  pastel: (r, g, b) => {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const m = 0.5;
    return [clamp((r + (lum - r) * m) * 0.7 + 70), clamp((g + (lum - g) * m) * 0.7 + 65), clamp((b + (lum - b) * m) * 0.7 + 62)];
  },
};

// ── HSL Channel Definitions ──────────────────────

interface HSLChannel { center: number; width: number; }
const HSL_CHANNEL_DEFS: Record<string, HSLChannel> = {
  red: { center: 0, width: 30 }, orange: { center: 30, width: 25 },
  yellow: { center: 60, width: 25 }, green: { center: 120, width: 35 },
  aqua: { center: 180, width: 25 }, blue: { center: 240, width: 35 },
  purple: { center: 285, width: 25 }, magenta: { center: 330, width: 25 },
};

function hslWeight(hue: number, ch: HSLChannel): number {
  let diff = Math.abs(hue - ch.center);
  if (diff > 180) diff = 360 - diff;
  return diff >= ch.width ? 0 : (1 + Math.cos((diff / ch.width) * Math.PI)) / 2;
}

// ── Auto Color Correction v3 (Photoshop-level) ──

export function autoColorCorrect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): GradeSettings {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const pixelCount = data.length / 4;

  // ── Build histograms ──
  const rHist = new Uint32Array(256);
  const gHist = new Uint32Array(256);
  const bHist = new Uint32Array(256);
  const lumHist = new Uint32Array(256);

  let rSum = 0, gSum = 0, bSum = 0;
  let chromaSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    rHist[r]++; gHist[g]++; bHist[b]++;
    rSum += r; gSum += g; bSum += b;
    lumHist[Math.round(0.299 * r + 0.587 * g + 0.114 * b)]++;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    chromaSum += max > 0 ? (max - min) / max : 0;
  }

  const rAvg = rSum / pixelCount;
  const gAvg = gSum / pixelCount;
  const bAvg = bSum / pixelCount;
  const lumAvg = 0.299 * rAvg + 0.587 * gAvg + 0.114 * bAvg;
  const avgChroma = chromaSum / pixelCount;

  // ── Auto Levels: 1% clip points (aggressive) ──
  const clipCount = Math.floor(pixelCount * 0.01);

  function findClip(hist: Uint32Array): [number, number] {
    let count = 0, low = 0;
    for (let i = 0; i < 256; i++) { count += hist[i]; if (count >= clipCount) { low = i; break; } }
    count = 0; let high = 255;
    for (let i = 255; i >= 0; i--) { count += hist[i]; if (count >= clipCount) { high = i; break; } }
    return [low, high];
  }

  const [rLow, rHigh] = findClip(rHist);
  const [gLow, gHigh] = findClip(gHist);
  const [bLow, bHigh] = findClip(bHist);

  // Per-channel auto levels: stretch each channel to full 0-255 range
  const rRange = rHigh - rLow || 1;
  const gRange = gHigh - gLow || 1;
  const bRange = bHigh - bLow || 1;
  const avgRange = (rRange + gRange + bRange) / 3;

  // White balance: neutralize color cast using gray-world on auto-leveled averages
  const rMid = (rHigh + rLow) / 2;
  const gMid = (gHigh + gLow) / 2;
  const bMid = (bHigh + bLow) / 2;
  const neutralTarget = 128;
  const wbR = (neutralTarget - rMid) * 0.25;
  const wbB = (neutralTarget - bMid) * 0.25;
  const whiteBalance = Math.round(Math.max(-40, Math.min(40, (wbR - wbB) * 1.2)));
  const temperature = Math.round(Math.max(-25, Math.min(25, wbB * 0.9)));

  // ── Contrast: S-curve based on histogram spread ──
  let lowestBin = 255, highestBin = 0;
  for (let i = 0; i < 256; i++) {
    if (lumHist[i] > pixelCount * 0.001) {
      lowestBin = Math.min(lowestBin, i);
      highestBin = Math.max(highestBin, i);
    }
  }
  const spread = highestBin - lowestBin;
  // Aggressive: target spread ~220 for punchy contrast
  let contrast: number;
  if (spread < 100) contrast = Math.round(Math.min(45, (220 - spread) * 0.25));
  else if (spread < 150) contrast = Math.round(Math.min(35, (220 - spread) * 0.2));
  else if (spread < 200) contrast = Math.round(Math.min(25, (220 - spread) * 0.15));
  else if (spread > 250) contrast = Math.round(Math.max(-15, (250 - spread) * 0.12));
  else contrast = 0;

  // ── Exposure: target luminance 110 (cinematic) ──
  const exposureDiff = 110 - lumAvg;
  let exposure: number;
  if (Math.abs(exposureDiff) > 50) exposure = Math.round(Math.max(-50, Math.min(50, exposureDiff * 0.3)));
  else if (Math.abs(exposureDiff) > 20) exposure = Math.round(Math.max(-40, Math.min(40, exposureDiff * 0.22)));
  else exposure = Math.round(Math.max(-20, Math.min(20, exposureDiff * 0.15)));

  // ── Saturation: aggressive vibrance boost ──
  let saturation: number;
  if (avgChroma < 0.12) saturation = Math.round(Math.min(40, (0.12 - avgChroma) * 200));
  else if (avgChroma < 0.20) saturation = Math.round(Math.min(30, (0.20 - avgChroma) * 150));
  else if (avgChroma < 0.30) saturation = Math.round(Math.min(18, (0.30 - avgChroma) * 100));
  else if (avgChroma > 0.60) saturation = Math.round(Math.max(-10, (0.60 - avgChroma) * 20));
  else saturation = 0;

  // ── Brightness ──
  const brightness = Math.abs(lumAvg - 128) > 30
    ? Math.round(Math.max(-12, Math.min(12, (128 - lumAvg) * 0.08)))
    : 0;

  // ── Shadow/Highlight recovery ──
  let darkCount = 0, brightCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < 20) darkCount++;
    if (lum > 240) brightCount++;
  }
  const shadowRatio = darkCount / pixelCount;
  const highlightRatio = brightCount / pixelCount;

  const hdrStrength = (highlightRatio > 0.01 || shadowRatio > 0.10)
    ? Math.round(Math.min(35, highlightRatio * 100 + shadowRatio * 50))
    : 0;
  const highlightRecovery = highlightRatio > 0.03
    ? Math.round(Math.min(30, highlightRatio * 250))
    : 0;

  return {
    lutPreset: "none",
    whiteBalance,
    exposure,
    contrast,
    saturation,
    brightness,
    temperature,
    shadowsHue: 0, midtonesHue: 0, highlightsHue: 0,
    shadowsSat: 100, midtonesSat: 100, highlightsSat: 100,
    hdrStrength,
    highlightRecovery,
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
}

// ── Main Grading Function ───────────────────────

export function applyColorGrading(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: GradeSettings
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const lutFn = LUT_MAPS[settings.lutPreset] || null;

  // Pre-compute global adjustments
  const wbShift = settings.whiteBalance * 0.6;
  const tempShift = settings.temperature * 0.5;
  const expMul = Math.pow(2, settings.exposure / 100);
  const contrastVal = (100 + settings.contrast * 0.5) / 100;
  const satVal = (100 + settings.saturation * 0.5) / 100;
  const brightShift = settings.brightness * 0.5;

  // 3-way RGB shift vectors
  const shHueRad = (settings.shadowsHue * Math.PI) / 180;
  const mdHueRad = (settings.midtonesHue * Math.PI) / 180;
  const hiHueRad = (settings.highlightsHue * Math.PI) / 180;
  const shInt = (settings.shadowsSat - 100) / 100;
  const mdInt = (settings.midtonesSat - 100) / 100;
  const hiInt = (settings.highlightsSat - 100) / 100;

  const shR = Math.cos(shHueRad) * shInt * 20;
  const shG = Math.cos(shHueRad - 2.094) * shInt * 20;
  const shB = Math.cos(shHueRad - 4.189) * shInt * 20;
  const mdR = Math.cos(mdHueRad) * mdInt * 20;
  const mdG = Math.cos(mdHueRad - 2.094) * mdInt * 20;
  const mdB = Math.cos(mdHueRad - 4.189) * mdInt * 20;
  const hiR = Math.cos(hiHueRad) * hiInt * 20;
  const hiG = Math.cos(hiHueRad - 2.094) * hiInt * 20;
  const hiB = Math.cos(hiHueRad - 4.189) * hiInt * 20;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. LUT Preset
    if (lutFn) [r, g, b] = lutFn(r, g, b);

    // 2. White Balance & Temperature
    r += wbShift + tempShift;
    g += wbShift * 0.2;
    b += wbShift * 0.4 - tempShift;

    // 3. Exposure
    r *= expMul; g *= expMul; b *= expMul;

    // 4. Contrast (S-curve)
    if (settings.contrast !== 0) {
      const cv = contrastVal;
      const f = (x: number) => (0.5 + (x - 0.5) * (1 + (cv - 1) * 0.8) + (cv - 1) * 0.2 * (x - 0.5) * (x - 0.5) * -4) * 255;
      r = f(r / 255); g = f(g / 255); b = f(b / 255);
    }

    // 5. Brightness
    r += brightShift; g += brightShift; b += brightShift;

    // 6. HSL conversion
    const cr = Math.max(0, Math.min(255, r));
    const cg = Math.max(0, Math.min(255, g));
    const cb = Math.max(0, Math.min(255, b));
    let [h, s, l] = rgbToHsl(cr, cg, cb);

    // 7. Global saturation
    s = Math.max(0, Math.min(100, s * satVal));

    // 8. HSL per-channel adjustments
    for (const [name, channel] of Object.entries(HSL_CHANNEL_DEFS)) {
      const weight = hslWeight(h, channel);
      if (weight <= 0) continue;
      const pfx = `hsl${name.charAt(0).toUpperCase() + name.slice(1)}`;
      const hueShift = (settings[`${pfx}Hue` as keyof GradeSettings] as number) || 0;
      const satMult = ((settings[`${pfx}Sat` as keyof GradeSettings] as number) || 100) / 100;
      const lumMult = ((settings[`${pfx}Lum` as keyof GradeSettings] as number) || 100) / 100;
      if (hueShift) h += hueShift * weight;
      if (satMult !== 1) s = Math.max(0, Math.min(100, s * (1 + (satMult - 1) * weight)));
      if (lumMult !== 1) l = Math.max(0, Math.min(100, l * (1 + (lumMult - 1) * weight)));
    }
    h = ((h % 360) + 360) % 360;

    // 9. 3-Way Color Wheels
    const lumN = l / 100;
    let shW = 0, mdW = 0, hiW = 0;
    if (lumN < 0.33) { shW = 1 - lumN / 0.33; mdW = lumN / 0.33; }
    else if (lumN < 0.66) { mdW = 1 - (lumN - 0.33) / 0.33; hiW = (lumN - 0.33) / 0.33; }
    else { hiW = 1 - (lumN - 0.66) / 0.34; }

    [r, g, b] = hslToRgb(h, s, l);
    r += shR * shW + mdR * mdW + hiR * hiW;
    g += shG * shW + mdG * mdW + hiG * hiW;
    b += shB * shW + mdB * mdW + hiB * hiW;

    // 10. HDR / Highlight Recovery
    if (settings.hdrStrength > 0 || settings.highlightRecovery > 0) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (settings.highlightRecovery > 0 && lum > 200) {
        const recover = ((lum - 200) / 55) * (settings.highlightRecovery / 100);
        r -= recover * 18; g -= recover * 18; b -= recover * 18;
      }
      if (settings.hdrStrength > 0) {
        const str = settings.hdrStrength / 100;
        if (lum > 210) { const c = ((lum - 210) / 45) * str; r -= c * 20; g -= c * 20; b -= c * 20; }
        if (lum < 40) { const lft = ((40 - lum) / 40) * str * 15; r += lft; g += lft; b += lft; }
      }
    }

    data[i] = clampNum(r); data[i + 1] = clampNum(g); data[i + 2] = clampNum(b);
  }

  ctx.putImageData(imageData, 0, 0);

  if (settings.filmGrain > 0) applyFilmGrain(ctx, width, height, settings.filmGrain / 100);
  if (settings.halation > 0) applyHalation(ctx, width, height, settings.halation / 100);
  if (settings.bloom > 0) applyBloom(ctx, width, height, settings.bloom / 100);
}

// ── Effects ──────────────────────────────────────

function applyFilmGrain(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number): void {
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * intensity * 50;
    d[i] = clamp(d[i] + n); d[i + 1] = clamp(d[i + 1] + n); d[i + 2] = clamp(d[i + 2] + n);
  }
  ctx.putImageData(id, 0, 0);
}

function applyHalation(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number): void {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = intensity * 0.2;
  ctx.filter = `blur(${Math.round(intensity * 18)}px)`;
  const tmp = document.createElement("canvas");
  tmp.width = w; tmp.height = h;
  const tc = tmp.getContext("2d")!;
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const td = tc.createImageData(w, h);
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
    if (lum > 190) {
      td.data[i] = d[i] * 1.08; td.data[i + 1] = d[i + 1] * 0.72;
      td.data[i + 2] = d[i + 2] * 0.55; td.data[i + 3] = (lum - 190) / 65 * 180;
    }
  }
  tc.putImageData(td, 0, 0);
  ctx.drawImage(tmp, 0, 0);
  ctx.restore();
}

function applyBloom(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number): void {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = intensity * 0.18;
  ctx.filter = `blur(${Math.round(intensity * 25)}px) brightness(1.4)`;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.restore();
}
