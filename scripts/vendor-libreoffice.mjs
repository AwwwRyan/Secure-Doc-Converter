// Downloads the LibreOffice-WASM (ZetaOffice) engine into
// public/vendor/libreoffice/ so the app can serve it SAME-ORIGIN — the runtime
// never touches a third-party origin (ADR-007). This is the opt-in, owner-run
// step that activates the high-fidelity Office→PDF tier (ADR-012); without it
// the tier stays hidden and the lightweight tier is the whole Office story.
//
//   node scripts/vendor-libreoffice.mjs
//
// ~221 MB total. The files are git-ignored on purpose (too big for the repo /
// a free static deploy). Re-run after `pnpm add zetajs` upgrades, or point a
// deploy build at this script. Set LOWA_BASE to use a mirror.
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, stat, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const BASE = process.env.LOWA_BASE || 'https://cdn.zetaoffice.net/zetaoffice_latest/';
const FILES = ['soffice.js', 'soffice.wasm', 'soffice.data', 'soffice.data.js.metadata'];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'public', 'vendor', 'libreoffice');
await mkdir(dest, { recursive: true });

const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';
const sums = [];

for (const name of FILES) {
  const out = join(dest, name);
  const url = BASE + name;
  process.stdout.write(`  ${name} … `);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`GET ${url} → ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(out));
  const buf = await readFile(out);
  sums.push(`${createHash('sha256').update(buf).digest('hex')}  ${name}`);
  console.log(mb((await stat(out)).size));
}

// ZetaJS glue, copied from the pinned npm package (never fetched at runtime).
// Neutralise its hard-coded CDN fallbacks so no third-party origin can be
// reached even if a caller forgets `wasmPkg` — this app always passes
// `wasmPkg: 'url:/vendor/libreoffice/'`, and check:origins stays green.
const zsrc = join(root, 'node_modules', 'zetajs', 'source');
for (const name of ['zeta.js', 'zetaHelper.js']) {
  let text = await readFile(join(zsrc, name), 'utf8');
  text = text.replace(/https:\/\/[a-z-]*cdn\.zetaoffice\.net\/[a-z_]*\//g, '/vendor/libreoffice/');
  await writeFile(join(dest, name), text);
  sums.push(`${createHash('sha256').update(text).digest('hex')}  ${name}`);
  console.log(
    `  ${name} … ${mb(Buffer.byteLength(text))} (from node_modules/zetajs, CDN neutralised)`,
  );
}

sums.sort();
await writeFile(join(dest, 'SHA256SUMS'), sums.join('\n') + '\n');
console.log(`\nwrote ${FILES.length} files + SHA256SUMS to public/vendor/libreoffice/`);
console.log('The high-fidelity Office tier will appear once these are served with');
console.log('COOP: same-origin + COEP: require-corp (already set in vercel.json).');
