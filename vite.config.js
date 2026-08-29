// Build config for the SPT Planning Calendar Builder.
//
// The product is ONE self-contained file. That is not a preference: the PWA manifest and every
// icon are inlined so the tool can be emailed around and run offline from file://, and the
// "Export shareable copy" feature hands someone a complete working app in one document. So the
// build's whole job is to take src/ back down to a single dist/index.html.
//
// ⛔ The root index.html is NOT this build's input and must not become one. It is the deployed
// v1.2.0 app, byte-identical to releases/v1.2.0.html, and `main` auto-deploys it. It stays exactly
// as it is until an explicit, owner-approved cutover.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  root: 'src',
  // Relative asset URLs: the built file is opened from file:// at least as often as it is served.
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // One file means one chunk and one stylesheet; there is nothing to split into.
    cssCodeSplit: false,
    assetsInlineLimit: 100 * 1024 * 1024,
    target: 'es2022',
    // ⚠️ The legacy IIFE contains a LITERAL NUL byte in a string literal -- the SIM_KEY sentinel,
    // chosen so it cannot collide with any phase key. A minifier is entitled to re-encode it.
    // tools/check-build.mjs asserts it survives the build; do not delete that check.
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
})
