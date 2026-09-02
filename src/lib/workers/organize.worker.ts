/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import type { ProgressFn, RunResult, ToolWorkerApi } from '@/lib/workers/types';
import {
  arrange,
  extractPages,
  merge,
  pageCount,
  removePages,
  rotate,
  split,
  type Angle,
  type ArrangedPage,
  type SplitMode,
} from '@/lib/pdf/organize';
import { parsePageRange } from '@/lib/pdf/range';

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function bool(v: unknown): boolean {
  return v === true;
}
function int(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

const api: ToolWorkerApi = {
  async run(inputs, options, onProgress: ProgressFn): Promise<RunResult> {
    const op = str(options['op']);
    const first = inputs[0];
    if (op !== 'merge' && !first) throw new Error('No file provided.');

    switch (op) {
      case 'merge': {
        const bytes = await merge(inputs, onProgress);
        return { kind: 'file', name: 'merged.pdf', mime: 'application/pdf', bytes };
      }

      case 'rotate': {
        const angle = (int(options['angle'], 90) as Angle) || 90;
        const scope = str(options['scope'], 'all');
        const pages =
          scope === 'range' ? parsePageRange(str(options['range']), await pageCount(first!)) : [];
        const bytes = await rotate(first!, angle, pages, onProgress);
        return { kind: 'file', name: 'rotated.pdf', mime: 'application/pdf', bytes };
      }

      case 'arrange': {
        const spec = Array.isArray(options['spec']) ? (options['spec'] as unknown[]) : [];
        const parsed: ArrangedPage[] = spec.map((s) => {
          const o = s as Record<string, unknown>;
          return { page: int(o['page'], 0), rotate: (int(o['rotate'], 0) as Angle) || 0 };
        });
        const bytes = await arrange(first!, parsed, onProgress);
        return { kind: 'file', name: 'arranged.pdf', mime: 'application/pdf', bytes };
      }

      case 'remove': {
        const total = await pageCount(first!);
        const drop = parsePageRange(str(options['range']), total);
        const bytes = await removePages(first!, drop, onProgress);
        return { kind: 'file', name: 'pages-removed.pdf', mime: 'application/pdf', bytes };
      }

      case 'extract': {
        const total = await pageCount(first!);
        const keep = parsePageRange(str(options['range']), total);
        if (bool(options['separate'])) {
          const files = await split(
            first!,
            { type: 'ranges', ranges: keep.map((n) => [n]) },
            'page',
            onProgress,
          );
          return { kind: 'files', files };
        }
        const bytes = await extractPages(first!, keep, onProgress);
        return { kind: 'file', name: 'extracted.pdf', mime: 'application/pdf', bytes };
      }

      case 'split': {
        const total = await pageCount(first!);
        const mode = str(options['mode'], 'everyN');
        let split_: SplitMode;
        if (mode === 'pages') split_ = { type: 'pages' };
        else if (mode === 'ranges') {
          // One output file per comma / semicolon / newline separated range.
          const ranges = str(options['ranges'])
            .split(/[,;\n]/)
            .map((chunk) => parsePageRange(chunk, total))
            .filter((r) => r.length > 0);
          if (ranges.length === 0) throw new Error('Enter at least one range, e.g. 1-3, 4-6.');
          split_ = { type: 'ranges', ranges };
        } else split_ = { type: 'everyN', n: Math.max(1, int(options['n'], 1)) };

        const files = await split(first!, split_, 'part', onProgress);
        return files.length === 1
          ? { kind: 'file', name: files[0]!.name, mime: 'application/pdf', bytes: files[0]!.bytes }
          : { kind: 'files', files };
      }

      default:
        throw new Error(`Unknown organize op: "${op}"`);
    }
  },
};

Comlink.expose(api);
