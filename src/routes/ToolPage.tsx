import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronLeft, Wrench } from 'lucide-react';
import { getTool } from '@/lib/tools/manifest';
import type { ToolDef } from '@/lib/tools/types';
import { ToolShell } from '@/components/ToolShell';
import { useSession } from '@/lib/store/session';

/** Synthetic tool for exercising the shell before real tools land (M0). */
const DEMO_TOOL: ToolDef = {
  id: 'demo',
  name: 'Demo tool',
  category: 'organize',
  blurb: 'Exercises the tool shell — no real processing',
  icon: Wrench,
  status: 'ready',
  tier: 'device',
};

export function ToolPage() {
  const { toolId } = useParams();
  const openTool = useSession((s) => s.openTool);
  const tool = toolId === 'demo' ? DEMO_TOOL : getTool(toolId);

  useEffect(() => {
    if (tool) openTool(tool.id);
  }, [tool, openTool]);

  if (!tool) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-[21px] font-bold text-ink">Tool not found</h1>
        <p className="text-sm text-muted">
          There&rsquo;s no tool with the id &ldquo;{toolId}&rdquo;.
        </p>
        <Link to="/" className="text-sm text-accent hover:underline">
          Back to all tools
        </Link>
      </div>
    );
  }

  if (tool.status === 'planned') {
    return (
      <div className="flex flex-col gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
        >
          <ChevronLeft size={13} /> All tools
        </Link>
        <h1 className="text-[21px] font-bold tracking-tight text-ink">{tool.name}</h1>
        <div className="max-w-[46ch] rounded-2xl border border-line bg-surface p-5 text-[13px] text-muted shadow-sm">
          <p className="mb-1 font-semibold text-ink">Not built yet</p>
          <p>
            This tool is planned but not implemented. The scaffold (M0) is in place; tools land in
            milestones M1&ndash;M5 &mdash; see <code>docs/08-roadmap.md</code>.
          </p>
        </div>
      </div>
    );
  }

  return <ToolShell tool={tool} />;
}
