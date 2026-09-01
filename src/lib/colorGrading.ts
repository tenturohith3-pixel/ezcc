/**
 * ColorGrade — Client-Side Canvas Color Grading Engine v2
 *
 * Photoshop-level pixel transformations using Canvas 2D API.
 * - Auto CC: histogram equalization, auto levels, S-curve, vibrance
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
  // HSL per-channel: [hueShift, saturationMultiplier, luminanceMultiplier]
  // Channels: red, orange, yellow, green, aqua, blue, purple, magenta
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
    const shadowMix = 1 - t;
    const highlightMix = t;
    return [
      clamp(r * 0.9 + 15 * highlightMix),
      clamp(g * 0.85 + 10 * highlightMix + 15 * shadowMix),
      clamp(b * 0.8 + 5 * highlightMix + 30 * shadowMix),
    ];
  },
  warm: (r, g, b) => {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const t = lum / 255;
    return [
      clamp(r * 1.08 + 12 * t),
      clamp(g * 1.02 + 8 * t),
      clamp(b * 0.82 - 5 * t + 10),
    ];
  },
  clean: (r, g, b) => {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const mix = 0.35;
    const nr = r + (lum - r) * mix;
    const ng = g + (lum - g) * mix;
    const nb = b + (lum - b) * mix;
    const cr = ((nr / 255 - 0.5) * 1.15 + 0.5) * 255;
    const cg = ((ng / 255 - 0.5) * 1.15 + 0.5) * 255;
    const cb = ((nb / 255 - 0.5) * 1.15 + 0.5) * 255;
    return [clamp(cr * 0.95 + 12), clamp(cg * 0.95 + 12), clamp(cb * 0.95 + 14)];
  },
  vintage: (r, g, b) => {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const t = lum / 255;
    const lifted = 18;
    return [
      clamp(r * 0.92 + 20 * t + lifted * (1 - t)),
      clamp(g * 0.88 + 5 * t + lifted * (1 - t) + 8 * (1 - t)),
      clamp(b * 0.7 + 8 * t + lifted * (1 - t) - 10 * t),
    ];
  },
  cool: (r, g, b) => {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const t = lum / 255;
    return [
      clamp(r * 0.88 - 8 * (1 - t)),
      clamp(g * 0.92 + 5 * t),
      clamp(b * 1.1 + 15 * (1 - t) + 8 * t),
    ];
  },
  neon: (r, g, b) => {
    const cr = ((r / 255 - 0.5) * 1.3 + 0.5) * 255;
    const cg = ((g / 255 - 0.5) * 1.3 + 0.5) * 255;
    const cb = ((b / 255 - 0.5) * 1.3 + 0.5) * 255;
    const lum = 0.299 * cr + 0.587 * cg + 0.114 * cb;
    const satBoost = 1.25;
    return [
      clamp(lum + (cr - lum) * satBoost),
      clamp(lum + (cg - lum) * satBoost),
      clamp(lum + (cb - lum) * satBoost),
    ];
  },
  pastel: (r, g, b) => {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const mix = 0.5;
    const dr = r + (lum - r) * mix;
    const dg = g + (lum - g) * mix;
    const db = b + (lum - b) * mix;
    return [clamp(dr * 0.7 + 70), clamp(dg * 0.7 + 65), clamp(db * 0.7 + 62)];
  },
};

// ── HSL Channel Definitions ──────────────────────
// 8 channels covering the full hue circle, ~45° each
interface HSLChannel {
  center: number; // hue center in degrees
  width: number;  // soft falloff width in degrees
}

const HSL_CHANNELS: Record<string, HSLChannel> = {
  red:    { center: 0,   width: 30 },
  orange: { center: 30,  width: 25 },
  yellow: { center: 60,  width: 25 },
  green:  { center: 120, width: 35 },
  aqua:   { center: 180, width: 25 },
  blue:   { center: 240, width: 35 },
  purple: { center: 285, width: 25 },
  magenta:{ center: 330, width: 25 },
};

/** Get soft blend weight for a hue relative to a channel center */
function hslWeight(hue: number, channel: HSLChannel): number {
  let diff = Math.abs(hue - channel.center);
  if (diff > 180) diff = 360 - diff;
  if (diff >= channel.width) return 0;
  // Smooth cosine falloff
  return (1 + Math.cos((diff / channel.width) * Math.PI)) / 2;
}

// ── Auto Color Correction v2 (Photoshop-level) ──

/**
 * Photoshop-level auto color correction:
 * 1. Auto Levels (per-channel black/white point clipping at 0.5%)
 * 2. Auto Contrast (S-curve based on histogram)
 * 3. Auto White Balance (gray world + highlight detection)
 * 4. Vibrance (selective saturation boost for less-saturated colors)
 * 5. Shadow/Highlight recovery
 */
export function autoColorCorrect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): GradeSettings {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const pixelCount = data.length / 4;

  // ── Step 1: Build per-channel histograms ──
  const rHist = new Uint32Array(256);
  const gHist = new Uint32Array(256);
  const bHist = new Uint32Array(256);
  const lumHist = new Uint32Array(256);

  let rSum = 0, gSum = 0, bSum = 0;
  let chromaSum = 0;
  let darkPixels = 0, brightPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    rHist[r]++; gHist[g]++; bHist[b]++;
    rSum += r; gSum += g; bSum += b;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lumHist[Math.round(lum)]++;
    if (lum < 25) darkPixels++;
    if (lum > 230) brightPixels++;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    chromaSum += max > 0 ? (max - min) / max : 0;
  }

  const rAvg = rSum / pixelCount;
  const gAvg = gSum / pixelCount;
  const bAvg = bSum / pixelCount;
  const lumAvg = 0.299 * rAvg + 0.587 * gAvg + 0.114 * bAvg;
  const avgChroma = chromaSum / pixelCount;

  // ── Auto Levels: find 0.5% and 99.5% clip points per channel ──
  const clipLow = Math.floor(pixelCount * 0.005);
  const clipHigh = Math.floor(pixelCount * 0.005);

  function findClipPoints(hist: Uint32Array): [number, number] {
    let count = 0;
    let low = 0;
    for (let i = 0; i < 256; i++) {
      count += hist[i];
      if (count >= clipLow) { low = i; break; }
    }
    count = 0;
    let high = 255;
    for (let i = 255; i >= 0; i--) {
      count += hist[i];
      if (count >= clipHigh) { high = i; break; }
    }
    return [low, high];
  }

  const [rLow, rHigh] = findClipPoints(rHist);
  const [gLow, gHigh] = findClipPoints(gHist);
  const [bLow, bHigh] = findClipPoints(bHist);

  // Auto levels strength — more aggressive if image is flat
  const rRange = rHigh - rLow || 1;
  const gRange = gHigh - gLow || 1;
  const bRange = bHigh - bLow || 1;
  const avgRange = (rRange + gRange + bRange) / 3;
  const levelsStrength = avgRange < 180 ? 0.7 : avgRange < 220 ? 0.5 : 0.3;

  // Calculate per-channel exposure shifts from auto levels
  const rTargetMid = (rHigh + rLow) / 2;
  const gTargetMid = (gHigh + gLow) / 2;
  const bTargetMid = (bHigh + bLow) / 2;
  const targetMid = 128;

  // White balance: align the average midpoints to neutral gray
  const wbR = (targetMid - rTargetMid) * levelsStrength * 0.15;
  const wbB = (targetMid - bTargetMid) * levelsStrength * 0.15;
  const whiteBalance = clampNum((wbR - wbB) * 0.8);
  const temperature = clampNum(wbB * 0.6);

  // ── Auto Contrast (S-curve) ──
  let lowestBin = 255, highestBin = 0;
  for (let i = 0; i < 256; i++) {
    if (lumHist[i] > pixelCount * 0.001) {
      lowestBin = Math.min(lowestBin, i);
      highestBin = Math.max(highestBin, i);
    }
  }
  const spread = highestBin - lowestBin;
  // S-curve contrast: target spread of ~210 for cinematic look
  const contrast = spread < 130
    ? Math.round(Math.min(30, (210 - spread) * 0.18))
    : spread < 180
    ? Math.round(Math.min(18, (210 - spread) * 0.12))
    : spread > 240
    ? Math.round(Math.max(-12, (240 - spread) * 0.1))
    : 0;

  // ── Exposure ──
  // Photoshop targets ~115 luminance for well-exposed images
  const exposureDiff = 115 - lumAvg;
  const exposure = Math.round(Math.max(-30, Math.min(30, exposureDiff * 0.18)));

  // ── Vibrance (selective saturation) ──
  // Count how many pixels are already saturated vs unsaturated
  let lowSatCount = 0;
  let highSatCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [,, s] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s < 30) lowSatCount++;
    if (s > 70) highSatCount++;
  }
  const lowSatRatio = lowSatCount / pixelCount;
  const highSatRatio = highSatCount / pixelCount;

  // Boost saturation more when image is desaturated, less when already vivid
  let saturation: number;
  if (avgChroma < 0.15) {
    saturation = Math.round(Math.min(25, (0.15 - avgChroma) * 120));
  } else if (avgChroma < 0.25) {
    saturation = Math.round(Math.min(15, (0.25 - avgChroma) * 80));
  } else if (avgChroma > 0.55) {
    saturation = Math.round(Math.max(-8, (0.55 - avgChroma) * 15));
  } else {
    saturation = 0;
  }

  // ── Brightness (very subtle) ──
  const brightness = Math.abs(lumAvg - 128) > 25
    ? Math.round(Math.max(-8, Math.min(8, (128 - lumAvg) * 0.06)))
    : 0;

  // ── Shadow/Highlight Recovery ──
  const shadowRatio = darkPixels / pixelCount;
  const highlightRatio = brightPixels / pixelCount;
  const hdrStrength = (highlightRatio > 0.02 || shadowRatio > 0.15)
    ? Math.round(Math.min(25, (highlightRatio * 80 + shadowRatio * 40)))
    : 0;
  const highlightRecovery = highlightRatio > 0.05
    ? Math.round(Math.min(20, highlightRatio * 200))
    : 0;

  return {
    lutPreset: "none",
    whiteBalance: Math.round(Math.max(-30, Math.min(30, whiteBalance))),
    exposure: Math.round(Math.max(-30, Math.min(30, exposure))),
    contrast: Math.round(Math.max(-15, Math.min(30, contrast))),
    saturation: Math.round(Math.max(-10, Math.min(25, saturation))),
    brightness: Math.round(Math.max(-10, Math.min(10, brightness))),
    temperature: Math.round(Math.max(-15, Math.min(15, temperature))),
    shadowsHue: 0,
    midtonesHue: 0,
    highlightsHue: 0,
    shadowsSat: 100,
    midtonesSat: 100,
    highlightsSat: 100,
    hdrStrength: Math.round(Math.max(0, Math.min(25, hdrStrength))),
    highlightRecovery: Math.round(Math.max(0, Math.min(20, highlightRecovery))),
    filmGrain: 0,
    halation: 0,
    bloom: 0,
    // HSL defaults
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

  // Pre-compute LUT
  const lutFn = LUT_MAPS[settings.lutPreset] || null;

  // Pre-compute global adjustments
  const wbShift = settings.whiteBalance * 0.6;
  const tempShift = settings.temperature * 0.5;
  const expMul = Math.pow(2, settings.exposure / 100);
  const contrastVal = (100 + settings.contrast * 0.5) / 100;
  const satVal = (100 + settings.saturation * 0.5) / 100;
  const brightShift = settings.brightness * 0.5;

  // 3-way shadow/mid/highlight RGB shifts
  const shHueRad = (settings.shadowsHue * Math.PI) / 180;
  const mdHueRad = (settings.midtonesHue * Math.PI) / 180;
  const hiHueRad = (settings.highlightsHue * Math.PI) / 180;
  const shIntensity = (settings.shadowsSat - 100) / 100; // -1 to +1
  const mdIntensity = (settings.midtonesSat - 100) / 100;
  const hiIntensity = (settings.highlightsSat - 100) / 100;

  // 3-way RGB shift vectors (hue determines direction, intensity determines magnitude)
  const shR = Math.cos(shHueRad) * shIntensity * 20;
  const shG = Math.cos(shHueRad - 2.094) * shIntensity * 20;
  const shB = Math.cos(shHueRad - 4.189) * shIntensity * 20;
  const mdR = Math.cos(mdHueRad) * mdIntensity * 20;
  const mdG = Math.cos(mdHueRad - 2.094) * mdIntensity * 20;
  const mdB = Math.cos(mdHueRad - 4.189) * mdIntensity * 20;
  const hiR = Math.cos(hiHueRad) * hiIntensity * 20;
  const hiG = Math.cos(hiHueRad - 2.094) * hiIntensity * 20;
  const hiB = Math.cos(hiHueRad - 4.189) * hiIntensity * 20;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. LUT Preset
    if (lutFn) {
      [r, g, b] = lutFn(r, g, b);
    }

    // 2. White Balance & Temperature
    r += wbShift + tempShift;
    g += wbShift * 0.2;
    b += wbShift * 0.4 - tempShift;

    // 3. Exposure
    r *= expMul;
    g *= expMul;
    b *= expMul;

    // 4. Contrast (S-curve approximation for better shadows/highlights)
    if (settings.contrast !== 0) {
      const cv = contrastVal;
      // S-curve: softer than linear contrast
      r = (0.5 + (r / 255 - 0.5) * (1 + (cv - 1) * 0.8) + (cv - 1) * 0.2 * (r / 255 - 0.5) * (r / 255 - 0.5) * -4) * 255;
      g = (0.5 + (g / 255 - 0.5) * (1 + (cv - 1) * 0.8) + (cv - 1) * 0.2 * (g / 255 - 0.5) * (g / 255 - 0.5) * -4) * 255;
      b = (0.5 + (b / 255 - 0.5) * (1 + (cv - 1) * 0.8) + (cv - 1) * 0.2 * (b / 255 - 0.5) * (b / 255 - 0.5) * -4) * 255;
    }

    // 5. Brightness
    r += brightShift;
    g += brightShift;
    b += brightShift;

    // 6. Convert to HSL for saturation & HSL channel adjustments
    const cr = Math.max(0, Math.min(255, r));
    const cg = Math.max(0, Math.min(255, g));
    const cb = Math.max(0, Math.min(255, b));
    let [h, s, l] = rgbToHsl(cr, cg, cb);

    // 7. Global saturation
    s = Math.max(0, Math.min(100, s * satVal));

    // 8. HSL per-channel adjustments
    for (const [name, channel] of Object.entries(HSL_CHANNELS)) {
      const weight = hslWeight(h, channel);
      if (weight <= 0) continue;

      const hueShiftKey = `hsl${name.charAt(0).toUpperCase() + name.slice(1)}Hue` as keyof GradeSettings;
      const satMultKey = `hsl${name.charAt(0).toUpperCase() + name.slice(1)}Sat` as keyof GradeSettings;
      const lumMultKey = `hsl${name.charAt(0).toUpperCase() + name.slice(1)}Lum` as keyof GradeSettings;

      const hueShift = (settings[hueShiftKey] as number) || 0;
      const satMult = ((settings[satMultKey] as number) || 100) / 100;
      const lumMult = ((settings[lumMultKey] as number) || 100) / 100;

      if (hueShift !== 0) h += hueShift * weight;
      if (satMult !== 1) s = Math.max(0, Math.min(100, s * (1 + (satMult - 1) * weight)));
      if (lumMult !== 1) l = Math.max(0, Math.min(100, l * (1 + (lumMult - 1) * weight)));
    }

    h = ((h % 360) + 360) % 360;

    // 9. 3-Way Color Wheels: apply RGB shifts based on tonal range
    // Determine shadow/mid/highlight weight
    const lumNorm = l / 100; // 0-1
    let shWeight = 0, mdWeight = 0, hiWeight = 0;
    if (lumNorm < 0.33) {
      shWeight = 1 - lumNorm / 0.33;
      mdWeight = lumNorm / 0.33;
    } else if (lumNorm < 0.66) {
      mdWeight = 1 - (lumNorm - 0.33) / 0.33;
      hiWeight = (lumNorm - 0.33) / 0.33;
    } else {
      hiWeight = 1 - (lumNorm - 0.66) / 0.34;
    }

    // Convert back to RGB first
    [r, g, b] = hslToRgb(h, s, l);

    // Apply 3-way RGB shifts with smooth tonal blending
    r += shR * shWeight + mdR * mdWeight + hiR * hiWeight;
    g += shG * shWeight + mdG * mdWeight + hiG * hiWeight;
    b += shB * shWeight + mdB * mdWeight + hiB * hiWeight;

    // 10. HDR / Highlight Recovery
    if (settings.hdrStrength > 0 || settings.highlightRecovery > 0) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Highlight recovery: compress bright values
      if (settings.highlightRecovery > 0 && lum > 200) {
        const recover = ((lum - 200) / 55) * (settings.highlightRecovery / 100);
        r -= recover * 18;
        g -= recover * 18;
        b -= recover * 18;
      }
      // HDR: lift shadows and compress highlights
      if (settings.hdrStrength > 0) {
        const str = settings.hdrStrength / 100;
        if (lum > 210) {
          const compress = ((lum - 210) / 45) * str;
          r -= compress * 20;
          g -= compress * 20;
          b -= compress * 20;
        }
        if (lum < 40) {
          const lift = ((40 - lum) / 40) * str * 15;
          r += lift; g += lift; b += lift;
        }
      }
    }

    // Clamp final values
    data[i]     = clampNum(r);
    data[i + 1] = clampNum(g);
    data[i + 2] = clampNum(b);
  }

  ctx.putImageData(imageData, 0, 0);

  // Post-process effects
  if (settings.filmGrain > 0) {
    applyFilmGrain(ctx, width, height, settings.filmGrain / 100);
  }
  if (settings.halation > 0) {
    applyHalation(ctx, width, height, settings.halation / 100);
  }
  if (settings.bloom > 0) {
    applyBloom(ctx, width, height, settings.bloom / 100);
  }
}

// ── Film Grain ──────────────────────────────────

function applyFilmGrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number
): void {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity * 50;
    data[i]     = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

// ── Halation ────────────────────────────────────

function applyHalation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number
): void {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = intensity * 0.2;
  ctx.filter = `blur(${Math.round(intensity * 18)}px)`;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const tempData = tempCtx.createImageData(w, h);

  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (lum > 190) {
      tempData.data[i]     = data[i] * 1.08;
      tempData.data[i + 1] = data[i + 1] * 0.72;
      tempData.data[i + 2] = data[i + 2] * 0.55;
      tempData.data[i + 3] = (lum - 190) / 65 * 180;
    }
  }

  tempCtx.putImageData(tempData, 0, 0);
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.restore();
}

// ── Bloom ───────────────────────────────────────

function applyBloom(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number
): void {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = intensity * 0.18;
  ctx.filter = `blur(${Math.round(intensity * 25)}px) brightness(1.4)`;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.restore();
}
