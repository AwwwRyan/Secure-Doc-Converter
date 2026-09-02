import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Cross-origin isolation headers. Required in production for the opt-in
// LibreOffice-WASM engine (SharedArrayBuffer); set here too so dev matches prod.
// See docs/05-security-and-privacy.md and docs/07-deployment.md.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
  build: {
    target: 'es2022',
    // No source maps in the deployed bundle: they carry every dependency's
    // original source (and the URL strings in its comments), which muddies the
    // "grep the build for third-party origins → none" guarantee (docs/05).
    // The repo is public — build locally with `--sourcemap` to debug.
    sourcemap: false,
  },
});
