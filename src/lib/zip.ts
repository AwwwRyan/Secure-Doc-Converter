import { zipSync, type Zippable } from 'fflate';
import type { RunResultFile } from '@/lib/workers/types';

/** Bundle several files into a single (stored, uncompressed) zip. PDFs don't
 * compress meaningfully, so skipping deflate keeps it fast. */
export function zipFiles(files: RunResultFile[]): ArrayBuffer {
  const entries: Zippable = {};
  const used = new Set<string>();
  for (const f of files) {
    let name = f.name;
    for (let i = 2; used.has(name); i++) {
      name = f.name.replace(/(\.[^.]+)?$/, `-${i}$1`);
    }
    used.add(name);
    entries[name] = [new Uint8Array(f.bytes), { level: 0 }];
  }
  return zipSync(entries).slice().buffer;
}
