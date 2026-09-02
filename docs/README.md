# Planning documentation

This folder is the source of truth for **Secure Doc Converter** while it is in the
planning stage. No application code exists yet.

## Reading order

1. [`01-vision-and-scope.md`](01-vision-and-scope.md) — why we're building this and where the boundaries are
2. [`02-feature-spec.md`](02-feature-spec.md) — what each tool does, in detail
3. [`03-architecture.md`](03-architecture.md) — how the system is put together (client-side only)
4. [`04-tech-stack.md`](04-tech-stack.md) — concrete technology choices and licences
5. [`05-security-and-privacy.md`](05-security-and-privacy.md) — the trust model (the reason this project exists)
6. [`06-ui-ux.md`](06-ui-ux.md) — the interface
7. [`07-deployment.md`](07-deployment.md) — getting it online
8. [`08-roadmap.md`](08-roadmap.md) — the build plan
9. [`09-decisions.md`](09-decisions.md) — decisions already locked in, with rationale
10. [`10-skills-and-tooling.md`](10-skills-and-tooling.md) — how we'll actually work

## Decisions locked so far (2026-09-02)

| # | Decision |
| --- | --- |
| D1 | **Browser-only processing.** *Every* tool runs client-side. No server, ever (ADR-011). |
| D2 | **Office → PDF is in-browser too:** lightweight renderers by default (`docx-preview` / `SheetJS` / `PPTXjs` → `jsPDF`), plus an **opt-in LibreOffice-WASM** engine (~100–250 MB one-time download) for full fidelity. |
| D3 | **Static hosting on Vercel** (free Hobby plan; Cloudflare Pages = fallback). No VPS, no container, no Docker. $0/month. Only the app is deployed; no document is uploaded. |
| D4 | **Open link** for v1 — no login. A shared passphrase via the static host's access control is the pre-approved escalation. |
| D5 | **Visual UI mockup** is produced during planning (design canvas artifact), alongside the written UI spec. |

Full rationale for each: [`09-decisions.md`](09-decisions.md).

## Open questions

Tracked at the bottom of [`09-decisions.md`](09-decisions.md). Nothing here is
frozen until milestone M0 starts.
