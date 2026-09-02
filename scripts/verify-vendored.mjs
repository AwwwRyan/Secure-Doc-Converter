// Verifies every vendored engine against its SHA256SUMS. Runs as `prebuild`
// (and in CI) so a tampered or truncated binary fails the build, not the user.
//
//   node scripts/verify-vendored.mjs
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const vendorRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'vendor');

if (!existsSync(vendorRoot)) {
  console.error('no public/vendor/ — nothing to verify');
  process.exit(1);
}

let checked = 0;
let failed = 0;

for (const name of readdirSync(vendorRoot)) {
  const dir = join(vendorRoot, name);
  if (!statSync(dir).isDirectory()) continue;
  const sumsPath = join(dir, 'SHA256SUMS');
  if (!existsSync(sumsPath)) {
    console.warn(`  ${name}/: no SHA256SUMS (not vendored) — skipped`);
    continue;
  }
  for (const line of readFileSync(sumsPath, 'utf8').split('\n')) {
    const m = line.match(/^([0-9a-f]{64})\s+\*?(.+?)\s*$/i);
    if (!m) continue;
    const [, want, file] = m;
    const target = join(dir, file);
    if (!existsSync(target)) {
      console.error(`  ✗ ${name}/${file} — listed in SHA256SUMS but missing`);
      failed++;
      continue;
    }
    const got = createHash('sha256').update(readFileSync(target)).digest('hex');
    checked++;
    if (got !== want.toLowerCase()) {
      console.error(`  ✗ ${name}/${file} — sha256 mismatch\n      want ${want}\n      got  ${got}`);
      failed++;
    }
  }
}

if (failed) {
  console.error(`\nvendored-engine verification FAILED (${failed} problem(s))`);
  process.exit(1);
}
console.log(`vendored engines OK — ${checked} file(s) match SHA256SUMS`);
