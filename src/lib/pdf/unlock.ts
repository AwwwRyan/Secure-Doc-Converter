import createQpdf from '@neslinesli93/qpdf-wasm';

// The package's .d.ts omits writeFile/analyzePath; Emscripten's FS has them.
interface QpdfFS {
  writeFile(path: string, data: Uint8Array): void;
  readFile(path: string): Uint8Array;
}

export class UnlockError extends Error {
  constructor(
    message: string,
    readonly reason: 'password' | 'not-encrypted' | 'failed',
  ) {
    super(message);
    this.name = 'UnlockError';
  }
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.slice().buffer;
}

/**
 * Remove encryption from a PDF using qpdf (WASM).
 *  - no password + owner-only restrictions → decrypts with the empty password
 *  - user password supplied → `--password=…`
 *
 * It does NOT and will not guess passwords. Wrong / missing password → UnlockError.
 */
export async function unlock(bytes: ArrayBuffer, password: string): Promise<ArrayBuffer> {
  const stderr: string[] = [];
  // Some Emscripten builds route program stderr to console.error regardless of
  // the printErr option, so capture both.
  const realError = console.error;
  console.error = (...a: unknown[]) => stderr.push(a.map(String).join(' '));

  let code: number;
  let FS: QpdfFS;
  try {
    const mod = await createQpdf({
      locateFile: () => '/vendor/qpdf/qpdf.wasm',
      print: () => {},
      printErr: (s: string) => stderr.push(s),
    } as Parameters<typeof createQpdf>[0]);

    FS = mod.FS as unknown as QpdfFS;
    FS.writeFile('/in.pdf', new Uint8Array(bytes));

    const args = ['--decrypt'];
    if (password) args.push(`--password=${password}`);
    args.push('/in.pdf', '/out.pdf');

    try {
      code = mod.callMain(args);
    } catch (err) {
      code = (err as { status?: number }).status ?? 1;
    }
  } finally {
    console.error = realError;
  }

  const err = stderr.join(' ').toLowerCase();
  if (code !== 0) {
    if (/invalid password|incorrect password|password/.test(err)) {
      throw new UnlockError(
        'That password is incorrect, or this PDF needs one to open.',
        'password',
      );
    }
    if (/not encrypted|no encryption/.test(err)) {
      throw new UnlockError(
        'This PDF isn’t password-protected — there’s nothing to unlock.',
        'not-encrypted',
      );
    }
    throw new UnlockError('This PDF could not be unlocked.', 'failed');
  }

  let out: Uint8Array;
  try {
    out = FS.readFile('/out.pdf');
  } catch {
    throw new UnlockError('This PDF could not be unlocked.', 'failed');
  }
  if (out.byteLength < 100) throw new UnlockError('This PDF could not be unlocked.', 'failed');
  return toArrayBuffer(out);
}
