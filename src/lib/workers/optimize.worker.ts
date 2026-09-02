/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import type { ProgressFn, RunResult, ToolWorkerApi } from '@/lib/workers/types';
import { compress, repair, type CompressPreset } from '@/lib/pdf/optimize';

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function human(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const api: ToolWorkerApi = {
  async run(inputs, options, onProgress: ProgressFn): Promise<RunResult> {
    const first = inputs[0];
    if (!first) throw new Error('No file provided.');
    const op = str(options['op']);

    if (op === 'compress') {
      const preset = (str(options['preset'], 'balanced') as CompressPreset) || 'balanced';
      const r = await compress(first, preset, onProgress);
      const pct = r.before > 0 ? Math.round((1 - r.after / r.before) * 100) : 0;
      const note =
        pct > 0
          ? `${human(r.before)} → ${human(r.after)} · ${pct}% smaller` +
            (r.imagesRecompressed ? ` · ${r.imagesRecompressed} image(s) recompressed` : '')
          : `Already well optimised — ${human(r.after)}, no meaningful reduction`;
      return {
        kind: 'file',
        name: 'compressed.pdf',
        mime: 'application/pdf',
        bytes: r.bytes,
        note,
      };
    }

    if (op === 'repair') {
      const bytes = await repair(first, onProgress);
      return {
        kind: 'file',
        name: 'repaired.pdf',
        mime: 'application/pdf',
        bytes,
        note: 'Reloaded in tolerant mode and re-saved.',
      };
    }

    throw new Error(`Unknown optimize op: "${op}"`);
  },
};

Comlink.expose(api);
