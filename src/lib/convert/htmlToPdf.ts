import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface HtmlToPdfOptions {
  html: string;
  pageSize: 'a4' | 'letter';
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
    // give layout a tick
    await new Promise((r) => setTimeout(r, 60));

    const canvas = await html2canvas(body, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: false,
      allowTaint: false,
      windowWidth: RENDER_WIDTH,
      width: RENDER_WIDTH,
    });
    if (canvas.width === 0 || canvas.height === 0) throw new Error('Nothing to render.');

    const pdf = new jsPDF({ unit: 'pt', format: o.pageSize, compress: true });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const m = Math.min(o.margin, pageW / 3, pageH / 3);
    const imgW = pageW - m * 2;
    const imgH = (canvas.height / canvas.width) * imgW;
    const usableH = pageH - m * 2;
    const img = canvas.toDataURL('image/jpeg', 0.92);

    let heightLeft = imgH;
    let y = m;
    pdf.addImage(img, 'JPEG', m, y, imgW, imgH);
    heightLeft -= usableH;
    while (heightLeft > 0) {
      pdf.addPage();
      y = m - (imgH - heightLeft);
      pdf.addImage(img, 'JPEG', m, y, imgW, imgH);
      heightLeft -= usableH;
    }
    return pdf.output('arraybuffer');
  } finally {
    iframe.remove();
  }
}
