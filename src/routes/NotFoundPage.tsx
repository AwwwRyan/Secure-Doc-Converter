import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-[21px] font-bold text-ink">Page not found</h1>
      <p className="text-sm text-muted">That page doesn&rsquo;t exist.</p>
      <Link to="/" className="text-sm text-accent hover:underline">
        Back to all tools
      </Link>
    </div>
  );
}
