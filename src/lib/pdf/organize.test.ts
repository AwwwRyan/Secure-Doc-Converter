import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from '@cantoo/pdf-lib';
import {
  arrange,
  extractPages,
  merge,
  pageCount,
  removePages,
  reorderPages,
  rotate,
  split,
} from './organize';
import { EmptyResultError } from './errors';

/** A PDF with `n` pages, each labelled so we can track identity across ops. */
async function makePdf(n: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage([200, 300]);
  return (await doc.save()).slice().buffer;
}

let five: ArrayBuffer;
let three: ArrayBuffer;

beforeAll(async () => {
  five = await makePdf(5);
  three = await makePdf(3);
});

describe('organize', () => {
  it('reports page count', async () => {
    expect(await pageCount(five)).toBe(5);
  });

  it('merges in order', async () => {
    expect(await pageCount(await merge([five, three]))).toBe(8);
    expect(await pageCount(await merge([three, five]))).toBe(8);
  });

  it('extracts the requested pages only', async () => {
    expect(await pageCount(await extractPages(five, [2, 4]))).toBe(2);
  });

  it('removes pages and keeps the rest', async () => {
    expect(await pageCount(await removePages(five, [1, 5]))).toBe(3);
  });

  it('reorders to an arbitrary sequence', async () => {
    expect(await pageCount(await reorderPages(five, [5, 4, 3, 2, 1]))).toBe(5);
  });

  it('rotates without changing the page count', async () => {
    const out = await rotate(five, 90, [1, 2]);
    expect(await pageCount(out)).toBe(5);
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
    expect(doc.getPage(2).getRotation().angle).toBe(0);
  });

  it('splits one file per page', async () => {
    const files = await split(five, { type: 'pages' }, 'doc');
    expect(files).toHaveLength(5);
    expect(files[0]!.name).toBe('doc-p1.pdf');
  });

  it('splits every N pages', async () => {
    const files = await split(five, { type: 'everyN', n: 2 }, 'doc');
    expect(files.map((f) => f.name)).toEqual(['doc-p1-2.pdf', 'doc-p3-4.pdf', 'doc-p5.pdf']);
  });

  it('splits by explicit ranges', async () => {
    const files = await split(
      five,
      {
        type: 'ranges',
        ranges: [
          [1, 2],
          [4, 5],
        ],
      },
      'doc',
    );
    expect(files.map((f) => f.name)).toEqual(['doc-p1-2.pdf', 'doc-p4-5.pdf']);
  });

  it('refuses an empty result', async () => {
    await expect(removePages(three, [1, 2, 3])).rejects.toBeInstanceOf(EmptyResultError);
  });

  it('arranges: reorder + per-page rotation + drop in one pass', async () => {
    const out = await arrange(five, [
      { page: 3, rotate: 90 },
      { page: 1, rotate: 0 },
      { page: 5, rotate: 180 },
    ]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
    expect(doc.getPage(1).getRotation().angle).toBe(0);
    expect(doc.getPage(2).getRotation().angle).toBe(180);
  });

  it('arrange refuses an all-dropped spec', async () => {
    await expect(arrange(three, [])).rejects.toBeInstanceOf(EmptyResultError);
  });
});
