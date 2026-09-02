// Copies the tesseract.js worker + WASM core out of node_modules into
// public/vendor/tesseract/ so the app serves them same-origin (no CDN).
// The English language data is fetched separately (see the curl in the README /
// CI); it is not shipped in either npm package.
//
//   node scripts/vendor-tesseract.mjs
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'public', 'vendor', 'tesseract');

const files = [
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm', 'tesseract-core-simd-lstm.wasm'],
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm', 'tesseract-core-lstm.wasm'],
];

await mkdir(dest, { recursive: true });
const sums = [];
for (const [from, to] of files) {
  const src = join(root, 'node_modules', from);
  await copyFile(src, join(dest, to));
  const hash = createHash('sha256')
    .update(await readFile(src))
    .digest('hex');
  sums.push(`${hash}  ${to}`);
  console.log(`  ${to}`);
}
sums.sort();
await writeFile(join(dest, 'SHA256SUMS'), sums.join('\n') + '\n');
console.log('wrote public/vendor/tesseract/SHA256SUMS');
