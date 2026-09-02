import { PDFArray, PDFDocument, PDFName, PDFNumber, PDFRawStream } from '@cantoo/pdf-lib';
import { CorruptPdfError, EncryptedPdfError } from '@/lib/pdf/errors';

export type Progress = (fraction: number) => void;
const noop: Progress = () => {};

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.slice().buffer;
}

async function load(
  bytes: ArrayBuffer,
  opts: Parameters<typeof PDFDocument.load>[1] = {},
): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false, ...opts });
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'EncryptedPDFError' || /encrypt/i.test(String(err))) throw new EncryptedPdfError();
    throw new CorruptPdfError(err instanceof Error ? err.message : undefined);
  }
}

function stripMetadata(doc: PDFDocument): void {
  try {
    doc.setTitle('');
    doc.setAuthor('');
    doc.setSubject('');
    doc.setKeywords([]);
    doc.setProducer('');
    doc.setCreator('');
    doc.catalog.delete(PDFName.of('Metadata'));
  } catch {
    /* best effort */
  }
}

export type CompressPreset = 'light' | 'balanced' | 'screen';

interface PresetCfg {
  recompress: boolean;
  quality: number;
  maxDim: number;
}
const PRESETS: Record<CompressPreset, PresetCfg> = {
  light: { recompress: false, quality: 1, maxDim: Number.POSITIVE_INFINITY },
  balanced: { recompress: true, quality: 0.72, maxDim: 2400 },
  screen: { recompress: true, quality: 0.55, maxDim: 1600 },
};

export interface CompressResult {
  bytes: ArrayBuffer;
  before: number;
  after: number;
  imagesRecompressed: number;
}

function filterName(dict: PDFRawStream['dict']): string | undefined {
  const f = dict.get(PDFName.of('Filter'));
  if (f instanceof PDFArray) return f.size() > 0 ? f.get(0)?.toString() : undefined;
  return f?.toString();
}

function numberOf(dict: PDFRawStream['dict'], key: string): number {
  const v = dict.get(PDFName.of(key));
  return v instanceof PDFNumber ? v.asNumber() : 0;
}

/**
 * Shrink a PDF, in the browser:
 *  - always: strip metadata, repack with object streams
 *  - balanced / screen: re-encode embedded JPEG (DCTDecode) images at a lower
 *    quality and (if very large) a smaller size, via OffscreenCanvas.
 * Other image types (PNG-style Flate, CCITT, JPX, masked/alpha) are left alone
 * — this is the conservative, MIT-only path (docs/02, ADR-006).
 */
export async function compress(
  bytes: ArrayBuffer,
  preset: CompressPreset,
  onProgress: Progress = noop,
): Promise<CompressResult> {
  const before = bytes.byteLength;
  const doc = await load(bytes);
  const cfg = PRESETS[preset];
  stripMetadata(doc);

  let imagesRecompressed = 0;
  const canUseCanvas =
    typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function';

  if (cfg.recompress && canUseCanvas) {
    const objs = doc.context.enumerateIndirectObjects();
    for (let i = 0; i < objs.length; i++) {
      onProgress(0.05 + 0.85 * (i / Math.max(1, objs.length)));
      const entry = objs[i];
      if (!entry) continue;
      const [ref, obj] = entry;
      if (!(obj instanceof PDFRawStream)) continue;
      const dict = obj.dict;
      if (dict.get(PDFName.of('Subtype'))?.toString() !== '/Image') continue;
      if (filterName(dict) !== '/DCTDecode') continue;
      if (dict.has(PDFName.of('SMask')) || dict.has(PDFName.of('Mask'))) continue;

      const w = numberOf(dict, 'Width');
      const h = numberOf(dict, 'Height');
      const raw = obj.contents;
      if (w < 8 || h < 8 || raw.byteLength < 16_000) continue;

      try {
        const bmp = await createImageBitmap(new Blob([raw.slice().buffer], { type: 'image/jpeg' }));
        const scale = Math.min(1, cfg.maxDim / Math.max(bmp.width, bmp.height));
        const dw = Math.max(1, Math.round(bmp.width * scale));
        const dh = Math.max(1, Math.round(bmp.height * scale));
        const canvas = new OffscreenCanvas(dw, dh);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          bmp.close();
          continue;
        }
        ctx.drawImage(bmp, 0, 0, dw, dh);
        bmp.close();
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: cfg.quality });
        const out = new Uint8Array(await blob.arrayBuffer());
        if (out.byteLength >= raw.byteLength * 0.95) continue; // <5% gain — keep original

        dict.set(PDFName.of('Width'), PDFNumber.of(dw));
        dict.set(PDFName.of('Height'), PDFNumber.of(dh));
        dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
        dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
        dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
        dict.delete(PDFName.of('DecodeParms'));
        dict.delete(PDFName.of('DecodeParams'));
        dict.delete(PDFName.of('Decode'));
        doc.context.assign(ref, PDFRawStream.of(dict, out));
        imagesRecompressed++;
      } catch {
        /* leave this image as-is */
      }
    }
  }

  onProgress(0.95);
  const saved = await doc.save({ useObjectStreams: true });
  const after = saved.byteLength;

  // Never hand back something bigger than the original with nothing gained.
  if (after >= before && imagesRecompressed === 0) {
    return { bytes, before, after: before, imagesRecompressed: 0 };
  }
  return { bytes: toArrayBuffer(saved), before, after, imagesRecompressed };
}

/** Best-effort recovery: tolerant reload, then re-serialise. */
export async function repair(
  bytes: ArrayBuffer,
  onProgress: Progress = noop,
): Promise<ArrayBuffer> {
  onProgress(0.15);
  let doc: PDFDocument;
  try {
    doc = await load(bytes, { throwOnInvalidObject: false, ignoreEncryption: true });
  } catch {
    throw new CorruptPdfError('the file structure is too damaged to rebuild');
  }
  if (doc.getPageCount() === 0) throw new CorruptPdfError('no readable pages were found');
  onProgress(0.7);
  const out = await doc.save({ useObjectStreams: true });
  onProgress(1);
  return toArrayBuffer(out);
}
