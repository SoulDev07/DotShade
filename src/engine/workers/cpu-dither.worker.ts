import * as Comlink from "comlink";
import { processCpuDithering, type CpuDitherOptions } from "../cpu-dither";

export const cpuDitherWorker = {
  process(
    buffer: Uint8ClampedArray,
    width: number,
    height: number,
    options: CpuDitherOptions
  ): Uint8ClampedArray {
    const imgData = new ImageData(width, height);
    imgData.data.set(buffer);
    const result = processCpuDithering(imgData, options);
    return result.data;
  },
};

Comlink.expose(cpuDitherWorker);
