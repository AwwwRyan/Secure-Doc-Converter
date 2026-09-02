import {
  pagedCanvasesToPdf,
  rasterise,
  slicedCanvasToPdf,
  type PdfLayout,
  type PdfPageSize,
} from '@/lib/convert/canvasToPdf';

export type OfficeKind = 'word' | 'excel' | 'powerpoint';

export interface OfficeToPdfOptions {
  pageSize: PdfPageSize;
  /** Margin in points. */
  margin: number;
}

export type Progress = (fraction: number, label?: string) => void;
const noop: Progress = () => {};

const DOCX_W = 820; // px — a Letter-ish page width for Word / Excel flow
const XLSX_W = 1100; // px — spreadsheets are wide; render landscape

/** Best-effort type sniff: extension first, then a scan of the zip for the
 * tell-tale part names. Returns null for formats this tier can't open
 * (legacy .doc/.xls/.ppt, or anything not an OOXML zip). */
export function detectOfficeKind(name: string, bytes: ArrayBuffer): OfficeKind | null {
  const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
  if (ext === 'docx' || ext === 'docm') return 'word';
  if (ext === 'xlsx' || ext === 'xlsm' || ext === 'xlsb') return 'excel';
  if (ext === 'pptx' || ext === 'pptm') return 'powerpoint';

  const u8 = new Uint8Array(bytes);
  const isZip = u8[0] === 0x50 && u8[1] === 0x4b && u8[2] === 0x03 && u8[3] === 0x04;
  if (!isZip) return null;
  const head = new TextDecoder('latin1').decode(u8.subarray(0, Math.min(u8.length, 65536)));
  if (head.includes('word/document.xml')) return 'word';
  if (head.includes('xl/workbook.xml')) return 'excel';
  if (head.includes('ppt/presentation.xml')) return 'powerpoint';
  return null;
}

/** An off-screen host the renderers can lay out into and html2canvas can read. */
function makeHost(widthPx: number): HTMLElement {
  const host = document.createElement('div');
  host.style.cssText =
    `position:fixed;left:-10000px;top:0;width:${widthPx}px;` +
    'background:#fff;color:#111;font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;';
  document.body.appendChild(host);
  return host;
}

async function wordToPdf(
  file: File,
  o: OfficeToPdfOptions,
  onProgress: Progress,
): Promise<ArrayBuffer> {
  const { renderAsync } = await import('docx-preview');
  const host = makeHost(DOCX_W);
  try {
    onProgress(0.2, 'Reading document…');
    await renderAsync(file, host, undefined, {
      inWrapper: false,
      ignoreWidth: false,
      ignoreHeight: false, // keep the document's own page breaks
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
      useBase64URL: true,
      className: 'docx',
    });
    await new Promise((r) => setTimeout(r, 80));

    const layout: PdfLayout = { pageSize: o.pageSize, marginPt: o.margin };
    // docx-preview renders one <section> per source page — map each to a PDF
    // page so pagination matches Word. Fall back to a single sliced image.
    const sections = Array.from(host.querySelectorAll<HTMLElement>('section.docx'));
    if (sections.length === 0) {
      onProgress(0.6, 'Rendering…');
      return slicedCanvasToPdf(await rasterise(host, DOCX_W), layout);
    }
    const canvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < sections.length; i++) {
      canvases.push(await rasterise(sections[i]!, sections[i]!.offsetWidth || DOCX_W));
      onProgress(0.4 + (0.5 * (i + 1)) / sections.length, `Page ${i + 1} of ${sections.length}`);
    }
    return pagedCanvasesToPdf(canvases, layout);
  } finally {
    host.remove();
  }
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) =>
      (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }) as Record<string, string>)[c]!,
  );
}

async function excelToPdf(
  file: File,
  o: OfficeToPdfOptions,
  onProgress: Progress,
): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx');
  onProgress(0.2, 'Reading workbook…');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  if (wb.SheetNames.length === 0) throw new Error('That workbook has no sheets.');

  const host = makeHost(XLSX_W);
  host.style.font = '12px/1.4 system-ui,-apple-system,Segoe UI,sans-serif';
  const style = document.createElement('style');
  style.textContent =
    '.xl-sheet{margin:0 0 28px}.xl-sheet h2{font:600 14px system-ui;margin:0 0 8px}' +
    '.xl-sheet table{border-collapse:collapse;width:100%}' +
    '.xl-sheet td,.xl-sheet th{border:1px solid #bbb;padding:3px 6px;text-align:left;' +
    'vertical-align:top;white-space:nowrap}';
  host.appendChild(style);

  try {
    wb.SheetNames.forEach((sheetName) => {
      const table = XLSX.utils.sheet_to_html(wb.Sheets[sheetName]!, { editable: false });
      const block = document.createElement('div');
      block.className = 'xl-sheet';
      block.innerHTML = `<h2>${escapeHtml(sheetName)}</h2>${table}`;
      host.appendChild(block);
    });
    onProgress(0.6, 'Rendering…');
    await new Promise((r) => setTimeout(r, 80));
    const canvas = await rasterise(host, XLSX_W);
    onProgress(0.9, 'Building PDF…');
    return slicedCanvasToPdf(canvas, {
      pageSize: o.pageSize,
      orientation: 'landscape',
      marginPt: o.margin,
    });
  } finally {
    host.remove();
  }
}

async function powerpointToPdf(
  file: File,
  o: OfficeToPdfOptions,
  onProgress: Progress,
): Promise<ArrayBuffer> {
  const { init } = await import('pptx-preview');
  const host = makeHost(1280);
  try {
    onProgress(0.2, 'Reading slides…');
    const previewer = init(host, { mode: 'list', width: 1280, height: 720 });
    await previewer.preview(await file.arrayBuffer());
    await new Promise((r) => setTimeout(r, 120));

    const slides = Array.from(host.querySelectorAll<HTMLElement>('.pptx-preview-slide-wrapper'));
    if (slides.length === 0) throw new Error('No slides were found in that file.');

    const canvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < slides.length; i++) {
      canvases.push(await rasterise(slides[i]!, slides[i]!.offsetWidth || 1280));
      onProgress(0.3 + (0.6 * (i + 1)) / slides.length, `Slide ${i + 1} of ${slides.length}`);
    }
    previewer.destroy();
    return pagedCanvasesToPdf(canvases, {
      pageSize: o.pageSize,
      orientation: 'landscape',
      marginPt: o.margin,
    });
  } finally {
    host.remove();
  }
}

/**
 * Convert a Word / Excel / PowerPoint file to a PDF entirely in the browser.
 * Each format's renderer is dynamically imported so its weight only loads when
 * that format is actually used. This is an approximation — fonts, exact
 * pagination and complex layouts will differ from the source app. The
 * LibreOffice-WASM tier is the high-fidelity path.
 */
export async function officeToPdf(
  file: File,
  o: OfficeToPdfOptions,
  onProgress: Progress = noop,
): Promise<{ bytes: ArrayBuffer; kind: OfficeKind }> {
  const kind = detectOfficeKind(file.name, await file.slice(0, 65536).arrayBuffer());
  if (!kind) {
    throw new Error(
      'Unsupported file. This tier opens .docx, .xlsx and .pptx. For legacy ' +
        '.doc/.xls/.ppt, re-save as the newer format or use the high-fidelity converter.',
    );
  }
  onProgress(0.05, 'Loading converter…');
  const bytes =
    kind === 'word'
      ? await wordToPdf(file, o, onProgress)
      : kind === 'excel'
        ? await excelToPdf(file, o, onProgress)
        : await powerpointToPdf(file, o, onProgress);
  onProgress(1, 'Done');
  return { bytes, kind };
}
