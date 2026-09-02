// Copies the qpdf WASM binary into public/vendor/qpdf/ so it is served
// same-origin (locateFile points here). The JS glue is imported through the
// bundler, so only the .wasm needs vendoring.
//
//   node scripts/vendor-qpdf.mjs
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'public', 'vendor', 'qpdf');
const src = join(root, 'node_modules', '@neslinesli93', 'qpdf-wasm', 'dist', 'qpdf.wasm');

await mkdir(dest, { recursive: true });
await copyFile(src, join(dest, 'qpdf.wasm'));
const hash = createHash('sha256')
  .update(await readFile(src))
  .digest('hex');
await writeFile(join(dest, 'SHA256SUMS'), `${hash}  qpdf.wasm\n`);
console.log('  qpdf.wasm\nwrote public/vendor/qpdf/SHA256SUMS');
