/**
 * Tier 2 Office→PDF: LibreOffice compiled to WebAssembly (ZetaOffice / ZetaJS),
 * driven headless via the UNO API. High fidelity, ~221 MB one-time engine
 * download.
 *
 * DEFERRED — see docs/09-decisions.md ADR-012. The engine, the ZetaJS glue
 * (`zetaHelper.js`, `zeta.js`) and the office-thread script are all vendored to
 * /vendor/libreoffice/ by `pnpm vendor:libreoffice`; nothing here is in the app
 * bundle and the runtime never touches a third-party origin. Until the assets
 * are present `libreOfficeStatus()` reports `assets-missing` and the UI keeps
 * this option hidden. The convert path follows the ZetaJS `convertpdf` example
 * but has NOT been verified end-to-end — activation checklist (incl. the
 * `data:`-script / CSP caveat) is in public/vendor/libreoffice/README.md.
 */
import { detectOfficeKind, type OfficeKind } from '@/lib/convert/officeToPdf';

const BASE = '/vendor/libreoffice/';
const READY_TIMEOUT_MS = 180_000; // engine boot: WASM compile + VFS mount
const CONVERT_TIMEOUT_MS = 300_000; // a single document

export type LibreOfficeUnavailable = 'not-isolated' | 'assets-missing';
export type LibreOfficeStatus = { ok: true } | { ok: false; reason: LibreOfficeUnavailable };

let okOnce: Promise<LibreOfficeStatus> | null = null;

/**
 * Can the high-fidelity tier run on this deployment / device? Needs cross-origin
 * isolation (SharedArrayBuffer) and the vendored engine served same-origin. A
 * successful result is cached; failures are re-probed (a transient network
 * hiccup on load shouldn't hide the tier for the whole session).
 */
export async function libreOfficeStatus(): Promise<LibreOfficeStatus> {
  if (okOnce) return okOnce;
  if (!globalThis.crossOriginIsolated) return { ok: false, reason: 'not-isolated' };

  let present: boolean;
  try {
    // A plain 200 isn't enough: with the SPA rewrite a missing asset returns
    // index.html (text/html). Require the real JS asset's content type.
    const res = await fetch(BASE + 'soffice.js', { method: 'HEAD' });
    present = res.ok && /javascript|ecmascript/i.test(res.headers.get('content-type') ?? '');
  } catch {
    present = false;
  }
  if (!present) return { ok: false, reason: 'assets-missing' };

  okOnce = Promise.resolve({ ok: true });
  return okOnce;
}

// Extension → module, for the legacy/ODF formats the lightweight tier can't
// sniff (it only recognises OOXML zips). LibreOffice opens all of these.
const EXT_KIND: Record<string, OfficeKind> = {
  doc: 'word',
  dot: 'word',
  docx: 'word',
  docm: 'word',
  odt: 'word',
  rtf: 'word',
  xls: 'excel',
  xlsx: 'excel',
  xlsm: 'excel',
  xlsb: 'excel',
  ods: 'excel',
  csv: 'excel',
  ppt: 'powerpoint',
  pptx: 'powerpoint',
  pptm: 'powerpoint',
  odp: 'powerpoint',
};

function libreOfficeKind(name: string, head: ArrayBuffer): OfficeKind | null {
  return (
    detectOfficeKind(name, head) ?? EXT_KIND[name.toLowerCase().split('.').pop() ?? ''] ?? null
  );
}

interface EmscriptenFs {
  writeFile: (path: string, data: Uint8Array) => void;
  readFile: (path: string) => Uint8Array;
  unlink?: (path: string) => void;
}
const getFs = (): EmscriptenFs | undefined => (globalThis as unknown as { FS?: EmscriptenFs }).FS;

interface ZetaHelperMainI {
  thrPort: MessagePort;
  start(appInit: () => void): void;
}
type ZetaHelperMainCtor = new (
  threadJs: string,
  options: { threadJsType?: 'classic' | 'module'; wasmPkg?: string },
) => ZetaHelperMainI;

type Job = { resolve: (bytes: ArrayBuffer) => void; reject: (err: Error) => void };
const jobs = new Map<string, Job>();

let engine: Promise<ZetaHelperMainI> | null = null;

/** Boot the engine once and reuse it — a second `new ZetaHelperMain` would
 * spin up a whole extra multi-hundred-MB instance and leak listeners. */
function getEngine(): Promise<ZetaHelperMainI> {
  engine ??= bootEngine().catch((err: unknown) => {
    engine = null; // let a later attempt retry from scratch
    throw err;
  });
  return engine;
}

async function bootEngine(): Promise<ZetaHelperMainI> {
  const mod = (await import(/* @vite-ignore */ BASE + 'zetaHelper.js')) as {
    ZetaHelperMain: ZetaHelperMainCtor;
  };

  if (!document.getElementById('qtcanvas')) {
    const c = document.createElement('canvas');
    c.id = 'qtcanvas';
    // Off-screen but laid out (a display:none canvas has no graphics context) —
    // same trick as officeToPdf.ts's makeHost.
    c.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;';
    document.body.appendChild(c);
  }

  const zHM = new mod.ZetaHelperMain(BASE + 'office_thread.js', {
    threadJsType: 'module',
    wasmPkg: 'url:' + BASE,
  });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('LibreOffice did not finish starting up (timed out).')),
      READY_TIMEOUT_MS,
    );
    zHM.start(() => {
      zHM.thrPort.onmessage = (e: MessageEvent) => {
        const d = e.data as { cmd: string; id?: string; to?: string; message?: string };
        if (d.cmd === 'ready') {
          clearTimeout(timer);
          resolve();
          return;
        }
        const job = d.id ? jobs.get(d.id) : undefined;
        if (!job || !d.id) return;
        jobs.delete(d.id);
        if (d.cmd === 'done') {
          const out = d.to ? getFs()?.readFile(d.to) : undefined;
          if (out) job.resolve(out.slice().buffer);
          else job.reject(new Error('LibreOffice produced no output.'));
        } else if (d.cmd === 'fail') {
          job.reject(new Error(d.message || 'LibreOffice conversion failed.'));
        }
      };
    });
  });
  return zHM;
}

/**
 * Convert one Office file to PDF via LibreOffice-WASM. Callers must gate on
 * `libreOfficeStatus()` first; this throws if the tier isn't available.
 */
export async function libreOfficeConvert(
  file: File,
): Promise<{ bytes: ArrayBuffer; kind: OfficeKind }> {
  const status = await libreOfficeStatus();
  if (!status.ok) {
    throw new Error(
      status.reason === 'not-isolated'
        ? "This browser tab isn't cross-origin isolated, so LibreOffice-WASM can't run here."
        : 'The high-fidelity converter is not installed on this deployment (see ADR-012).',
    );
  }

  const kind = libreOfficeKind(file.name, await file.slice(0, 65536).arrayBuffer());
  if (!kind) throw new Error('That file type is not supported.');

  const zHM = await getEngine();
  const fs = getFs();
  if (!fs) throw new Error("This LibreOffice build doesn't expose a filesystem handle.");

  const id = crypto.randomUUID();
  const dot = file.name.lastIndexOf('.');
  const from = `/tmp/in-${id}${dot > 0 ? file.name.slice(dot) : '.bin'}`;
  const to = `/tmp/out-${id}.pdf`;
  fs.writeFile(from, new Uint8Array(await file.arrayBuffer()));

  try {
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const timer = setTimeout(() => {
        jobs.delete(id);
        reject(new Error('LibreOffice conversion timed out.'));
      }, CONVERT_TIMEOUT_MS);
      jobs.set(id, {
        resolve: (b) => {
          clearTimeout(timer);
          resolve(b);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      zHM.thrPort.postMessage({ cmd: 'convert', id, from, to, kind });
    });
    return { bytes, kind };
  } finally {
    try {
      fs.unlink?.(from);
      fs.unlink?.(to);
    } catch {
      /* best effort */
    }
  }
}
