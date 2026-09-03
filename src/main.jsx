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
// PER-COMPONENT, not the 273 KB bundle (round 6). The chrome uses about a dozen components; the
// full sheet ships ~200. The list below is not guesswork: every m_* class the app actually renders
// was collected from a live run that opened each sidebar tab, the file menu, all four tool
// popovers, the pop-out date picker, the phase picker, the month view and both note editors, then
// mapped hash -> file. ⚠️ Seven files are here that that sweep did NOT see, because their states
// are not reachable by clicking: Badge (the autosave-FAILED status), Loader (a Button's `loading`
// spinner), Tooltip, Divider (Menu.Divider), ScrollArea, VisuallyHidden and FloatingIndicator.
// THAT is the trap this optimisation carries -- a missing import renders unstyled rather than
// failing -- so add the file whenever a component or a STATE is added, and re-run the audit.
//
// ⛔ THE ORDER IS NOT ALPHABETICAL AND MUST NOT BE SORTED. Every file declares the SAME
// `@layer mantine`, so within it ORDER decides, and Mantine's components rely on that: Button's
// root and UnstyledButton's root are both single classes on the same element, so an alphabetical
// list (UnstyledButton last) let UnstyledButton's reset win and every button in the app rendered
// with no background, no border and no padding. Measured, not theorised — the first attempt did
// exactly this. The order below is DERIVED from the position of each file's own rules inside
// Mantine's shipped styles.layer.css, so it is that file's order with the unused parts removed.
// Regenerate the same way if the list changes; do not hand-sort it.
import '@mantine/dates/styles.layer.css'
import '@mantine/core/styles/default-css-variables.layer.css'
import '@mantine/core/styles/baseline.layer.css'
import '@mantine/core/styles/global.layer.css'
import '@mantine/core/styles/ScrollArea.layer.css'
import '@mantine/core/styles/UnstyledButton.layer.css'
import '@mantine/core/styles/VisuallyHidden.layer.css'
import '@mantine/core/styles/Paper.layer.css'
import '@mantine/core/styles/Overlay.layer.css'
import '@mantine/core/styles/Popover.layer.css'
import '@mantine/core/styles/Loader.layer.css'
import '@mantine/core/styles/ActionIcon.layer.css'
import '@mantine/core/styles/CloseButton.layer.css'
import '@mantine/core/styles/Group.layer.css'
import '@mantine/core/styles/ModalBase.layer.css'
import '@mantine/core/styles/Input.layer.css'
import '@mantine/core/styles/FloatingIndicator.layer.css'
import '@mantine/core/styles/Text.layer.css'
import '@mantine/core/styles/Combobox.layer.css'
import '@mantine/core/styles/Badge.layer.css'
import '@mantine/core/styles/Button.layer.css'
import '@mantine/core/styles/Divider.layer.css'
import '@mantine/core/styles/Menu.layer.css'
import '@mantine/core/styles/Modal.layer.css'
import '@mantine/core/styles/NumberInput.layer.css'
import '@mantine/core/styles/Tooltip.layer.css'
import '@mantine/core/styles/Stack.layer.css'
import './styles/inter.css'
import './styles/legacy.css'

import { theme } from './theme.js'
import { InfoHint } from './chrome/InfoHint.jsx'
import { Header } from './chrome/Header.jsx'
import { PreviewToolbar } from './chrome/PreviewToolbar.jsx'
import { ShowInfoCard, RegionCard, HolidaysCard, AppCard, PreferencesCard } from './chrome/Sidebar.jsx'
import { DatePop } from './chrome/DatePop.jsx'
import { SelectPop } from './chrome/SelectPop.jsx'
import { Dialogs } from './chrome/Dialogs.jsx'
import { APP_ICON } from './chrome/appIcon.js'
import { initLegacyApp } from './legacy/app.js'

// The app icon's bytes live in appIcon.js ONLY; the head carries placeholder hrefs (see the
// comment there). Written before render so the tab icon is right from the first paint the user
// can see — the app is 100% JS-dependent, so there is no meaningful pre-JS window. The engine's
// buildSavedHtml() serialises attributes, so a shareable copy carries the real URI here, not the
// placeholder.
for (const sel of ['link[rel="icon"]', 'link[rel="apple-touch-icon"]']) {
  const link = document.querySelector(sel)
  if (link) link.href = APP_ICON
}

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
      {portal(<><ShowInfoCard /><RegionCard /><HolidaysCard /><PreferencesCard /><AppCard /></>, '#sidebar-static')}
      {/* The All-phase hiatus card's rows are engine-generated, so the card itself cannot be a
          React component -- but its header is static markup, so its "i" portals in here. Keeps
          one InfoHint implementation rather than a CSS-only lookalike for this one card. */}
      {portal(
        <InfoHint label="All-phase hiatus" width={300}>
          A production-wide pause (e.g. a winter break) that stops every phase at once and pushes
          the whole schedule out. For pausing a single phase, use its own hiatus toggle above.
        </InfoHint>,
        '#hiatus-hint-host')}
      {/* Not a portal: DatePop renders straight into #react-root, which is a direct child of
          <body> BEFORE #print-root — so `body.printing-* > *:not(#print-root)` hides it in both
          print paths with no extra work, and #print-root stays last. */}
      <DatePop />
      <SelectPop />
      <Dialogs />
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
