import { Link } from 'react-router';
import type { ToolDef } from '@/lib/tools/types';
import { cn } from '@/ui/cn';

function TierChip() {
  return (
    <span className="mt-0.5 inline-flex items-center gap-1.5 self-start rounded-full bg-good-bg px-2 py-[3px] text-[11px] font-semibold text-good-ink">
      <span className="h-[5px] w-[5px] rounded-full bg-current" />
      on your device
    </span>
  );
}

export function ToolCard({ tool }: { tool: ToolDef }) {
  const planned = tool.status === 'planned';
  const Icon = tool.icon;

  const body = (
    <>
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[9px] bg-accent-wash text-accent">
        <Icon size={18} strokeWidth={1.6} />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[13.5px] font-semibold text-ink">{tool.name}</span>
        <span className="text-xs text-muted">{tool.blurb}</span>
        <TierChip />
      </span>
      {planned && (
        <span className="ml-auto self-start rounded-full border border-line px-2 py-[3px] text-[10.5px] font-medium text-faint">
          soon
        </span>
      )}
    </>
  );

  const cls = cn(
    'flex gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3.5 shadow-sm',
    planned ? 'opacity-70' : 'transition-colors hover:border-accent/40',
  );

  if (planned) {
    return (
      <div className={cls} aria-disabled="true">
        {body}
      </div>
    );
  }
  return (
    <Link to={`/t/${tool.id}`} className={cls}>
      {body}
    </Link>
  );
}
