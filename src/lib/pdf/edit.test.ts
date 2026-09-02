import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from '@cantoo/pdf-lib';
import { crop, pageNumbers, watermark } from './edit';

async function makePdf(n: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage([400, 600]);
  return (await doc.save()).slice().buffer;
}

let five: ArrayBuffer;
beforeAll(async () => {
  five = await makePdf(5);
});

const black = { r: 0, g: 0, b: 0 };

describe('watermark', () => {
  it('keeps the page count and produces a larger file', async () => {
    const out = await watermark(five, {
      text: 'DRAFT',
      fontSize: 48,
      opacity: 0.2,
      rotationDeg: 45,
      color: black,
      layout: 'center',
      bold: true,
      pages: [],
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(5);
    expect(out.byteLength).toBeGreaterThan(five.byteLength);
  });

  it('rejects empty text', async () => {
    await expect(
      watermark(five, {
        text: '   ',
        fontSize: 10,
        opacity: 1,
        rotationDeg: 0,
        color: black,
        layout: 'center',
        bold: false,
        pages: [],
      }),
    ).rejects.toThrow();
  });

  it('only marks the requested pages', async () => {
    const out = await watermark(five, {
      text: 'X',
      fontSize: 20,
      opacity: 1,
      rotationDeg: 0,
      color: black,
      layout: 'top',
      bold: false,
      pages: [2],
    });
    expect((await PDFDocument.load(out)).getPageCount()).toBe(5);
  });
});

describe('pageNumbers', () => {
  it('numbers every page and honours startAt', async () => {
    const out = await pageNumbers(five, {
      format: 'n-of-total',
      position: 'bottom-center',
      margin: 24,
      fontSize: 10,
      startAt: 1,
      color: black,
      skipFirst: false,
      pages: [],
    });
    expect((await PDFDocument.load(out)).getPageCount()).toBe(5);
  });

  it('skipFirst leaves the first page alone', async () => {
    const out = await pageNumbers(five, {
      format: 'roman',
      position: 'top-right',
      margin: 20,
      fontSize: 11,
      startAt: 1,
      color: black,
      skipFirst: true,
      pages: [],
    });
    expect((await PDFDocument.load(out)).getPageCount()).toBe(5);
  });
});

describe('crop', () => {
  it('shrinks the crop box by the given point margins', async () => {
    const out = await crop(five, {
      unit: 'pt',
      top: 50,
      right: 40,
      bottom: 30,
      left: 20,
      pages: [],
    });
    const doc = await PDFDocument.load(out);
    const box = doc.getPage(0).getCropBox();
    expect(Math.round(box.width)).toBe(400 - 20 - 40);
    expect(Math.round(box.height)).toBe(600 - 50 - 30);
  });

  it('supports percentage margins', async () => {
    const out = await crop(five, {
      unit: 'percent',
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
      pages: [1],
    });
    const box = (await PDFDocument.load(out)).getPage(0).getCropBox();
    expect(Math.round(box.width)).toBe(320);
    expect(Math.round(box.height)).toBe(480);
  });
});
