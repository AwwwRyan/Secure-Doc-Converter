# 02 — Feature Specification

Legend for **Runs** — everything is client-side; there is no server (ADR-011):

- 🟢 **Browser** — 100% client-side in a Web Worker. No bytes leave the device.
- 🔵 **Browser (best-effort)** — client-side, with known fidelity limits.
- ⚙️ **Browser + heavy engine** — client-side, but depends on a large WASM module
  the user opts into downloading once (LibreOffice WASM). Still no bytes leave
  the device.

Every tool shares the same shell (see [`06-ui-ux.md`](06-ui-ux.md)): drop/select
files → set options → run → download or save. Common behaviours:

- Multiple input files where it makes sense; drag to reorder.
- Page-range input accepts `1-3, 5, 8-` style expressions.
- Output is offered as a download and, on Chromium, "Save to folder…".
- On finish the user can **chain**: send the result straight into another tool
  without re-uploading.
- All object URLs revoked and buffers dropped when the task ends or view unmounts.

---

## A. Organize

### A1. Merge PDF — 🟢
Combine several PDFs (and optionally images) into one.
- **Input:** 2+ PDFs; images allowed (converted via A→PDF path first).
- **Options:** order (drag), optional blank page between docs, keep or flatten
  bookmarks/outline (keep by default), page-range per input (optional).
- **Library:** `pdf-lib` `copyPages`.
- **Edge cases:** encrypted input → prompt to run Unlock first; corrupted input →
  offer Repair; mixed page sizes preserved (no scaling).
- **Acceptance:** N inputs totalling P pages → one PDF with P pages in the chosen
  order; bookmarks preserved; no visual change to any page.

### A2. Split PDF — 🟢
- **Modes:** by fixed range(s); every N pages; one file per page; split at
  bookmarks (top level).
- **Output:** single PDF if one range, otherwise a `.zip` (`fflate`).
- **Library:** `pdf-lib`, `fflate`.
- **Acceptance:** ranges are inclusive, 1-indexed; page content unchanged; zip
  entries named `name-<start>-<end>.pdf`.

### A3. Remove pages — 🟢
Delete a set of pages.
- **Options:** page-range expression or click-to-select on the thumbnail grid.
- **Acceptance:** output = input minus selected pages, order otherwise unchanged.

### A4. Extract pages — 🟢
Keep only selected pages (optionally as separate files).
- **Acceptance:** inverse of Remove; "separate files" yields a zip.

### A5. Organize / Reorder — 🟢
Visual page manager: drag to reorder, rotate a page, delete a page, insert pages
from another PDF, duplicate a page.
- **UI:** thumbnail grid (`pdf.js` rendering), multi-select, keyboard reorder as a
  non-drag fallback (accessibility).
- **Library:** `pdf.js` (thumbnails), `pdf-lib` (rebuild).
- **Acceptance:** final page sequence and per-page rotation match the grid exactly.

### A6. Rotate PDF — 🟢
Rotate all pages or a subset by 90° / 180° / 270°.
- **Library:** `pdf-lib` `page.setRotation(degrees(...))` (normalised to 0/90/180/270).
- **Acceptance:** rotation is additive to any existing `/Rotate`; content stream
  untouched.

---

## B. Optimize

### B1. Compress PDF — 🟢
Reduce file size. v1 is MIT-licensed, client-side only:
- Re-encode embedded raster images to JPEG at a target quality (via `OffscreenCanvas`).
- Downsample images above a DPI ceiling (150 / 200 / 300 presets).
- Drop unused objects, subset nothing (no font subsetting in v1), rewrite with
  object streams, strip non-essential metadata and thumbnails.
- **Presets:** *Screen* (aggressive), *Balanced* (default), *Light* (metadata only).
- **Library:** `pdf-lib` + canvas.
- **Known limit:** vector-heavy or already-optimised PDFs may barely shrink.
  Ghostscript would do better but it's AGPL and there is no server to run it on
  (ADR-006); if the in-browser path proves too weak, an alternative WASM
  compressor is a research item, not a v1 feature.
- **Acceptance:** output opens identically; text stays selectable; size report
  shows before/after; user can revert to original if the result looks worse.

### B2. OCR PDF — 🟢
Add a searchable, invisible text layer to a scanned PDF (or export the text).
- **Engine:** `tesseract.js` (WASM), language packs bundled locally
  (English + a small set; user-selectable, extra packs lazy-loaded from our own origin).
- **Flow:** `pdf.js` renders each page to an image → Tesseract → invisible text
  layer positioned over the page.
- **Options:** language(s), "text layer only" vs "also deskew/clean image",
  page range, output PDF or `.txt`.
- **Performance:** slow (seconds per page); progress per page; cancellable;
  runs off the main thread.
- **Acceptance:** resulting PDF is searchable in a normal viewer; original raster
  untouched; word positions visually align.

### B3. Repair PDF — 🔵
Best-effort recovery of a damaged file.
- **v1 approach:** load with `pdf-lib` in tolerant mode (ignore invalid objects,
  rebuild xref) and re-serialise; retry via `pdf.js` reconstruction if that fails.
- **Known limit:** truly truncated/garbage files may be unrecoverable in-browser.
  `qpdf` is already bundled (for Unlock); if its WASM build exposes `--recover`
  usefully, wire it in as a second attempt. No server fallback exists.
- **Acceptance:** files with broken xref / trailing junk / bad object offsets
  open afterwards; tool clearly reports "could not repair" rather than producing
  a silently broken file.

---

## C. Convert to PDF

### C1. Images → PDF — 🟢
JPG, JPEG, PNG, WebP, GIF (first frame), BMP, TIFF (multi-page).
- **Options:** page size (Fit / A4 / Letter), orientation, margin, one image per
  page vs auto-fit multiple, background colour, image order (drag).
- **Library:** `pdf-lib` `embedJpg` / `embedPng`; other formats decoded through
  canvas first; TIFF via `utif`.
- **Acceptance:** each image placed at correct aspect ratio within margins; DPI
  metadata respected for physical sizing when present.

### C2. Word / PowerPoint / Excel → PDF — 🔵 default, ⚙️ opt-in
`.docx .doc .rtf .odt` · `.pptx .ppt .odp` · `.xlsx .xls .csv .ods`

Runs entirely in the browser (ADR-011). Two tiers, chosen per file:

**Tier 1 — lightweight renderers (🔵, default, ~1–2 MB lazy-loaded):**
- Word: `docx-preview` → styled DOM → paginate (`paged.js`) → `jsPDF` /
  `html2canvas`.
- Excel: `SheetJS` (community) reads cells/formats → HTML table or
  `jspdf-autotable` → PDF.
- PowerPoint: `PPTXjs` / `pptx-preview` renders slides to DOM/SVG → one `jsPDF`
  page per slide.
- **Fidelity:** good for text-forward Word docs, straightforward sheets, and
  standard decks. Weak on multi-column layouts, exact pagination, footnotes,
  equations, SmartArt, charts, custom fonts, slide effects. The UI states this
  and shows a preview before export.

**Tier 2 — LibreOffice WASM (⚙️, opt-in):**
- `ZetaJS` / LibreOffice-WASM `convert-to pdf`, full LibreOffice fidelity.
- Behind an explicit prompt: *"Download the high-fidelity converter (~100–250 MB,
  one time — stays cached)."* Needs cross-origin isolation (COOP/COEP) and
  substantial RAM; the button is hidden / disabled on devices that can't run it,
  and Tier 1 still works there.
- Processes in a Worker; the file stays in memory; nothing is uploaded.

- **Edge cases:** macro-laden / password-protected / corrupt files → clear error,
  never a partial PDF. `.doc/.ppt/.xls` (legacy binary) supported only in Tier 2.
- **Acceptance:** typical `.docx/.pptx/.xlsx` samples convert with correct
  content and reasonable layout in Tier 1; Tier 2 matches LibreOffice; DevTools
  shows **zero uploads** for both tiers.

### C3. HTML → PDF — 🔵
From an uploaded `.html` file or pasted markup.
- **Approach:** render inside a **sandboxed, same-origin-blocked `<iframe srcdoc>`**,
  paginate with `paged.js`, rasterise/print to PDF (`html2canvas` + `jsPDF`, or
  the browser print pipeline).
- **Deliberate limits:** no external CSS/JS/images are fetched (CSP + sandbox);
  inline and `data:` assets only. This is a safety property, not a bug.
- **Out of scope:** **URL → PDF.** Fetching an arbitrary URL needs a server; there
  isn't one, and adding one is against the project's premise. Not in v1.
- **Acceptance:** self-contained HTML renders with reasonable layout; external
  references are ignored, not errored.

---

## D. Edit

> "Edit" here means **overlay and structure**, matching what iLovePDF's Edit tool
> actually does. Reflowing or re-typing existing body text is **not** feasible
> with our libraries and is out of scope.

### D1. Edit PDF (annotate / overlay) — 🟢
Add on top of existing pages: text boxes (font, size, colour), freehand ink,
lines/arrows/rectangles/ellipses, images, highlight, redaction-style opaque box
(cosmetic only — *not* a secure redaction; that tool is out of scope and the UI
says so).
- **UI:** page canvas (`pdf.js` render) with an object layer; select / move /
  resize / delete; undo–redo; snap to guides.
- **Library:** `pdf-lib` drawing APIs; ink/shapes flattened to vector where
  possible, otherwise a transparent PNG overlay per page.
- **Fonts:** a bundled set embedded/subset on export.
- **Acceptance:** exported PDF shows all objects at the right place/size/rotation
  in other viewers; original page content unchanged beneath.

### D2. Watermark — 🟢
Text or image watermark.
- **Options:** content, font, size, colour, opacity, rotation, position (9-grid or
  tiled), pages (all / range / even / odd), above or below page content.
- **Acceptance:** applied to every selected page; tiling covers the page;
  under-content mode doesn't obscure text.

### D3. Page numbers — 🟢
- **Options:** format (`1`, `1 / N`, `Page 1 of N`, roman), position (6-grid),
  margin, start-at, page range, font/size/colour, skip first page.
- **Acceptance:** numbers correct and consistently placed; respects start-at and skips.

### D4. Crop — 🟢
- **Modes:** visual marquee on a page; numeric margins; apply to one page / range
  / all; "auto-crop whitespace" (bounding-box detection).
- **Library:** `pdf-lib` `setCropBox` (MediaBox left intact so it's reversible in
  principle).
- **Acceptance:** visible area matches the marquee; content not rescaled.

### D5. Rotate — 🟢
Same engine as A6, surfaced inside the Edit context for convenience.

---

## E. Unlock

### E1. Unlock PDF — 🟢
Remove encryption from a file the user is authorised to open.
- **Requires:** the user supplies the **open/user password**, *or* the file has
  only an owner/permissions password (no user password) — in which case
  restrictions (print/copy/edit flags) are removed without any password.
- **Engine:** `qpdf` compiled to WASM (`qpdf --decrypt --password=… in out`).
  Handles RC4 and AES-128/256.
- **Explicitly refused:** brute force, dictionary attacks, "try to recover the
  password", or unlocking without the password when a user password is set. The
  UI states this and the tool returns a clear "password required / incorrect"
  message.
- **Ethics/consent copy:** a short line — "Only use this on documents you own or
  are permitted to unlock." — shown on the tool page.
- **Acceptance:** with the correct password, output opens with no password and no
  restriction flags; wrong password → clear error, no output; nothing logged.

---

## Cross-cutting requirements

| Area | Requirement |
| --- | --- |
| **Privacy UI** | Every tool shows a persistent "Processed on your device — nothing uploaded" badge (there is no server). The ⚙️ tier of Office→PDF adds a note that it downloads a large engine the first time. |
| **Errors** | Never emit a silently broken output file. Distinguish: bad/unsupported input, wrong password, file too large for in-browser processing (suggest splitting), engine failed to load. |
| **Cancellation** | Any long task (OCR, big merge, compress, Office render) is cancellable; cancelling frees memory. |
| **First run** | Engine modules (pdf.js worker, qpdf, tesseract, docx-preview, SheetJS, PPTXjs, and — only if the user opts in — LibreOffice WASM) are lazy-loaded from our own origin on first use, with a "preparing tools…" indicator. |
| **Determinism** | Same input + options → same output bytes where the library allows (helps testing and trust). |
| **No history** | Nothing about a job (name, size, type, timestamp) is stored after the tab is closed. |
| **Accessibility** | Every drag interaction has a keyboard equivalent; progress announced via ARIA live regions. |
