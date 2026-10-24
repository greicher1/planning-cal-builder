// Builds the Phases-card mockups into one script + one stylesheet for mockups/phase-cards.html. Not part of the app's build.
//   cd mockups/phase-cards && ../../node_modules/.bin/vite build --config vite.config.mjs --outDir <somewhere outside the repo>
//   then: node assemble.mjs <that outDir>   (writes ../phase-cards.html with both inlined)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  root: '.',
  plugins: [react()],
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    emptyOutDir: true, cssCodeSplit: false, minify: true, target: 'es2022', assetsInlineLimit: 100 * 1024 * 1024,
    lib: { entry: 'entry.jsx', formats: ['iife'], name: 'SPTPhaseCards', fileName: () => 'phase-cards.js', cssFileName: 'phase-cards' },
  },
})
