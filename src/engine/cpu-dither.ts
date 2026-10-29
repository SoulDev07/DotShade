import type { CpuAlgorithm, ColorMode } from "./types";

export type { CpuAlgorithm } from "./types";

export interface CpuDitherOptions {
  algorithm: CpuAlgorithm;
  colorMode: ColorMode;
  colorBack: string;
  colorFront: string;
  colorHighlight: string;
  palette: string[];
  colorSteps: number;
  threshold: number;
  brightness: number;
  contrast: number;
  gamma: number;
  inverted: boolean;
}

interface DiffusionMatrix {
  divisor: number;
  offsets: [dx: number, dy: number, weight: number][];
}

const DIFFUSION_MATRICES: Record<CpuAlgorithm, DiffusionMatrix> = {
  "floyd-steinberg": {
    divisor: 16,
    offsets: [
      [1, 0, 7],
      [-1, 1, 3],
      [0, 1, 5],
      [1, 1, 1],
    ],
  },
  atkinson: {
    divisor: 8,
    offsets: [
      [1, 0, 1],
      [2, 0, 1],
      [-1, 1, 1],
      [0, 1, 1],
      [1, 1, 1],
      [0, 2, 1],
    ],
  },
  sierra3: {
    divisor: 32,
    offsets: [
      [1, 0, 5],
      [2, 0, 3],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 5],
      [1, 1, 4],
      [2, 1, 2],
      [-1, 2, 2],
      [0, 2, 3],
      [1, 2, 2],
    ],
  },
  "sierra-lite": {
    divisor: 4,
    offsets: [
      [1, 0, 2],
      [-1, 1, 1],
      [0, 1, 1],
    ],
  },
  burkes: {
    divisor: 32,
    offsets: [
      [1, 0, 8],
      [2, 0, 4],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 8],
      [1, 1, 4],
      [2, 1, 2],
    ],
  },
  stucki: {
    divisor: 42,
    offsets: [
      [1, 0, 8],
      [2, 0, 4],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 8],
      [1, 1, 4],
      [2, 1, 2],
      [-2, 2, 1],
      [-1, 2, 2],
      [0, 2, 4],
      [1, 2, 2],
      [2, 2, 1],
    ],
  },
  jarvis: {
    divisor: 48,
    offsets: [
      [1, 0, 7],
      [2, 0, 5],
      [-2, 1, 3],
      [-1, 1, 5],
      [0, 1, 7],
      [1, 1, 5],
      [2, 1, 3],
      [-2, 2, 1],
      [-1, 2, 3],
      [0, 2, 5],
      [1, 2, 3],
      [2, 2, 1],
    ],
  },
};

const FLAT_DIFFUSION: Record<CpuAlgorithm, Float64Array> = (() => {
  const flat = {} as Record<CpuAlgorithm, Float64Array>;
  (Object.keys(DIFFUSION_MATRICES) as CpuAlgorithm[]).forEach((key) => {
    const { divisor, offsets } = DIFFUSION_MATRICES[key];
    const arr = new Float64Array(offsets.length * 3);
    for (let i = 0; i < offsets.length; i++) {
      const [dx, dy, weight] = offsets[i];
      arr[i * 3] = dx;
      arr[i * 3 + 1] = dy;
      arr[i * 3 + 2] = weight / divisor;
    }
    flat[key] = arr;
  });
  return flat;
})();

const LN_EPS = 216 / 24389;
const LN_KAPPA = 24389 / 27;

function clamp(v: number, min: number, max: number): number {
  return v > max ? max : v < min ? min : v;
}

function linearize(c: number): number {
  const t = c / 255;
  return t < 0.04045 ? t / 12.92 : Math.pow((t + 0.055) / 1.055, 2.4);
}

function labF(t: number): number {
  return t > LN_EPS ? Math.cbrt(t) : (LN_KAPPA * t + 16) / 116;
}

function rgbToLab(r: number, g: number, b: number, out: Float64Array, outOffset = 0): void {
  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);

  const x0 = 100 * (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb);
  const y0 = 100 * (0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb);
  const z0 = 100 * (0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb);

  const x = clamp(1.0478112 * x0 + 0.0228866 * y0 - 0.050127 * z0, 0, 96.422);
  const y = clamp(0.0295424 * x0 + 0.9904844 * y0 - 0.0170491 * z0, 0, 100);
  const z = clamp(-0.0092345 * x0 + 0.0150436 * y0 + 0.7521316 * z0, 0, 82.521);

  const fx = labF(x / 96.422);
  const fy = labF(y / 100);
  const fz = labF(z / 82.521);

  out[outOffset] = Math.round((116 * fy - 16) * 100) / 100;
  out[outOffset + 1] = Math.round(500 * (fx - fy) * 100) / 100;
  out[outOffset + 2] = Math.round(200 * (fy - fz) * 100) / 100;
}

function ciede2000(
  l1: number, a1: number, b1: number,
  l2: number, a2: number, b2: number
): number {
  const DEG = 180 / Math.PI;
  const RAD = Math.PI / 180;

  const c1 = Math.pow(Math.pow(a1, 2) + Math.pow(b1, 2), 0.5);
  const c2 = Math.pow(Math.pow(a2, 2) + Math.pow(b2, 2), 0.5);
  const meanL = (l1 + l2) / 2;
  const gBase = Math.pow((c1 + c2) / 2, 7);
  const g = 0.5 * (1 - Math.pow(gBase / (gBase + Math.pow(25, 7)), 0.5));

  const ap1 = a1 * (1 + g);
  const ap2 = a2 * (1 + g);
  const cp1 = Math.pow(Math.pow(ap1, 2) + Math.pow(b1, 2), 0.5);
  const cp2 = Math.pow(Math.pow(ap2, 2) + Math.pow(b2, 2), 0.5);
  const meanC = (cp1 + cp2) / 2;

  let h1 = ap1 === 0 && b1 === 0 ? 0 : Math.atan2(b1, ap1) * DEG;
  let h2 = ap2 === 0 && b2 === 0 ? 0 : Math.atan2(b2, ap2) * DEG;
  if (h1 < 0) h1 += 360;
  if (h2 < 0) h2 += 360;

  let dh = h2 - h1;
  const absDh = Math.abs(h2 - h1);
  if (absDh > 180 && h2 <= h1) dh += 360;
  else if (absDh > 180 && h2 > h1) dh -= 360;

  let meanH = h1 + h2;
  if (absDh <= 180) meanH /= 2;
  else meanH = (h1 + h2 < 360 ? meanH + 360 : meanH - 360) / 2;

  const fT =
    1 -
    0.17 * Math.cos(RAD * (meanH - 30)) +
    0.24 * Math.cos(2 * RAD * meanH) +
    0.32 * Math.cos(RAD * (3 * meanH + 6)) -
    0.2 * Math.cos(RAD * (4 * meanH - 63));

  const dl = l2 - l1;
  const dc = cp2 - cp1;
  const dp = 2 * Math.sin(RAD * dh / 2) * Math.pow(cp1 * cp2, 0.5);

  const sl =
    1 + (0.015 * Math.pow(meanL - 50, 2)) / Math.pow(20 + Math.pow(meanL - 50, 2), 0.5);
  const sc = 1 + 0.045 * meanC;
  const sh = 1 + 0.015 * meanC * fT;
  const rt =
    -2 *
    Math.pow(Math.pow(meanC, 7) / (Math.pow(meanC, 7) + Math.pow(25, 7)), 0.5) *
    Math.sin(2 * RAD * 30 * Math.exp(-Math.pow((meanH - 275) / 25, 2)));

  return Math.pow(
    Math.pow(dl / sl, 2) +
    Math.pow(dc / sc, 2) +
    Math.pow(dp / sh, 2) +
    (rt * dc * dp) / (sc * sh),
    0.5
  );
}

/**
 * colord's delta() = clamp(round(ciede2000()/100, 3), 0, 1) — its helper `o`
 * defaults to a [0,1] clamp. Replicate so palette ties resolve identically
 * (raw values ≥1 all collapse to 1 in the old colord-based engine).
 */
function colordDelta(
  l1: number, a1: number, b1: number,
  l2: number, a2: number, b2: number
): number {
  const n = ciede2000(l1, a1, b1, l2, a2, b2) / 100;
  const rounded = Math.round(n * 1000) / 1000;
  return rounded > 1 ? 1 : rounded < 0 ? 0 : rounded;
}

const LUT_SHIFT = 3;
const LUT_SIZE = 1 << 15;
const LUT_STRIDE_G = 1 << 5;
const LUT_STRIDE_R = 1 << 10;

let lutPaletteKey = "";
let lutPauseIndices: Uint8Array | null = null;
let lutPaletteLab: Float64Array | null = null;
let labScratch: Float64Array | null = null;

function buildPaletteLut(paletteLab: Float64Array, count: number): Uint8Array {
  const indices = new Uint8Array(LUT_SIZE);
  const lab = (labScratch ??= new Float64Array(3));

  for (let i = 0; i < LUT_SIZE; i++) {
    const cellB = i & 31;
    const cellG = (i >> 5) & 31;
    const cellR = (i >> 10) & 31;
    rgbToLab(cellR * 8 + 4, cellG * 8 + 4, cellB * 8 + 4, lab);

    let best = 0;
    let bestDist = Infinity;
    for (let p = 0; p < count; p++) {
      const o = p * 3;
      const d = colordDelta(
        lab[0], lab[1], lab[2],
        paletteLab[o], paletteLab[o + 1], paletteLab[o + 2]
      );
      if (d < bestDist) {
        bestDist = d;
        best = p;
        if (d === 0) break;
      }
    }
    indices[i] = best;
  }
  return indices;
}

let errorBufferCache: Float32Array | null = null;
let errorBufferKey = 0;

function getErrorBuffer(pixelCount: number): Float32Array {
  const key = pixelCount * 3;
  if (!errorBufferCache || errorBufferKey !== key) {
    errorBufferCache = new Float32Array(key);
    errorBufferKey = key;
  }
  return errorBufferCache;
}

function parseHex(hex: string, out: [number, number, number]): void {
  let h = hex.trim();
  if (h.charCodeAt(0) === 35) h = h.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  out[0] = (n >> 16) & 255;
  out[1] = (n >> 8) & 255;
  out[2] = n & 255;
}

type Rgb = [number, number, number];

function parseColor(hex: string | undefined, fallback: string): Rgb {
  const rgb: Rgb = [0, 0, 0];
  parseHex(hex || fallback, rgb);
  if (Number.isNaN(rgb[0])) parseHex(fallback, rgb);
  return rgb;
}

export function processCpuDithering(
  imageData: ImageData,
  options: CpuDitherOptions
): ImageData {
  return processCpuDitheringData(imageData.data, imageData.width, imageData.height, options);
}

export function processCpuDitheringData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: CpuDitherOptions
): ImageData {
  const output = new ImageData(width, height);
  const outData = output.data;
  const pixelCount = width * height;

  const offsets =
    FLAT_DIFFUSION[options.algorithm] ?? FLAT_DIFFUSION["floyd-steinberg"];

  const gradeLut = new Float32Array(256);
  const brightnessOffset = options.brightness ? options.brightness * 255 : 0;
  const contrast = options.contrast ?? 1;
  const hasContrast = contrast !== 1;
  const gamma = options.gamma ?? 1;
  const hasGamma = gamma !== 1 && gamma > 0;
  const invGamma = hasGamma ? 1 / gamma : 1;

  for (let val = 0; val < 256; val++) {
    let v = val;
    if (brightnessOffset) v += brightnessOffset;
    if (hasContrast) v = (v - 128) * contrast + 128;
    if (hasGamma) v = 255 * Math.pow(Math.max(0, v / 255), invGamma);
    gradeLut[val] = Math.max(0, Math.min(255, v));
  }

  const fb = getErrorBuffer(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const dataIdx = i * 4;
    const errIdx = i * 3;
    fb[errIdx] = gradeLut[data[dataIdx]];
    fb[errIdx + 1] = gradeLut[data[dataIdx + 1]];
    fb[errIdx + 2] = gradeLut[data[dataIdx + 2]];
  }

  const bgRgb = parseColor(options.colorBack, "#000c38");
  const fgRgb = parseColor(options.colorFront, "#94ffaf");
  const hlRgb = parseColor(options.colorHighlight, "#eaff94");
  const threshold = options.threshold ?? 0.5;
  const inverted = options.inverted;

  const mode =
    options.colorMode === "paper" ? 0 :
    options.colorMode === "duotone" ? 1 :
    options.colorMode === "palette" ? 2 :
    options.colorMode === "original" ? 3 : 4;

  let palIndices: Uint8Array | null = null;
  let palFlat: Float32Array | null = null;
  if (mode === 2) {
    const palette = options.palette && options.palette.length > 0 ? options.palette : ["#000000", "#ffffff"];
    const paletteKey = palette.join(",");
    if (paletteKey !== lutPaletteKey || !lutPauseIndices) {
      const count = palette.length;
      const paletteLab = (lutPaletteLab && lutPaletteLab.length >= count * 3)
        ? lutPaletteLab
        : new Float64Array(count * 3);
      const rgb: Rgb = [0, 0, 0];
      for (let i = 0; i < count; i++) {
        parseHex(palette[i], rgb);
        rgbToLab(rgb[0], rgb[1], rgb[2], paletteLab, i * 3);
      }
      lutPauseIndices = buildPaletteLut(paletteLab, count);
      lutPaletteLab = paletteLab;
      lutPaletteKey = paletteKey;
    }
    palIndices = lutPauseIndices;
    palFlat = new Float32Array(palette.length * 3);
    const rgb: Rgb = [0, 0, 0];
    for (let i = 0; i < palette.length; i++) {
      parseHex(palette[i], rgb);
      palFlat[i * 3] = rgb[0];
      palFlat[i * 3 + 1] = rgb[1];
      palFlat[i * 3 + 2] = rgb[2];
    }
  }

  const colorSteps = Math.max(1, options.colorSteps || 4);
  const origStepSize = 255 / colorSteps;
  const origInvStepSize = 1 / origStepSize;

  let newR = 0;
  let newG = 0;
  let newB = 0;

  for (let y = 0; y < height; y++) {
    const yw = y * width;
    let errIdx = yw * 3;
    let outIdx = yw * 4;

    for (let x = 0; x < width; x++, errIdx += 3, outIdx += 4) {
      const alpha = data[outIdx + 3];

      if (alpha < 10) {
        continue;
      }

      let r = fb[errIdx];
      let g = fb[errIdx + 1];
      let b = fb[errIdx + 2];

      if (mode === 2) {
        const rc = r < 0 ? 0 : r > 255 ? 255 : r;
        const gc = g < 0 ? 0 : g > 255 ? 255 : g;
        const bc = b < 0 ? 0 : b > 255 ? 255 : b;
        const ci =
          (((rc + 0.5) | 0) >> LUT_SHIFT) * LUT_STRIDE_R +
          (((gc + 0.5) | 0) >> LUT_SHIFT) * LUT_STRIDE_G +
          (((bc + 0.5) | 0) >> LUT_SHIFT);
        const pi = palIndices![ci] * 3;
        newR = palFlat![pi];
        newG = palFlat![pi + 1];
        newB = palFlat![pi + 2];
      } else {
        const rc = r < 0 ? 0 : r > 255 ? 255 : r;
        const gc = g < 0 ? 0 : g > 255 ? 255 : g;
        const bc = b < 0 ? 0 : b > 255 ? 255 : b;
        let lum = (299 * rc + 587 * gc + 114 * bc) / 1000 / 255;
        lum = Math.round(lum * 100) / 100;
        if (inverted) lum = 1 - lum;

        if (mode === 0) {
          if (lum >= threshold) {
            if (lum > 0.85) {
              newR = hlRgb[0]; newG = hlRgb[1]; newB = hlRgb[2];
            } else {
              newR = fgRgb[0]; newG = fgRgb[1]; newB = fgRgb[2];
            }
          } else {
            newR = bgRgb[0]; newG = bgRgb[1]; newB = bgRgb[2];
          }
        } else if (mode === 1) {
          if (lum >= threshold) {
            newR = fgRgb[0]; newG = fgRgb[1]; newB = fgRgb[2];
          } else {
            newR = bgRgb[0]; newG = bgRgb[1]; newB = bgRgb[2];
          }
        } else if (mode === 3) {
          newR = Math.min(255, Math.max(0, Math.round(r * origInvStepSize) * origStepSize));
          newG = Math.min(255, Math.max(0, Math.round(g * origInvStepSize) * origStepSize));
          newB = Math.min(255, Math.max(0, Math.round(b * origInvStepSize) * origStepSize));
        } else {
          const bit = lum >= threshold ? 255 : 0;
          newR = bit; newG = bit; newB = bit;
        }
      }

      outData[outIdx] = newR;
      outData[outIdx + 1] = newG;
      outData[outIdx + 2] = newB;
      outData[outIdx + 3] = alpha;

      const errR = r - newR;
      const errG = g - newG;
      const errB = b - newB;

      for (let k = 0; k < offsets.length; k += 3) {
        const nx = x + offsets[k];
        const ny = y + offsets[k + 1];
        if (nx >= 0 && nx < width && ny < height) {
          const nIdx = (ny * width + nx) * 3;
          const factor = offsets[k + 2];
          fb[nIdx] += errR * factor;
          fb[nIdx + 1] += errG * factor;
          fb[nIdx + 2] += errB * factor;
        }
      }
    }
  }

  return output;
}
