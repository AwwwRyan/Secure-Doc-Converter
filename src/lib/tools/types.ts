import type { LucideIcon } from 'lucide-react';

export type ToolCategoryId = 'organize' | 'optimize' | 'convert' | 'edit' | 'unlock';

export type ToolStatus = 'ready' | 'planned';

/**
 * Where a tool's work happens. Everything is client-side (docs/03); this only
 * affects the copy shown to the user.
 *  - 'device'    : plain in-browser, no extra download
 *  - 'device-dl' : in-browser, but first use lazy-loads a large engine
 */
export type ToolTier = 'device' | 'device-dl';

export interface ToolDef {
  readonly id: string;
  readonly name: string;
  readonly category: ToolCategoryId;
  readonly blurb: string;
  readonly icon: LucideIcon;
  readonly status: ToolStatus;
  readonly tier: ToolTier;
  /** Extra one-liner shown on the card / tool screen (e.g. the Office download note). */
  readonly note?: string;
}

export interface ToolCategory {
  readonly id: ToolCategoryId;
  readonly label: string;
}
