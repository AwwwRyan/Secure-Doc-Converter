import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronLeft, Wrench } from 'lucide-react';
import { getTool } from '@/lib/tools/manifest';
import type { ToolDef } from '@/lib/tools/types';
import { getToolConfig, type ToolConfig } from '@/tools/registry';
import { ToolShell } from '@/components/ToolShell';
import { useSession } from '@/lib/store/session';

const DEMO_TOOL: ToolDef = {
  id: 'demo',
  name: 'Demo tool',
  category: 'organize',
  blurb: 'Exercises the tool shell — no real processing',
  icon: Wrench,
  status: 'ready',
  tier: 'device',
};
const DEMO_CONFIG: ToolConfig = {
  workerId: 'demo',
  multiple: true,
  action: 'Run demo',
  defaultOptions: {},
};

export function ToolPage() {
  const { toolId } = useParams();
  const openTool = useSession((s) => s.openTool);

  const tool = toolId === 'demo' ? DEMO_TOOL : getTool(toolId);
  const config = tool ? (tool.id === 'demo' ? DEMO_CONFIG : getToolConfig(tool.id)) : undefined;

  useEffect(() => {
    if (tool) openTool(tool.id);
  }, [tool, openTool]);

  if (!tool) {
    return (
      <Shell title="Tool not found">
        <p className="text-sm text-muted">
          There&rsquo;s no tool with the id &ldquo;{toolId}&rdquo;.
        </p>
      </Shell>
    );
  }

  if (tool.status !== 'ready' || !config) {
    return (
      <Shell title={tool.name}>
        <div className="max-w-[46ch] rounded-2xl border border-line bg-surface p-5 text-[13px] text-muted shadow-sm">
          <p className="mb-1 font-semibold text-ink">Not built yet</p>
          <p>
            This tool is planned but not implemented yet. See <code>docs/08-roadmap.md</code> for
            the build order.
          </p>
        </div>
      </Shell>
    );
  }

  return <ToolShell tool={tool} config={config} />;
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"
      >
        <ChevronLeft size={13} /> All tools
      </Link>
      <h1 className="text-[21px] font-bold tracking-tight text-ink">{title}</h1>
      {children}
    </div>
  );
}
