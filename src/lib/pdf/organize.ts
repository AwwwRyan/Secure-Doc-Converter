import { PDFDocument, degrees } from '@cantoo/pdf-lib';
import { CorruptPdfError, EmptyResultError, EncryptedPdfError } from '@/lib/pdf/errors';

export type Angle = 0 | 90 | 180 | 270;
export type Progress = (fraction: number) => void;

const noop: Progress = () => {};

/** A copyable ArrayBuffer over exactly the bytes (no view offset games). */
function bytesToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.slice().buffer;
}

async function load(bytes: ArrayBuffer): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'EncryptedPDFError' || /encrypt/i.test(String(err))) {
      throw new EncryptedPdfError();
    }
    throw new CorruptPdfError(err instanceof Error ? err.message : undefined);
  }
}

async function save(doc: PDFDocument): Promise<ArrayBuffer> {
  return bytesToArrayBuffer(await doc.save({ useObjectStreams: true }));
}

export async function pageCount(bytes: ArrayBuffer): Promise<number> {
  return (await load(bytes)).getPageCount();
}

/** Merge PDFs in the given order, optionally inserting a blank page between docs. */
export async function merge(
  inputs: ArrayBuffer[],
  opts: { blankBetween?: boolean } = {},
  onProgress: Progress = noop,
): Promise<ArrayBuffer> {
  const out = await PDFDocument.create();
  for (let i = 0; i < inputs.length; i++) {
    const src = await load(inputs[i]!);
    const copied = await out.copyPages(src, src.getPageIndices());
    for (const page of copied) out.addPage(page);
    if (opts.blankBetween && i < inputs.length - 1) {
      const last = out.getPage(out.getPageCount() - 1);
      out.addPage([last.getWidth(), last.getHeight()]);
    }
    onProgress((i + 1) / inputs.length);
  }
  if (out.getPageCount() === 0) throw new EmptyResultError();
  return save(out);
}

/** Build a new PDF from `keep` (1-based page numbers, in output order). */
async function rebuild(
  bytes: ArrayBuffer,
  keep: number[],
  onProgress: Progress,
): Promise<ArrayBuffer> {
  const src = await load(bytes);
  const total = src.getPageCount();
  const indices = keep.map((n) => n - 1).filter((i) => i >= 0 && i < total);
  if (indices.length === 0) throw new EmptyResultError();

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  for (let i = 0; i < copied.length; i++) {
    out.addPage(copied[i]!);
    if (i % 25 === 0) onProgress(i / copied.length);
  }
  onProgress(1);
  return save(out);
}

/** Keep only the given pages (1-based), in ascending order. */
export function extractPages(bytes: ArrayBuffer, keep: number[], onProgress: Progress = noop) {
  return rebuild(
    bytes,
    [...new Set(keep)].sort((a, b) => a - b),
    onProgress,
  );
}

/** Drop the given pages (1-based); keep the rest in their original order. */
export async function removePages(bytes: ArrayBuffer, drop: number[], onProgress: Progress = noop) {
  const total = await pageCount(bytes);
  const dropSet = new Set(drop);
  const keep: number[] = [];
  for (let n = 1; n <= total; n++) if (!dropSet.has(n)) keep.push(n);
  return rebuild(bytes, keep, onProgress);
}

/** Reorder pages to exactly `order` (1-based; may repeat/omit). */
export function reorderPages(bytes: ArrayBuffer, order: number[], onProgress: Progress = noop) {
  return rebuild(bytes, order, onProgress);
}

/** Rotate the given pages (1-based; empty = all) by `angle`, added to any existing rotation. */
export async function rotate(
  bytes: ArrayBuffer,
  angle: Angle,
  pages: number[] = [],
  onProgress: Progress = noop,
): Promise<ArrayBuffer> {
  const doc = await load(bytes);
  const wanted = pages.length ? new Set(pages) : null;
  const all = doc.getPages();
  all.forEach((page, i) => {
    if (!wanted || wanted.has(i + 1)) {
      page.setRotation(degrees((((page.getRotation().angle + angle) % 360) + 360) % 360));
    }
  });
  onProgress(1);
  return save(doc);
}

export type SplitMode =
  { type: 'everyN'; n: number } | { type: 'pages' } | { type: 'ranges'; ranges: number[][] };

export interface SplitFile {
  name: string;
  bytes: ArrayBuffer;
}

/** Split into several PDFs. Returns one entry per output file. */
export async function split(
  bytes: ArrayBuffer,
  mode: SplitMode,
  baseName: string,
  onProgress: Progress = noop,
): Promise<SplitFile[]> {
  const src = await load(bytes);
  const total = src.getPageCount();

  let groups: number[][]; // 0-based page indices per output file
  if (mode.type === 'pages') {
    groups = Array.from({ length: total }, (_, i) => [i]);
  } else if (mode.type === 'everyN') {
    const n = Math.max(1, Math.floor(mode.n));
    groups = [];
    for (let i = 0; i < total; i += n) {
      groups.push(Array.from({ length: Math.min(n, total - i) }, (_, k) => i + k));
    }
  } else {
    groups = mode.ranges
      .map((r) =>
        [...new Set(r)]
          .sort((a, b) => a - b)
          .map((n) => n - 1)
          .filter((i) => i >= 0 && i < total),
      )
      .filter((g) => g.length > 0);
  }
  if (groups.length === 0) throw new EmptyResultError();

  const files: SplitFile[] = [];
  for (let g = 0; g < groups.length; g++) {
    const idxs = groups[g]!;
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, idxs);
    for (const page of copied) out.addPage(page);
    const first = idxs[0]! + 1;
    const last = idxs[idxs.length - 1]! + 1;
    const suffix = first === last ? `p${first}` : `p${first}-${last}`;
    files.push({ name: `${baseName}-${suffix}.pdf`, bytes: await save(out) });
    onProgress((g + 1) / groups.length);
  }
  return files;
}
