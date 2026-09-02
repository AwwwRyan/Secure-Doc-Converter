/**
 * Run a DOM-mutating update inside a View Transition where supported, so list
 * reorders animate; falls back to an instant update elsewhere. Respects
 * `prefers-reduced-motion`.
 */
export function withViewTransition(update: () => void): void {
  const reduce =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const doc: { startViewTransition?: (cb: () => void) => unknown } =
    typeof document === 'undefined' ? {} : document;

  if (reduce || typeof doc.startViewTransition !== 'function') {
    update();
    return;
  }
  doc.startViewTransition(update);
}
