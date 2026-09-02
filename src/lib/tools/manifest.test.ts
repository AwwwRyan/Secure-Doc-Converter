import { describe, expect, it } from 'vitest';
import { CATEGORIES, TOOLS, getTool, toolsInCategory } from './manifest';

describe('tool manifest', () => {
  it('has unique tool ids', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('assigns every tool to a known category', () => {
    const known = new Set(CATEGORIES.map((c) => c.id));
    for (const tool of TOOLS) {
      expect(known.has(tool.category)).toBe(true);
    }
  });

  it('has at least one tool in every category', () => {
    for (const category of CATEGORIES) {
      expect(toolsInCategory(category.id).length).toBeGreaterThan(0);
    }
  });

  it('only marks known tools as ready', () => {
    const ready = TOOLS.filter((t) => t.status === 'ready').map((t) => t.id);
    // Organize (M1). Grows as milestones land.
    expect(new Set(ready)).toEqual(
      new Set([
        // M1 — Organize
        'merge',
        'split',
        'remove-pages',
        'extract-pages',
        'rotate',
        'organize-pages',
        // M2a — Edit
        'watermark',
        'page-numbers',
        'crop',
        'rotate-edit',
        // M3a/b — Optimize
        'compress',
        'repair',
        'ocr',
        // M4 — Unlock
        'unlock',
        // M5a/b — Convert to PDF
        'image-to-pdf',
        'html-to-pdf',
        'office-to-pdf',
      ]),
    );
  });

  it('getTool resolves known ids and rejects unknown ones', () => {
    expect(getTool('unlock')?.name).toBe('Unlock PDF');
    expect(getTool('nope')).toBeUndefined();
    expect(getTool(undefined)).toBeUndefined();
  });
});
