import { Loader2 } from 'lucide-react';

/**
 * Shows the live single-page preview for the Edit tools. `url` is a rendered
 * data URL of page 1 with the current options applied.
 */
export function PagePreview({ url, busy }: { url: string | null; busy: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-[0.08em] text-faint uppercase">
          Preview — page 1
        </span>
        {busy && (
          <span className="flex items-center gap-1.5 text-[11px] text-faint">
            <Loader2 size={12} className="animate-spin" /> updating
          </span>
        )}
      </div>
      <div className="flex max-h-[calc(100vh-160px)] min-h-[320px] items-center justify-center overflow-auto rounded-xl border border-line bg-bg p-4">
        {url ? (
          <img
            src={url}
            alt="Preview of page 1 with the current settings"
            className="w-auto rounded-md border border-line bg-white shadow-sm"
          />
        ) : (
          <span className="text-[12px] text-faint">{busy ? 'Rendering…' : 'No preview yet'}</span>
        )}
      </div>
    </div>
  );
}
