import * as Comlink from 'comlink';
import type { RemoteToolWorker, ToolWorkerApi } from '@/lib/workers/types';

export interface ToolWorkerHandle {
  readonly api: RemoteToolWorker;
  /** Terminate the worker and release its memory. Always call when done. */
  dispose(): void;
}

/**
 * Factory per tool id. Each entry returns a fresh, code-split Worker so a tool's
 * engine bytes never land in the entry chunk (docs/03, CLAUDE.md).
 *
 * M0 wires only the demo worker; M1+ adds one line per real tool.
 */
const WORKER_FACTORIES: Record<string, () => Worker> = {
  demo: () => new Worker(new URL('./demo.worker.ts', import.meta.url), { type: 'module' }),
};

export function createToolWorker(toolId: string): ToolWorkerHandle {
  const factory = WORKER_FACTORIES[toolId] ?? WORKER_FACTORIES['demo'];
  if (!factory) throw new Error(`no worker factory for tool "${toolId}"`);
  const worker = factory();
  const api: RemoteToolWorker = Comlink.wrap<ToolWorkerApi>(worker);
  return {
    api,
    dispose: () => {
      worker.terminate();
    },
  };
}

export function hasToolWorker(toolId: string): boolean {
  return toolId in WORKER_FACTORIES;
}
