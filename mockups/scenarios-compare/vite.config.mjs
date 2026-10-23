// Builds the Compare window into one script + one stylesheet for mockups/scenarios.html. Not part of the app's build.
//   cd mockups/scenarios-compare && ../../node_modules/.bin/vite build --config vite.config.mjs --outDir <somewhere outside the repo>
// then paste out/compare.css and out/compare.js over the two marked blocks in ../scenarios.html.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  root: '.',
  plugins: [react()],
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    emptyOutDir: true, cssCodeSplit: false, minify: true, target: 'es2022',
    lib: { entry: 'entry.jsx', formats: ['iife'], name: 'SPTCompareBundle', fileName: () => 'compare.js', cssFileName: 'compare' },
  },
})
