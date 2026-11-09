//! EffectCraft pixel kernel — Rust compiled to wasm32-unknown-unknown.
//!
//! A 1:1 mirror of `lib/grade/engine.ts :: gradePass`:
//!   base curve LUT (exposure → contrast → brightness)
//!   → temperature/tint per-channel LUTs
//!   → global saturation: fast luma path OR full HSL path
//!     (8 Gaussian colour bands + 3-way lift/gamma/gain + HDR + recovery)
//!   → vignette → deterministic luma grain.
//!
//! Conventions kept identical to the JS engine on purpose:
//!   • f64 arithmetic in the exact JS order of operations,
//!   • `Math.round` == floor(x + 0.5) (negative halves round toward +∞),
//!   • Uint8ClampedArray write == clamp → round half-to-even,
//!   • Rust `f64::exp / sin / powf` ≙ `Math.exp / sin / pow` (±1 ulp; the
//!     8-bit output only sees a difference on astronomically rare ties).
//!
//! ABI — plain exports over linear memory, no wasm-bindgen:
//!   export "memory"     : the linear heap
//!   export "ec_alloc"   : (bytes: i32) -> ptr (16-byte aligned)
//!   export "ec_dealloc" : (ptr: i32, bytes: i32) -> void
//!   export "ec_grade"   : (src, dst, w, h, params, seed) -> i32 status
//!     src/dst : RGBA8888, len = w*h*4
//!     params  : 43 × f64 — layout defined in lib/grade/kernel.ts
//!     seed    : f64 grain seed (deterministic per image + random)
//!
//! `.cube` LUT sampling intentionally stays on the JS path (dynamic size,
//! host-managed data). Halation/bloom composites stay JS too (canvas ops).

use std::alloc::{alloc, dealloc, Layout};

mod upscale;

const PARAM_COUNT: usize = 43;

/* ── index constants for the flat params array (see lib/grade/kernel.ts) ── */
const P_USE_HSL: usize = 0;
const P_HSL_ACTIVE: usize = 1;
const P_THREE_ACTIVE: usize = 2;
const P_SAT_FACTOR: usize = 3;
const P_VIGN_K: usize = 4;
const P_GRAIN_K: usize = 5;
const P_HDR_K: usize = 6;
const P_REC_K: usize = 7;
const P_LIFT_H: usize = 8;
const P_GAMMA_H: usize = 9;
const P_GAIN_H: usize = 10;
const P_LIFT_S: usize = 11;
const P_GAMMA_S: usize = 12;
const P_GAIN_S: usize = 13;
const P_EXPOSURE: usize = 14;
const P_CONTRAST: usize = 15;
const P_BRIGHTNESS: usize = 16;
const P_TEMPERATURE: usize = 17;
const P_TINT: usize = 18;
const P_BANDS: usize = 19; // 24 values: band_h[8], band_s[8], band_l[8]

#[inline]
fn clamp(v: f64, lo: f64, hi: f64) -> f64 {
    if v < lo {
        lo
    } else if v > hi {
        hi
    } else {
        v
    }
}

/// JS `Math.round(x)` — spec: floor(x + 0.5), so -0.5 rounds toward +∞.
#[inline]
fn js_round(v: f64) -> i32 {
    (v + 0.5).floor() as i32
}

/// JS `dst[i] = v` into a Uint8ClampedArray: clamp first, then round
/// half-to-even (ToUint8Clamp).
#[inline]
fn to_u8(v: f64) -> u8 {
    if v != v {
        return 0; // NaN → 0
    }
    let c = clamp(v, 0.0, 255.0);
    let f = c.floor();
    let r = f as i64;
    let frac = c - f;
    let r = if frac > 0.5 {
        r + 1
    } else if frac == 0.5 && r % 2 != 0 {
        r + 1
    } else {
        r
    };
    r as u8
}

#[inline]
fn hue_distance(a: f64, b: f64) -> f64 {
    let d = (a - b).abs() % 360.0;
    if d > 180.0 {
        360.0 - d
    } else {
        d
    }
}

#[inline]
fn smoothstep(e0: f64, e1: f64, x: f64) -> f64 {
    let t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

/// hsl → rgb, out in 0..255 floats — identical shape to the JS engine's.
#[inline]
fn hsl_to_rgb(h: f64, s: f64, l: f64, out: &mut [f64; 3]) {
    if s <= 0.0 {
        let v = l * 255.0;
        out[0] = v;
        out[1] = v;
        out[2] = v;
        return;
    }
    let hh = (((h % 360.0) + 360.0) % 360.0) / 60.0;
    let c = (1.0 - (2.0 * l - 1.0).abs()) * s;
    let x = c * (1.0 - (hh % 2.0 - 1.0).abs());
    let (mut r, mut g, mut b) = (0.0f64, 0.0f64, 0.0f64);
    if hh < 1.0 {
        r = c;
        g = x;
    } else if hh < 2.0 {
        r = x;
        g = c;
    } else if hh < 3.0 {
        g = c;
        b = x;
    } else if hh < 4.0 {
        g = x;
        b = c;
    } else if hh < 5.0 {
        r = x;
        b = c;
    } else {
        r = c;
        b = x;
    }
    let m = l - c / 2.0;
    out[0] = (r + m) * 255.0;
    out[1] = (g + m) * 255.0;
    out[2] = (b + m) * 255.0;
}

#[no_mangle]
pub extern "C" fn ec_alloc(bytes: i32) -> i32 {
    if bytes <= 0 {
        return 0;
    }
    // overshoot so the align-up math can never wrap
    let layout = Layout::from_size_align(bytes as usize + 16, 16).expect("bad layout");
    match unsafe { alloc(layout) } as i32 {
        0 => 0,
        ptr => ptr,
    }
}

#[no_mangle]
pub extern "C" fn ec_dealloc(ptr: i32, bytes: i32) {
    if ptr == 0 || bytes <= 0 {
        return;
    }
    // matching overshoot allocation
    let layout = Layout::from_size_align(bytes as usize + 16, 16).expect("bad layout");
    unsafe {
        dealloc(ptr as *mut u8, layout);
    }
}

#[no_mangle]
pub extern "C" fn ec_grade(
    src: *const u8,
    dst: *mut u8,
    w: i32,
    h: i32,
    params: *const f64,
    seed: f64,
) -> i32 {
    if src.is_null() || dst.is_null() || params.is_null() || w <= 0 || h <= 0 {
        return 1;
    }
    let w = w as usize;
    let h = h as usize;
    let n = w * h * 4;
    let src = unsafe { std::slice::from_raw_parts(src, n) };
    let dst = unsafe { std::slice::from_raw_parts_mut(dst, n) };
    let p = unsafe { std::slice::from_raw_parts(params, PARAM_COUNT) };

    /* ── unpack (mirrors the precomputed constants in engine.ts) ── */
    let use_hsl = p[P_USE_HSL] >= 0.5;
    let hsl_active = p[P_HSL_ACTIVE] >= 0.5;
    let three_active = p[P_THREE_ACTIVE] >= 0.5;
    let sat_factor = p[P_SAT_FACTOR];
    let vign_k = p[P_VIGN_K];
    let grain_k = p[P_GRAIN_K];
    let hdr_k = p[P_HDR_K];
    let rec_k = p[P_REC_K];
    let lift_h = p[P_LIFT_H];
    let gamma_h = p[P_GAMMA_H];
    let gain_h = p[P_GAIN_H];
    let lift_s = p[P_LIFT_S];
    let gamma_s = p[P_GAMMA_S];
    let gain_s = p[P_GAIN_S];

    /* 1) Base curve LUT: exposure → contrast → brightness */
    let exp_mult = f64::powf(2.0, (p[P_EXPOSURE] / 100.0) * 2.0);
    let contrast_k = (p[P_CONTRAST] / 100.0) * 0.9;
    let bright_off = (p[P_BRIGHTNESS] / 100.0) * 48.0;
    let mut base = [0i32; 256];
    for li in 0..256usize {
        let mut x = (li as f64 / 255.0) * exp_mult;
        x = (x - 0.5) * (1.0 + contrast_k) + 0.5;
        x += bright_off / 255.0;
        base[li] = clamp(js_round(x * 255.0) as f64, 0.0, 255.0) as i32;
    }

    /* 2) Temperature/tint LUTs (additive, per channel) */
    let temp_r = js_round((p[P_TEMPERATURE] / 100.0) * 26.0) as i32;
    let temp_b = js_round((-p[P_TEMPERATURE] / 100.0) * 26.0) as i32;
    let tint_g = js_round((-p[P_TINT] / 100.0) * 18.0) as i32;
    let mut lut_r = [0i16; 256];
    let mut lut_g = [0i16; 256];
    let mut lut_b = [0i16; 256];
    for i in 0..256usize {
        lut_r[i] = clamp((base[i] + temp_r) as f64, 0.0, 255.0) as i16;
        lut_g[i] = clamp((base[i] + tint_g) as f64, 0.0, 255.0) as i16;
        lut_b[i] = clamp((base[i] + temp_b) as f64, 0.0, 255.0) as i16;
    }

    /* HSL band constants */
    const BAND_CENTERS: [f64; 8] = [0.0, 32.0, 60.0, 115.0, 175.0, 220.0, 275.0, 320.0];
    let mut band_h = [0f64; 8];
    let mut band_s = [0f64; 8];
    let mut band_l = [0f64; 8];
    for bi in 0..8 {
        band_h[bi] = p[P_BANDS + bi];
        band_s[bi] = p[P_BANDS + 8 + bi];
        band_l[bi] = p[P_BANDS + 16 + bi];
    }
    let inv2sig2 = 1.0 / (2.0 * 34.0 * 34.0);

    let vign_cx = w as f64 * 0.5;
    let vign_cy = h as f64 * 0.5;
    let vign_max = (vign_cx * vign_cx + vign_cy * vign_cy).sqrt();

    let seed_term = seed * 37.719;
    let mut out = [0f64; 3];
    let mut idx = 0usize;
    for y in 0..h {
        let dy_v = y as f64 * 78.233;
        let dy_norm = (y as f64 - vign_cy) / vign_max;
        for x in 0..w {
            let mut r = lut_r[src[idx] as usize] as f64;
            let mut g = lut_g[src[idx + 1] as usize] as f64;
            let mut b = lut_b[src[idx + 2] as usize] as f64;

            let yy = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0;

            if use_hsl {
                // rgb → hsl
                let rn = r / 255.0;
                let gn = g / 255.0;
                let bn = b / 255.0;
                let max = if rn >= gn && rn >= bn {
                    rn
                } else if gn >= bn {
                    gn
                } else {
                    bn
                };
                let min = if rn <= gn && rn <= bn {
                    rn
                } else if gn <= bn {
                    gn
                } else {
                    bn
                };
                let l0 = (max + min) / 2.0;
                let mut hue = 0.0f64;
                let mut sat = 0.0f64;
                if max != min {
                    let d = max - min;
                    sat = if l0 > 0.5 {
                        d / (2.0 - max - min)
                    } else {
                        d / (max + min)
                    };
                    if max == rn {
                        hue = ((gn - bn) / d + if gn < bn { 6.0 } else { 0.0 }) * 60.0;
                    } else if max == gn {
                        hue = ((bn - rn) / d + 2.0) * 60.0;
                    } else {
                        hue = ((rn - gn) / d + 4.0) * 60.0;
                    }
                }
                let mut hh = hue;
                let mut ss = sat * sat_factor;
                let mut ll = l0;

                if hsl_active {
                    let mut acc_h = 0.0f64;
                    let mut acc_s = 0.0f64;
                    let mut acc_l = 0.0f64;
                    for bi in 0..8 {
                        let hx = hue_distance(hue, BAND_CENTERS[bi]);
                        let w8 = (-(hx * hx) * inv2sig2).exp();
                        if w8 < 0.05 {
                            continue;
                        }
                        acc_h += band_h[bi] * w8;
                        acc_s += band_s[bi] * w8;
                        acc_l += band_l[bi] * w8;
                    }
                    hh += acc_h;
                    ss = clamp(ss * (1.0 + acc_s), 0.0, 1.0);
                    ll = clamp(ll * (1.0 + acc_l), 0.0, 1.0);
                }
                if three_active {
                    let wsh = 1.0 - smoothstep(0.0, 0.55, yy);
                    let whi = smoothstep(0.45, 1.0, yy);
                    let wmid = (1.0 - wsh - whi).max(0.0);
                    hh += lift_h * wsh + gamma_h * wmid + gain_h * whi;
                    ss = clamp(
                        ss * (1.0 + lift_s * wsh + gamma_s * wmid + gain_s * whi),
                        0.0,
                        1.0,
                    );
                }
                if hdr_k > 0.0 {
                    // punchy mid contrast with graceful top/bottom
                    let sc = 0.5 + (ll - 0.5) * (1.0 + hdr_k * 0.42);
                    ll = clamp(sc + hdr_k * 0.05 * (1.0 - ll), 0.0, 1.0);
                }
                if rec_k > 0.0 {
                    let top = 0.8;
                    if ll > top {
                        ll = top + (ll - top) * (1.0 - rec_k * 0.5);
                        ss *= 1.0 - rec_k * 0.12;
                    }
                }
                hsl_to_rgb(hh, ss, ll, &mut out);
                r = out[0];
                g = out[1];
                b = out[2];
            } else if sat_factor != 1.0 {
                // Fast path: saturation only
                let y255 = yy * 255.0;
                r = y255 + (r - y255) * sat_factor;
                g = y255 + (g - y255) * sat_factor;
                b = y255 + (b - y255) * sat_factor;
            }

            // Vignette
            if vign_k > 0.0 {
                let dx = (x as f64 - vign_cx) / vign_max;
                let d2 = (dx * dx + dy_norm * dy_norm) * 2.0;
                let mul = 1.0 - vign_k * d2 * d2;
                r *= mul;
                g *= mul;
                b *= mul;
            }

            // Luma grain (deterministic)
            if grain_k > 0.0 {
                let arg = (x as f64 * 12.9898 + dy_v) + seed_term;
                let n = (arg.sin() * 43758.5453) % 1.0;
                let nz = (if n < 0.0 { n + 1.0 } else { n }) - 0.5;
                let g_noise = nz * grain_k * 2.0;
                r += g_noise;
                g += g_noise;
                b += g_noise;
            }

            dst[idx] = to_u8(r);
            dst[idx + 1] = to_u8(g);
            dst[idx + 2] = to_u8(b);
            dst[idx + 3] = src[idx + 3];
            idx += 4;
        }
    }
    0
}
