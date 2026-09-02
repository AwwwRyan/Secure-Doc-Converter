/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import type { ProgressFn, RunResult, ToolWorkerApi } from '@/lib/workers/types';
import { unlock } from '@/lib/pdf/unlock';

const api: ToolWorkerApi = {
  async run(inputs, options, onProgress: ProgressFn): Promise<RunResult> {
    const first = inputs[0];
    if (!first) throw new Error('No file provided.');
    onProgress(0.2);
    const password = typeof options['password'] === 'string' ? options['password'] : '';
    const bytes = await unlock(first, password);
    onProgress(1);
    return {
      kind: 'file',
      name: 'unlocked.pdf',
      mime: 'application/pdf',
      bytes,
      note: 'Password and restrictions removed.',
    };
  },
};

Comlink.expose(api);
