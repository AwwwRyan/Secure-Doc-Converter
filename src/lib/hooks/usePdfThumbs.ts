import { useEffect, useState } from 'react';
import { Thumbnailer } from '@/lib/pdf/thumbs';

interface ThumbsState {
  thumbnailer: Thumbnailer | null;
  pageCount: number;
  loading: boolean;
  error: string | null;
}

const LOADING: ThumbsState = { thumbnailer: null, pageCount: 0, loading: true, error: null };

/**
 * Owns a Thumbnailer for `file`. Rebuilds it when the file changes and destroys
 * it (freeing pdf.js + every thumbnail URL) on unmount. Mount only when a file
 * exists.
 */
export function usePdfThumbs(file: File): ThumbsState {
  const [state, setState] = useState<ThumbsState>(LOADING);

  useEffect(() => {
    let cancelled = false;
    let t: Thumbnailer | null = null;

    void (async () => {
      try {
        const buf = await file.arrayBuffer();
        if (cancelled) return;
        t = new Thumbnailer(buf);
        const pageCount = await t.pageCount();
        if (cancelled) {
          void t.destroy();
          return;
        }
        setState({ thumbnailer: t, pageCount, loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        setState({
          thumbnailer: null,
          pageCount: 0,
          loading: false,
          error: err instanceof Error ? err.message : 'Could not read this PDF.',
        });
      }
    })();

    return () => {
      cancelled = true;
      void t?.destroy();
    };
  }, [file]);

  return state;
}
