import { Link } from 'react-router';
import type { ToolTier } from '@/lib/tools/types';

/**
 * The persistent reassurance shown on every tool screen (docs/06-ui-ux.md).
 * Every tool runs on the device — the tier only changes the secondary line.
 */
export function PrivacyBadge({ tier, note }: { tier: ToolTier; note?: string | undefined }) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-ctl)] bg-good-bg px-3 py-2.5 text-[11.5px] leading-snug text-good-ink">
      <span className="flex items-start gap-2 font-medium">
        <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-current" />
        Processed on your device. Nothing is uploaded.{' '}
        <Link to="/about" className="underline">
          Verify
        </Link>
      </span>
      {tier === 'device-dl' && (
        <span className="pl-3.5 opacity-90">
          {note ?? 'The exact converter downloads a large engine the first time, then caches it.'}
        </span>
      )}
    </div>
  );
}
