/**
 * Guardrail: the built bundle must never reference a third-party runtime
 * origin. The browser CSP (connect-src 'self', script-src 'self') enforces
 * this at run time; this check catches it at build time so a bad dependency
 * is spotted in review, not in production.
 *
 * Vendored libraries legitimately embed URL *strings* that are never fetched:
 * XML namespace identifiers, funding links in license banners, and dead
 * default-config we override (tesseract's CDN worker path — we pin the
 * vendored one in src/lib/ocr/runOcr.ts). Those exact hosts are allow-listed
 * below with a reason. Anything else fails the build.
 *
 * Usage: node scripts/check-build-origins.mjs [distDir]
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Scan the whole build, not just dist/assets — public/ files (e.g. the vendored
// LibreOffice glue under dist/vendor/) land at the dist root and must be
// checked too.
const DIST = process.argv[2] ?? (existsSync('dist') ? 'dist' : 'dist/assets');

/** host -> why it is inert (documentation, shown on failure diff). */
const ALLOW = new Map([
  ['www.w3.org', 'XML/SVG namespace URIs'],
  ['schemas.openxmlformats.org', 'OOXML namespace URIs (docx/xlsx/pptx parsers)'],
  ['sheetjs.openxmlformats.org', 'SheetJS synthetic namespace string'],
  ['sheetjs.com', 'SheetJS version-stamp string in an internal data table — never fetched'],
  ['schemas.microsoft.com', 'OOXML extension namespace URIs'],
  ['purl.org', 'Dublin Core namespace URIs'],
  ['purl.oclc.org', 'ODF namespace URIs'],
  ['docs.oasis-open.org', 'ODF namespace URIs'],
  ['openoffice.org', 'ODF namespace URIs'],
  ['ns.adobe.com', 'XMP metadata namespace URIs'],
  ['www.aiim.org', 'PDF/A extension-schema namespace URIs'],
  ['www.xfa.org', 'XFA namespace URIs (pdf tooling)'],
  ['macVmlSchemaUri', 'VML namespace placeholder string (xlsx)'],
  ['docx', 'docx-preview internal namespace token'],
  ['jspdf.default.namespaceuri', 'jsPDF internal namespace token'],
  ['example.com', 'placeholder in library JSDoc/tests'],
  ['foo.bar', 'placeholder in library JSDoc/tests'],
  ['localhost', 'dev-only references'],
  ['cdn.jsdelivr.net', 'tesseract.js default workerPath — overridden with the vendored path'],
  [
    'cdnjs.cloudflare.com',
    'jsPDF pdfobject viewer URL — only used by output() modes we never call',
  ],
  ['github.com', 'links in library license/help strings'],
  ['stuk.github.io', 'JSZip homepage in its license banner'],
  ['npms.io', 'badge URL in a library license banner'],
  ['opencollective.com', 'funding link in a library license banner'],
  ['react.dev', 'React dev-mode console warning links'],
  ['reactrouter.com', 'React Router dev-mode warning links'],
  ['rolldown.rs', 'bundler runtime comment'],
  ['tailwindcss.com', 'Tailwind license-banner comment in the built CSS'],
]);

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|css)$/.test(name)) files.push(p);
  }
})(DIST);

const offenders = new Map(); // host -> Set(file)
const re = /\bhttps?:\/\/([a-zA-Z0-9._-]+)/g;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(re)) {
    const host = m[1];
    if (ALLOW.has(host)) continue;
    if (!offenders.has(host)) offenders.set(host, new Set());
    offenders.get(host).add(file);
  }
}

if (offenders.size > 0) {
  console.error('External origin(s) referenced in the build:\n');
  for (const [host, inFiles] of offenders) {
    console.error(`  ${host}`);
    for (const f of inFiles) console.error(`      ${f}`);
  }
  console.error(
    '\nIf this is an inert string inside a vendored library (namespace URI, ' +
      'license-banner link, dead config), add it to ALLOW in this script with a ' +
      'reason. Otherwise remove the dependency or the code path.',
  );
  process.exit(1);
}

console.log(`ok — ${files.length} files scanned, no unexpected external origins`);
