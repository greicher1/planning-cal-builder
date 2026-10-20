// The Settings window (owner ruling 12, 20 Oct 2026): "a tabbed panel that slides in beside the grid
// and leaves the waterfall visible", opened from the Settings button in the sidebar's rail. It holds
// what used to be the sidebar's Settings TAB -- Region and holidays, the Preferences, the header
// presets, Export App With Data -- and it is where the new calendar-level settings go. The sidebar
// keeps Show and Phases.
//
// ⭐ THE TABS ARE THE SAVE BOUNDARY. Calendar and Region are saved in the calendar's file and travel
// with it; Preferences stays on this computer (localStorage) and never enters captureSnapshot().
// Presets is the one tab that holds both, and its opening line says which part is which. The old
// Preferences card mixed the two and needed a hint to say so; here the tab says it, and each tab
// opens on one line that says it again.
//
// ⛔ WHERE IT LIVES, AND WHY. React portals this into #settings-host, a static host INSIDE
// aside.form-panel (src/index.html), and CSS lays it over the whole sidebar (legacy.css, "The
// Settings window"). Three things decided that, and each is a trap if moved:
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
import { Tabs, CloseButton, Text } from '@mantine/core'
import { IconSliders, IconFile, IconMonitor } from './icons.jsx'
import { installChrome } from './bridge.js'
import {
  RegionCard, HolidaysCard, AppCard, HeadersCard,
  CalendarWaterfallCard, CalendarMonthCard, PrefsWaterfallCard, PrefsMonthCard,
} from './Sidebar.jsx'

// ⚠️ The VALUES are what a leg or the engine names (chrome.settingsWindow({ open, tab })); the labels
// are the owner's. Named by the owner from the mock-up, 20 Oct 2026 ("Shorter names"). Presets is
// the owner's too, the same day: "a tab in settings that keeps both presaved headers and presaved side
// boxes". It holds the Headers card now; the side-box presets (ruling 7, built in a sibling session)
// go beside it when they land.
const TABS = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'region', label: 'Region' },
  { value: 'presets', label: 'Presets' },
  { value: 'prefs', label: 'Preferences' },
]

// The line each saved-or-not tab opens on. Text, not an ⓘ: it is the one fact about the tab, and a
// hover hides it from exactly the person who needs it.
function ScopeLine({ icon: Icon, children }) {
  return (
    <div className="sw-scope">
      <Icon className="sw-scope-ic" />
      <Text size="xs" c="dimmed" component="span">{children}</Text>
    </div>
  )
}

export function SettingsWindow() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('calendar')
  const rootRef = useRef(null)
  // Where focus was when the window opened, so closing puts it back.
  const returnFocus = useRef(null)

  // The engine closes the window when it sends the user to the Phases card ("Show in Phases card"
  // and friends), which the window would otherwise cover. `tab` lets a caller open a given tab.
  useLayoutEffect(() => {
    installChrome({
      settingsWindow: (next) => {
        if (!next) return
        if (typeof next.tab === 'string' && TABS.some((t) => t.value === next.tab)) setTab(next.tab)
        if (typeof next.open === 'boolean') setOpen(next.open)
      },
    })
  }, [])

  // The Settings button is STATIC markup (the rail is engine-wired skeleton), so it is reached by
  // delegation on its class -- never captured.
  useEffect(() => {
    const onClick = (e) => {
      const b = e.target && e.target.closest && e.target.closest('.side-settings-btn')
      if (!b) return
      returnFocus.current = b
      setOpen((o) => !o)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // The open state reaches outside React: the sidebar's own scroll, the button's aria-expanded, and
  // `inert` on what the window covers, so Tab cannot walk into controls hidden behind it.
  // ⚠️ THE SCROLL OFFSET. aside.form-panel is the sidebar's scroll box AND the window's containing
  // block, and an absolutely positioned child of a scroll box scrolls with its content: with the
  // sidebar scrolled down, `top:0` would be off the top of the window. So `top` follows scrollTop,
  // and the sidebar cannot scroll underneath while the window is open (.settings-open, overflow
  // hidden). Below 960px the window is in flow (legacy.css) and `top` does nothing.
  useLayoutEffect(() => {
    const root = rootRef.current
    const aside = root && root.closest('.form-panel')
    if (!aside) return
    const btn = document.querySelector('.side-settings-btn')
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false')
    aside.classList.toggle('settings-open', open)
    const host = root.parentElement
    const covered = [aside.querySelector('.side-tabs')]
      .concat(host && host.parentElement ? Array.from(host.parentElement.children).filter((el) => el !== host) : [])
      .filter(Boolean)
    covered.forEach((el) => { if (open) el.setAttribute('inert', ''); else el.removeAttribute('inert') })
    if (!open) return
    const follow = () => { root.style.top = aside.scrollTop + 'px' }
    follow()
    aside.addEventListener('scroll', follow)
    return () => aside.removeEventListener('scroll', follow)
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
         role="dialog" aria-modal="false" aria-labelledby="settings-window-title" onKeyDown={onKeyDown}>
      <div className="sw-head">
        <IconSliders className="sw-head-ic" />
        <h2 id="settings-window-title" className="sw-title">Settings</h2>
        <CloseButton className="sw-close" size="md" aria-label="Close settings"
                     onClick={() => setOpen(false)} />
      </div>
      {/* ⛔ keepMountedMode="display-none" IS A CORRECTNESS REQUIREMENT, NOT A STYLE CHOICE.
          Mantine 9's Tabs keeps inactive panels mounted by default, but through React's <Activity
          mode="hidden"> (keepMountedMode defaults to "activity", @mantine/core 9.5.2). A hidden
          Activity renders its children at a LOWER PRIORITY -- after main.jsx's flushSync has
          returned, so initLegacyApp() would run with two of the three tabs missing from the DOM --
          and it unmounts their effects, so ProdLabelControl and HeaderPresets would never install
          their bridge functions. display-none mode renders every panel in the first commit and
          hides the inactive ones with display:none, the sidebar's old `.tab-hidden` contract.
          ⚠️ An explicit id, so the tab and panel ids Mantine derives from it are stable
          (settings-tabs-tab-calendar, …). They are on buttons and divs, which nothing sweeps. */}
      <Tabs id="settings-tabs" className="sw-tabs" value={tab}
            onChange={(v) => { if (v) setTab(v) }}
            keepMounted keepMountedMode="display-none">
        <Tabs.List grow className="sw-tablist">
          {TABS.map((t) => (
            <Tabs.Tab key={t.value} value={t.value} className="sw-tab">{t.label}</Tabs.Tab>
          ))}
        </Tabs.List>

        {/* ⚠️ PANEL ORDER IS SWEEP ORDER. The calendar tab's controls are all skipped by the sweep
            (.prefs-card) or are buttons, and the preferences tab's likewise, so only the Region tab
            contributes ids to fields.byId -- in the order RegionCard, HolidaysCard, as before. A new
            card with a SWEPT id in the first tab would land before #union-place in every saved file. */}
        <Tabs.Panel value="calendar" className="sw-panel">
          <ScopeLine icon={IconFile}>Saved in this calendar’s file, so they travel with it.</ScopeLine>
          <CalendarWaterfallCard />
          <CalendarMonthCard />
          <AppCard />
        </Tabs.Panel>

        <Tabs.Panel value="region" className="sw-panel">
          <ScopeLine icon={IconFile}>Saved in this calendar’s file, so they travel with it.</ScopeLine>
          <RegionCard />
          <HolidaysCard />
        </Tabs.Panel>

        {/* The saved-presets library (owner, 20 Oct 2026). ⚠️ The SIDE-BOX presets card goes here,
            after HeadersCard, when ruling 7 merges -- a .prefs-card like HeadersCard if any control in
            it carries an id, since presets are per machine. */}
        <Tabs.Panel value="presets" className="sw-panel">
          <ScopeLine icon={IconMonitor}>Presets stay on this computer. The header a calendar wears is saved in its file.</ScopeLine>
          <HeadersCard />
        </Tabs.Panel>

        <Tabs.Panel value="prefs" className="sw-panel">
          <ScopeLine icon={IconMonitor}>These stay on this computer. Send someone a calendar and they keep their own.</ScopeLine>
          <PrefsWaterfallCard />
          <PrefsMonthCard />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
