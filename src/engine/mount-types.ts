import type { RenderSettings } from "./types";

export type MountSource = HTMLImageElement | HTMLVideoElement | ImageBitmap;
export type SnapshotType = "image/png" | "image/webp" | "image/jpeg";

/** Common surface of the WebGPU and WebGL renderers. */
export interface DitherMount {
  readonly canvas: HTMLCanvasElement;
  setImage(source: MountSource | null): void;
  updateOptions(options: RenderSettings): void;
  /** Schedule one redraw on the next animation frame (coalesced). */
  invalidate(): void;
  /** Draw synchronously now. Used right before reading pixels back. */
  render(): void;
  /** Render, then copy the result into a 2D context in the same task. */
  captureTo(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  snapshotBlob(type?: SnapshotType, quality?: number): Promise<Blob | null>;
  dispose(): void;
}

export const DITHER_TYPE_IDS: Record<string, number> = {
  noise: 1,
  "2x2": 2,
  "4x4": 3,
  "8x8": 4,
  "16x16": 5,
  halftone: 6,
  crosshatch: 7,
  clustered: 8,
};

export const COLOR_MODE_IDS: Record<string, number> = {
  paper: 1,
  duotone: 2,
  original: 3,
  palette: 4,
  grayscale: 5,
};

export const FIT_MODE_IDS: Record<string, number> = { contain: 1, cover: 2, fill: 3 };

export const PROCEDURAL_SHAPE_IDS: Record<string, number> = {
  simplex: 1,
  warp: 2,
  dots: 3,
  waves: 4,
  ripple: 5,
  swirl: 6,
  sphere: 7,
};

export function getSourceSize(source: MountSource): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth || 1, height: source.videoHeight || 1 };
  }
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width || 1,
      height: source.naturalHeight || source.height || 1,
    };
  }
  return { width: source.width || 1, height: source.height || 1 };
}
