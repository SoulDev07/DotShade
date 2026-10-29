import * as Comlink from "comlink";
import { processCpuDitheringData, type CpuDitherOptions } from "../cpu-dither";

export const cpuDitherWorker = {
  process(
    buffer: Uint8ClampedArray,
    width: number,
    height: number,
    options: CpuDitherOptions
  ): Uint8ClampedArray {
    const result = processCpuDitheringData(buffer, width, height, options);
    return Comlink.transfer(result.data, [result.data.buffer]);
  },
};

Comlink.expose(cpuDitherWorker);
