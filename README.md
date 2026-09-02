# Secure Doc Converter

A PDF toolkit that runs **entirely in your browser**. **Your documents never
leave your device and are never stored — there is no server.** Built because
mainstream online PDF tools can't be trusted with private files.

> Status: **M0 — scaffold.** The app shell (Vite + React + TS, router, tool
> launcher, worker harness, `vercel.json`) is in place; the tools themselves land
> in M1–M5. Design and specs live in [`docs/`](docs/).

## Development

```sh
corepack enable          # once, to get pnpm
pnpm install
pnpm dev                 # http://localhost:5173
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Full command list and repo layout: [`CLAUDE.md`](CLAUDE.md). Build order:
[`docs/08-roadmap.md`](docs/08-roadmap.md).

## What it will do

| Category | Tools |
| --- | --- |
| **Organize** | Merge, Split, Remove pages, Extract pages, Reorder, Rotate |
| **Optimize** | Compress, OCR (make scans searchable), Repair |
| **Convert to PDF** | Images (JPG/PNG/WebP/TIFF/…), Word / PowerPoint / Excel, HTML |
| **Edit** | Add text & annotations, Watermark, Page numbers, Crop, Rotate |
| **Unlock** | Remove a password you know / owner restrictions from your own files |

Explicitly **out of scope**: converting *from* PDF to Office, Sign, Redact,
Compare, AI features, Protect/encrypt, password cracking, accounts/teams. See
[`docs/01-vision-and-scope.md`](docs/01-vision-and-scope.md).

## How your files are handled

**Every tool runs in your browser** — Organize, Optimize, Edit, Unlock, and
Convert-to-PDF *including Word / PowerPoint / Excel*. Open the Network tab while
you use any of them and you will see **no uploads**. There is no server that
accepts a file.

Office → PDF has two tiers, both in-browser: a lightweight default (good for
everyday documents) and an **opt-in high-fidelity engine** (LibreOffice compiled
to WebAssembly — a one-time ~100–250 MB download, cached after). Details and a
"verify it yourself" guide:
[`docs/05-security-and-privacy.md`](docs/05-security-and-privacy.md).

## Deployment

Static files on **Vercel** (free Hobby plan; Cloudflare Pages is a drop-in
fallback). No server, no container, no Docker, **$0/month**. Only the app is
deployed — no document is ever uploaded to it. See
[`docs/07-deployment.md`](docs/07-deployment.md).

## Documentation

| Doc | What's in it |
| --- | --- |
| [`docs/README.md`](docs/README.md) | How to navigate these docs, reading order, status |
| [`docs/01-vision-and-scope.md`](docs/01-vision-and-scope.md) | Problem, goals, non-goals, success criteria |
| [`docs/02-feature-spec.md`](docs/02-feature-spec.md) | Every tool: behaviour, options, where it runs, acceptance criteria |
| [`docs/03-architecture.md`](docs/03-architecture.md) | Client-side processing model, engines, data flow (no server) |
| [`docs/04-tech-stack.md`](docs/04-tech-stack.md) | Framework, UI kit, PDF + Office libraries, licences |
| [`docs/05-security-and-privacy.md`](docs/05-security-and-privacy.md) | Threat model, guarantees, headers/CSP, verifiability |
| [`docs/06-ui-ux.md`](docs/06-ui-ux.md) | Design principles, screen inventory, states, components, a11y |
| [`docs/07-deployment.md`](docs/07-deployment.md) | Static host, headers, COOP/COEP, verification, cost |
| [`docs/08-roadmap.md`](docs/08-roadmap.md) | Milestones M0–M6, acceptance gates, risk register |
| [`docs/09-decisions.md`](docs/09-decisions.md) | Architecture Decision Records |
| [`docs/10-skills-and-tooling.md`](docs/10-skills-and-tooling.md) | Claude Code skills used, dev tooling checklist |

## Licence

The repository is public. Bundled engines are permissively licensed — the
LibreOffice-WASM converter is MPL-2.0 / LGPL-3.0 (**not** AGPL). AGPL tools
(Ghostscript, MuPDF) are deliberately kept out. Application licence: TBD
(MIT or AGPL-3.0), decided at M0. See
[`docs/04-tech-stack.md`](docs/04-tech-stack.md).
