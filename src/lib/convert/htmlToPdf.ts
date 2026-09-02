import { rasterise, slicedCanvasToPdf, type PdfPageSize } from '@/lib/convert/canvasToPdf';

export interface HtmlToPdfOptions {
  html: string;
  pageSize: PdfPageSize;
  /** Margin in points. */
  margin: number;
}

const RENDER_WIDTH = 794; // ~A4 width at 96dpi

/**
 * Render self-contained HTML to a PDF, entirely in the browser. The markup is
 * loaded into a sandboxed, script-disabled iframe; the page CSP already blocks
 * external CSS / JS / images, so only inline and `data:` assets render — a
 * safety property, not a bug. html2canvas rasterises it; the tall image is
 * sliced across pages.
 */
export async function htmlToPdf(o: HtmlToPdfOptions): Promise<ArrayBuffer> {
  if (!o.html.trim()) throw new Error('Paste some HTML or choose a .html file.');

  const iframe = document.createElement('iframe');
  // allow-same-origin so we can read the rendered DOM; NO allow-scripts.
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.style.cssText =
    'position:fixed;left:-10000px;top:0;width:' + RENDER_WIDTH + 'px;height:10px;border:0;';
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve) => {
      iframe.addEventListener('load', () => resolve(), { once: true });
      iframe.srcdoc = /^\s*<(!doctype|html)/i.test(o.html)
        ? o.html
        : `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff;font-family:system-ui,sans-serif">${o.html}`;
      setTimeout(resolve, 2500); // srcdoc sometimes fires no load event
    });

    const body = iframe.contentDocument?.body;
    if (!body) throw new Error('Could not read the rendered HTML.');
    await new Promise((r) => setTimeout(r, 60)); // give layout a tick

    const canvas = await rasterise(body, RENDER_WIDTH);
    return slicedCanvasToPdf(canvas, { pageSize: o.pageSize, marginPt: o.margin });
  } finally {
    iframe.remove();
  }
}
