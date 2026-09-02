import { createWorker } from 'tesseract.js';
import { PDFDocument } from '@cantoo/pdf-lib';
import { closePdf, openPdf, renderPageToCanvas } from '@/lib/pdf/thumbs';
import { parsePageRange } from '@/lib/pdf/range';
import { CorruptPdfError } from '@/lib/pdf/errors';

const V = '/vendor/tesseract';
const OEM_LSTM_ONLY = 1;

export type OcrFormat = 'pdf' | 'txt';

export interface OcrOptions {
  format: OcrFormat;
  /** Render scale for pdf.js (higher = sharper OCR, slower). ~2–3 is good. */
  scale: number;
  /** 1-based page-range expression; blank = all pages. */
  range: string;
  onProgress: (done: number, total: number, phase: string) => void;
  signal: AbortSignal;
}

export interface OcrResult {
  bytes: ArrayBuffer;
  name: string;
  mime: string;
  note: string;
}

function toU8(pdf: unknown): Uint8Array {
  if (pdf instanceof Uint8Array) return pdf;
  if (Array.isArray(pdf)) return Uint8Array.from(pdf as number[]);
  throw new Error('tesseract did not return PDF bytes');
}

/**
 * OCR a PDF entirely in the browser. pdf.js rasterises each page, tesseract.js
 * recognises it, and (for the PDF output) we merge the per-page searchable PDFs
 * tesseract emits. Orchestrated on the caller's thread; the heavy work runs in
 * pdf.js's and tesseract's own workers.
 */
export async function runOcr(file: File, opts: OcrOptions): Promise<OcrResult> {
  const { signal } = opts;
  const buf = await file.arrayBuffer();

  let doc;
  try {
    doc = await openPdf(buf);
  } catch {
    throw new CorruptPdfError();
  }

  const total = doc.numPages;
  const pages = opts.range.trim()
    ? parsePageRange(opts.range, total)
    : Array.from({ length: total }, (_, i) => i + 1);
  if (pages.length === 0) throw new Error('No pages selected.');

  opts.onProgress(0, pages.length, 'Starting the OCR engine…');
  const tess = await createWorker('eng', OEM_LSTM_ONLY, {
    workerPath: `${V}/worker.min.js`,
    // Point at the exact core file (fixed-width SIMD + LSTM) so tesseract skips
    // its own detection, which asks for a relaxed-SIMD build we don't ship.
    corePath: `${V}/tesseract-core-simd-lstm.wasm.js`,
    langPath: `${V}/`,
    gzip: false,
    cacheMethod: 'none',
    logger: () => {},
  });

  try {
    const perPage: Uint8Array[] = [];
    const texts: string[] = [];

    for (let i = 0; i < pages.length; i++) {
      if (signal.aborted) throw new DOMException('cancelled', 'AbortError');
      opts.onProgress(i, pages.length, `Reading page ${pages[i]}`);
      const canvas = await renderPageToCanvas(doc, pages[i]!, opts.scale);
      const { data } = await tess.recognize(
        canvas,
        {},
        opts.format === 'pdf' ? { pdf: true, text: true } : { text: true },
      );
      texts.push(data.text ?? '');
      if (opts.format === 'pdf') perPage.push(toU8((data as { pdf?: unknown }).pdf));
      opts.onProgress(i + 1, pages.length, `Read page ${pages[i]}`);
    }

    const words = texts.join(' ').trim().split(/\s+/).filter(Boolean).length;

    if (opts.format === 'txt') {
      const text = texts.join('\n\n\n\n');
      return {
        bytes: new TextEncoder().encode(text).slice().buffer,
        name: 'ocr-text.txt',
        mime: 'text/plain',
        note: `${pages.length} page(s) · ~${words} words`,
      };
    }

    const out = await PDFDocument.create();
    for (const p of perPage) {
      const src = await PDFDocument.load(p.slice().buffer, { updateMetadata: false });
      const copied = await out.copyPages(src, src.getPageIndices());
      for (const pg of copied) out.addPage(pg);
    }
    return {
      bytes: (await out.save({ useObjectStreams: true })).slice().buffer,
      name: 'searchable.pdf',
      mime: 'application/pdf',
      note: `${pages.length} page(s) made searchable · ~${words} words recognised`,
    };
  } finally {
    await tess.terminate();
    closePdf(doc);
  }
}
