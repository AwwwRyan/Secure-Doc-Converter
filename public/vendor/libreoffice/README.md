# LibreOffice-WASM engine (Tier 2 Office→PDF) — not committed

This directory holds the **opt-in, high-fidelity** Office→PDF engine
(ZetaOffice / LibreOffice compiled to WebAssembly). It is **not in git**: the
engine is ~221 MB (`soffice.wasm` ≈ 121 MB, `soffice.data` ≈ 100 MB), which does
not belong in the repo or on a free static host. See
[`docs/09-decisions.md`](../../../docs/09-decisions.md) → **ADR-012**.

Until these files are present, `src/lib/convert/libreoffice.ts` feature-detects
their absence and the app simply doesn't show the Tier 2 option — the lightweight
in-browser converters (`docx-preview` / SheetJS / `pptx-preview`) are the whole
Office story. That is the shipped state.

## Enabling it

1. `pnpm vendor:libreoffice` — downloads `soffice.js`, `soffice.wasm`,
   `soffice.data`, `soffice.data.js.metadata` from
   `https://cdn.zetaoffice.net/zetaoffice_latest/`, copies the ZetaJS glue
   (`zeta.js`, `zetaHelper.js`) out of `node_modules/zetajs` with its hard-coded
   CDN fallbacks rewritten to `/vendor/libreoffice/`, and writes `SHA256SUMS`.
   (Set `LOWA_BASE` to use a mirror.)
2. Serve this directory **same-origin** with cross-origin isolation headers —
   `Cross-Origin-Opener-Policy: same-origin` and
   `Cross-Origin-Embedder-Policy: require-corp`. `vercel.json` and the Vite dev
   server already set these globally, so `pnpm dev` / `pnpm preview` and a Vercel
   deploy pick the engine up with no extra config.
3. For a Vercel deploy, either commit the files via Git LFS **or** run
   `pnpm vendor:libreoffice` as part of the build command so the engine is
   fetched at deploy time (never at runtime). Add `SHA256SUMS` to the CI
   checksum step, mirroring `public/vendor/{tesseract,qpdf}`.
4. Verify a real `.docx` / `.xlsx` / `.pptx` round-trips — render the output PDF
   and look at it (project rule since M2).

The runtime only ever fetches from `/vendor/libreoffice/` on its own origin;
the ZetaOffice CDN is touched by the vendor step alone.
