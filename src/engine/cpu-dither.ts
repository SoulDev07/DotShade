import { getLuminance, hexToRgb, parseColorToNormalizedRgba } from "@/lib/utils";
import { findClosestPaletteColor } from "./palettes";
import type { CpuAlgorithm, ColorMode } from "./types";

export type { CpuAlgorithm } from "./types";

/**
 * Configuration options for CPU error-diffusion image dithering.
 */
export interface CpuDitherOptions {
  /** Spatial error-diffusion kernel (e.g. Floyd-Steinberg, Atkinson, Sierra) */
  algorithm: CpuAlgorithm;
  /** Color quantization and mapping scheme */
  colorMode: ColorMode;
  /** Background hex color (paper and duotone modes) */
  colorBack: string;
  /** Foreground hex color (paper and duotone modes) */
  colorFront: string;
  /** Accent highlight hex color (paper mode) */
  colorHighlight: string;
  /** Color palette array for palette matching mode */
  palette: string[];
  /** Discrete quantization steps per RGB channel */
  colorSteps: number;
  /** Threshold cutoff bias for 1-bit / duotone decisions */
  threshold: number;
  /** Brightness adjustment [-1..1] */
  brightness: number;
  /** Contrast multiplier [0..3] */
  contrast: number;
  /** Gamma power curve [0.2..3] */
  gamma: number;
  /** Invert luminance */
  inverted: boolean;
}

/**
 * Representation of an error-diffusion kernel matrix.
 * Divisor normalizes the integer weights.
 * Offsets specify relative neighbor pixel coordinates [dx, dy, weight].
 */
interface DiffusionMatrix {
  divisor: number;
  offsets: [number, number, number][]; // [dx, dy, weight]
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

/**
 * Performs high-precision spatial error-diffusion dithering on CPU ImageData.
 * Allocates a floating-point error accumulation buffer, applies color adjustments,
 * and distributes quantization error to neighboring forward pixels using the selected kernel.
 *
 * @param imageData - Source image data containing RGBA pixel buffer
 * @param options - Dithering algorithm, color palette, and grading options
 * @returns New dithered ImageData
 */
export function processCpuDithering(
  imageData: ImageData,
  options: CpuDitherOptions
): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const output = new ImageData(width, height);
  const outData = output.data;

  // Retrieve error diffusion matrix kernel for the selected algorithm
  const matrix = DIFFUSION_MATRICES[options.algorithm] || DIFFUSION_MATRICES["floyd-steinberg"];
  const divisor = matrix.divisor;
  const offsets = matrix.offsets;

  // Step 1: Initialize 32-bit float RGB error buffer with pre-graded pixel values
  const errorBuffer = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    let r = data[i * 4];
    let g = data[i * 4 + 1];
    let b = data[i * 4 + 2];

    // Apply brightness adjustment
    if (options.brightness) {
      r += options.brightness * 255;
      g += options.brightness * 255;
      b += options.brightness * 255;
    }
    // Apply contrast adjustment around middle gray (128)
    if (options.contrast && options.contrast !== 1) {
      r = (r - 128) * options.contrast + 128;
      g = (g - 128) * options.contrast + 128;
      b = (b - 128) * options.contrast + 128;
    }
    // Apply gamma curve
    if (options.gamma && options.gamma !== 1) {
      r = 255 * Math.pow(Math.max(0, r / 255), 1 / options.gamma);
      g = 255 * Math.pow(Math.max(0, g / 255), 1 / options.gamma);
      b = 255 * Math.pow(Math.max(0, b / 255), 1 / options.gamma);
    }

    errorBuffer[i * 3] = Math.max(0, Math.min(255, r));
    errorBuffer[i * 3 + 1] = Math.max(0, Math.min(255, g));
    errorBuffer[i * 3 + 2] = Math.max(0, Math.min(255, b));
  }

  // Pre-parse hex colors
  const bgRgb = hexToRgb(options.colorBack || "#000c38");
  const fgRgb = hexToRgb(options.colorFront || "#94ffaf");
  const hlRgb = hexToRgb(options.colorHighlight || "#eaff94");
  const palette = options.palette || ["#000000", "#ffffff"];
  const threshold = options.threshold ?? 0.5;

  // Step 2: Raster scan line-by-line diffusing quantization error
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const alphaIdx = (y * width + x) * 4 + 3;
      const alpha = data[alphaIdx];

      // Retain transparent pixels without error diffusion
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

      // Relative perceived luminance
      let lum = getLuminance(r, g, b) / 255;
      if (options.inverted) {
        lum = 1 - lum;
      }

      let newR = 0;
      let newG = 0;
      let newB = 0;

      // Color mapping & quantization
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
        const closest = findClosestPaletteColor(r, g, b, palette);
        newR = closest[0];
        newG = closest[1];
        newB = closest[2];
      } else if (options.colorMode === "original") {
        const steps = Math.max(1, options.colorSteps || 4);
        const quant = (val: number) => Math.round(val / (255 / steps)) * (255 / steps);
        newR = Math.min(255, quant(r));
        newG = Math.min(255, quant(g));
        newB = Math.min(255, quant(b));
      } else {
        // Grayscale 1-bit
        const bit = lum >= threshold ? 255 : 0;
        newR = bit;
        newG = bit;
        newB = bit;
      }

      // Write final quantized pixel to output buffer
      const outIdx = (y * width + x) * 4;
      outData[outIdx] = newR;
      outData[outIdx + 1] = newG;
      outData[outIdx + 2] = newB;
      outData[outIdx + 3] = alpha;

      // Calculate quantization error (difference between accumulated value and output)
      const errR = r - newR;
      const errG = g - newG;
      const errB = b - newB;

      // Diffuse error to neighboring forward pixels according to kernel weights
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
