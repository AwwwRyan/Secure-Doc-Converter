/**
 * Client-side size guards. Everything runs in the browser's memory, so a very
 * large file can crash the tab — worst on mobile Safari, which kills a tab
 * around ~1–1.5 GB with no error. These caps are deliberately generous (real
 * documents pass) but stop the pathological cases before they OOM.
 *
 * There is no server to enforce anything; this is purely a UX safety net.
 */
export const MAX_FILE_BYTES = 100 * 1024 * 1024; // hard cap, per file
export const SOFT_WARN_BYTES = 25 * 1024 * 1024; // advise, don't block

const MB = 1024 * 1024;
export const asMB = (n: number): string =>
  n >= MB ? `${Math.round(n / MB)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export interface SizeCheck {
  ok: File[];
  tooBig: { name: string; size: number }[];
  /** Accepted files that are large enough to be worth a heads-up. */
  heavy: boolean;
}

/** Split an incoming file list into what's safe to process and what's over the cap. */
export function checkFileSizes(files: File[]): SizeCheck {
  const ok: File[] = [];
  const tooBig: { name: string; size: number }[] = [];
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) tooBig.push({ name: f.name, size: f.size });
    else ok.push(f);
  }
  return { ok, tooBig, heavy: ok.some((f) => f.size > SOFT_WARN_BYTES) };
}
