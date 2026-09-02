import { PDFDocument, rgb } from '@cantoo/pdf-lib';

export type Progress = (fraction: number) => void;
const noop: Progress = () => {};

export type PageSize = 'fit' | 'a4' | 'letter';
export type Orientation = 'auto' | 'portrait' | 'landscape';

export interface ImageToPdfOptions {
  pageSize: PageSize;
  orientation: Orientation;
  /** Margin in points. */
  margin: number;
  /** White page background behind transparent images. */
  background: boolean;
}

const SIZES: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

function isJpeg(u8: Uint8Array): boolean {
  return u8.length > 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff;
}

function isPng(u8: Uint8Array): boolean {
  return u8.length > 7 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47;
}

/** Decode anything the browser can (webp/gif/bmp/…) to PNG bytes via a canvas. */
async function toPngBytes(u8: Uint8Array): Promise<Uint8Array> {
  const bmp = await createImageBitmap(new Blob([u8.slice().buffer]));
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
}

/** Build a PDF placing one image per page. */
export async function imageToPdf(
  inputs: ArrayBuffer[],
  o: ImageToPdfOptions,
  onProgress: Progress = noop,
): Promise<ArrayBuffer> {
  if (inputs.length === 0) throw new Error('Add at least one image.');
  const doc = await PDFDocument.create();

  for (let i = 0; i < inputs.length; i++) {
    const u8 = new Uint8Array(inputs[i]!);
    const img = isJpeg(u8)
      ? await doc.embedJpg(u8)
      : await doc.embedPng(isPng(u8) ? u8 : await toPngBytes(u8));

    const iw = img.width;
    const ih = img.height;

    let pw: number;
    let ph: number;
    if (o.pageSize === 'fit') {
      pw = iw + o.margin * 2;
      ph = ih + o.margin * 2;
    } else {
      let [a, b] = SIZES[o.pageSize];
      const landscape = o.orientation === 'landscape' || (o.orientation === 'auto' && iw > ih);
      if (landscape) [a, b] = [b, a];
      pw = a;
      ph = b;
    }

    const page = doc.addPage([pw, ph]);
    if (o.background) {
      page.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: rgb(1, 1, 1) });
    }

    const availW = Math.max(1, pw - o.margin * 2);
    const availH = Math.max(1, ph - o.margin * 2);
    const scale = Math.min(availW / iw, availH / ih, 1);
    const dw = iw * scale;
    const dh = ih * scale;
    page.drawImage(img, {
      x: (pw - dw) / 2,
      y: (ph - dh) / 2,
      width: dw,
      height: dh,
    });
    onProgress((i + 1) / inputs.length);
  }

  return (await doc.save({ useObjectStreams: true })).slice().buffer;
}
