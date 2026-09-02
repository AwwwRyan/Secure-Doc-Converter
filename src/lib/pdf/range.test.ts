import { describe, expect, it } from 'vitest';
import { parsePageRange, RangeSyntaxError } from './range';

describe('parsePageRange', () => {
  it('expands a simple range', () => {
    expect(parsePageRange('1-3', 10)).toEqual([1, 2, 3]);
  });

  it('handles single pages and mixed parts, sorted and de-duplicated', () => {
    expect(parsePageRange('5, 1-3, 2', 10)).toEqual([1, 2, 3, 5]);
  });

  it('treats an open end as "to the last page"', () => {
    expect(parsePageRange('8-', 10)).toEqual([8, 9, 10]);
  });

  it('treats an open start as "from the first page"', () => {
    expect(parsePageRange('-3', 10)).toEqual([1, 2, 3]);
  });

  it('accepts reversed endpoints', () => {
    expect(parsePageRange('3-1', 10)).toEqual([1, 2, 3]);
  });

  it('clamps ranges to the document length', () => {
    expect(parsePageRange('8-20', 10)).toEqual([8, 9, 10]);
  });

  it('returns [] for an empty expression', () => {
    expect(parsePageRange('   ', 10)).toEqual([]);
  });

  it('throws on non-numeric input', () => {
    expect(() => parsePageRange('a-b', 10)).toThrow(RangeSyntaxError);
  });

  it('throws when a single page is out of bounds', () => {
    expect(() => parsePageRange('99', 10)).toThrow(RangeSyntaxError);
  });
});
