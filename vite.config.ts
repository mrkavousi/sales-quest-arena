import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`            -> dist/ (regular static build)
// `npm run build:standalone` -> standalone/index.html (one self-contained file)
export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone';
  return {
    base: './',
    plugins: [react(), ...(standalone ? [viteSingleFile()] : [])],
    build: {
      outDir: standalone ? 'standalone' : 'dist',
      assetsInlineLimit: standalone ? 100_000_000 : 4096,
    },
    server: { host: '0.0.0.0', port: 5173, allowedHosts: true as const },
    preview: { host: '0.0.0.0', port: 4173, allowedHosts: true as const },
  };
});
