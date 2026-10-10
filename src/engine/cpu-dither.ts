import { getLuminance, hexToRgb } from "@/lib/utils";
import { findClosestPaletteColor, type RgbTuple } from "./palettes";
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

export function processCpuDithering(
  imageData: ImageData,
  options: CpuDitherOptions
): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const output = new ImageData(width, height);
  const outData = output.data;

  const matrix = DIFFUSION_MATRICES[options.algorithm] || DIFFUSION_MATRICES["floyd-steinberg"];
  const divisor = matrix.divisor;
  const offsets = matrix.offsets;

  // Precompute 256-entry grading curve to avoid per-pixel Math.pow calls
  const lut = new Float32Array(256);
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
    lut[val] = Math.max(0, Math.min(255, v));
  }

  const errorBuffer = new Float32Array(width * height * 3);
  const totalPixels = width * height;
  for (let i = 0; i < totalPixels; i++) {
    const dataIdx = i * 4;
    const errIdx = i * 3;
    errorBuffer[errIdx] = lut[data[dataIdx]];
    errorBuffer[errIdx + 1] = lut[data[dataIdx + 1]];
    errorBuffer[errIdx + 2] = lut[data[dataIdx + 2]];
  }

  const bgRgb = hexToRgb(options.colorBack || "#000c38");
  const fgRgb = hexToRgb(options.colorFront || "#94ffaf");
  const hlRgb = hexToRgb(options.colorHighlight || "#eaff94");
  const palette = options.palette || ["#000000", "#ffffff"];
  const parsedPalette: RgbTuple[] = palette.map((hex) => hexToRgb(hex));
  const threshold = options.threshold ?? 0.5;

  const colorSteps = Math.max(1, options.colorSteps || 4);
  const origStepSize = 255 / colorSteps;
  const origInvStepSize = 1 / origStepSize;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const alphaIdx = (y * width + x) * 4 + 3;
      const alpha = data[alphaIdx];

      if (alpha < 10) {
        outData[alphaIdx - 3] = 0;
        outData[alphaIdx - 2] = 0;
        outData[alphaIdx - 1] = 0;
        outData[alphaIdx] = 0;
        continue;
      }

      let r = errorBuffer[idx];
      let g = errorBuffer[idx + 1];
      let b = errorBuffer[idx + 2];

      let lum = getLuminance(r, g, b) / 255;
      if (options.inverted) lum = 1 - lum;

      let newR = 0;
      let newG = 0;
      let newB = 0;

      if (options.colorMode === "paper") {
        const bit = lum >= threshold ? 1 : 0;
        if (bit === 1) {
          if (lum > 0.85) {
            newR = hlRgb[0];
            newG = hlRgb[1];
            newB = hlRgb[2];
          } else {
            newR = fgRgb[0];
            newG = fgRgb[1];
            newB = fgRgb[2];
          }
        } else {
          newR = bgRgb[0];
          newG = bgRgb[1];
          newB = bgRgb[2];
        }
      } else if (options.colorMode === "duotone") {
        const bit = lum >= threshold ? 1 : 0;
        newR = bit ? fgRgb[0] : bgRgb[0];
        newG = bit ? fgRgb[1] : bgRgb[1];
        newB = bit ? fgRgb[2] : bgRgb[2];
      } else if (options.colorMode === "palette") {
        const closest = findClosestPaletteColor(r, g, b, parsedPalette);
        newR = closest[0];
        newG = closest[1];
        newB = closest[2];
      } else if (options.colorMode === "original") {
        newR = Math.min(255, Math.max(0, Math.round(r * origInvStepSize) * origStepSize));
        newG = Math.min(255, Math.max(0, Math.round(g * origInvStepSize) * origStepSize));
        newB = Math.min(255, Math.max(0, Math.round(b * origInvStepSize) * origStepSize));
      } else {
        const bit = lum >= threshold ? 255 : 0;
        newR = bit;
        newG = bit;
        newB = bit;
      }

      const outIdx = (y * width + x) * 4;
      outData[outIdx] = newR;
      outData[outIdx + 1] = newG;
      outData[outIdx + 2] = newB;
      outData[outIdx + 3] = alpha;

      const errR = r - newR;
      const errG = g - newG;
      const errB = b - newB;

      for (let k = 0; k < offsets.length; k++) {
        const [dx, dy, weight] = offsets[k];
        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = (ny * width + nx) * 3;
          const factor = weight / divisor;
          errorBuffer[nIdx] += errR * factor;
          errorBuffer[nIdx + 1] += errG * factor;
          errorBuffer[nIdx + 2] += errB * factor;
        }
      }
    }
  }

  return output;
}
