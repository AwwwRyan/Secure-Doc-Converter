/**
 * Tier 2 Office→PDF: LibreOffice compiled to WebAssembly (ZetaOffice / ZetaJS),
 * driven headless via the UNO API. High fidelity, ~221 MB one-time engine
 * download.
 *
 * DEFERRED — see docs/09-decisions.md ADR-012. The engine AND the ZetaJS glue
 * (`zetaHelper.js`, `zeta.js`) are not in the app bundle; `pnpm
 * vendor:libreoffice` copies them to /vendor/libreoffice/ (stripping ZetaJS's
 * hard-coded CDN fallbacks) so everything is served same-origin and the app
 * bundle stays free of any third-party origin. Until the assets are present
 * `libreOfficeStatus()` reports `assets-missing` and the UI keeps this option
 * hidden. The convert path below follows the ZetaJS `convertpdf` example but
 * has NOT been verified end-to-end here — the activation checklist in
 * public/vendor/libreoffice/README.md covers that.
 */
import { detectOfficeKind, type OfficeKind } from '@/lib/convert/officeToPdf';

const BASE = '/vendor/libreoffice/';

export type LibreOfficeUnavailable = 'not-isolated' | 'assets-missing';
export type LibreOfficeStatus = { ok: true } | { ok: false; reason: LibreOfficeUnavailable };

let statusPromise: Promise<LibreOfficeStatus> | null = null;

/**
 * Can the high-fidelity tier run on this deployment / device? Needs cross-origin
 * isolation (SharedArrayBuffer) and the vendored engine served same-origin.
 * Cached for the page's lifetime.
 */
export function libreOfficeStatus(): Promise<LibreOfficeStatus> {
  statusPromise ??= (async (): Promise<LibreOfficeStatus> => {
    if (!globalThis.crossOriginIsolated) return { ok: false, reason: 'not-isolated' };
    try {
      // A plain 200 isn't enough: with the SPA rewrite, a missing asset returns
      // index.html (text/html). Require the real JS asset's content type.
      const res = await fetch(BASE + 'soffice.js', { method: 'HEAD' });
      const type = res.headers.get('content-type') ?? '';
      const present = res.ok && /javascript|ecmascript/i.test(type);
      return present ? { ok: true } : { ok: false, reason: 'assets-missing' };
    } catch {
      return { ok: false, reason: 'assets-missing' };
    }
  })();
  return statusPromise;
}

const PDF_FILTER: Record<OfficeKind, string> = {
  word: 'writer_pdf_Export',
  excel: 'calc_pdf_Export',
  powerpoint: 'impress_pdf_Export',
};

// The office-thread script: runs inside the LOWA worker, loads the doc and
// stores it back as PDF. A data: module URL, so there's no extra asset to
// vendor; it imports the thread helper by absolute same-origin path.
function threadModuleUrl(filter: string): string {
  const src = `
    import { ZetaHelperThread } from '${BASE}zetaHelper.js';
    const zHT = new ZetaHelperThread();
    const css = zHT.css;
    const hidden = new css.beans.PropertyValue({ Name: 'Hidden', Value: true });
    const overwrite = new css.beans.PropertyValue({ Name: 'Overwrite', Value: true });
    const pdf = new css.beans.PropertyValue({ Name: 'FilterName', Value: ${JSON.stringify(filter)} });
    zHT.thrPort.onmessage = (e) => {
      if (e.data.cmd !== 'convert') return;
      try {
        const m = zHT.desktop.loadComponentFromURL('file://' + e.data.from, '_blank', 0, [hidden]);
        m.storeToURL('file://' + e.data.to, [overwrite, pdf]);
        m.close(false);
        zHT.zetajs.mainPort.postMessage({ cmd: 'done', to: e.data.to });
      } catch (err) {
        const exc = zHT.zetajs.catchUnoException(err);
        zHT.zetajs.mainPort.postMessage({ cmd: 'fail', message: String(exc?.Message ?? err) });
      }
    };
    zHT.thrPort.postMessage({ cmd: 'ready' });
  `;
  return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(src);
}

/**
 * Convert one Office file to PDF via LibreOffice-WASM. Throws if the tier isn't
 * available (callers must gate on `libreOfficeStatus()` first).
 */
export async function libreOfficeConvert(file: File): Promise<ArrayBuffer> {
  const status = await libreOfficeStatus();
  if (!status.ok) {
    throw new Error(
      status.reason === 'not-isolated'
        ? "This browser tab isn't cross-origin isolated, so LibreOffice-WASM can't run here."
        : 'The high-fidelity converter is not installed on this deployment (see ADR-012).',
    );
  }
  const kind = detectOfficeKind(file.name, await file.slice(0, 65536).arrayBuffer());
  if (!kind) throw new Error('Unsupported file type for the high-fidelity converter.');

  // Loaded from our own origin (vendored by pnpm vendor:libreoffice), never the
  // npm package — keeps ZetaJS's CDN constants out of the app bundle.
  interface ZetaHelperMainI {
    thrPort: MessagePort;
    start(appInit: () => void): void;
  }
  const { ZetaHelperMain } = (await import(/* @vite-ignore */ BASE + 'zetaHelper.js')) as {
    ZetaHelperMain: new (
      threadJs: string,
      options: { threadJsType?: 'classic' | 'module'; wasmPkg?: string },
    ) => ZetaHelperMainI;
  };

  if (!document.getElementById('qtcanvas')) {
    const c = document.createElement('canvas');
    c.id = 'qtcanvas';
    c.style.display = 'none';
    document.body.appendChild(c);
  }

  const ext = file.name.slice(file.name.lastIndexOf('.')) || '.bin';
  const from = '/tmp/input' + ext;
  const to = '/tmp/output.pdf';

  const zHM = new ZetaHelperMain(threadModuleUrl(PDF_FILTER[kind]), {
    threadJsType: 'module',
    wasmPkg: 'url:' + BASE,
  });

  interface EmscriptenFs {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
  }
  const fs = () => (globalThis as unknown as { FS?: EmscriptenFs }).FS;

  return new Promise<ArrayBuffer>((resolve, reject) => {
    zHM.start(() => {
      zHM.thrPort.onmessage = (e: MessageEvent) => {
        if (e.data.cmd === 'ready') {
          void file.arrayBuffer().then((buf) => {
            fs()?.writeFile(from, new Uint8Array(buf));
            zHM.thrPort.postMessage({ cmd: 'convert', from, to });
          });
        } else if (e.data.cmd === 'done') {
          const out = fs()?.readFile(to);
          if (out) resolve(out.slice().buffer);
          else reject(new Error('LibreOffice produced no output.'));
        } else if (e.data.cmd === 'fail') {
          reject(new Error(e.data.message || 'LibreOffice conversion failed.'));
        }
      };
    });
  });
}
