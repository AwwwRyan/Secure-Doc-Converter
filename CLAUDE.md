# CLAUDE.md

Guidance for Claude Code (and any contributor) working in this repository.
Read [`docs/`](docs/) too — especially [`docs/03-architecture.md`](docs/03-architecture.md)
and [`docs/05-security-and-privacy.md`](docs/05-security-and-privacy.md).

## What this is

A privacy-first PDF toolkit: **Organize / Optimize / Convert-to-PDF / Edit /
Unlock**, running **entirely in the browser** as a static site — there is no
server (ADR-011). The whole reason it exists is that the owner does not trust
third-party PDF websites with private documents. Every design decision defers to
one principle:

> **A user's document never leaves their device, and is never persisted
> anywhere. Every tool runs client-side. There is no backend that touches a file.**

## Hard rules

Breaking one of these requires a new ADR in
[`docs/09-decisions.md`](docs/09-decisions.md) with the owner's sign-off.

**MUST NOT**
- Add a server, serverless function, container, or any `POST` endpoint that
  accepts a document. The build output is static files only.
- Add analytics, telemetry, crash/error reporting, session replay, A/B tooling,
  or any other "phone home" behaviour.
- Load *any* runtime resource from a third-party origin — fonts, scripts, styles,
  images, CDNs, favicons. Everything is self-hosted and bundled.
- Persist user document content anywhere: no `localStorage` / `IndexedDB` / Cache
  Storage of file bytes or anything derived from them (text, thumbnails); no
  Service Worker caching of user files (the SW may cache the static app shell only).
- Log file names, file bytes, or anything derived from a user's document.
- Add authentication, user accounts, or any user database.
- Bundle AGPL engines (Ghostscript, MuPDF) into the browser build. The
  LibreOffice-WASM converter (MPL-2.0 / LGPL-3.0) is fine.

**MUST**
- Run every document operation in a Web Worker in the browser.
- Lazy-load each engine (pdf.js, qpdf, tesseract, docx-preview, SheetJS, PPTXjs,
  jsPDF, and the opt-in LibreOffice-WASM) — never in the entry chunk.
- Gate the LibreOffice-WASM download behind an explicit user click; feature-detect
  it and hide it where it can't run.
- Pin exact dependency versions, commit the lockfile, vendor engine binaries with
  `SHA256SUMS` verified in CI and at build.
- Call `URL.revokeObjectURL` for every object URL and release `ArrayBuffer`s when
  a task finishes or a view unmounts.
- Keep the CSP as written in [`docs/05-security-and-privacy.md`](docs/05-security-and-privacy.md)
  (`connect-src 'self'`); any relaxation needs an ADR.
- Run the `security-review` skill before every release and `code-review` at the
  end of every milestone.

## Skills

See [`docs/10-skills-and-tooling.md`](docs/10-skills-and-tooling.md). Most used:
`design` / `artifact-design` (UI), `security-review` (every release),
`code-review` / `simplify` (every milestone), `run` (verify in the real app),
`init` (regenerate this file once code exists), `update-config` (guardrail hooks).

## Stack (M0)

Vite 8 + React 19 + TypeScript 6 (strict) · Tailwind v4 (`@tailwindcss/vite`) ·
shadcn-style `src/ui` primitives · React Router 8 (`react-router`) · Zustand ·
Comlink worker pool. Package manager: **pnpm** (via corepack). Deploy target:
Vercel static (`vercel.json`).

TypeScript is pinned to 6.x on purpose — `typescript-eslint` does not yet support
the TS 7 native compiler.

## Commands

```sh
pnpm install          # first run: `corepack enable` then this
pnpm dev              # Vite dev server (COOP/COEP headers set for parity)
pnpm build            # tsc -b && vite build  →  dist/
pnpm preview          # serve the built dist/ locally
pnpm typecheck        # tsc -b
pnpm lint             # eslint .
pnpm test             # vitest run
pnpm format           # prettier --write .
pnpm vendor           # re-copy the tesseract engine into public/vendor/ from node_modules
pnpm e2e              # playwright test  (browsers: `pnpm exec playwright install`)
```

`tesseract.js`'s postinstall (it downloads its own core + langs) is deliberately
skipped — see `pnpm-workspace.yaml` (`allowBuilds`). The exact files the app
serves are vendored under `public/vendor/tesseract/` with a `SHA256SUMS` CI
gate; `.npmrc` sets `verify-deps-before-run=false` so the skipped build doesn't
fail `pnpm <script>`.

## Layout

- `src/app/` — router + `RootLayout`
- `src/routes/` — `HomePage` (tool launcher), `ToolPage`, `AboutPage`, `SettingsPage`, `NotFoundPage`
- `src/components/` — `AppBar`, `Footer`, `ThemeToggle`, `PrivacyBadge`, `ToolShell`, `FileList`,
  `FileDropzone`, `ToolHeader`, `PagePreview`, `ResultCard`, `pagegrid/`
- `src/ui/` — design-system primitives (`Button`, `cn`, `viewTransition`)
- `src/lib/pdf/` — `organize` (merge/split/rotate/arrange), `edit` (watermark/page-numbers/crop),
  `optimize` (compress/repair), `range`, `errors`, `thumbs` (pdf.js render)
- `src/lib/ocr/runOcr.ts` — main-thread OCR orchestration (tesseract.js)
- `src/lib/workers/` — Comlink pool + one worker per engine group (`organize` / `edit` /
  `optimize` / `demo`)
- `src/lib/store/` — `settings` (theme; localStorage) and `session` (per-run state)
- `src/lib/hooks/` — `useToolRun` (worker), `usePreview` (Edit live preview), `usePdfThumbs`,
  `usePageModel`
- `src/tools/` — `registry.tsx` (per-tool wiring), `options/*` (Options components),
  `shells/*` + `lazy-shells.ts` (custom shells: Organize grid, Edit preview, OCR)

Add a tool: a manifest entry + a `TOOL_CONFIG` entry pointing at a worker (or a
`CustomShell`). No tool imports another tool.
