import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CATEGORIES, TOOLS } from '@/lib/tools/manifest';
import { ToolCard } from '@/components/ToolCard';

export function HomePage() {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOLS;
    return TOOLS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.blurb.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-[27px] font-bold tracking-tight text-balance">
          PDF tools that run on your device
        </h1>
        <p className="max-w-[58ch] text-[14.5px] text-muted">
          Your files aren&rsquo;t uploaded or stored. Every tool works entirely in your browser
          &mdash; open the Network tab and check.
        </p>
      </header>

      <label className="flex h-[42px] w-full max-w-[390px] items-center gap-2.5 rounded-[var(--radius-ctl)] border border-line bg-surface px-3 text-faint">
        <Search size={18} strokeWidth={1.6} className="flex-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools — merge, compress, unlock…"
          className="w-full border-0 bg-transparent text-ink outline-none placeholder:text-faint"
        />
      </label>

      <div className="flex flex-col gap-[30px]">
        {CATEGORIES.map((category) => {
          const tools = matches.filter((t) => t.category === category.id);
          if (tools.length === 0) return null;
          return (
            <section key={category.id}>
              <div className="mb-3 flex items-baseline gap-2.5">
                <h2 className="text-xs font-bold tracking-[0.08em] text-muted uppercase">
                  {category.label}
                </h2>
                <span className="text-[11.5px] text-faint">
                  {tools.length} {tools.length === 1 ? 'tool' : 'tools'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </section>
          );
        })}

        {matches.length === 0 && (
          <p className="text-sm text-muted">No tools match &ldquo;{query}&rdquo;.</p>
        )}
      </div>
    </div>
  );
}
