# 07 — Deployment

There is no server (ADR-011). Deployment is: **build the static bundle, push it
to a free static host that lets you set response headers.** No VPS, no container,
no Docker, no `/api/*`.

## Host — Vercel (decided, ADR-008)

**Vercel** Hobby plan (free): TLS + CDN + custom response headers + auto-detects
Vite. **Only the app is deployed to it — no document is ever uploaded.**
**Cloudflare Pages** is a documented drop-in fallback (same `dist/`, `_headers`
instead of `vercel.json`, `_redirects` for SPA fallback).

| | Vercel (chosen) | Cloudflare Pages (fallback) |
| --- | --- | --- |
| Headers config | `vercel.json` | `_headers` file |
| SPA fallback | `rewrites` in `vercel.json` | `_redirects` file |
| Custom domain + TLS | included | included |
| Access control (the escalation) | Password Protection / Vercel Authentication | Cloudflare Access (email allowlist or PIN) |
| Terms | Hobby = non-commercial — fine for a private friends deployment | no such clause |
| Build | auto-detects Vite | build `pnpm build`, output `dist` |

A friend just loads a URL. Nothing to install, no accounts.

## `vercel.json`

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "rewrites": [
    { "source": "/((?!assets/|vendor/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "no-referrer" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Cross-Origin-Resource-Policy", "value": "same-origin" }
      ]
    },
    {
      "source": "/(assets|vendor)/(.*)",
      "headers": [ { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" } ]
    }
  ]
}
```

## `_headers` (Cloudflare Pages equivalent)

```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Resource-Policy: same-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/vendor/*
  Cache-Control: public, max-age=31536000, immutable
```

(Cloudflare Pages SPA fallback: add a `_redirects` line `/*  /index.html  200`,
scoped so it doesn't shadow `/assets` and `/vendor`.)

### On COOP/COEP

`Cross-Origin-Embedder-Policy: require-corp` is here because the opt-in
LibreOffice-WASM engine needs `SharedArrayBuffer` (cross-origin isolation). Every
asset is same-origin and gets `Cross-Origin-Resource-Policy: same-origin`, so
nothing else breaks. If integration shows a problem, the fallback is to send
COOP/COEP only on the routes that load the WASM engine — a header-file change,
recorded as an ADR (Q4).

## First deploy

1. Push the repo to GitHub.
2. Vercel: "Import Project" → it detects Vite → deploy. **Cloudflare Pages**:
   "Create project" → connect repo → build `pnpm build`, output `dist`.
3. Add a custom domain in the dashboard; point DNS as instructed. TLS is automatic.
4. Run the verification checklist. Share the link.

Total time: minutes. Cost: **$0/month** (domain ~$12/yr if you want one).

## Verification (post-deploy)

- [ ] HTTPS valid; HTTP→HTTPS redirect; HSTS present.
- [ ] Response headers scored A/A+ by an offline linter; CSP has no gaps.
- [ ] In the page console: `crossOriginIsolated === true` (COOP/COEP working).
- [ ] DevTools Network tab: run Merge, Compress, Unlock, **Word→PDF** → **zero**
      document uploads for every one.
- [ ] Opt-in LibreOffice-WASM: the ~big download happens only after the explicit
      click, then is served from cache on reload.
- [ ] `grep` the built `dist/` for external origins → none.
- [ ] Deployed commit SHA matches the public repo `HEAD`.
- [ ] (If added) Service Worker caches app shell only — no `blob:`/`data:`.

## Operations

| Task | How |
| --- | --- |
| Deploy | `git push` (host auto-builds) — or `vercel --prod` / `wrangler pages deploy` |
| Rollback | Host dashboard → instant rollback to a previous deployment |
| TLS | Host-managed, auto-renew |
| Logs | Host's edge request logs only (asset delivery); no app logs by design |
| Uptime | External ping to the root URL |
| Backups | None — no state. Re-deploy from the repo. |
| Limit who can load it | Vercel Password Protection / Cloudflare Access (ADR-003) |
| Incident: compromise suspicion | Roll back the deployment; there is nothing at rest to contain |

## If full Office fidelity ever isn't enough in-browser

The opt-in LibreOffice-WASM tier is the ceiling without a server. If a future
need genuinely can't be met in the browser, adding any server component is a new
ADR that must re-clear the guarantees in
[`05-security-and-privacy.md`](05-security-and-privacy.md) — it is not the current
plan.
