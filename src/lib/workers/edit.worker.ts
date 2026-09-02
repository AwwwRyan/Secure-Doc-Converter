/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import type { ProgressFn, RunResult, ToolWorkerApi } from '@/lib/workers/types';
import { pageCount } from '@/lib/pdf/organize';
import { parsePageRange } from '@/lib/pdf/range';
import {
  crop,
  pageNumbers,
  watermark,
  type NumberFormat,
  type NumberPosition,
  type RGB,
} from '@/lib/pdf/edit';

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}
function bool(v: unknown): boolean {
  return v === true;
}
function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  const int = Number.parseInt(m[1]!, 16);
  return { r: ((int >> 16) & 255) / 255, g: ((int >> 8) & 255) / 255, b: (int & 255) / 255 };
}

async function resolvePages(range: string, first: ArrayBuffer): Promise<number[]> {
  const r = range.trim();
  if (!r) return [];
  return parsePageRange(r, await pageCount(first));
}

const api: ToolWorkerApi = {
  async run(inputs, options, onProgress: ProgressFn): Promise<RunResult> {
    const first = inputs[0];
    if (!first) throw new Error('No file provided.');
    const op = str(options['op']);

    if (op === 'watermark') {
      const bytes = await watermark(
        first,
        {
          text: str(options['text']),
          fontSize: num(options['fontSize'], 48),
          opacity: Math.min(1, Math.max(0.02, num(options['opacity'], 0.2))),
          rotationDeg: num(options['rotationDeg'], 45),
          color: hexToRgb(str(options['color'], '#111111')),
          layout:
            (str(options['layout'], 'center') as 'center' | 'tile' | 'top' | 'bottom') || 'center',
          bold: bool(options['bold']),
          pages: await resolvePages(str(options['range']), first),
        },
        onProgress,
      );
      return { kind: 'file', name: 'watermarked.pdf', mime: 'application/pdf', bytes };
    }

    if (op === 'page-numbers') {
      const bytes = await pageNumbers(
        first,
        {
          format: (str(options['format'], 'n') as NumberFormat) || 'n',
          position:
            (str(options['position'], 'bottom-center') as NumberPosition) || 'bottom-center',
          margin: num(options['margin'], 28),
          fontSize: num(options['fontSize'], 11),
          startAt: Math.max(0, Math.round(num(options['startAt'], 1))),
          color: hexToRgb(str(options['color'], '#333333')),
          skipFirst: bool(options['skipFirst']),
          pages: await resolvePages(str(options['range']), first),
        },
        onProgress,
      );
      return { kind: 'file', name: 'numbered.pdf', mime: 'application/pdf', bytes };
    }

    if (op === 'crop') {
      const bytes = await crop(
        first,
        {
          unit: (str(options['unit'], 'pt') as 'pt' | 'percent') || 'pt',
          top: num(options['top'], 0),
          right: num(options['right'], 0),
          bottom: num(options['bottom'], 0),
          left: num(options['left'], 0),
          pages: await resolvePages(str(options['range']), first),
        },
        onProgress,
      );
      return { kind: 'file', name: 'cropped.pdf', mime: 'application/pdf', bytes };
    }

    throw new Error(`Unknown edit op: "${op}"`);
  },
};

Comlink.expose(api);
