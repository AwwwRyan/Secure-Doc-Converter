import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';

export function ToolHeader({ name, blurb }: { name: string; blurb: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
      >
        <ChevronLeft size={13} /> All tools
      </Link>
      <h1 className="text-[21px] font-bold tracking-tight text-ink">{name}</h1>
      <p className="text-[13px] text-muted">{blurb}. Runs entirely in your browser.</p>
    </div>
  );
}
