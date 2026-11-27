import * as Comlink from "comlink";
import type { CpuDitherOptions } from "./cpu-dither";
import type { CpuDitherWorkerApi, CpuRenderResult } from "./workers/cpu-dither.worker";

let worker: Comlink.Remote<CpuDitherWorkerApi> | null = null;

function getWorker(): Comlink.Remote<CpuDitherWorkerApi> {
  if (!worker) {
    worker = Comlink.wrap<CpuDitherWorkerApi>(
      new Worker(new URL("./workers/cpu-dither.worker.ts", import.meta.url), { type: "module" }),
    );
  }
  return worker;
}

// The decoded bitmap lives on the main thread until something needs the worker. It is then
// cloned and transferred exactly once per source.
let currentBitmap: ImageBitmap | null = null;
let currentId = 0;
let sentId = -1;
let sending: Promise<void> | null = null;

/** Registers the shared decoded bitmap as the CPU engine's source. Nothing is sent yet. */
export function setCpuSource(bitmap: ImageBitmap | null) {
  currentBitmap = bitmap;
  currentId++;
}

async function ensureSourceSent(): Promise<number | null> {
  if (!currentBitmap) return null;
  const id = currentId;
  if (sentId !== id) {
    sending ??= (async () => {
      try {
        const bitmap = currentBitmap;
        if (!bitmap || sentId === currentId) return;
        const clone = await createImageBitmap(bitmap);
        const sourceIdToSend = currentId;
        await getWorker().setSource(sourceIdToSend, Comlink.transfer(clone, [clone]));
        sentId = sourceIdToSend;
      } finally {
        sending = null;
      }
    })();
    await sending;
  }
  return sentId === currentId ? currentId : null;
}

interface PendingRender {
  options: CpuDitherOptions;
  resolve: (value: CpuRenderResult | null) => void;
}

let inFlight = false;
let pending: PendingRender | null = null;

async function runRender(options: CpuDitherOptions): Promise<CpuRenderResult | null> {
  inFlight = true;
  try {
    const id = await ensureSourceSent();
    if (id === null) return null;
    return await getWorker().process(id, options);
  } finally {
    inFlight = false;
    const next = pending;
    pending = null;
    if (next) runRender(next.options).then(next.resolve, () => next.resolve(null));
  }
}

/**
 * Latest-only scheduling: while a job is running only the newest request is kept.
 * Superseded calls resolve `null` and must be ignored by the caller.
 */
export function renderCpu(options: CpuDitherOptions): Promise<CpuRenderResult | null> {
  if (inFlight) {
    pending?.resolve(null);
    return new Promise((resolve) => {
      pending = { options, resolve };
    });
  }
  return runRender(options);
}

export async function extractCpuPalette(count: number): Promise<string[] | null> {
  const id = await ensureSourceSent();
  if (id === null) return null;
  return getWorker().extractPalette(id, count);
}
