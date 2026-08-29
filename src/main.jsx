// Entry point. The order of operations in this file is load-bearing; read the comments before
// reordering anything.
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { createPortal } from 'react-dom'
import { MantineProvider } from '@mantine/core'

// ---- CSS ------------------------------------------------------------------------------------
// Mantine's LAYERED build first, the app's UNLAYERED stylesheet last. That ordering is the fence
// MANTINE-SEAM.md §4.3 requires, and it is stronger than declaring an explicit @layer order:
//
//   * For NORMAL declarations, unlayered styles outrank every layer. So every frozen .sheet-* /
//     .mv-* / #print-root rule beats Mantine's baseline automatically, with no per-rule work.
//   * For !important declarations the precedence REVERSES — layered !important would beat
//     unlayered !important — which put the app's `* { print-color-adjust: exact !important }` at
//     risk. Without that rule Chrome strips every phase fill, hiatus band and note highlight and
//     BOTH PDFs print as an empty grid. Verified against @mantine/core 9.5.2: all 20 !important
//     declarations in styles.layer.css are scoped to hashed .m_* class selectors, so not one of
//     them can match anything inside #table-wrap or #print-root. Re-check this on any Mantine
//     upgrade; tools/check-build.mjs asserts it.
import '@mantine/core/styles.layer.css'
import '@mantine/dates/styles.layer.css'
import './styles/legacy.css'

import { theme } from './theme.js'
import { Header } from './chrome/Header.jsx'
import { PreviewToolbar } from './chrome/PreviewToolbar.jsx'
import { initLegacyApp } from './legacy/app.js'

// ---- Why portals, and not a React root that owns the document ---------------------------------
// Three independent constraints in MANTINE-SEAM.md §3.1 rule out wrapping the app in a root div:
//
//   1. Both print paths hide the app with `body.printing-calendar > *:not(#print-root)` and
//      `body.printing-waterfall > *:not(#print-root)` — CHILD combinators. A React root wrapping
//      the app makes those selectors match the wrapper, and the printed page comes out blank.
//   2. `header.app-header` is resolved by a ResizeObserver IIFE that writes --header-h, which
//      feeds the frozen `.sheet-scroll{max-height:calc(100vh - var(--header-h) - 140px)}`.
//   3. #table-wrap must exist in the served HTML BEFORE the script runs: seven delegated listeners
//      are attached with an unguarded document.getElementById('table-wrap').addEventListener(...)
//      at IIFE-evaluation time. If React created that node on mount, all seven would throw and
//      take the rest of the IIFE with them.
//
// createPortal renders INTO an existing node without wrapping it, so the static skeleton in
// index.html keeps its exact shape and React only fills the interiors. One root and one
// MantineProvider, so the CSS-variable block is emitted once.
function Chrome() {
  return (
    <>
      {portal(<Header />, 'header.app-header')}
      {portal(<PreviewToolbar />, '.view-toggle-row')}
    </>
  )
}

// A portal whose host must already exist. It must NOT be created here: #table-wrap and
// header.app-header are both resolved by the engine at evaluation time, so a host React invented
// would either be missing when the engine looked for it or would sit in the wrong place in <body>.
function portal(node, selector) {
  const host = document.querySelector(selector)
  if (!host) {
    // Loud, because the failure is otherwise silent and looks like a styling bug.
    console.error('chrome: no host for ' + selector + ' -- the static skeleton is missing it')
    return null
  }
  return createPortal(node, host)
}

const host = document.getElementById('react-root')
const root = createRoot(host)

// flushSync, because React 19 commits asynchronously by default and initLegacyApp() binds to
// chrome elements BY ID at evaluation time. The chrome DOM has to exist before that call returns,
// not on the next frame.
//
// ⚠️ flushSync is NOT sufficient on its own, and finding that out cost an afternoon. Mantine's
// Popover mounts its dropdown from an EFFECT, so #file-menu is still absent when this returns --
// even with keepMounted. Anything the engine resolves by id at evaluation time must therefore
// either live in the STATIC skeleton or be reached by delegation from document. See the file-menu
// handler in legacy/app.js.
flushSync(() => {
  root.render(
    // forceColorScheme="light" — dark mode is a stated non-goal, see theme.js.
    <MantineProvider theme={theme} forceColorScheme="light" withCssVariables>
      <Chrome />
    </MantineProvider>
  )
})

initLegacyApp()
