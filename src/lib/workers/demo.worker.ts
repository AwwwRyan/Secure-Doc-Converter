/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import type { ProgressFn, RunResult, ToolWorkerApi } from '@/lib/workers/types';

/**
 * Placeholder worker for the /t/demo route. Does no real work — it just steps a
 * progress bar and returns an empty placeholder PDF so the shell's
 * run → progress → result → cleanup path can be exercised.
 */
const api: ToolWorkerApi = {
  async run(_inputs, _options, onProgress: ProgressFn): Promise<RunResult> {
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 90));
      onProgress(i / steps);
    }
    return {
      kind: 'file',
      name: 'demo-result.pdf',
      mime: 'application/pdf',
      bytes: new TextEncoder().encode('%PDF-1.4\n%%EOF\n').slice().buffer,
    };
  },
};

Comlink.expose(api);
