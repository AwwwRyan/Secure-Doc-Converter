import {
  ArrowRightLeft,
  Combine,
  Crop,
  FileImage,
  FileSpreadsheet,
  FileText,
  Hash,
  LockOpen,
  RotateCw,
  ScanText,
  Scissors,
  SlidersHorizontal,
  SquarePen,
  Stamp,
  Trash2,
  Wand2,
  WrapText,
} from 'lucide-react';
import type { ToolCategory, ToolDef } from '@/lib/tools/types';

export const CATEGORIES: readonly ToolCategory[] = [
  { id: 'organize', label: 'Organize' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'convert', label: 'Convert to PDF' },
  { id: 'edit', label: 'Edit' },
  { id: 'unlock', label: 'Unlock' },
] as const;

/**
 * The full tool catalogue. Scope is fixed in docs/02-feature-spec.md.
 * Nothing is `ready` yet — M0 ships the shell; tools land in M1–M5.
 */
export const TOOLS: readonly ToolDef[] = [
  // Organize
  {
    id: 'merge',
    name: 'Merge PDF',
    category: 'organize',
    blurb: 'Combine files into one',
    icon: Combine,
    status: 'ready',
    tier: 'device',
  },
  {
    id: 'split',
    name: 'Split PDF',
    category: 'organize',
    blurb: 'Break one PDF into several',
    icon: Scissors,
    status: 'ready',
    tier: 'device',
  },
  {
    id: 'remove-pages',
    name: 'Remove pages',
    category: 'organize',
    blurb: "Delete pages you don't need",
    icon: Trash2,
    status: 'ready',
    tier: 'device',
  },
  {
    id: 'extract-pages',
    name: 'Extract pages',
    category: 'organize',
    blurb: 'Pull out the pages you want',
    icon: WrapText,
    status: 'ready',
    tier: 'device',
  },
  {
    id: 'organize-pages',
    name: 'Reorder pages',
    category: 'organize',
    blurb: 'Drag pages into a new order',
    icon: SlidersHorizontal,
    status: 'ready',
    tier: 'device',
  },
  {
    id: 'rotate',
    name: 'Rotate PDF',
    category: 'organize',
    blurb: 'Turn pages 90° at a time',
    icon: RotateCw,
    status: 'ready',
    tier: 'device',
  },

  // Optimize
  {
    id: 'compress',
    name: 'Compress PDF',
    category: 'optimize',
    blurb: 'Shrink file size, keep quality',
    icon: SlidersHorizontal,
    status: 'ready',
    tier: 'device',
  },
  {
    id: 'ocr',
    name: 'OCR PDF',
    category: 'optimize',
    blurb: 'Make scans searchable',
    icon: ScanText,
    status: 'ready',
    tier: 'device',
  },
  {
    id: 'repair',
    name: 'Repair PDF',
    category: 'optimize',
    blurb: 'Recover a damaged file',
    icon: Wand2,
    status: 'ready',
    tier: 'device',
  },

  // Convert to PDF
  {
    id: 'image-to-pdf',
    name: 'Images → PDF',
    category: 'convert',
    blurb: 'JPG, PNG, WebP, TIFF',
    icon: FileImage,
    status: 'planned',
    tier: 'device',
  },
  {
    id: 'office-to-pdf',
    name: 'Word / PowerPoint / Excel → PDF',
    category: 'convert',
    blurb: 'Office files, in your browser',
    icon: FileSpreadsheet,
    status: 'planned',
    tier: 'device-dl',
    note: 'Exact conversions download a converter the first time.',
  },
  {
    id: 'html-to-pdf',
    name: 'HTML → PDF',
    category: 'convert',
    blurb: 'From a self-contained page',
    icon: FileText,
    status: 'planned',
    tier: 'device',
  },

  // Edit
  {
    id: 'annotate',
    name: 'Add text & annotations',
    category: 'edit',
    blurb: 'Notes, shapes, highlights',
    icon: SquarePen,
    status: 'planned',
    tier: 'device',
  },
  {
    id: 'watermark',
    name: 'Watermark',
    category: 'edit',
    blurb: 'Text, any angle or opacity',
    icon: Stamp,
    status: 'ready',
    tier: 'device',
  },
  {
    id: 'page-numbers',
    name: 'Page numbers',
    category: 'edit',
    blurb: 'Any format or position',
    icon: Hash,
    status: 'ready',
    tier: 'device',
  },
  {
    id: 'crop',
    name: 'Crop',
    category: 'edit',
    blurb: 'Trim margins from pages',
    icon: Crop,
    status: 'ready',
    tier: 'device',
  },
  {
    id: 'rotate-edit',
    name: 'Rotate',
    category: 'edit',
    blurb: 'Fix page orientation',
    icon: ArrowRightLeft,
    status: 'ready',
    tier: 'device',
  },

  // Unlock
  {
    id: 'unlock',
    name: 'Unlock PDF',
    category: 'unlock',
    blurb: 'Remove a password you know',
    icon: LockOpen,
    status: 'ready',
    tier: 'device',
  },
] as const;

const TOOLS_BY_ID: ReadonlyMap<string, ToolDef> = new Map(TOOLS.map((t) => [t.id, t]));

export function getTool(id: string | undefined): ToolDef | undefined {
  return id ? TOOLS_BY_ID.get(id) : undefined;
}

export function toolsInCategory(category: ToolCategory['id']): ToolDef[] {
  return TOOLS.filter((t) => t.category === category);
}
