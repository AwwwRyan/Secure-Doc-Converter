import * as pdfjs from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();

export interface Thumb {
  /** 1-based page number in the *original* document. */
  page: number;
  url: string;
  width: number;
  height: number;
}

/** Open a PDF with pdf.js. Caller must `closePdf()` the returned doc when done. */
export function openPdf(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  return pdfjs.getDocument({ data: bytes.slice(0) }).promise;
}

/** Release a doc opened with `openPdf` (its `.destroy()` is missing from the types). */
export function closePdf(doc: PDFDocumentProxy): void {
  void (doc as unknown as { destroy?: () => Promise<void> }).destroy?.();
}

/** Render one page (1-based) of an already-open doc to a fresh canvas. */
export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  page: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const pdfPage = await doc.getPage(page);
  const viewport = pdfPage.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
  pdfPage.cleanup();
  return canvas;
}

/**
 * One-shot render of a document's first page to a self-contained data URL
 * (no cleanup needed). Used for the Edit tools' live preview.
 */
export async function renderFirstPage(bytes: ArrayBuffer, targetWidth = 560): Promise<string> {
  const doc = await openPdf(bytes);
  try {
    const base = (await doc.getPage(1)).getViewport({ scale: 1 });
    const canvas = await renderPageToCanvas(doc, 1, targetWidth / base.width);
    return canvas.toDataURL('image/png');
  } finally {
    closePdf(doc);
  }
}

/**
 * Lazily renders page thumbnails for one PDF. pdf.js parses in its own worker;
 * we rasterise on demand (the grid only asks for visible pages) and hand back
 * object URLs the caller must revoke.
 */
export class Thumbnailer {
  private task: PDFDocumentLoadingTask;
  private docPromise: Promise<PDFDocumentProxy>;
  private urls = new Set<string>();
  private cache = new Map<number, Promise<Thumb>>();
  private destroyed = false;

  constructor(data: ArrayBuffer) {
    // pdf.js transfers/detaches the buffer it's given; hand it a copy so the
    // caller keeps theirs.
    this.task = pdfjs.getDocument({ data: data.slice(0) });
    this.docPromise = this.task.promise;
  }

  async pageCount(): Promise<number> {
    return (await this.docPromise).numPages;
  }

  /** Cached per page — repeated calls for the same page share one render. */
  render(page: number, targetWidth = 220): Promise<Thumb> {
    let pending = this.cache.get(page);
    if (!pending) {
      pending = this.renderUncached(page, targetWidth);
      this.cache.set(page, pending);
    }
    return pending;
  }

  private async renderUncached(page: number, targetWidth: number): Promise<Thumb> {
    const doc = await this.docPromise;
    if (this.destroyed) throw new Error('thumbnailer destroyed');

    const pdfPage = await doc.getPage(page);
    const base = pdfPage.getViewport({ scale: 1 });
    const scale = targetWidth / base.width;
    const viewport = pdfPage.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d canvas unavailable');

    await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
    pdfPage.cleanup();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('thumbnail encode failed');
    const url = URL.createObjectURL(blob);
    this.urls.add(url);
    return { page, url, width: canvas.width, height: canvas.height };
  }

  revoke(url: string): void {
    if (this.urls.delete(url)) URL.revokeObjectURL(url);
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.cache.clear();
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.urls.clear();
    try {
      await this.task.destroy();
    } catch {
      /* already gone */
    }
  }
}
