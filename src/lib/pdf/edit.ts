import {
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  rotateRadians,
  StandardFonts,
  translate,
} from '@cantoo/pdf-lib';
import { CorruptPdfError, EmptyResultError, EncryptedPdfError } from '@/lib/pdf/errors';

export type Progress = (fraction: number) => void;
const noop: Progress = () => {};

export interface RGB {
  r: number;
  g: number;
  b: number;
}

function bytesToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.slice().buffer;
}

async function load(bytes: ArrayBuffer): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'EncryptedPDFError' || /encrypt/i.test(String(err))) throw new EncryptedPdfError();
    throw new CorruptPdfError(err instanceof Error ? err.message : undefined);
  }
}

async function save(doc: PDFDocument): Promise<ArrayBuffer> {
  return bytesToArrayBuffer(await doc.save({ useObjectStreams: true }));
}

/** Resolve `pages` (1-based; empty = all) to a Set of 0-based indices. */
function targetSet(pages: number[], total: number): Set<number> {
  if (pages.length === 0) return new Set(Array.from({ length: total }, (_, i) => i));
  return new Set(pages.filter((n) => n >= 1 && n <= total).map((n) => n - 1));
}

const toRoman = (n: number): string => {
  if (n <= 0) return String(n);
  const map: Array<[number, string]> = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];
  let out = '';
  let v = n;
  for (const [num, sym] of map) {
    while (v >= num) {
      out += sym;
      v -= num;
    }
  }
  return out;
};

// ---------------------------------------------------------------- watermark

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  opacity: number; // 0..1
  rotationDeg: number;
  color: RGB;
  layout: 'center' | 'tile' | 'top' | 'bottom';
  bold: boolean;
  pages: number[];
}

export async function watermark(
  bytes: ArrayBuffer,
  o: WatermarkOptions,
  onProgress: Progress = noop,
): Promise<ArrayBuffer> {
  if (!o.text.trim()) throw new Error('Enter watermark text.');
  const doc = await load(bytes);
  const font = await doc.embedFont(o.bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);
  const pages = doc.getPages();
  const targets = targetSet(o.pages, pages.length);
  const color = rgb(o.color.r, o.color.g, o.color.b);

  // Banners are horizontal by definition; only centre / tile use the angle.
  const banner = o.layout === 'top' || o.layout === 'bottom';
  const angleRad = banner ? 0 : (o.rotationDeg * Math.PI) / 180;

  pages.forEach((page, i) => {
    if (!targets.has(i)) return;
    const pw = page.getWidth();
    const ph = page.getHeight();
    const tw = font.widthOfTextAtSize(o.text, o.fontSize);

    /**
     * Stamp the text so its visual centre lands exactly at (cx, cy), rotated
     * about that point. `translate` then `rotateRadians` composes to
     * "rotate about (cx, cy)"; the text is then drawn centred on the local
     * origin.
     */
    const stamp = (cx: number, cy: number) => {
      page.pushOperators(pushGraphicsState(), translate(cx, cy), rotateRadians(angleRad));
      page.drawText(o.text, {
        x: -tw / 2,
        y: -o.fontSize * 0.34, // baseline offset so the glyph body straddles y=0
        size: o.fontSize,
        font,
        color,
        opacity: o.opacity,
      });
      page.pushOperators(popGraphicsState());
    };

    if (o.layout === 'tile') {
      const stepX = Math.max(tw * 0.9 + o.fontSize, 150);
      const stepY = Math.max(o.fontSize * 3.4, 120);
      for (let y = stepY / 2; y < ph + stepY; y += stepY) {
        for (let x = stepX / 2; x < pw + stepX; x += stepX) stamp(x, y);
      }
    } else if (o.layout === 'top') {
      stamp(pw / 2, ph - Math.max(o.fontSize, 26));
    } else if (o.layout === 'bottom') {
      stamp(pw / 2, Math.max(o.fontSize * 0.9, 22));
    } else {
      stamp(pw / 2, ph / 2);
    }
    onProgress((i + 1) / pages.length);
  });

  return save(doc);
}

// -------------------------------------------------------------- page numbers

export type NumberFormat = 'n' | 'n-of-total' | 'page-n-of-total' | 'roman';
export type NumberPosition =
  'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';

export interface PageNumberOptions {
  format: NumberFormat;
  position: NumberPosition;
  margin: number;
  fontSize: number;
  startAt: number;
  color: RGB;
  skipFirst: boolean;
  pages: number[];
}

export async function pageNumbers(
  bytes: ArrayBuffer,
  o: PageNumberOptions,
  onProgress: Progress = noop,
): Promise<ArrayBuffer> {
  const doc = await load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const targets = [...targetSet(o.pages, pages.length)].sort((a, b) => a - b);
  const numbered = o.skipFirst ? targets.filter((idx) => idx !== 0) : targets;
  const total = numbered.length;
  const color = rgb(o.color.r, o.color.g, o.color.b);

  numbered.forEach((idx, seq) => {
    const page = pages[idx]!;
    const n = o.startAt + seq;
    let label: string;
    if (o.format === 'roman') label = toRoman(n);
    else if (o.format === 'n-of-total') label = `${n} / ${total}`;
    else if (o.format === 'page-n-of-total') label = `Page ${n} of ${total}`;
    else label = String(n);

    const w = font.widthOfTextAtSize(label, o.fontSize);
    const pw = page.getWidth();
    const ph = page.getHeight();
    const isTop = o.position.startsWith('top');
    const y = isTop ? ph - o.margin - o.fontSize : o.margin;
    let x: number;
    if (o.position.endsWith('left')) x = o.margin;
    else if (o.position.endsWith('right')) x = pw - o.margin - w;
    else x = (pw - w) / 2;

    page.drawText(label, { x, y, size: o.fontSize, font, color });
    onProgress((seq + 1) / total);
  });

  return save(doc);
}

// --------------------------------------------------------------------- crop

export interface CropOptions {
  unit: 'pt' | 'percent';
  top: number;
  right: number;
  bottom: number;
  left: number;
  pages: number[];
}

export async function crop(
  bytes: ArrayBuffer,
  o: CropOptions,
  onProgress: Progress = noop,
): Promise<ArrayBuffer> {
  const doc = await load(bytes);
  const pages = doc.getPages();
  const targets = targetSet(o.pages, pages.length);

  pages.forEach((page, i) => {
    if (!targets.has(i)) return;
    const box = page.getCropBox();
    const fx = o.unit === 'percent' ? box.width / 100 : 1;
    const fy = o.unit === 'percent' ? box.height / 100 : 1;
    const left = Math.max(0, o.left * fx);
    const right = Math.max(0, o.right * fx);
    const top = Math.max(0, o.top * fy);
    const bottom = Math.max(0, o.bottom * fy);
    const w = box.width - left - right;
    const h = box.height - top - bottom;
    if (w > 1 && h > 1) page.setCropBox(box.x + left, box.y + bottom, w, h);
    onProgress((i + 1) / pages.length);
  });

  if (pages.length === 0) throw new EmptyResultError();
  return save(doc);
}
