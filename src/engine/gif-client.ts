import * as Comlink from "comlink";
import type { GifWorkerApi } from "./workers/gif.worker";

export interface GifWorkerEncoder {
  /** Transfers the frame's pixels to the worker; quantizing and encoding happen off-thread. */
  addFrame(frame: ImageData, delayMs: number): void;
  finish(): Promise<Blob>;
  dispose(): void;
}

/** `palette: null` quantizes once from the first frame and reuses it for every frame. */
export async function createGifEncoder(
  width: number,
  height: number,
  palette: string[] | null,
): Promise<GifWorkerEncoder> {
  const raw = new Worker(new URL("./workers/gif.worker.ts", import.meta.url), { type: "module" });
  const remote = Comlink.wrap<GifWorkerApi>(raw);
  await remote.start(width, height, palette);

  // Calls on one worker are processed in order; keep the first failure for finish().
  let failure: unknown = null;
  return {
    addFrame(frame, delayMs) {
      const buffer = frame.data.buffer as ArrayBuffer;
      remote
        .addFrame(Comlink.transfer(buffer, [buffer]), frame.width, frame.height, delayMs)
        .catch((err) => {
          failure ??= err;
        });
    },
    async finish() {
      const blob = await remote.finish();
      if (failure) throw failure;
      return blob;
    },
    dispose() {
      remote[Comlink.releaseProxy]();
      raw.terminate();
    },
  };
}
