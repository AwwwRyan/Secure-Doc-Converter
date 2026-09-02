import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export type PdfPageSize = 'a4' | 'letter';
export type PdfOrientation = 'portrait' | 'landscape';

export interface PdfLayout {
  pageSize: PdfPageSize;
  orientation?: PdfOrientation;
  /** Page margin in points. */
  marginPt: number;
}

/**
 * Rasterise a DOM element with html2canvas. The element must already be in the
 * document and laid out at `renderWidth` px. `scale: 2` keeps text legible;
 * external assets never load (the page CSP blocks them) so `useCORS`/
 * `allowTaint` are off deliberately.
 */
export async function rasterise(el: HTMLElement, renderWidth: number): Promise<HTMLCanvasElement> {
  const canvas = await html2canvas(el, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: false,
    allowTaint: false,
    windowWidth: renderWidth,
    width: renderWidth,
  });
  if (canvas.width === 0 || canvas.height === 0) throw new Error('Nothing to render.');
  return canvas;
}

function startPdf(o: PdfLayout): { pdf: jsPDF; pageW: number; pageH: number; m: number } {
  const pdf = new jsPDF({
    unit: 'pt',
    format: o.pageSize,
    orientation: o.orientation ?? 'portrait',
    compress: true,
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const m = Math.max(0, Math.min(o.marginPt, pageW / 3, pageH / 3));
  return { pdf, pageW, pageH, m };
}

/**
 * One tall canvas sliced down consecutive pages (flowing documents: HTML, Word,
 * long spreadsheets). The same image is placed on each page at a negative
 * offset so the visible band advances.
 */
export function slicedCanvasToPdf(canvas: HTMLCanvasElement, o: PdfLayout): ArrayBuffer {
  const { pdf, pageW, pageH, m } = startPdf(o);
  const imgW = pageW - m * 2;
  const imgH = (canvas.height / canvas.width) * imgW;
  const usableH = pageH - m * 2;
  const img = canvas.toDataURL('image/jpeg', 0.92);

  let heightLeft = imgH;
  pdf.addImage(img, 'JPEG', m, m, imgW, imgH);
  heightLeft -= usableH;
  while (heightLeft > 0) {
    pdf.addPage();
    pdf.addImage(img, 'JPEG', m, m - (imgH - heightLeft), imgW, imgH);
    heightLeft -= usableH;
  }
  return pdf.output('arraybuffer');
}

/**
 * Several canvases, one per page, each scaled to fit inside the margins and
 * centred (slide decks: one slide → one page).
 */
export function pagedCanvasesToPdf(canvases: HTMLCanvasElement[], o: PdfLayout): ArrayBuffer {
  if (canvases.length === 0) throw new Error('Nothing to render.');
  const { pdf, pageW, pageH, m } = startPdf(o);
  const availW = pageW - m * 2;
  const availH = pageH - m * 2;

  canvases.forEach((canvas, i) => {
    if (i > 0) pdf.addPage();
    const scale = Math.min(availW / canvas.width, availH / canvas.height);
    const w = canvas.width * scale;
    const h = canvas.height * scale;
    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.92),
      'JPEG',
      (pageW - w) / 2,
      (pageH - h) / 2,
      w,
      h,
    );
  });
  return pdf.output('arraybuffer');
}
