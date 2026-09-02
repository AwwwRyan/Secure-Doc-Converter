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

  it('ships nothing as ready yet (M0)', () => {
    expect(TOOLS.every((t) => t.status === 'planned')).toBe(true);
  });

  it('getTool resolves known ids and rejects unknown ones', () => {
    expect(getTool('unlock')?.name).toBe('Unlock PDF');
    expect(getTool('nope')).toBeUndefined();
    expect(getTool(undefined)).toBeUndefined();
  });
});
