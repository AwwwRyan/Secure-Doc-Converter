import * as Comlink from 'comlink';
import type { RemoteToolWorker, ToolWorkerApi } from '@/lib/workers/types';

export interface ToolWorkerHandle {
  readonly api: RemoteToolWorker;
  /** Terminate the worker and release its memory. Always call when done. */
  dispose(): void;
}

/**
 * Which worker module backs each tool. Tools that share an engine share a
 * code-split chunk (e.g. all Organize tools → pdf-lib); heavier engines
 * (pdf.js, tesseract, qpdf, LibreOffice-WASM) get their own.
 */
const WORKER_FACTORIES: Record<string, () => Worker> = {
  demo: () => new Worker(new URL('./demo.worker.ts', import.meta.url), { type: 'module' }),
  organize: () => new Worker(new URL('./organize.worker.ts', import.meta.url), { type: 'module' }),
  edit: () => new Worker(new URL('./edit.worker.ts', import.meta.url), { type: 'module' }),
  optimize: () => new Worker(new URL('./optimize.worker.ts', import.meta.url), { type: 'module' }),
};

export function createWorker(workerId: string): ToolWorkerHandle {
  const factory = WORKER_FACTORIES[workerId];
  if (!factory) throw new Error(`no worker factory "${workerId}"`);
  const worker = factory();
  const api: RemoteToolWorker = Comlink.wrap<ToolWorkerApi>(worker);
  return {
    api,
    dispose: () => {
      worker.terminate();
    },
  };
}

export function hasWorker(workerId: string): boolean {
  return workerId in WORKER_FACTORIES;
}
