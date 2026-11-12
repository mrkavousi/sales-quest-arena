import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { pwaBuild } from './scripts/pwa-build.mjs';

// `npm run build`            -> dist/ (regular static build)
// `npm run build:standalone` -> standalone/index.html (one self-contained file)
export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone';
  // Development/preview-only reverse proxy. Browser requests stay same-origin;
  // the backend address is never embedded in the client bundle.
  const target = process.env.GAME_BFF_TARGET;
  // Everything the client needs is under /api/v1/game; the older /login and
  // /demo-login HTML routes are no longer used by the app.
  const proxy = target ? {
    '/api/v1/game': { target, changeOrigin: true },
  } : undefined;
  return {
    base: './',
    plugins: [react(), ...(standalone ? [viteSingleFile()] : [pwaBuild()])],
    build: {
      outDir: standalone ? 'standalone' : 'dist',
      copyPublicDir: !standalone,
      assetsInlineLimit: standalone ? 100_000_000 : 4096,
    },
    server: { host: '0.0.0.0', port: 5173, allowedHosts: true as const, proxy },
    preview: { host: '0.0.0.0', port: 4173, allowedHosts: true as const, proxy },
  };
});
