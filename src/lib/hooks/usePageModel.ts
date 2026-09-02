import { useCallback, useState } from 'react';

export type Rotation = 0 | 90 | 180 | 270;

export interface PageItem {
  /** Stable id for React keys and selection. */
  id: string;
  /** 1-based page number in the source document. */
  srcPage: number;
  rotate: Rotation;
}

function initial(pageCount: number): PageItem[] {
  return Array.from({ length: pageCount }, (_, i) => ({
    id: `p${i + 1}`,
    srcPage: i + 1,
    rotate: 0 as Rotation,
  }));
}

const addRot = (r: Rotation, delta: number): Rotation =>
  ((((r + delta) % 360) + 360) % 360) as Rotation;

/**
 * Ordered page list + a selection, with the edits the page grid needs.
 * Mount this under a `key` tied to the file so a new document starts fresh.
 */
export function usePageModel(pageCount: number) {
  const [items, setItems] = useState<PageItem[]>(() => initial(pageCount));
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const dirty = version > 0;

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const move = useCallback(
    (from: number, to: number) => {
      setItems((prev) => {
        if (from === to || from < 0 || from >= prev.length || to < 0 || to >= prev.length) {
          return prev;
        }
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved!);
        return next;
      });
      bump();
    },
    [bump],
  );

  const moveSelected = useCallback(
    (dir: -1 | 1) => {
      setItems((prev) => {
        const idxs = prev.map((it, i) => (selected.has(it.id) ? i : -1)).filter((i) => i >= 0);
        if (idxs.length === 0) return prev;
        const next = [...prev];
        const ordered = dir === 1 ? [...idxs].reverse() : idxs;
        for (const i of ordered) {
          const j = i + dir;
          if (j < 0 || j >= next.length || selected.has(next[j]!.id)) continue;
          [next[i], next[j]] = [next[j]!, next[i]!];
        }
        return next;
      });
      bump();
    },
    [selected, bump],
  );

  const rotate = useCallback(
    (ids: Iterable<string>, delta: 90 | -90 | 180) => {
      const set = new Set(ids);
      setItems((prev) =>
        prev.map((it) => (set.has(it.id) ? { ...it, rotate: addRot(it.rotate, delta) } : it)),
      );
      bump();
    },
    [bump],
  );

  const remove = useCallback(
    (ids: Iterable<string>) => {
      const set = new Set(ids);
      setItems((prev) => prev.filter((it) => !set.has(it.id)));
      setSelected(new Set());
      bump();
    },
    [bump],
  );

  const reset = useCallback(() => {
    setItems(initial(pageCount));
    setSelected(new Set());
    setAnchor(null);
    setVersion(0);
  }, [pageCount]);

  // ---- selection ----
  const selectOnly = useCallback((id: string) => {
    setSelected(new Set([id]));
    setAnchor(id);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAnchor(id);
  }, []);

  const selectRangeTo = useCallback(
    (id: string) => {
      setItems((prev) => {
        const a = anchor ?? prev[0]?.id ?? id;
        const i = prev.findIndex((it) => it.id === a);
        const j = prev.findIndex((it) => it.id === id);
        if (i === -1 || j === -1) return prev;
        const [lo, hi] = i < j ? [i, j] : [j, i];
        setSelected(new Set(prev.slice(lo, hi + 1).map((it) => it.id)));
        return prev;
      });
    },
    [anchor],
  );

  const selectAll = useCallback(() => {
    setItems((prev) => {
      setSelected(new Set(prev.map((it) => it.id)));
      return prev;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setAnchor(null);
  }, []);

  return {
    items,
    selected,
    dirty,
    move,
    moveSelected,
    rotate,
    remove,
    reset,
    selectOnly,
    toggle,
    selectRangeTo,
    selectAll,
    clearSelection,
  };
}
