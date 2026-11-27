import * as Comlink from "comlink";
import { type CpuDitherOptions, processCpuDitheringData } from "../cpu-dither";
import { extractPaletteFromImageData } from "../gif-export";

/** The CPU engine never works above this size; keeps diffusion fast and memory bounded. */
const MAX_DIM = 600;

let sourceId = -1;
let sourcePixels: Uint8ClampedArray | null = null;
let sourceWidth = 0;
let sourceHeight = 0;

export interface CpuRenderResult {
  data: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
}

export const cpuDitherWorker = {
  /** Decodes the bitmap once into capped pixels; later calls only send options. */
  setSource(id: number, bitmap: ImageBitmap): { width: number; height: number } {
    let w = bitmap.width;
    let h = bitmap.height;
    if (w > MAX_DIM || h > MAX_DIM) {
      if (w > h) {
        h = Math.round((h * MAX_DIM) / w);
        w = MAX_DIM;
      } else {
        w = Math.round((w * MAX_DIM) / h);
        h = MAX_DIM;
      }
    }
    w = Math.max(1, w);
    h = Math.max(1, h);

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not create OffscreenCanvas 2D context");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    sourcePixels = ctx.getImageData(0, 0, w, h).data;
    sourceWidth = w;
    sourceHeight = h;
    sourceId = id;
    return { width: w, height: h };
  },

  /** Returns `null` when the requested source is no longer the loaded one. */
  process(id: number, options: CpuDitherOptions): CpuRenderResult | null {
    if (id !== sourceId || !sourcePixels) return null;
    const result = processCpuDitheringData(
      new Uint8ClampedArray(sourcePixels),
      sourceWidth,
      sourceHeight,
      options,
    );
    const data = result.data as Uint8ClampedArray<ArrayBuffer>;
    return Comlink.transfer({ data, width: sourceWidth, height: sourceHeight }, [data.buffer]);
  },

  extractPalette(id: number, count: number): string[] | null {
    if (id !== sourceId || !sourcePixels) return null;
    return extractPaletteFromImageData(
      new ImageData(new Uint8ClampedArray(sourcePixels), sourceWidth, sourceHeight),
      count,
    );
  },
};

export type CpuDitherWorkerApi = typeof cpuDitherWorker;

Comlink.expose(cpuDitherWorker);
