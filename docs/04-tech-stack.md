# 04 — Technology Stack

All choices optimise for: small auditable surface, static output, self-hostable,
no third-party runtime calls, permissive licences where practical.

## Frontend

| Concern | Choice | Why |
| --- | --- | --- |
| Build / framework | **Vite + React 18 + TypeScript (strict)** | Pure static bundle, nothing to run server-side, trivial to audit and self-host. No SSR we'd have to secure. |
| Alternative considered | Next.js | Rejected: SSR/runtime we don't want; static export has footguns. See ADR-004. |
| Routing | **React Router** (SPA) | Small, familiar; history mode with a static-host SPA fallback (`vercel.json` / `_redirects`). |
| Styling | **Tailwind CSS v4** | Utility CSS compiled to one static file; no runtime, no inline-style CSP headache. |
| Components | **shadcn/ui** (Radix primitives, copied into the repo) | Accessible, unstyled-then-themed, MIT, no black-box dependency; we own the code. |
| Icons | **lucide-react** (ISC) | Self-hosted SVGs. |
| Fonts | **Inter** (OFL-1.1), self-hosted `.woff2` | No Google Fonts / no CDN. |
| State | **zustand** (MIT) | Tiny; per-session tool state only. |
| Worker RPC | **Comlink** (Apache-2.0) | Clean `postMessage` ergonomics with transferables. |
| Tests | **Vitest** + **@testing-library/react**; **Playwright** (e2e + screenshots) | |
| Lint/format | **ESLint** + **Prettier**; `typescript-eslint` strict | |

## PDF / document libraries (browser)

| Purpose | Library | Licence | Notes |
| --- | --- | --- | --- |
| Build / modify PDFs (merge, split, rotate, crop, watermark, page numbers, overlay, images→PDF) | **`pdf-lib`** | MIT | Pure JS, no native deps. Upstream is quiet; evaluate the maintained **`@cantoo/pdf-lib`** fork at M1. Cannot reflow existing text (by design — see scope). |
| Render pages, thumbnails, text extraction | **`pdf.js`** (`pdfjs-dist`) | Apache-2.0 | Ship the worker + local `cmaps` + `standard_fonts`. |
| Unlock (decrypt with known password; strip owner restrictions) | **`qpdf` → WASM** | Apache-2.0 | RC4 + AES-128/256. Prebuilt (`@jspawn/qpdf-wasm`) or our own Emscripten build, vendored with checksum. |
| OCR | **`tesseract.js`** 7 + **`tesseract.js-core`** 6.1.2 | Apache-2.0 | Worker + fixed-SIMD LSTM WASM core + `eng.traineddata` (tessdata_fast) all **vendored** under `public/vendor/tesseract/` by `scripts/vendor-tesseract.mjs` (`pnpm vendor`), served same-origin. `corePath` points at the exact `.wasm.js` (tesseract's own detection asks for a relaxed-SIMD build we don't ship). `cacheMethod: 'none'` — nothing cached to IndexedDB. tesseract.js's postinstall is skipped (`pnpm-workspace.yaml → allowBuilds`). `SHA256SUMS` checked in CI. Orchestrated on the main thread (`src/lib/ocr/runOcr.ts`); pdf.js + tesseract do the heavy work in their own workers. |
| Zip (multi-file outputs / inputs) | **`fflate`** | MIT | Tiny. |
| TIFF decode | **`utif`** | MIT | For images→PDF. |
| HTML→PDF (best-effort) | **`paged.js`** + **`html2canvas`** + **`jsPDF`** | MIT / MIT / MIT | Sandboxed, inline-assets-only. |

## Office → PDF libraries (browser, ADR-011)

### Tier 1 — lightweight renderers (default, ~1–2 MB, lazy-loaded)

| Format | Library | Licence | Notes |
| --- | --- | --- | --- |
| Word `.docx` | **`docx-preview`** | Apache-2.0 | Renders to styled DOM with good fidelity for text-forward docs; then `paged.js` → `jsPDF` / `html2canvas`. Legacy `.doc` → Tier 2 only. |
| Excel `.xlsx` | **`SheetJS`** (community) | Apache-2.0 | Reads cells + number formats; render to an HTML table or `jspdf-autotable`. `exceljs` (MIT) is the alternative to weigh at M5. |
| PowerPoint `.pptx` | **`PPTXjs`** *(or `pptx-preview`)* | MIT | Renders slides to DOM/SVG → one `jsPDF` page each. Weakest of the three; `pptx-preview` evaluated at M5 (Q7). |
| Assembly | **`jsPDF`** (+ `jspdf-autotable`) | MIT | Turns the rendered output into the PDF. |

### Tier 2 — LibreOffice WASM (opt-in, ~100–250 MB one-time download)

| Concern | Detail |
| --- | --- |
| Engine | **LibreOffice → WebAssembly (`ZetaJS` / ZetaOffice)** — real LibreOffice `convert-to pdf`, fully client-side. **MPL-2.0 / LGPL-3.0 — not AGPL**, so no network-use clause. |
| Delivery | Vendored under `public/vendor/`, `SHA256SUMS`-checked, served from our origin; fetched only after an explicit user click; browser-cached thereafter. |
| Requirements | Cross-origin isolation (COOP/COEP) for `SharedArrayBuffer`; substantial RAM. Feature-detected — hidden where it can't run. |
| Fonts | Bundle Liberation / Carlito / Caladea / Noto core (metric-compatible with Arial / Calibri / Cambria + broad Unicode) alongside the engine. |

### Deliberately kept out of the browser bundle

**Ghostscript** and **MuPDF/`mupdf.js`** are AGPL-3.0 — serving them as WASM
triggers the network-use clause, and there is no longer a server to run them on.
If deep compress/repair ever needs them, that is a new ADR (see ADR-006).

## Infrastructure

| Concern | Choice | Why |
| --- | --- | --- |
| Hosting | **Vercel** (Hobby, free) — Cloudflare Pages as fallback | Static files + custom response headers (CSP, COOP/COEP) + managed TLS + CDN. No server, no container, no Docker. Only the app is deployed; no document is uploaded (ADR-008). |
| Headers | `vercel.json` / `_headers` file in the repo | CSP, HSTS, COOP, COEP, CORP, etc. — see [`05-security-and-privacy.md`](05-security-and-privacy.md). |
| CI | **GitHub Actions** | Typecheck, lint, unit, e2e, `osv-scanner` / `npm audit`, build the static bundle. |
| Dependency updates | **Renovate** (or Dependabot), grouped, manual merge | Pinned + reviewed. |
| Supply-chain scan | **osv-scanner** in CI; `npm audit --audit-level=high` gate | |

## Versioning & vendoring

- Exact versions in `package.json` (no `^`/`~`); commit `pnpm-lock.yaml`.
- WASM/engine binaries (`qpdf`, `tesseract-core`, `pdf.worker`, and the opt-in
  LibreOffice-WASM bundle) vendored under `public/vendor/` with a `SHA256SUMS`
  file checked in CI and at build time.
- No `postinstall` scripts from dependencies allowed (`pnpm` `--ignore-scripts`
  where feasible; audit the exceptions).

## Package manager

**pnpm** — strict, content-addressed, fast, good at flagging phantom deps.

## Application licence

Decided at M0: **MIT** (simplest) or **AGPL-3.0** (forces any redeployer to keep
it open). Repo is public either way. Recorded in ADR-006.
