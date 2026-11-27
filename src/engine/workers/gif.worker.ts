import * as Comlink from "comlink";
import { ClientGifEncoder } from "../gif-export";

let encoder: ClientGifEncoder | null = null;

export const gifWorker = {
  start(width: number, height: number, palette: string[] | null) {
    encoder = new ClientGifEncoder(width, height);
    encoder.start(palette, 0);
  },

  addFrame(buffer: ArrayBuffer, width: number, height: number, delayMs: number) {
    encoder?.addFrame(new ImageData(new Uint8ClampedArray(buffer), width, height), delayMs);
  },

  finish(): Blob {
    if (!encoder) throw new Error("GIF encoder was not started");
    const blob = encoder.finish();
    encoder = null;
    return blob;
  },
};

export type GifWorkerApi = typeof gifWorker;

Comlink.expose(gifWorker);
