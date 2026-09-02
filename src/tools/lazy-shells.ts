import { lazy } from 'react';

/**
 * Lazy wrappers for custom tool shells. Each pulls in a heavy engine (pdf.js, …)
 * so it must stay out of the entry chunk. ToolPage renders them in <Suspense>.
 */
export const OrganizeShell = lazy(() =>
  import('@/tools/shells/OrganizeShell').then((m) => ({ default: m.OrganizeShell })),
);
