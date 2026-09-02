# 09 — Architecture Decision Records

Short records of decisions that are expensive to reverse. New decisions that
contradict a "Hard rule" in [`../CLAUDE.md`](../CLAUDE.md) need one of these plus
the owner's sign-off.

Status values: **Accepted**, **Proposed**, **Superseded**.

---

## ADR-001 — Browser-first processing

**Status:** Accepted (2026-09-02)

**Context:** The project exists because uploading documents to a third party is
unacceptable. Modern browsers can run PDF manipulation (pdf-lib), rendering
(pdf.js), decryption (qpdf-wasm), and OCR (tesseract.js) entirely client-side.

**Decision:** Every tool runs in the browser (in a Web Worker). There is **no
server-side processing of any kind** — the only backend is a static file host
(see ADR-011, which extends this to Office→PDF too).

**Consequences:** Strongest possible privacy story; verifiable by users — *every*
tool shows zero uploads. First load carries WASM (mitigated by per-tool
code-splitting and lazy loading). Some tools are best-effort vs a server
implementation (compress, repair, Office→PDF) — accepted.

---

## ADR-002 — Hybrid: one stateless sidecar, Office→PDF only

**Status:** ~~Accepted (2026-09-02)~~ **Superseded by ADR-011 (2026-09-02)**

Original decision: run a single self-hosted, stateless conversion sidecar
(LibreOffice) reached at `POST /api/convert`, allowlist `office2pdf` only.

**Why superseded:** the owner does not want to pay for any infrastructure, and
does not want files touching *any* third party — including a free-tier service
that we'd merely be trusting not to log. Office→PDF moves into the browser
(ADR-011). There is now no server component at all.

---

## ADR-003 — Open link for v1 (no authentication)

**Status:** Accepted (2026-09-02)

**Context:** The owner wants to share with friends via a plain link. Building
accounts adds a user store (persistence) and ongoing maintenance, against the
project's grain.

**Decision:** No login in v1. There is nothing to abuse — no server, no stored
state, no endpoint that accepts a file. The only question is who can load the
static page.

**Escalation (pre-approved, no new ADR needed to enact):** turn on the static
host's built-in access control — Vercel **Password Protection** or Cloudflare
Pages **Access** — with a single shared passphrase distributed out of band. No
app change. (With no server there is no `/api/*` to abuse; the only concern is
who can load the page.)

**Revisit if:** the circle grows beyond "friends".

---

## ADR-004 — Vite + React (SPA), not Next.js

**Status:** Accepted (2026-09-02)

**Decision:** Frontend is a static Vite + React + TypeScript SPA.

**Rationale:** Output is plain static files — nothing to run or secure
server-side, trivial to self-host, easy to audit, easy to move to a static host
as a fallback. Next.js brings SSR/runtime and static-export edge cases we don't
need. Astro was considered; React islands via Vite are sufficient.

---

## ADR-005 — shadcn/ui + Tailwind for the UI

**Status:** Accepted (2026-09-02)

**Decision:** Tailwind CSS v4 for styling; shadcn/ui components (Radix
primitives) copied into the repo rather than pulled as an opaque dependency.

**Rationale:** Accessible by default; we own and can audit every component; MIT;
compiled static CSS keeps the CSP clean (no runtime style injection needed).
Clean, calm aesthetic matches the product intent.

---

## ADR-006 — Licensing stance

**Status:** Proposed → finalise at M0

**Context:** Ghostscript and MuPDF are AGPL-3.0; serving them as WASM to browsers
triggers AGPL's network clause.

**Decision (proposed):**
1. Prefer **MIT/Apache/BSD** libraries for everything shipped to the browser.
2. The Office→PDF engines are acceptable: `docx-preview` (Apache-2.0), SheetJS
   community (Apache-2.0), PPTXjs (MIT), and **LibreOffice WASM / ZetaJS**
   (**MPL-2.0 / LGPL-3.0**, *not* AGPL — the network-use clause does not apply).
3. Ghostscript and MuPDF (AGPL-3.0) stay **out of the browser bundle**. If deep
   compress/repair ever needs them there, that is a new ADR; there is no longer a
   server to run them on.
4. The **repository is public** regardless.
5. Application's own licence: **MIT or AGPL-3.0**, decided at M0 and recorded here.

---

## ADR-007 — No third-party runtime origins, no analytics

**Status:** Accepted (2026-09-02)

**Decision:** The deployed app makes network requests to **its own origin only**.
Fonts, icons, scripts, styles, WASM — all self-hosted and bundled. No analytics,
telemetry, error reporting, or tag managers, ever. Enforced by
`connect-src 'self'` in the CSP and a CI check that greps the build for external
origins.

---

## ADR-008 — Host: Vercel (static, no reverse proxy)

**Status:** Accepted (2026-09-02); revised by ADR-011; host chosen 2026-09-02

**Decision:** With no server component (ADR-011), the host is just **static
hosting with custom response headers**. **Vercel** (Hobby, free) is the chosen
host; **Cloudflare Pages** is a documented drop-in fallback (same static `dist/`,
`_headers` instead of `vercel.json`). Only the app is deployed — no document is
ever uploaded to it. The host provides TLS, CDN, the security headers + CSP, and
the `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers the
LibreOffice-WASM engine needs for `SharedArrayBuffer`. No reverse proxy, no
`/api/*`.

**Rationale:** Nothing to proxy to. `vercel.json` covers headers + SPA fallback.
Fully auditable; immutable git-SHA deploys; free.

**Known constraint:** Vercel Hobby is non-commercial-use only — fine for a
private friends deployment with no ads and no charging. Switch to Cloudflare
Pages (no such clause) or Vercel Pro if that ever changes.

---

## ADR-010 — Vercel supported as a deployment path

**Status:** ~~Accepted (2026-09-02)~~ **Superseded by ADR-011 (2026-09-02)**

The three-path model (A: VPS+Compose, B: Vercel+container sidecar, C: Vercel
static) is gone. ADR-011 removes the sidecar entirely, so deployment is simply
"push the static bundle to a free static host" — see ADR-008 and
[`07-deployment.md`](07-deployment.md).

---

## ADR-011 — Office→PDF runs in the browser; no server anywhere

**Status:** Accepted (2026-09-02)

**Context:** The owner will not pay for infrastructure and will not let files
touch any third party — not even a free-tier service trusted not to log. That
rules out the sidecar (ADR-002) and the container-on-Cloud-Run option.

**Decision:** Office→PDF is a **browser tool**, in two tiers:

1. **Default — lightweight renderers**, lazy-loaded (~1–2 MB total):
   `docx-preview` for Word, `SheetJS` + a table renderer for Excel,
   `PPTXjs` / `pptx-preview` for PowerPoint → rendered to DOM/canvas → `jsPDF`.
   Good for everyday documents and simple sheets/decks. Fidelity is explicitly
   *not* guaranteed to match Microsoft for complex layouts, and the UI says so.
2. **Opt-in — LibreOffice WASM (ZetaJS / ZetaOffice)** for full fidelity, behind
   a one-time "~100–250 MB download" prompt, cached thereafter. Runs entirely in
   the browser; needs cross-origin isolation (COOP/COEP) and significant RAM;
   degraded on low-end phones (the default tier still works there).

**Consequences:**
- **No sidecar, no VPS, no container, no Docker, no `/api/*`.** Deployment is a
  static bundle on a free host (ADR-008). `connect-src 'self'` holds for the
  whole app; *every* tool is verifiably upload-free.
- `docs/03`, `05`, `07` lose their server sections; `04` gains the Office
  libraries; `08` M5 becomes "browser Office converters".
- PPTX fidelity in the default tier is the weakest point → the WASM tier is the
  real answer for decks (tracked as a risk).
- First use of each tier downloads its engine; budget/caching work in M5.

---

## ADR-009 — Scope: to-PDF only, unlock-only security, no accounts

**Status:** Accepted (2026-09-02)

**Decision:** In scope: Organize, Optimize, Convert **to** PDF, Edit, Unlock.
Out: convert **from** PDF, Sign, Redact, Compare, Protect/encrypt, AI features,
password cracking, accounts/teams/history, native apps. Rationale and the full
list live in [`01-vision-and-scope.md`](01-vision-and-scope.md).

---

## Open questions (decide by/at the milestone noted)

| # | Question | Decide by |
| --- | --- | --- |
| Q1 | `pdf-lib` vs `@cantoo/pdf-lib` fork | M0 / M1 |
| Q2 | App licence: MIT vs AGPL-3.0 | M0 (ADR-006) |
| ~~Q3~~ | ~~Static host~~ → **decided: Vercel** (Cloudflare Pages = fallback), ADR-008 | done |
| Q4 | Turn on COOP/COEP globally (needed for LibreOffice WASM; also helps threaded OCR) — or only on demand | M3 / M5 |
| Q5 | Ship a PWA app-shell service worker at all? | post-launch |
| Q6 | Which OCR language packs to bundle by default | M3 |
| Q7 | PowerPoint default renderer: `PPTXjs` vs `pptx-preview` vs "decks need the WASM tier" | M5 |
| Q8 | Bundle the LibreOffice WASM engine as an opt-in from launch, or add post-launch | M5 |
