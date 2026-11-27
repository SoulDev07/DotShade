import type { SnapshotType } from "./mount-types";

/** What the export dialog needs from whichever canvas is currently producing the output. */
export interface CaptureSource {
  /** The live output canvas (used for MediaRecorder `captureStream`). */
  readonly canvas: HTMLCanvasElement;
  /** Copy the current output into a 2D context. GPU mounts render and read in the same task. */
  drawTo(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  toBlob(type: SnapshotType, quality?: number): Promise<Blob | null>;
}

let active: CaptureSource | null = null;

export function setCaptureSource(source: CaptureSource | null) {
  active = source;
}

/** Clears the registration only if `source` is still the active one. */
export function clearCaptureSource(source: CaptureSource) {
  if (active === source) active = null;
}

export function getCaptureSource(): CaptureSource | null {
  return active;
}
