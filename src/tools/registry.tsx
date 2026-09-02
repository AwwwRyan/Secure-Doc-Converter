import type { ComponentType } from 'react';
import type { ToolDef } from '@/lib/tools/types';
import { CompressOptions } from '@/tools/options/CompressOptions';
import { CropOptions } from '@/tools/options/CropOptions';
import { ExtractOptions } from '@/tools/options/ExtractOptions';
import { PageNumberOptions } from '@/tools/options/PageNumberOptions';
import { RemoveOptions } from '@/tools/options/RemoveOptions';
import { RotateOptions } from '@/tools/options/RotateOptions';
import { SplitOptions } from '@/tools/options/SplitOptions';
import { WatermarkOptions } from '@/tools/options/WatermarkOptions';
import { EditShell, OrganizeShell } from '@/tools/lazy-shells';

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
    defaultOptions: { op: 'merge' },
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

  // ---- Edit (M2a) ----
  watermark: {
    workerId: 'edit',
    multiple: false,
    action: 'Add watermark',
    defaultOptions: {
      op: 'watermark',
      text: 'CONFIDENTIAL',
      layout: 'center',
      fontSize: 60,
      rotationDeg: 45,
      color: '#111111',
      opacity: 0.15,
      bold: true,
      range: '',
    },
    Options: WatermarkOptions as ComponentType<OptionsProps>,
    CustomShell: EditShell,
  },
  'page-numbers': {
    workerId: 'edit',
    multiple: false,
    action: 'Add page numbers',
    defaultOptions: {
      op: 'page-numbers',
      format: 'n',
      position: 'bottom-center',
      margin: 28,
      fontSize: 11,
      startAt: 1,
      color: '#333333',
      skipFirst: false,
      range: '',
    },
    Options: PageNumberOptions as ComponentType<OptionsProps>,
    CustomShell: EditShell,
  },
  crop: {
    workerId: 'edit',
    multiple: false,
    action: 'Crop',
    defaultOptions: {
      op: 'crop',
      unit: 'pt',
      uniform: true,
      top: 24,
      right: 24,
      bottom: 24,
      left: 24,
      range: '',
    },
    Options: CropOptions as ComponentType<OptionsProps>,
    CustomShell: EditShell,
  },
  'rotate-edit': {
    workerId: 'organize',
    multiple: false,
    action: 'Rotate',
    defaultOptions: { op: 'rotate', angle: 90, scope: 'all', range: '' },
    Options: RotateOptions as ComponentType<OptionsProps>,
  },

  // ---- Optimize (M3a) ----
  compress: {
    workerId: 'optimize',
    multiple: false,
    action: 'Compress',
    defaultOptions: { op: 'compress', preset: 'balanced' },
    Options: CompressOptions as ComponentType<OptionsProps>,
  },
  repair: {
    workerId: 'optimize',
    multiple: false,
    action: 'Repair PDF',
    defaultOptions: { op: 'repair' },
  },
};

export function getToolConfig(id: string): ToolConfig | undefined {
  return TOOL_CONFIG[id];
}
