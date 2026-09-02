import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from '@cantoo/pdf-lib';
import { compress, repair } from './optimize';
import { CorruptPdfError } from './errors';

async function makePdf(pages: number, withMeta = true): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  if (withMeta) {
    doc.setTitle('Secret Project Plan');
    doc.setAuthor('Jane Doe');
    doc.setKeywords(['confidential', 'internal']);
  }
  for (let i = 0; i < pages; i++) doc.addPage([400, 600]);
  return (await doc.save()).slice().buffer;
}

let ten: ArrayBuffer;
beforeAll(async () => {
  ten = await makePdf(10);
});

describe('compress (light)', () => {
  it('returns a valid PDF with the same page count', async () => {
    const { bytes, before, after } = await compress(ten, 'light');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(10);
    expect(before).toBe(ten.byteLength);
    expect(after).toBeLessThanOrEqual(before);
  });

  it('strips document metadata', async () => {
    const { bytes } = await compress(ten, 'light');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getTitle() ?? '').toBe('');
    expect(doc.getAuthor() ?? '').toBe('');
    expect(doc.getKeywords() ?? '').toBe('');
  });

  it('never returns something bigger than the input for a plain PDF', async () => {
    const { bytes } = await compress(ten, 'balanced');
    expect(bytes.byteLength).toBeLessThanOrEqual(ten.byteLength);
  });
});

describe('repair', () => {
  it('round-trips a healthy PDF', async () => {
    const out = await repair(ten);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(10);
  });

  it('recovers a file with trailing junk after %%EOF', async () => {
    const junked = new Uint8Array(ten.byteLength + 64);
    junked.set(new Uint8Array(ten));
    junked.fill(0x25, ten.byteLength); // '%' bytes
    const out = await repair(junked.buffer);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(10);
  });

  it('throws a clear error on unrecoverable garbage', async () => {
    const garbage = new TextEncoder().encode('this is definitely not a pdf').slice().buffer;
    await expect(repair(garbage)).rejects.toBeInstanceOf(CorruptPdfError);
  });
});
