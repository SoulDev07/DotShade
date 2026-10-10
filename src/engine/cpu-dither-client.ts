import * as Comlink from "comlink";
import { processCpuDithering, type CpuDitherOptions } from "./cpu-dither";

interface CpuDitherWorkerApi {
  process(
    buffer: Uint8ClampedArray,
    width: number,
    height: number,
    options: CpuDitherOptions
  ): Uint8ClampedArray;
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

/** Offloads CPU error-diffusion to a Web Worker, falling back to synchronous execution */
export async function processCpuDitheringAsync(
  imageData: ImageData,
  options: CpuDitherOptions
): Promise<ImageData> {
  const worker = getWorker();
  if (worker) {
    try {
      const copy = new Uint8ClampedArray(imageData.data);
      const processedBuffer = await worker.process(
        copy,
        imageData.width,
        imageData.height,
        options
      );
      const output = new ImageData(imageData.width, imageData.height);
      output.data.set(processedBuffer);
      return output;
    } catch (err) {
      console.warn("Worker error during dithering, falling back to sync:", err);
    }
  }

  return processCpuDithering(imageData, options);
}
