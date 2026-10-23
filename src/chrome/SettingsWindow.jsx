// The Settings window (owner ruling 12, 20 Oct 2026): "a tabbed panel that slides in beside the grid
// and leaves the waterfall visible", opened from the Settings button in the sidebar's rail. It holds
// what used to be the sidebar's Settings TAB -- Region and holidays, the Preferences, the header
// presets, Export App With Data -- and it is where the new calendar-level settings go. The sidebar
// keeps Show and Phases.
//
// ⭐ THE TABS USED TO BE THE SAVE BOUNDARY, AND NOW ONLY REGION'S IS. The window shipped with a Calendar
// tab (saved in the calendar's file) beside Preferences (kept on this computer, localStorage, never in
// captureSnapshot()). The owner merged the two, 20 Oct 2026: *"Lets combine settings under preferences
// and Calendar to be just under "Preferences". Delete the calendar tab. this should apply to both the
// waterfall and month view"*. So Preferences holds both kinds now, like Presets always has. Nothing
// moved between a file and this computer -- every control keeps its id and its store.
// Each tab used to open on a line saying which part is which ("Saved in this calendar's file, so they
// travel with it -- except ..."). The owner deleted all of them, 23 Oct 2026, so a tab opens on its
// first card. Only the Headers card's ⓘ and the Help page's presets paragraph still say what stays on
// this computer.
//
// ⭐ IT OPENS UNDER THE RAIL, NOT OVER IT (owner, 23 Oct 2026): *"it should not cover the
// Show/phases/settings bar. Instead it should appear right below it with the preferences/region/presets
// menu below"*. So the rail stays visible and live while the window is open: its Settings button
// takes the selected look, and a click on Show or Phases closes the window and goes there, as a tab
// would. The window's own "Settings ×" head went with it, since it repeated the button right above it
// (Escape and the Settings button close it). And it no longer slides in: the same day, *"can we just
// have the menu already there rather than still sliding in"*, so it is simply shown (legacy.css).
//
// ⛔ WHERE IT LIVES, AND WHY. React portals this into #settings-host, a static host INSIDE
// aside.form-panel (src/index.html), and CSS lays it over the sidebar below the rail (legacy.css,
// "The Settings window"). Three things decided that, and each is a trap if moved:
//   1. fields.byId is built in DOCUMENT order. The host sits exactly where the Region and Holidays
//      cards used to, so #union-place, #custom-hol-name and #custom-hol-date keep their places among
//      the swept ids and every saved calendar's byId keys come out in the same order as before.
//   2. Every `.form-panel ...` rule in legacy.css (the plain checkbox and number-input looks, the
//      invalid-field ring, the Mantine label sizes) keeps reaching the moved controls. A body-level
//      Drawer would have stripped them of all of it.
//   3. It is NOT a Mantine Drawer/Modal for the same reason, and because both portal to <body> and
//      unmount when closed. ⛔ The window must stay MOUNTED while closed: collectFieldValues() and
//      readState() read these controls from the DOM on every save and every update, and a closed
//      window that unmounted would save a calendar with no Region. Closed is `display:none`, exactly
//      what the sidebar's `.tab-hidden` did to these cards whenever another tab was showing.
//
// ⛔ NO ENGINE CODE MAY CAPTURE A NODE IN HERE AT IIFE TIME unless React has committed it inside
// main.jsx's flushSync. Everything below renders in that first synchronous commit, which is why it
// is safe for the engine to bind #union-place, #share-copy-btn and the rest as it always has. That
// holds ONLY because nothing here mounts from an effect: no Popover, no Transition, no Collapse, and
// Tabs with keepMountedMode="display-none" -- see the comment on <Tabs>.
import { useState, useLayoutEffect, useEffect, useRef } from 'react'
import { Tabs } from '@mantine/core'
import { installChrome } from './bridge.js'
import {
  RegionCard, HolidaysCard, AppCard, HeadersCard, AutoNotesCard, WaterfallCard, MonthViewCard,
} from './Sidebar.jsx'

// ⚠️ The VALUES are what a leg or the engine names (chrome.settingsWindow({ open, tab })); the labels
// are the owner's. Named by the owner from the mock-up, 20 Oct 2026 ("Shorter names"). Presets is
// the owner's too, the same day: "a tab in settings that keeps both presaved headers and presaved side
// boxes". It holds the Headers card now; the side-box presets (ruling 7, built in a sibling session)
// go beside it when they land.
// Preferences is FIRST, and the tab the window opens on, because it took over the Calendar tab's place
// and contents when the owner merged the two (20 Oct 2026): it holds the settings people reach for most.
const TABS = [
  { value: 'prefs', label: 'Preferences' },
  { value: 'region', label: 'Region' },
  { value: 'presets', label: 'Presets' },
]
// The retired tab's value, still accepted from a caller (a leg on an older branch, a later merge that
// names it) and sent to where its cards went, so `{ tab: 'calendar' }` opens Preferences, not nothing.
const TAB_ALIASES = { calendar: 'prefs' }

// ⛔ THE PANELS' CONTENTS ARE BUILT ONCE, HERE, AND THAT IS A CORRECTNESS REQUIREMENT. Mantine's Switch
// is controlled INSIDE itself (useUncontrolled, then <input checked={state}>), so the engine's `.checked`
// writes -- reflectSingleColumn(), refreshPrepUI(), reflectMonthTagPrefs(), on every undo, Load and New --
// never reach its state, and the next time React re-renders a Switch it writes that stale state back
// over the engine's. In the sidebar the cards never re-rendered after mount, so it never showed. This
// window re-renders on every open, close and tab change: before this, a Load of a file with Pause prep
// OFF, then opening the window, showed it ON (offweek R12 and R14 caught it, 20 Oct 2026). Handing React
// the SAME element objects every render makes it skip the cards' subtrees entirely, so nothing in them
// re-renders after the first commit. ⚠️ Never build these inside SettingsWindow's render, and never
// give a card props or context that change: either brings the stale-state write back.
//
// ⚠️ PANEL ORDER IS SWEEP ORDER. Preferences' controls are all skipped by the sweep (.prefs-card) or
// are buttons or id-less boxes (Automatic notes), and Presets' likewise, so only the Region tab
// contributes ids to fields.byId -- in the order RegionCard, HolidaysCard, as before. Preferences
// sitting AHEAD of Region in the DOM (it took the Calendar tab's place) is safe for exactly that
// reason: a new card with a SWEPT id here would land before #union-place in every saved file.
//
// Preferences = the old Calendar tab's cards and the old Preferences tab's, merged by view (owner, 20 Oct
// 2026; see Sidebar.jsx, WaterfallCard / MonthViewCard).
const PREFS_PANEL = (
  <>
    <WaterfallCard />
    <MonthViewCard />
    {/* Automatic notes (ruling 9) reach both views, so it is no .pref-view-* card. No id in it. */}
    <AutoNotesCard />
    <AppCard />
  </>
)
const REGION_PANEL = (
  <>
    <RegionCard />
    <HolidaysCard />
  </>
)
// The saved-presets library (owner, 20 Oct 2026). ⚠️ The SIDE-BOX presets card goes here, after
// HeadersCard, when ruling 7 merges -- a .prefs-card like HeadersCard if any control in it carries an id,
// since presets are per machine.
const PRESETS_PANEL = (
  <>
    <HeadersCard />
  </>
)

export function SettingsWindow() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('prefs')
  const rootRef = useRef(null)
  // Where focus was when the window opened, so closing puts it back.
  const returnFocus = useRef(null)

  // The engine closes the window when it sends the user to the Phases card ("Show in Phases card"
  // and friends), which the window would otherwise cover. `tab` lets a caller open a given tab.
  useLayoutEffect(() => {
    installChrome({
      settingsWindow: (next) => {
        if (!next) return
        const want = typeof next.tab === 'string' ? (TAB_ALIASES[next.tab] || next.tab) : null
        if (want && TABS.some((t) => t.value === want)) setTab(want)
        if (typeof next.open === 'boolean') setOpen(next.open)
      },
    })
  }, [])

  // The Settings button is STATIC markup (the rail is engine-wired skeleton), so it is reached by
  // delegation on its class -- never captured. So are Show and Phases: with the rail left uncovered,
  // picking either one is leaving Settings, so it closes the window (the engine's own rail handler
  // switches the tab). ⛔ Only on the user's click or arrow key, never from setSidebarTab(), which
  // every undo and Load replays (see revealSidebarTab() in app.js).
  useEffect(() => {
    const onClick = (e) => {
      const t = e.target && e.target.closest ? e.target : null
      if (!t) return
      const b = t.closest('.side-settings-btn')
      if (b) {
        returnFocus.current = b
        setOpen((o) => !o)
      } else if (t.closest('.side-tab-btn')) {
        setOpen(false)
      }
    }
    // The rail's tablist moves between Show and Phases on the arrow keys, Home and End (app.js).
    const onKey = (e) => {
      if (!/^(Arrow(Left|Right|Up|Down)|Home|End)$/.test(e.key)) return
      const t = e.target && e.target.closest ? e.target : null
      if (t && t.closest('.side-tab-btn')) setOpen(false)
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // The open state reaches outside React: the sidebar's own scroll, the button's aria-expanded, and
  // `inert` on what the window covers, so Tab cannot walk into controls hidden behind it. The rail
  // is not covered, so it is never inert.
  // ⚠️ THE SCROLL OFFSET. aside.form-panel is the sidebar's scroll box AND the window's containing
  // block, and an absolutely positioned child of a scroll box scrolls with its content: with the
  // sidebar scrolled down, `top:0` would be off the top of the window. So `top` follows scrollTop,
  // and the sidebar cannot scroll underneath while the window is open (.settings-open, overflow
  // hidden). Below 960px the window is in flow (legacy.css) and `top` does nothing.
  // ⚠️ THE RAIL'S HEIGHT is measured, never assumed: `top` adds it, and --sw-rail-h takes it off the
  // window's height in legacy.css. It is measured from the rail's bottom edge on screen, so it holds
  // with the sticky rail pinned over a scrolled sidebar, and a ResizeObserver re-measures it.
  useLayoutEffect(() => {
    const root = rootRef.current
    const aside = root && root.closest('.form-panel')
    if (!aside) return
    const btn = document.querySelector('.side-settings-btn')
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false')
    aside.classList.toggle('settings-open', open)
    const host = root.parentElement
    const covered = (host && host.parentElement ? Array.from(host.parentElement.children).filter((el) => el !== host) : [])
    covered.forEach((el) => { if (open) el.setAttribute('inert', ''); else el.removeAttribute('inert') })
    if (!open) return
    const rail = aside.querySelector('.side-tabs')
    const follow = () => {
      const below = rail ? Math.max(0, rail.getBoundingClientRect().bottom - aside.getBoundingClientRect().top - aside.clientTop) : 0
      root.style.setProperty('--sw-rail-h', below + 'px')
      root.style.top = (aside.scrollTop + below) + 'px'
    }
    follow()
    aside.addEventListener('scroll', follow)
    const ro = rail && typeof ResizeObserver === 'function' ? new ResizeObserver(follow) : null
    if (ro) ro.observe(rail)
    return () => {
      aside.removeEventListener('scroll', follow)
      if (ro) ro.disconnect()
    }
  }, [open])

  // Focus moves in on open (to the selected tab, which is how a tablist is entered) and back out on
  // close, to whatever opened it -- the Settings button, normally.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (open) {
      if (!returnFocus.current) returnFocus.current = document.activeElement
      const t = root.querySelector('[role="tab"][aria-selected="true"]')
      if (t) t.focus({ preventScroll: true })
    } else {
      const back = returnFocus.current
      returnFocus.current = null
      if (back && root.contains(document.activeElement) && document.contains(back)) back.focus({ preventScroll: true })
      else if (root.contains(document.activeElement)) document.activeElement.blur()
    }
  }, [open])

  // Escape closes, but only from inside the window. The grid's own editors take Escape as "cancel"
  // at document level, and a window that closed on every Escape would close under a note editor.
  const onKeyDown = (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented) setOpen(false)
  }

  return (
    <div ref={rootRef} id="settings-window" className={'settings-window' + (open ? ' is-open' : '')}
         role="dialog" aria-modal="false" aria-label="Settings" onKeyDown={onKeyDown}>
      {/* No head of its own: the rail's Settings button sits right above, selected (see the top). */}
      {/* ⛔ keepMountedMode="display-none" IS A CORRECTNESS REQUIREMENT, NOT A STYLE CHOICE.
          Mantine 9's Tabs keeps inactive panels mounted by default, but through React's <Activity
          mode="hidden"> (keepMountedMode defaults to "activity", @mantine/core 9.5.2). A hidden
          Activity renders its children at a LOWER PRIORITY -- after main.jsx's flushSync has
          returned, so initLegacyApp() would run with three of the four tabs missing from the DOM --
          and it unmounts their effects, so ProdLabelControl and HeaderPresets would never install
          their bridge functions. display-none mode renders every panel in the first commit and
          hides the inactive ones with display:none, the sidebar's old `.tab-hidden` contract.
          ⚠️ An explicit id, so the tab and panel ids Mantine derives from it are stable
          (settings-tabs-tab-prefs, …). They are on buttons and divs, which nothing sweeps. */}
      <Tabs id="settings-tabs" className="sw-tabs" value={tab}
            onChange={(v) => { if (v) setTab(v) }}
            keepMounted keepMountedMode="display-none">
        <Tabs.List grow className="sw-tablist">
          {TABS.map((t) => (
            <Tabs.Tab key={t.value} value={t.value} className="sw-tab">{t.label}</Tabs.Tab>
          ))}
        </Tabs.List>

        <Tabs.Panel value="prefs" className="sw-panel">{PREFS_PANEL}</Tabs.Panel>
        <Tabs.Panel value="region" className="sw-panel">{REGION_PANEL}</Tabs.Panel>
        <Tabs.Panel value="presets" className="sw-panel">{PRESETS_PANEL}</Tabs.Panel>
      </Tabs>
    </div>
  )
}
