# 06 — UI / UX

A visual mockup (design canvas) accompanies this document. This file is the
written spec it's drawn from.

## Design principles

1. **Calm and plain.** White space, one accent colour, no gradients-for-drama, no
   marketing. It's a utility.
2. **One job per screen.** Pick a tool → do the tool. No mega-menus.
3. **The privacy fact is always visible**, not a footnote. A small persistent
   badge on every tool screen.
4. **No dark patterns.** No ads, no "go premium", no fake urgency, no cookie
   wall (there are no cookies).
5. **Forgiving.** Every destructive step is undoable or re-runnable; the original
   file is never mutated in place; "start over" is always one click.
6. **Keyboard-first friendly.** Every drag has a keyboard equivalent.

## Visual language

| Token | Value (starting point) |
| --- | --- |
| Font | Inter, system fallback |
| Accent | a single restrained blue (`~#2563EB`), one hover/active shade |
| Neutrals | near-white bg, `#111` text, 3–4 grey steps |
| Radius | `rounded-2xl` on cards, `rounded-lg` on controls |
| Shadow | one soft shadow for cards; none elsewhere |
| Spacing | 4-pt scale; generous section padding |
| Motion | 120–160 ms ease; respect `prefers-reduced-motion` |
| Dark mode | full parity, follows `prefers-color-scheme`, manual toggle in Settings |

## Layout

**Global frame**
- Slim top bar: wordmark (left), theme toggle + "About / Privacy" link (right).
  No nav clutter.
- Content max-width ~`1100px`, centered.
- Footer: version, source-code link, "Nothing you open here is uploaded or
  stored." one-liner.

**Home — tool launcher**
- Short headline: *"PDF tools that run on your device."* + one sentence of
  reassurance.
- A search/filter box ("merge", "compress"…).
- Tools shown as **cards grouped by category**: Organize · Optimize ·
  Convert to PDF · Edit · Unlock.
- Each card: icon, name, one-line description, and a tiny **"on your device"**
  (green) chip — on *every* card, because every tool runs locally. The Office→PDF
  card adds a small note: *"first use downloads a converter."*

**Tool screen — the shared `ToolShell`** (used by every tool)
Three zones, top to bottom (side-by-side on wide screens for zones 2–3):

1. **Input** — a large dropzone ("Drop files here or browse"). After files are
   added: a list/grid of file cards (thumbnail, name, size, remove, drag-handle).
   For page-level tools (Organize, Remove, Extract, Crop, Edit) this becomes a
   **page thumbnail grid**.
2. **Options** — tool-specific controls (compression preset, watermark text,
   page range, rotation, OCR language…). Sensible defaults pre-filled.
3. **Action & result** — a sticky primary button (`Merge PDF`, `Compress`, …).
   While running: progress bar + %, current step, **Cancel**. On success: a
   result card with size/pages summary, **Download**, **Save to folder** (Chromium),
   **Start over**, and **Use in another tool →** (chaining).

**Persistent on every tool screen**
- The privacy badge (zone-level, near the action button), on **every** tool:
  - *"Processed on your device. Nothing is uploaded. [Verify]"*
- Office→PDF adds one line under it:
  - default tier: *"Uses a lightweight in-browser converter — fine for most
    documents, not identical to Microsoft for complex layouts."*
  - opt-in tier: *"High-fidelity converter (LibreOffice) — one-time ~150 MB
    download, then cached. Still runs entirely in your browser."*

## Screen inventory

| # | Screen | Purpose | Key states |
| --- | --- | --- | --- |
| S1 | Home / launcher | Choose a tool | default, search-filtered, empty-search |
| S2 | ToolShell (generic) | Run a file-level tool | empty, drag-over, files-added, invalid-file, preparing-tools, running, success, partial-success, error |
| S3 | Page grid (Organize/Remove/Extract/Crop) | Manipulate pages | loading-thumbs, selecting, reordering (drag + keyboard), rotating, deleting, empty-after-delete |
| S4 | Edit canvas | Overlay text/shapes/images/watermark | tool palette, object selected, drag/resize, undo/redo, multi-page nav, export |
| S5 | Unlock | Remove known password | needs-password, wrong-password, no-user-password (restrictions only), success, refusal note (no cracking) |
| S6 | Office→PDF | Convert Office files in-browser | idle, rendering, preview (with fidelity note), done, too-large, unsupported-type, "get the high-fidelity converter" prompt, engine-downloading, engine-unavailable-on-this-device |
| S7 | Result / chaining | Hand off output | download, save-to-folder, start-over, chain-to-tool picker |
| S8 | About / Privacy | The trust story + "verify it yourself" steps | static |
| S9 | Settings | Theme, default page size, OCR language, HTML/DOCX fallback toggle | — |
| S10 | Error / not-found | Graceful failure | generic, tool-load-failed |

## Component list (maps to shadcn/ui where possible)

`AppBar`, `Footer`, `ToolCard`, `CategorySection`, `SearchInput`,
`FileDropzone`, `FileCard`, `PageThumb` (selectable/rotatable/draggable),
`PageGrid`, `OptionsPanel` + field primitives (`Select`, `Slider`, `RadioGroup`,
`Switch`, `RangeInput` for `1-3,5,8-`), `PrimaryActionButton` (idle/working/done),
`ProgressBar`, `StepLabel`, `ResultCard`, `PrivacyBadge`, `ChainMenu`,
`Toast`, `Dialog`, `Tooltip`, `ThemeToggle`, `EmptyState`, `ErrorState`.

## Interaction details

- **Drag-and-drop** files anywhere on a tool screen; also a normal file picker.
- **Reorder**: drag handle *and* selected-item + `Alt+↑/↓` (announced via ARIA live).
- **Page grid**: click to select, shift-click range, `Ctrl/Cmd+A`, per-thumb
  rotate/delete on hover or via context menu; a toolbar for bulk actions.
- **Progress**: real percentages from the worker (per page for OCR / per file for
  batch); never a fake spinner for long jobs; always cancellable.
- **First use of a tool**: brief "preparing tools…" while its WASM chunk loads;
  cached for the session.
- **Errors** are specific and actionable: *"This PDF is password-protected — use
  Unlock first."* / *"This file is 320 MB; that's too large to process in the
  browser. Try Split first."* / *"Conversion service is busy, try again in a minute."*
- **Chaining**: after a result, "Use in another tool →" opens a small menu; the
  output Blob is passed in memory to the next ToolShell (still never uploaded).

## Accessibility

- Target WCAG 2.1 AA contrast; visible focus rings; logical tab order.
- All functionality reachable without a pointer.
- `aria-live="polite"` for progress/step text; `assertive` for errors.
- Dialogs trap focus and restore it on close.
- Honour `prefers-reduced-motion` (no non-essential animation).
- Respect OS dark mode by default.

## Responsive

- **Desktop / laptop:** zones 2–3 side by side; page grids 4–6 columns.
- **Tablet:** stacked zones; page grids 3 columns; drag still works.
- **Phone:** single column; page grids 2 columns; heavy Edit-canvas features
  degrade to "best on a larger screen" notice but core tools (merge, compress,
  convert, unlock) fully usable; big-file warnings more aggressive.

## Copy tone

Direct, unfussy, a little reassuring. Examples:

- Home: *"PDF tools that run on your device. Your files are never uploaded or
  stored — every tool works entirely in your browser."*
- Unlock: *"Removes a password you already know. This tool does not and will not
  guess or crack passwords."*
- Office→PDF (default): *"Word, PowerPoint and Excel files are converted right
  here in your browser. Good for everyday documents; complex layouts may not
  match Microsoft exactly — check the preview."*
- Office→PDF (opt-in): *"Want an exact match? Download the full converter
  (LibreOffice, ~150 MB, one time). It runs in your browser too — your file
  still never leaves this page."*
