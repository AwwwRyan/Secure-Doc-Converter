import { useEffect, useState } from 'react';
import * as Comlink from 'comlink';
import { createWorker } from '@/lib/workers/pool';
import { renderFirstPage } from '@/lib/pdf/thumbs';

/**
 * Debounced live preview: runs the tool's real operation on page 1 only, then
 * rasterises it with pdf.js. Because it's the same worker code as the download,
 * the preview can't drift from the result. Best-effort — errors just leave the
 * last good preview in place.
 */
export function usePreview(workerId: string, file: File, options: Record<string, unknown>) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = JSON.stringify(options);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setBusy(true);
        const handle = createWorker(workerId);
        try {
          const buf = await file.arrayBuffer();
          const out = await handle.api.run(
            [buf],
            { ...options, preview: true },
            Comlink.proxy(() => {}),
          );
          if (cancelled || out.kind !== 'file') return;
          const dataUrl = await renderFirstPage(out.bytes);
          if (!cancelled) setUrl(dataUrl);
        } catch {
          /* keep the previous preview */
        } finally {
          handle.dispose();
          if (!cancelled) setBusy(false);
        }
      })();
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `key` captures the option values; `file`/`workerId` are the other inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId, file, key]);

  return { url, busy };
}
