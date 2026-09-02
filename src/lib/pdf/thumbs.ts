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
