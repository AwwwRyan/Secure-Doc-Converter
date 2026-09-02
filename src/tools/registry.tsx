import type { ComponentType } from 'react';
import type { ToolDef } from '@/lib/tools/types';
import { ExtractOptions } from '@/tools/options/ExtractOptions';
import { MergeOptions } from '@/tools/options/MergeOptions';
import { RemoveOptions } from '@/tools/options/RemoveOptions';
import { RotateOptions } from '@/tools/options/RotateOptions';
import { SplitOptions } from '@/tools/options/SplitOptions';
import { OrganizeShell } from '@/tools/lazy-shells';

export type ToolOptions = Record<string, unknown>;

export interface OptionsProps<T extends ToolOptions = ToolOptions> {
  value: T;
  onChange: (next: T) => void;
}

export interface ToolConfig {
  /** Worker module id in the pool. */
  readonly workerId: string;
  /** May the user add more than one file? */
  readonly multiple: boolean;
  /** Verb for the run button, e.g. "Merge" → "Merge PDF". */
  readonly action: string;
  readonly defaultOptions: ToolOptions;
  readonly Options?: ComponentType<OptionsProps>;
  /** Replaces the generic ToolShell entirely (e.g. the page-grid editor). Lazy. */
  readonly CustomShell?: ComponentType<{ tool: ToolDef }>;
}

/**
 * Per-tool wiring. A tool with an entry here is live; ToolPage renders the
 * shell for it. Missing entry → "not built yet".
 */
export const TOOL_CONFIG: Record<string, ToolConfig> = {
  merge: {
    workerId: 'organize',
    multiple: true,
    action: 'Merge',
    defaultOptions: { op: 'merge', blankBetween: false },
    Options: MergeOptions as ComponentType<OptionsProps>,
  },
  split: {
    workerId: 'organize',
    multiple: false,
    action: 'Split',
    defaultOptions: { op: 'split', mode: 'everyN', n: 1, ranges: '' },
    Options: SplitOptions as ComponentType<OptionsProps>,
  },
  'remove-pages': {
    workerId: 'organize',
    multiple: false,
    action: 'Remove pages',
    defaultOptions: { op: 'remove', range: '' },
    Options: RemoveOptions as ComponentType<OptionsProps>,
  },
  'extract-pages': {
    workerId: 'organize',
    multiple: false,
    action: 'Extract pages',
    defaultOptions: { op: 'extract', range: '', separate: false },
    Options: ExtractOptions as ComponentType<OptionsProps>,
  },
  rotate: {
    workerId: 'organize',
    multiple: false,
    action: 'Rotate',
    defaultOptions: { op: 'rotate', angle: 90, scope: 'all', range: '' },
    Options: RotateOptions as ComponentType<OptionsProps>,
  },
  'organize-pages': {
    workerId: 'organize',
    multiple: false,
    action: 'Apply changes',
    defaultOptions: { op: 'arrange' },
    CustomShell: OrganizeShell,
  },
};

export function getToolConfig(id: string): ToolConfig | undefined {
  return TOOL_CONFIG[id];
}
