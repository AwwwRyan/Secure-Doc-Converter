import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { getTool } from '@/lib/tools/manifest';
import type { ToolDef } from '@/lib/tools/types';
import { buttonVariants } from '@/ui/button-variants';
import { cn } from '@/ui/cn';

const SUGGESTIONS = ['merge', 'compress', 'image-to-pdf', 'unlock'];

export function NotFoundPage() {
  const tools = SUGGESTIONS.map(getTool).filter((t): t is ToolDef => t !== undefined);

  return (
    <div className="mx-auto flex max-w-[46ch] flex-col items-start gap-5 py-10">
      <p className="font-mono text-[13px] tracking-[0.15em] text-faint">404</p>

      <div className="flex flex-col gap-2">
        <h1 className="text-[27px] font-bold tracking-tight text-ink text-balance">
          This page isn&rsquo;t here
        </h1>
        <p className="text-[14.5px] text-muted">
          The link may be old or mistyped. Nothing went wrong with your files &mdash; nothing is
          ever uploaded or stored in the first place.
        </p>
      </div>

      <Link to="/" className={cn(buttonVariants({ size: 'md' }))}>
        <ArrowLeft size={15} /> All tools
      </Link>

      {tools.length > 0 && (
        <div className="mt-2 flex flex-col gap-2.5">
          <span className="text-[11px] font-bold tracking-[0.08em] text-faint uppercase">
            Or jump to
          </span>
          <div className="flex flex-wrap gap-2">
            {tools.map((tool) => (
              <Link
                key={tool.id}
                to={`/t/${tool.id}`}
                className="rounded-[var(--radius-ctl)] border border-line bg-surface px-3 py-1.5 text-[12.5px] text-ink transition-colors hover:border-accent hover:text-accent"
              >
                {tool.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
