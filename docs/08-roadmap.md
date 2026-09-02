# 08 — Roadmap

Planning started **2026-09-02**. No calendar deadlines — this is a
friends-and-family project. Milestones are sequenced by dependency and each ends
with the same gate.

## Milestone gate (applies to every milestone)

- [ ] Feature(s) work end-to-end in Chrome, Firefox, Safari, Edge (desktop) + one mobile browser.
- [ ] `code-review` skill run on the milestone branch; findings resolved or ADR'd.
- [ ] Unit tests for the processing logic; one Playwright e2e per new tool.
- [ ] Network tab audit: every tool uploads nothing (no server exists).
- [ ] No new third-party runtime origin; no server component; CSP unchanged (or ADR).
- [ ] Docs updated (feature spec / decisions / CLAUDE.md commands).

---

## M0 — Scaffold & guardrails

**Goal:** an empty but correct skeleton you could deploy.

- Vite + React + TS (strict), Tailwind v4, shadcn/ui base, React Router, zustand.
- Worker pool (`Comlink`) + per-tool code-splitting harness.
- `ToolShell` component with all states (empty/drag/running/success/error) using a
  no-op demo tool.
- Home launcher (S1) with the real tool manifest (cards, categories, tier chips),
  tools disabled/"coming soon".
- About/Privacy page (S8) with the "verify it yourself" steps.
- Settings (S9): theme, defaults.
- Deploy config: `vercel.json` (or `_headers` + `_redirects` for Cloudflare
  Pages) with the full CSP + security headers + COOP/COEP + SPA fallback. Pick
  the host (Q3). No server, no `deploy/` dir, no Docker.
- CI: typecheck, lint, unit, e2e, `osv-scanner` / `npm audit`, build the static
  bundle, `SHA256SUMS` check for vendored engines.
- Decide application licence (ADR-006); pick `@cantoo/pdf-lib` vs `pdf-lib` (Q1).
- `init` skill → generate the real `CLAUDE.md` "Commands" section.

**Done when:** the shell is live on the static host over HTTPS with
`crossOriginIsolated === true`; header linter A/A+; CI green.

---

## M1 — Organize 🟢

Merge, Split, Remove pages, Extract pages, Organize/Reorder, Rotate.

**Status: M1 done.**

- M1a — Merge, Split, Remove pages, Extract pages, Rotate (`@cantoo/pdf-lib`,
  range-expression input, worker-per-engine).
- M1b — **Reorder pages** visual grid (pdf.js lazy thumbnails, drag + keyboard
  reorder, per-page rotate/delete, multi-select); split range UX (3 modes,
  comma-separated custom ranges, size presets); multi-file results offer
  "download separately" **or** ".zip" (no forced zip); merge file list gets a
  drag handle + animated (View Transition) reorder.
- Deferred: click-to-select pages inside Remove/Extract (the range field covers
  it); View Transitions on the page-thumbnail grid.

- `lib/pdf` wrappers over `pdf-lib`; `pdf.js` thumbnail renderer in a worker.
- `PageGrid` / `PageThumb` (S3) with drag **and** keyboard reorder, multi-select,
  per-page rotate/delete.
- `fflate` for zipped multi-file outputs.
- Range-expression parser (`1-3,5,8-`) + tests.
- Chaining (result → next tool) implemented here first.

**Done when:** all six tools pass acceptance criteria in
[`02-feature-spec.md`](02-feature-spec.md); a 200-page file reorders smoothly.

---

## M2 — Edit 🟢

Annotate/overlay, Watermark, Page numbers, Crop, Rotate.

**Status: M2a + M2b done.**

- M2a — Watermark (centred/tiled/banner; angle, opacity, colour, range), Page
  numbers (4 formats, 6 positions, start-at, skip-first, range), Crop (uniform
  or per-side margins, pt or %), Rotate. pdf-lib drawing in a code-split `edit`
  worker; Helvetica standard font.
- M2b — **live single-page preview** for Watermark / Page numbers / Crop
  (`EditShell` + `usePreview`): runs the real op on page 1 only, debounced,
  rendered via pdf.js — the preview is the same code as the download so it can't
  drift. Shared `ToolHeader` / `FileDropzone` extracted; `ToolShell` and
  `OrganizeShell` moved onto them.
- Deferred: the **annotate/overlay canvas** (text boxes, ink, shapes, images) —
  D1 in the feature spec; its own milestone. Embedded fonts for non-Latin
  watermark/number text.

- Edit canvas (S4): object layer over `pdf.js` render; select/move/resize/delete;
  undo–redo; multi-page nav.
- Vector flatten where possible; transparent-PNG overlay fallback.
- Bundled fonts embedded/subset on export.
- Crop: marquee + numeric + auto-whitespace detection.

**Done when:** exported PDFs show overlays correctly in third-party viewers;
watermark tiling/opacity/range all correct.

---

## M3 — Optimize 🟢

Compress (MIT path), OCR (Tesseract), Repair (best-effort).

**Status: M3a done** — Compress and Repair.

- Compress (`src/lib/pdf/optimize.ts`): always strips metadata + repacks with
  object streams; Balanced/Smallest presets also re-encode embedded **JPEG
  (DCTDecode)** images via `OffscreenCanvas` (quality + optional downscale).
  Other image types are left untouched (conservative MIT-only path, ADR-006).
  Result card shows "X MB → Y MB · N% smaller · k images recompressed".
  Verified: a 3.4 MB photo PDF → 1.7 MB, pages intact.
- Repair: tolerant reload (`throwOnInvalidObject: false`) + re-serialise;
  clear error when even that fails. Verified against trailing-junk + garbage.
- `RunResult.file` + `ResultFile` gained an optional `note`.

**Status: M3b done** — OCR (`tesseract.js` 7).

- Worker + fixed-SIMD LSTM WASM core + `eng.traineddata` (tessdata_fast)
  **vendored** under `public/vendor/tesseract/` (`pnpm vendor`), served
  same-origin, `SHA256SUMS`-gated in CI. `corePath` pinned to the exact
  `.wasm.js`. `cacheMethod: 'none'`.
- `src/lib/ocr/runOcr.ts` orchestrates on the main thread (tesseract + pdf.js
  do the work in their own workers): pdf.js rasterises each page → tesseract
  recognises → for "Searchable PDF", merge the per-page searchable PDFs
  tesseract emits; for "Plain text", concatenate. Options: format, quality
  (render scale), page range. Cancellable.
- Verified: a rendered "scan" round-trips to exact text ("Receipt total 9876
  rupees paid by card ending 4242").
- Deferred: more languages; a proper text-layer overlay that keeps existing
  vector text (current output rasterises the page).

- Compress: canvas image re-encode + downsample + object-stream rewrite +
  metadata strip; presets; before/after report; revert.
- OCR: `tesseract.js` in a worker; `pdf.js` page raster → text layer; per-page
  progress; cancellable; bundled English + selectable packs.
- **COOP/COEP:** M5 needs `require-corp` globally for LibreOffice-WASM anyway
  (ADR-011); if threaded OCR wants it sooner, bring it forward here. `CORP:
  same-origin` on every asset makes it safe. Decision recorded per Q4.
- Repair: tolerant `pdf-lib` reload → `pdf.js` reconstruction fallback; honest
  "couldn't repair" outcome.

**Done when:** typical scanned PDF becomes searchable; compress shows real
savings on image-heavy PDFs; repair fixes broken-xref samples.

---

## M4 — Unlock 🟢

- `qpdf` WASM vendored with checksum; `--decrypt --password`.
- S5 flow: needs-password / wrong-password / restrictions-only / success.
- Refusal copy for cracking; ethics/consent line.

**Status: done.** `@neslinesli93/qpdf-wasm` in `unlock.worker`; `.wasm` vendored
to `public/vendor/qpdf/` (`SHA256SUMS` in CI). `UnlockOptions` = password field
(show/hide) + the "we don't crack passwords / only unlock what you may" note.
Blank password handles owner-only (restrictions) PDFs. qpdf's stderr is captured
so a wrong password becomes *"That password is incorrect…"* — never a console
leak, never a partial file. Verified: correct pw → opens without a password;
wrong pw → error, no download; owner-only + blank pw → unlocked; no console
errors.

---

**Status: M5 done** — Images, HTML, Office (lightweight tier); Tier 2
(LibreOffice-WASM) is plumbed but dormant (ADR-012).

- M5a — **Images→PDF** 🟢 (`src/lib/pdf/imageToPdf.ts` in a code-split `convert`
  worker): one image per page, list order. JPEG/PNG embed directly; anything
  else the browser can decode (WebP/GIF/BMP) goes through `OffscreenCanvas` →
  PNG first. Options: page size (fit-to-image / A4 / Letter), orientation
  (auto / portrait / landscape), margin (pt), white background behind
  transparent images. Verified: 3 colour-coded images → 3-page PDF, each image
  centred and unclipped (rendered + eyeballed).
- M5a — **HTML→PDF** 🔵 (`src/lib/convert/htmlToPdf.ts`, main thread — needs the
  DOM): markup loaded into a **sandboxed, script-disabled** `<iframe srcdoc>`;
  the page CSP already blocks external CSS/JS/images so only inline + `data:`
  assets render (a safety property). `html2canvas` rasterises, `jsPDF` slices
  the tall image across A4/Letter pages with a configurable margin. `HtmlShell`
  = textarea or `.html` upload + page-size / margin. Verified: a styled report
  (heading, callout box, table, long copy) → 2-page PDF, layout + colours +
  pagination correct (rendered + eyeballed).
- M5b — **Office→PDF Tier 1 (🔵, default)** (`src/lib/convert/officeToPdf.ts`,
  main thread — needs the DOM; `OfficeShell`). One file in, one PDF out; the
  renderer for the detected type is dynamically imported so its weight only
  loads when that type is used (`docx-preview` ≈75 kB, `xlsx`/SheetJS ≈420 kB,
  `pptx-preview` ≈1.2 MB incl. echarts — each its own chunk). Word: one PDF page
  per source `<section>` so pagination matches. Excel: every sheet →
  `sheet_to_html` table, stacked, landscape. PowerPoint: one PDF page per slide,
  landscape. Type sniff = extension then a zip part-name scan; legacy
  `.doc/.xls/.ppt` get an honest "re-save or use the high-fidelity converter".
  Shared rasterise+paginate helper `src/lib/convert/canvasToPdf.ts`
  (`slicedCanvasToPdf` / `pagedCanvasesToPdf`), also now backing HTML→PDF.
  Prominent "approximate layout" copy. Verified: `.docx` (2 source pages) →
  2-page PDF with headings/bold/table; `.xlsx` (2 sheets) → 1-page PDF with both
  tables; `.pptx` (3 slides) → 3-page PDF — rendered + eyeballed, no console
  errors. New `pnpm check:origins` guardrail (allow-lists inert URL strings in
  vendored libs, fails on any real new origin) replaces the CI grep.
- M5c — **Office→PDF Tier 2 (⚙️, opt-in): plumbing only, engine deferred**
  (ADR-012). The ZetaOffice engine is ~221 MB (`soffice.wasm` 121 MB +
  `soffice.data` 100 MB) — too big for the repo or a free static deploy, and
  ADR-007 forbids fetching it from the ZetaOffice CDN at runtime. What landed:
  `zetajs` pinned; `src/lib/convert/libreoffice.ts` with a working
  `libreOfficeStatus()` feature-detect (`crossOriginIsolated` + a
  content-type-checked `HEAD /vendor/libreoffice/soffice.js`, so the SPA
  fallback can't false-positive) and a `libreOfficeConvert()` following the
  ZetaJS `convertpdf` example (headless `loadComponentFromURL` →
  `storeToURL(writer|calc|impress_pdf_Export)`); `scripts/vendor-libreoffice.mjs`
  (`pnpm vendor:libreoffice`) that downloads the engine + copies the ZetaJS glue
  out of `node_modules` with its CDN constants rewritten to `/vendor/libreoffice/`
  and writes `SHA256SUMS`; `public/vendor/libreoffice/` git-ignored with an
  activation README; `OfficeShell` shows a high-fidelity opt-in **only** when the
  detect passes — dormant on every current deployment, so the UI is unchanged.
  Not verified end-to-end (needs the 221 MB engine present); the README carries
  the activation checklist.
- S6 states: fidelity-warning, too-large, engine-load-failed, tier-unavailable.

**Done when:** ✅ `.docx/.pptx/.xlsx` samples convert in Tier 1 with correct
content; ✅ DevTools shows **zero uploads**; ✅ Tier 2 is cleanly hidden where it
can't run. **Deferred (ADR-012):** shipping the Tier 2 engine and verifying it
matches LibreOffice — re-opens if/when the ~221 MB engine gets a same-origin
home (Git LFS, deploy-time vendor step, or a paid plan).

---

## M6 — Hardening & launch

- `security-review` skill on the whole branch; resolve all high/critical.
- Full pre-launch checklist in [`05-security-and-privacy.md`](05-security-and-privacy.md).
- Lighthouse/perf pass; first-load budget check (every engine lazy-loaded, none
  in the entry chunk); verify the LibreOffice-WASM download is gated behind the
  opt-in click.
- `run` skill to drive the real app and capture screenshots for the README/About.
- Deploy the static bundle per [`07-deployment.md`](07-deployment.md) (Vercel or
  Cloudflare Pages), custom domain, run the post-deploy verification checklist.
- Write the friends-facing one-paragraph "what this is / how to trust it".
- `update-config` skill: add guardrail hooks (block deps that add analytics /
  third-party origins / a server framework; run typecheck+lint on stop).

**Done when:** live HTTPS URL, all checklists green, a non-technical friend uses
it unaided.

---

## Post-launch backlog (not scheduled)

- PWA app-shell offline cache (shell only; strict SW route guard).
- Static-host access gate (passphrase) if the circle grows (ADR-003 escalation).
- More OCR language packs.
- i18n of the UI.
- Re-evaluate the PPTX renderer / Office Tier-1 engines as they mature.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Office→PDF Tier 1 fidelity disappoints vs Microsoft (esp. PPTX) | High | Med | Preview-before-export + honest copy; offer the LibreOffice-WASM tier; suggest "print to PDF from the source app" as a last resort |
| LibreOffice-WASM too heavy for a user's device (RAM / mobile) | Med | Med | Feature-detect and hide it; Tier 1 always available; document the limitation |
| ~100–250 MB engine download deters use / first-run cost | Med | Low | Gate behind an explicit click; cache aggressively; show size up front |
| Large files exhaust browser memory (esp. iOS Safari) | Med | Med | Pre-run size checks; suggest Split; workers; documented limitation |
| `pdf-lib` upstream stays unmaintained | Med | Med | Adopt `@cantoo/pdf-lib` fork; wrappers isolate the dependency |
| AGPL creep if Ghostscript/MuPDF get pulled into the bundle | Low | Med | Policy: kept out; there's no server to run them on; ADR required to revisit |
| COOP/COEP (`require-corp`) breaks an asset | Low | Low | Every asset same-origin + `CORP: same-origin`; fallback = scope the headers to WASM routes (ADR, Q4) |
| Malicious Office/PDF file exploits an in-browser parser | Low | High | Parse in a Worker; script-disabled sandboxed iframe for render steps; no `eval` of bytes; size/page guards; keep engines patched |
| Static host tampers with the served bundle | Low | Med | Public repo; immutable git-SHA deploys; SRI + `SHA256SUMS`; browser tools make no network calls (verifiable) |
| Solo maintainer bandwidth | High | Med | Small scope; zero infra/ops now; friends can help via the public repo |
