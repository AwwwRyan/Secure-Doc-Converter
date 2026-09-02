# 01 — Vision & Scope

## Problem

Online PDF tools (iLovePDF, Smallpdf, Adobe's web tools, and dozens of clones)
require uploading your document to a server you don't control. For anything
sensitive — contracts, IDs, financials, medical, legal — that is a
non-starter. Their privacy policies promise deletion "within a couple of hours",
but you cannot verify it, and you are trusting the operator, their staff, their
logging, their subprocessors, and their breach response.

Installing heavyweight desktop software (Acrobat Pro) or wrangling command-line
tools (`qpdf`, `pdftk`, `gs`, `mutool`) for every small job is the usual
alternative, and it's friction most people won't accept.

## Vision

A clean, fast web app that does the everyday PDF jobs where **the document
physically stays on your device** — every tool, no exceptions (ADR-011). It ships
as static files on a free host; there is no server that ever touches a file.
Shared with friends over the internet via a plain link.

## Who it's for

- **Primary:** the owner and a small circle of friends (tens, not thousands, of
  people; casual, bursty usage).
- Internet-facing, so it must survive being publicly reachable, but it is **not**
  a product, a business, or a service with an SLA.
- Users are non-technical. The privacy guarantee must be *legible* to them
  ("nothing is uploaded" shown in the UI, and a one-page explainer), not buried
  in a policy.

## Goals

1. **Verifiable privacy.** For *every* tool: zero network traffic carrying
   document bytes. A user can confirm this in DevTools in 30 seconds.
2. **No persistence anywhere.** No document is written to disk or a database, ever,
   on any machine. No logs of names or content. There is no server.
3. **Cover the five categories** well enough to replace day-to-day iLovePDF use:
   Organize, Optimize, Convert-to-PDF, Edit, Unlock.
4. **Clean, calm UI.** No ads ever, no upsells, no dark patterns, no clutter.
5. **Free to run, trivial to deploy.** Static bundle on a free host (Vercel /
   Cloudflare Pages); ~$0/month.
6. **Low maintenance.** No servers, pinned dependencies, no user data to protect
   or migrate.

## Non-goals

- **Convert *from* PDF** to Word/Excel/PowerPoint/JPG. (Different, harder problem;
  heavy dependencies; not the itch being scratched.)
- **Sign, Redact, Compare, PDF/A, Forms authoring, AI (summarize/translate).**
- **Protect / encrypt / add passwords.** Only *removing* a password you already
  know is in scope.
- **Password cracking / brute force / recovery.** Explicitly refused in the UI.
- **Accounts, teams, workspaces, saved history, cloud-storage connectors.**
- **A native desktop or mobile app**, or offline installability beyond a basic
  PWA app-shell cache.
- **Pixel-perfect Office→PDF fidelity.** The default in-browser tier is
  best-effort; the opt-in LibreOffice-WASM tier is LibreOffice-grade — complex
  decks with exotic fonts/effects still won't match Microsoft exactly.
- **Any server component.** No backend, no serverless functions, no container —
  not even a free one (ADR-011).

## Success criteria

- [ ] All five categories usable end-to-end on a mid-range laptop and a recent phone.
- [ ] Network tab shows **no document upload for any tool**, Office→PDF included.
- [ ] Office→PDF: a typical `.docx`, `.pptx`, `.xlsx` round-trips acceptably in the
      default tier; the opt-in tier matches LibreOffice.
- [ ] The opt-in LibreOffice-WASM engine downloads only after an explicit click,
      and is cleanly hidden where it can't run.
- [ ] `security-review` skill passes with no unresolved high findings before launch.
- [ ] A non-technical friend can use it from a link with no instructions.
- [ ] Fresh deploy to a live HTTPS URL in minutes following `07-deployment.md`.
- [ ] Running cost = $0/month (domain optional).

## Constraints & assumptions

- **Maintainers:** one owner + occasional help from friends. Keep the surface small.
- **Budget:** $0 — free static host, free CI, free public repo.
- **Browser support:** current Chrome, Edge, Firefox, Safari (desktop + mobile).
  Chromium gets nicer save-to-disk (File System Access API); others get downloads.
  The opt-in LibreOffice-WASM tier needs a capable desktop browser + RAM.
- **File sizes:** browser processing is memory-bound. Assume most files < 100 MB;
  warn above that; very large files may fail in-browser and that's an accepted
  limitation (see `08-roadmap.md` risk register).
- **Open link:** no auth in v1. With no server, the only exposure is who can load
  the page; a static-host passphrase is the pre-approved escalation.
