/**
 * Parse a page-range expression like `"1-3, 5, 8-"` into a sorted, de-duplicated
 * list of 1-based page numbers, clamped to `[1, total]`.
 *
 *  - `"1-3"`   → 1, 2, 3
 *  - `"5"`     → 5
 *  - `"8-"`    → 8 … total
 *  - `"-3"`    → 1 … 3
 *  - `"3-1"`   → 1, 2, 3 (endpoints may be reversed)
 *  - `""`      → [] (caller decides what "empty" means)
 *
 * Throws `RangeSyntaxError` on malformed input or out-of-bounds single pages so
 * the UI can show a precise message.
 */
export class RangeSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RangeSyntaxError';
  }
}

export function parsePageRange(expr: string, total: number): number[] {
  if (total < 1) return [];
  const trimmed = expr.trim();
  if (trimmed === '') return [];

  const pages = new Set<number>();

  for (const rawPart of trimmed.split(',')) {
    const part = rawPart.trim();
    if (part === '') continue;

    const dash = part.indexOf('-');
    if (dash === -1) {
      const n = toInt(part);
      if (n < 1 || n > total) {
        throw new RangeSyntaxError(`Page ${n} is out of range (1–${total}).`);
      }
      pages.add(n);
      continue;
    }

    const startRaw = part.slice(0, dash).trim();
    const endRaw = part.slice(dash + 1).trim();
    let start = startRaw === '' ? 1 : toInt(startRaw);
    let end = endRaw === '' ? total : toInt(endRaw);
    if (start > end) [start, end] = [end, start];

    start = Math.max(1, start);
    end = Math.min(total, end);
    for (let n = start; n <= end; n++) pages.add(n);
  }

  return [...pages].sort((a, b) => a - b);
}

function toInt(s: string): number {
  if (!/^\d+$/.test(s)) {
    throw new RangeSyntaxError(`"${s}" is not a page number.`);
  }
  return Number.parseInt(s, 10);
}
