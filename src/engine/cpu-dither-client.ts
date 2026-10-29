import * as Comlink from "comlink";
import { processCpuDithering, type CpuDitherOptions } from "./cpu-dither";

interface CpuDitherWorkerApi {
  process(
    buffer: Uint8ClampedArray,
    width: number,
    height: number,
    options: CpuDitherOptions
  ): Uint8ClampedArray<ArrayBuffer>;
}

let workerInstance: Comlink.Remote<CpuDitherWorkerApi> | null = null;
let workerFailed = false;

function getWorker(): Comlink.Remote<CpuDitherWorkerApi> | null {
  if (workerFailed || typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }
  if (!workerInstance) {
    try {
      const worker = new Worker(
        new URL("./workers/cpu-dither.worker.ts", import.meta.url),
        { type: "module" }
      );
      workerInstance = Comlink.wrap<CpuDitherWorkerApi>(worker);
    } catch (err) {
      console.warn("Web Worker init failed, using sync fallback:", err);
      workerFailed = true;
    }
  }
  return workerInstance;
}

export async function processCpuDitheringAsync(
  imageData: ImageData,
  options: CpuDitherOptions
): Promise<ImageData> {
  const worker = getWorker();
  const { width, height } = imageData;
  if (worker) {
    try {
      const copy = new Uint8ClampedArray(imageData.data);
      const processed = await worker.process(
        Comlink.transfer(copy, [copy.buffer]),
        width,
        height,
        options
      );
      return new ImageData(processed as Uint8ClampedArray<ArrayBuffer>, width, height);
    } catch (err) {
      console.warn("Worker error during dithering, falling back to sync:", err);
    }
  }

  return processCpuDithering(imageData, options);
}
