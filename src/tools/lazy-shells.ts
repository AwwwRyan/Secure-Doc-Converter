import { lazy } from 'react';

/**
 * Lazy wrappers for custom tool shells. Each pulls in a heavy engine (pdf.js, …)
 * so it must stay out of the entry chunk. ToolPage renders them in <Suspense>.
 */
export const OrganizeShell = lazy(() =>
  import('@/tools/shells/OrganizeShell').then((m) => ({ default: m.OrganizeShell })),
);

export const EditShell = lazy(() =>
  import('@/tools/shells/EditShell').then((m) => ({ default: m.EditShell })),
);

export const OcrShell = lazy(() =>
  import('@/tools/shells/OcrShell').then((m) => ({ default: m.OcrShell })),
);

export const HtmlShell = lazy(() =>
  import('@/tools/shells/HtmlShell').then((m) => ({ default: m.HtmlShell })),
);

export const OfficeShell = lazy(() =>
  import('@/tools/shells/OfficeShell').then((m) => ({ default: m.OfficeShell })),
);
