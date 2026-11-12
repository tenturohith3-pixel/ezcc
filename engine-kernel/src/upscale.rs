//! EffectCraft Detail Engine — high-fidelity upscaler, Rust → wasm32.
//!
//! Pipeline (all in linear light, which is what separates a real detail
//! engine from a browser `drawImage` stretch):
//!   1. optional denoise: 3×3 box blend in-place, amount-weighted
//!   2. separable Lanczos3 (a = 3) upscale, weights normalized per axis
//!   3. anti-ringing clamp: each result is bounded by its 2×2 nearest
//!      source neighbourhood (kills halos around edges)
//!   4. optional edge-aware unsharp (3×3 gaussian-ish blur) for micro-contrast
//!   5. linear → sRGB through a 4096-entry LUT, banded output
//!
//! Memory discipline: the source image lives once in linear-memory (RGBA8),
//! horizontal resample rows are cached in a 6-slot ring (Lanczos support),
//! and the caller receives the output in horizontal BANDS — so a 24 MP
//! upscale never needs a 4× destination buffer inside wasm.
//!
//! ABI (plane exports, no wasm-bindgen):
//!   ec_up_begin(srcPtr, srcW, srcH, dstW, dstH, detail, denoise) -> status
//!   ec_up_band(dstPtr, y0, bandH) -> status
//!   ec_up_end() -> status

use std::f64::consts::PI;

const TAPS: usize = 6; // Lanczos3 window: floor(c)-2 ..= floor(c)+3
const A: f64 = 3.0;
const BAND_MAX: usize = 2048;
const SRGB_LUT_N: usize = 4096;

struct Up {
    src_ptr: i32,
    src_w: usize,
    src_h: usize,
    dst_w: usize,
    dst_h: usize,
    detail: f64,
    denoise: f64,
    lin: [f64; 256],
    out_lut: [u8; SRGB_LUT_N],
    /* precomputed horizontal geometry */
    xt: Vec<i32>,        // dst_w * TAPS clamped source indices
    xw: Vec<f64>,        // dst_w * TAPS normalized weights
    near_x: Vec<usize>,  // dst_w nearest source columns
    /* horizontal row cache: 6 slots × dst_w × 3 */
    hcache: Vec<f32>,
    hrow: [i32; TAPS],
    /* output raw linear ring: 3 rows × dst_w × 3 */
    ring: Vec<f32>,
    ring_y: [i32; 3],
    scratch: Vec<f32>,   // one dst_w*3 row
    blur: Vec<f32>,      // one dst_w*3 row of vertically-blurred values
}

static mut UP: Option<Up> = None;

#[inline]
fn lanczos(x: f64) -> f64 {
    let ax = x.abs();
    if ax < 1e-9 {
        return 1.0;
    }
    if ax >= A {
        return 0.0;
    }
    let pix = PI * ax;
    (pix.sin() / pix) * ((pix / A).sin() / (pix / A))
}

#[inline]
fn to_linear(c: u8, lin: &[f64; 256]) -> f64 {
    lin[c as usize]
}

fn build_lin_lut() -> [f64; 256] {
    let mut t = [0.0f64; 256];
    for (i, slot) in t.iter_mut().enumerate() {
        let c = i as f64 / 255.0;
        *slot = if c <= 0.04045 {
            c / 12.92
        } else {
            ((c + 0.055) / 1.055).powf(2.4)
        };
    }
    t
}

fn build_out_lut() -> [u8; SRGB_LUT_N] {
    let mut t = [0u8; SRGB_LUT_N];
    for (i, slot) in t.iter_mut().enumerate() {
        let l = i as f64 / (SRGB_LUT_N - 1) as f64;
        let s = if l <= 0.0031308 {
            l * 12.92
        } else {
            1.055 * l.powf(1.0 / 2.4) - 0.055
        };
        *slot = (s.clamp(0.0, 1.0) * 255.0 + 0.5).floor() as u8;
    }
    t
}

#[inline]
fn out_srgb(v: f64, lut: &[u8; SRGB_LUT_N]) -> u8 {
    let idx = (v.clamp(0.0, 1.0) * (SRGB_LUT_N - 1) as f64 + 0.5) as usize;
    lut[idx.min(SRGB_LUT_N - 1)]
}

impl Up {
    fn src(&self) -> &'static [u8] {
        unsafe {
            std::slice::from_raw_parts(
                self.src_ptr as *const u8,
                self.src_w * self.src_h * 4,
            )
        }
    }

    fn denoise_in_place(&mut self, amount: f64) {
        if amount <= 0.0 {
            return;
        }
        let k = amount.clamp(0.0, 1.0) * 0.85;
        let w = self.src_w;
        let h = self.src_h;
        let stride = w * 4;
        // keep an untouched copy while we write into the working buffer
        let orig = self.src().to_vec();
        let src = unsafe {
            std::slice::from_raw_parts_mut(
                self.src_ptr as *mut u8,
                w * h * 4,
            )
        };
        for y in 0..h {
            for x in 0..w {
                let y0 = y.saturating_sub(1);
                let y1 = (y + 1).min(h - 1);
                let x0 = x.saturating_sub(1);
                let x1 = (x + 1).min(w - 1);
                for c in 0..3 {
                    let mut sum = 0.0f64;
                    for yy in y0..=y1 {
                        for xx in x0..=x1 {
                            sum += orig[yy * stride + xx * 4 + c] as f64;
                        }
                    }
                    let avg = sum / 9.0;
                    let here = orig[y * stride + x * 4 + c] as f64;
                    src[y * stride + x * 4 + c] = (here * (1.0 - k) + avg * k + 0.5)
                        .floor()
                        .clamp(0.0, 255.0) as u8;
                }
            }
        }
    }

    fn build_horizontal(&mut self) {
        let scale = self.dst_w as f64 / self.src_w as f64;
        self.xt.clear();
        self.xw.clear();
        self.near_x.clear();
        for o in 0..self.dst_w {
            let center = (o as f64 + 0.5) / scale - 0.5;
            let base = center.floor() as i32;
            let mut sum = 0.0f64;
            let mut ws = [0.0f64; TAPS];
            let mut is = [0i32; TAPS];
            for j in 0..TAPS {
                let i = base - 2 + j as i32;
                let wv = lanczos(center - i as f64);
                ws[j] = wv;
                is[j] = i.clamp(0, self.src_w as i32 - 1);
                sum += wv;
            }
            if sum.abs() > 1e-12 {
                for j in 0..TAPS {
                    ws[j] /= sum;
                }
            }
            for j in 0..TAPS {
                self.xt.push(is[j]);
                self.xw.push(ws[j]);
            }
            let nx = ((o as f64 + 0.5) / scale).floor() as usize;
            self.near_x.push(nx.min(self.src_w - 1));
        }
    }

    fn compute_hrow(&mut self, si: usize) {
        let slot = si % TAPS;
        let stride = self.dst_w * 3;
        let src = self.src();
        let lin = &self.lin;
        let xt = &self.xt;
        let xw = &self.xw;
        let out = &mut self.hcache[slot * stride..(slot + 1) * stride];
        for o in 0..self.dst_w {
            let (mut r, mut g, mut b) = (0.0f64, 0.0f64, 0.0f64);
            for j in 0..TAPS {
                let sx = xt[o * TAPS + j] as usize;
                let w = xw[o * TAPS + j];
                let base = (si * self.src_w + sx) * 4;
                r += to_linear(src[base], lin) * w;
                g += to_linear(src[base + 1], lin) * w;
                b += to_linear(src[base + 2], lin) * w;
            }
            out[o * 3] = r as f32;
            out[o * 3 + 1] = g as f32;
            out[o * 3 + 2] = b as f32;
        }
        self.hrow[slot] = si as i32;
    }

    fn ensure_hrow(&mut self, si: usize) -> usize {
        let slot = si % TAPS;
        if self.hrow[slot] != si as i32 {
            self.compute_hrow(si);
        }
        slot
    }

    fn compute_raw_row(&mut self, y: usize) {
        let scale = self.dst_h as f64 / self.src_h as f64;
        let center = (y as f64 + 0.5) / scale - 0.5;
        let base = center.floor() as i32;

        let mut is = [0usize; TAPS];
        let mut ws = [0.0f64; TAPS];
        let mut sum = 0.0f64;
        for j in 0..TAPS {
            let si = (base - 2 + j as i32).clamp(0, self.src_h as i32 - 1) as usize;
            is[j] = si;
            let wv = lanczos(center - (base - 2 + j as i32) as f64);
            ws[j] = wv;
            sum += wv;
        }
        if sum.abs() > 1e-12 {
            for j in 0..TAPS {
                ws[j] /= sum;
            }
        }
        for j in 0..TAPS {
            self.ensure_hrow(is[j]);
        }

        let stride = self.dst_w * 3;
        let slots: [usize; TAPS] = [is[0] % TAPS, is[1] % TAPS, is[2] % TAPS, is[3] % TAPS, is[4] % TAPS, is[5] % TAPS];

        let src = self.src();
        let lin = &self.lin;
        let near_x = &self.near_x;
        let hcache = &self.hcache;
        let scratch = &mut self.scratch;
        let ny = (((y as f64 + 0.5) / scale).floor() as usize).min(self.src_h - 1);
        let ny1 = (ny + 1).min(self.src_h - 1);

        for o in 0..self.dst_w {
            let mut v = [0.0f64; 3];
            for j in 0..TAPS {
                let off = slots[j] * stride + o * 3;
                v[0] += hcache[off] as f64 * ws[j];
                v[1] += hcache[off + 1] as f64 * ws[j];
                v[2] += hcache[off + 2] as f64 * ws[j];
            }

            /* anti-ringing: bound by the nearest source 2×2 in linear */
            let nx = near_x[o];
            let nx1 = (nx + 1).min(self.src_w - 1);
            let p00 = (ny * self.src_w + nx) * 4;
            let p10 = (ny * self.src_w + nx1) * 4;
            let p01 = (ny1 * self.src_w + nx) * 4;
            let p11 = (ny1 * self.src_w + nx1) * 4;
            for c in 0..3 {
                let a = to_linear(src[p00 + c], lin);
                let b = to_linear(src[p10 + c], lin);
                let d = to_linear(src[p01 + c], lin);
                let e = to_linear(src[p11 + c], lin);
                let lo = a.min(b).min(d).min(e);
                let hi = a.max(b).max(d).max(e);
                v[c] = v[c].clamp(lo, hi);
            }

            scratch[o * 3] = v[0] as f32;
            scratch[o * 3 + 1] = v[1] as f32;
            scratch[o * 3 + 2] = v[2] as f32;
        }

        let slot = y % 3;
        let dst = &mut self.ring[slot * stride..(slot + 1) * stride];
        dst.copy_from_slice(scratch);
        self.ring_y[slot] = y as i32;
    }

    fn ensure_raw_row(&mut self, y: usize) {
        if self.ring_y[y % 3] != y as i32 {
            self.compute_raw_row(y);
        }
    }

    fn emit_row(&mut self, ey: usize, dst: &mut [u8], band_y0: usize) {
        let stride = self.dst_w * 3;
        let clamp_y = |ry: i32| -> usize {
            (ry.clamp(0, self.dst_h as i32 - 1) as usize) % 3
        };
        let r0 = clamp_y(ey as i32 - 1);
        let r1 = clamp_y(ey as i32);
        let r2 = clamp_y(ey as i32 + 1);
        let k = (self.detail / 100.0) * 2.2;

        /* vertical blur into self.blur */
        {
            let ring = &self.ring;
            let blur = &mut self.blur;
            for o in 0..self.dst_w {
                for c in 0..3 {
                    let a = ring[r0 * stride + o * 3 + c] as f64;
                    let b = ring[r1 * stride + o * 3 + c] as f64;
                    let d = ring[r2 * stride + o * 3 + c] as f64;
                    blur[o * 3 + c] = ((a + 2.0 * b + d) * 0.25) as f32;
                }
            }
        }

        let src = self.src();
        let out_lut = &self.out_lut;
        let near_x = &self.near_x;
        let ring = &self.ring;
        let blur = &self.blur;
        let ny = (((ey as f64 + 0.5) / (self.dst_h as f64 / self.src_h as f64)).floor()
            as usize)
            .min(self.src_h - 1);
        let row_off = (ey - band_y0) * self.dst_w * 4;

        for o in 0..self.dst_w {
            let xl = ((o as i32 - 1).clamp(0, self.dst_w as i32 - 1) as usize) * 3;
            let xc = o * 3;
            let xr = ((o as i32 + 1).clamp(0, self.dst_w as i32 - 1) as usize) * 3;
            for c in 0..3 {
                let raw = ring[r1 * stride + xc + c] as f64;
                let hb = ((blur[xl + c] as f64
                    + 2.0 * blur[xc + c] as f64
                    + blur[xr + c] as f64)
                    * 0.25) as f64;
                let mut v = raw + (raw - hb) * k;

                /* Halo guard — keep the sharpened pixel inside the local
                   3×3 range plus a small margin. Strong micro-contrast
                   without white/black fringes on hard edges. */
                let mut lo = f64::MAX;
                let mut hi = f64::MIN;
                for rr in [r0, r1, r2] {
                    for cc in [xl, xc, xr] {
                        let n = ring[rr * stride + cc + c] as f64;
                        if n < lo {
                            lo = n;
                        }
                        if n > hi {
                            hi = n;
                        }
                    }
                }
                let margin = 0.045;
                v = v.clamp(lo - margin, hi + margin);

                let px = row_off + o * 4 + c;
                dst[px] = out_srgb(v, out_lut);
            }
            let nx = near_x[o];
            dst[row_off + o * 4 + 3] = src[(ny * self.src_w + nx) * 4 + 3];
        }
    }
}

/* wasm32 is single-threaded by contract; the kernel owns this static across
   ec_up_begin → ec_up_band* → ec_up_end calls. */
#[allow(static_mut_refs)]
fn state() -> Option<&'static mut Up> {
    unsafe { UP.as_mut() }
}

#[no_mangle]
pub extern "C" fn ec_up_begin(
    src_ptr: i32,
    src_w: i32,
    src_h: i32,
    dst_w: i32,
    dst_h: i32,
    detail: f64,
    denoise: f64,
) -> i32 {
    if src_ptr == 0 || src_w <= 0 || src_h <= 0 || dst_w <= 0 || dst_h <= 0 {
        return 1;
    }
    let (sw, sh, dw, dh) = (src_w as usize, src_h as usize, dst_w as usize, dst_h as usize);
    /* overflow / sanity guards (TS enforces product caps too) */
    if sw.checked_mul(sh).is_none() || dw.checked_mul(dh).is_none() {
        return 2;
    }
    if dw > 16_384 || dh > 16_384 || dw * dh > 64_000_000 {
        return 3;
    }

    unsafe { UP = None; } // drop the previous job (frees cache)

    let stride = dw * 3;
    let mut up = Up {
        src_ptr,
        src_w: sw,
        src_h: sh,
        dst_w: dw,
        dst_h: dh,
        detail: detail.clamp(0.0, 100.0),
        denoise: denoise.clamp(0.0, 100.0) / 100.0,
        lin: build_lin_lut(),
        out_lut: build_out_lut(),
        xt: Vec::with_capacity(dw * TAPS),
        xw: Vec::with_capacity(dw * TAPS),
        near_x: Vec::with_capacity(dw),
        hcache: vec![0.0f32; TAPS * stride],
        hrow: [-1; TAPS],
        ring: vec![0.0f32; 3 * stride],
        ring_y: [-1; 3],
        scratch: vec![0.0f32; stride],
        blur: vec![0.0f32; stride],
    };
    up.build_horizontal();
    up.denoise_in_place(up.denoise);
    unsafe { UP = Some(up); }
    0
}

#[no_mangle]
pub extern "C" fn ec_up_band(dst_ptr: i32, y0: i32, band_h: i32) -> i32 {
    let up = match state() {
        Some(u) => u,
        None => return 1,
    };
    if dst_ptr == 0 || y0 < 0 || band_h <= 0 {
        return 2;
    }
    let y0 = y0 as usize;
    let band_h = band_h as usize;
    if band_h > BAND_MAX || y0 + band_h > up.dst_h {
        return 3;
    }
    let dst = unsafe {
        std::slice::from_raw_parts_mut(dst_ptr as *mut u8, up.dst_w * band_h * 4)
    };

    /* emit every row in the band; each needs raw rows y-1, y, y+1
       (edge-clamped), which the 3-slot ring keeps alive */
    for ey in y0..(y0 + band_h) {
        for dy in -1i32..=1 {
            let ry = (ey as i32 + dy).clamp(0, up.dst_h as i32 - 1) as usize;
            up.ensure_raw_row(ry);
        }
        up.emit_row(ey, dst, y0);
    }
    0
}

#[no_mangle]
pub extern "C" fn ec_up_end() -> i32 {
    unsafe { UP = None; }
    0
}
