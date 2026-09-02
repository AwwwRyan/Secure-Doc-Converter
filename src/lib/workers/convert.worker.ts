/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import type { ProgressFn, RunResult, ToolWorkerApi } from '@/lib/workers/types';
import { imageToPdf, type Orientation, type PageSize } from '@/lib/pdf/imageToPdf';

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

const api: ToolWorkerApi = {
  async run(inputs, options, onProgress: ProgressFn): Promise<RunResult> {
    const op = str(options['op']);

    if (op === 'image-to-pdf') {
      const bytes = await imageToPdf(
        inputs,
        {
          pageSize: (str(options['pageSize'], 'fit') as PageSize) || 'fit',
          orientation: (str(options['orientation'], 'auto') as Orientation) || 'auto',
          margin: Math.max(0, num(options['margin'], 0)),
          background: options['background'] !== false,
        },
        onProgress,
      );
      return { kind: 'file', name: 'images.pdf', mime: 'application/pdf', bytes };
    }

    throw new Error(`Unknown convert op: "${op}"`);
  },
};

Comlink.expose(api);
