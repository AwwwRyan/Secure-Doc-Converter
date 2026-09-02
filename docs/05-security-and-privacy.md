# 05 — Security & Privacy

This is the document the whole project exists to satisfy. If a feature can't meet
these terms, it doesn't ship.

## The promise, in plain words

1. **Your file never leaves your device.** Every tool — Organize, Optimize, Edit,
   Unlock, and Convert-to-PDF *including Word / PowerPoint / Excel* — runs in your
   browser. You can prove it in the Network tab: no request ever uploads a
   document.
2. **There is no server.** Nothing to hack, log, subpoena, or misconfigure. The
   only backend is a static file host that sends the app *to* you.
3. **Nothing is stored, anywhere, ever** — no accounts, no history, no file
   names, no contents, no analytics, on your side or ours.
4. **No third parties at runtime.** No CDN, no fonts server, no tracker, no error
   reporter. The page talks only to its own origin.

## Threat model

| # | Adversary | What they want | Our mitigation |
| --- | --- | --- | --- |
| T1 | **The operator** (owner) | Read users' documents | Processing is 100% client-side; **public source**; verifiable zero-upload for every tool; the host only serves static files it can't tie to a document |
| T2 | **The static host** (Vercel / Cloudflare) | See or retain documents | It never receives one. It serves HTML/JS/WASM and sees ordinary asset requests; documents are handled only in the visitor's browser |
| T3 | **Another person on the open link** | Reach someone else's files | No shared storage, no persistence, no server state — there is nothing of anyone else's to reach |
| T4 | **Network attacker** | Intercept / modify traffic | HTTPS + HSTS; strict CSP; SRI + `SHA256SUMS` on vendored engines; immutable git-SHA deploys |
| T5 | **Supply-chain** (a dependency ships malware) | Exfiltrate documents from the browser | Pinned versions + lockfile; `osv-scanner` gate; no `postinstall`; **`connect-src 'self'`** means stolen data has nowhere to send; minimal dependency count |
| T6 | **Malicious Office / PDF file** | RCE or exfiltration during parsing | Parse/convert in a **Web Worker** (no DOM, no `connect-src` beyond self); any HTML render step is in a `sandbox`ed, script-disabled `<iframe srcdoc>`; document bytes are never `eval`'d; size + page-count guards; LibreOffice-WASM runs sandboxed with macros disabled |
| T7 | **Oversized / pathological input** | Crash or hang the tab | Worker isolation; pre-run size checks (tighter on iOS Safari); cancellable long tasks; memory freed on cancel |

Out of model: nation-state targeting of a specific user's device; a compromised
end-user browser / OS; physical access to the user's machine.

## Client-side data hygiene

- All processing in a **Web Worker**; document `ArrayBuffer`s live only there.
- **No** `localStorage` / `sessionStorage` / `IndexedDB` / Cache Storage of file
  bytes or derived data (text, thumbnails). The settings store holds only UI
  prefs (theme, default page size, OCR language) — never anything from a document.
- **Service Worker** (if added post-launch for an offline app-shell) caches the
  static bundle **only** — a route guard ensures it never touches `blob:` /
  `data:` document traffic. It is the only component that could retain app code
  offline, and it retains no user data.
- Every `URL.createObjectURL` has a matching `revokeObjectURL` in a `finally`.
- On task end / cancel / route change / `beforeunload`: null out buffers, clear
  file `<input>`s, terminate idle workers.
- Result files are handed over on a user gesture (download / Save-to-folder); the
  object URL is revoked immediately after.

## HTTP security headers (set by the static host)

Delivered via `vercel.json` (Vercel) or a `_headers` file (Cloudflare Pages),
committed to the repo:

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self';
  worker-src 'self' blob:;
  child-src 'self' blob:;
  frame-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp        # see note
Cross-Origin-Resource-Policy: same-origin
```

- **`connect-src 'self'`** is the key anti-exfiltration control: even a
  compromised dependency cannot POST a document anywhere. There is no endpoint
  that accepts one anyway.
- **`style-src 'unsafe-inline'`** is allowed because dynamic inline `style=`
  attributes (progress bars, computed layout) are unavoidable in React. It is not
  a meaningful weakening — inline styles cannot exfiltrate data, and
  `frame-ancestors 'none'` + same-origin already close the CSS-redressing angle.
  `script-src` stays strict (no `'unsafe-inline'`).
- **COOP + COEP (`require-corp`)** are needed for `SharedArrayBuffer`, which the
  opt-in **LibreOffice-WASM** engine requires (and threaded Tesseract can use).
  Because every asset is same-origin, a global `Cross-Origin-Resource-Policy:
  same-origin` satisfies COEP with no other change. Open question Q4: enable
  globally from the start, or only on the routes that need it. Either way it's a
  header-file change, not code.
- `'wasm-unsafe-eval'` (not `'unsafe-eval'`) covers pdf.js / pdf-lib / qpdf /
  tesseract / jsPDF. Verify per engine at integration — including LibreOffice
  WASM, which may need `'unsafe-eval'`; if so, that relaxation is scoped and
  recorded in an ADR before it ships.
- HTML→PDF and `docx-preview` render inside `<iframe sandbox srcdoc>` with
  neither `allow-same-origin` nor `allow-scripts`.

## Open-link stance and the escalation path

v1 has no login (ADR-003). Safe because nothing is stored and no tool contacts a
server — the only question is who can load the page. If that needs limiting:

- **Vercel** → turn on project **Password Protection** (or Vercel Authentication).
- **Cloudflare Pages** → add a **Cloudflare Access** policy (email allowlist or a
  shared PIN).

One shared passphrase, distributed out of band. No app change; recorded as an ADR
if enacted.

## Supply-chain controls

- Exact-pinned deps; committed lockfile; `osv-scanner` + `npm audit` gate in CI.
- `pnpm` with install scripts disabled by default; each exception reviewed.
- Vendored engines (`qpdf`, `tesseract-core`, `pdf.worker`, LibreOffice-WASM)
  under `public/vendor/` with `SHA256SUMS`, verified in CI and at build time.
- Dependency count is a tracked metric; adding one needs a one-line justification
  in the PR.
- Renovate PRs are reviewed, never auto-merged.
- Deploys are tied to a git SHA and immutable — a friend can check the running
  commit against the public repo.

## What is logged / kept

| Data | Kept? |
| --- | --- |
| File contents / bytes | **No** — never leaves the browser for any tool |
| File names | **No** |
| Which tool was used, by whom | **No** |
| IP addresses | Only the static host's standard edge/CDN request logs for asset delivery (short-retention, operated by Vercel/Cloudflare); no application logging; disable host analytics |
| Analytics / usage metrics | **None** |
| Crash / error reports | **None** sent anywhere; errors are shown in-page only |

## How a user can verify it themselves

Put this on the `/about` page, in these words:

1. Open **DevTools → Network** and clear it.
2. Use **any** tool — merge, compress, unlock, Word→PDF, anything.
3. You'll see the app and its engines download once (and the high-fidelity Office
   converter only if you ask for it). When you run a tool and save the result:
   **no request uploads your file.** The result is built in your browser.
4. There is no "convert" server request to find, for any tool.
5. The source is public — the whole app is static files; read them.

## Pre-launch security checklist

- [ ] `security-review` skill run on the full branch, no unresolved high/critical.
- [ ] CSP verified in Chrome / Firefox / Safari / Edge; no console violations; no
      weakening of the policy above without an ADR.
- [ ] COOP/COEP: cross-origin isolation actually achieved where LibreOffice-WASM
      needs it (`crossOriginIsolated === true`); no other asset broken by COEP.
- [ ] Network-tab audit for **every** tool (incl. both Office→PDF tiers): zero
      document upload.
- [ ] Feed a malformed / macro-laden `.docx`, `.pptx`, `.xlsx` and a zip-bomb
      `.xlsx` → clear error, no hang, tab stays responsive.
- [ ] Large-file guard fires before OOM on desktop and on iOS Safari.
- [ ] `grep` the production build for third-party origins → none.
- [ ] `SHA256SUMS` for vendored engines verified at build time.
- [ ] Service Worker (if present) cache audited → app shell only.
- [ ] Response headers scored by an offline linter → A/A+.
