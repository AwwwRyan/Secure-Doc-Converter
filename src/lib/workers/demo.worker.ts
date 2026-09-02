/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import type { ProgressFn, ToolWorkerApi } from '@/lib/workers/types';

/**
 * Placeholder worker used by the M0 tool shell to exercise the run/progress/
 * result flow. Real tool workers (pdf-lib, qpdf-wasm, ...) arrive in M1+.
 * It does no real work and returns an empty buffer.
 */
const api: ToolWorkerApi = {
  async run(_input, _options, onProgress: ProgressFn) {
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 90));
      onProgress(i / steps);
    }
    return new ArrayBuffer(0);
  },
};

Comlink.expose(api);
