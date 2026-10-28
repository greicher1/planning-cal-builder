// The scenario tabs (SCENARIOS-PLAN.md; owner rulings D1–D6, 22 Oct 2026): Excel's sheet tabs, bottom-left in the
// strip under the calendar whose bottom-right holds the zoom and the ? button -- Excel's own layout. Click a tab to
// flip to it, double-click to rename, right-click (or the ▾ on the tab on screen) for its menu, drag to reorder.
// "+" duplicates the tab on screen; with one scenario the strip holds nothing but "+ Scenario".
//
// The engine owns the tabs (scenarioTabs in app.js) and pushes them here through the bridge; every action goes back
// as a 'sptcal-scenario' DOM event, the way the zoom control hands back its zoom. So this holds no tab state of its
// own beyond what is being typed or dragged.
//
// ⛔ No id on anything here. collectFieldValues() sweeps every input[id] in the document into the saved file and
// the undo stack, and the rename box IS an input: a plain <input> with no id, never a Mantine TextInput (which
// mints one).
//
// Rendered straight into #react-root (main.jsx), like ZoomControl: a direct child of <body> before #print-root, so
// both print paths hide it, and buildSavedHtml() empties it.
import { useState, useLayoutEffect, useEffect, useRef } from 'react'
import { ActionIcon, Button, Menu, UnstyledButton } from '@mantine/core'
import { installChrome } from './bridge.js'
import { IconPlus } from './icons.jsx'
import { fmt } from './CompareDialog.jsx'

// The key facts band (KEY-FACTS-PLAN.md; owner, 23 Oct 2026: "lets go for C"): the tab on screen's facts on a soft
// grey band directly above the tabs, centred over the calendar (placeBand, below), while there are two or more scenarios. Since the same
// evening each fact is a small STAT TILE, its label above its value (owner, option D: "a small label above each
// value, like stat tiles"), because one line of "·"-separated facts left "20 wks" floating between the writers' room
// and Production -- "its not necessarily clear that the 20wks refers to the length of the writers room". The
// engine sends {values, same, labels} (scenarioBand() in app.js, from Compare's own scenarioFacts()); a fact the same
// in every scenario is `same` and drawn dimmed, as Compare dims a row that is the same everywhere, so what stays dark
// is what differs. A fact with nothing behind it drops out, and with nothing left the band hides.
//
// ⛔ No id on anything here (the rule above). It is never saved, printed or exported: #react-root is hidden by both
// print paths and emptied by buildSavedHtml().
//
// It makes its own room. Its height plus the 8 px above it is written as --sc-band-space on <html>, and legacy.css
// adds that to .preview-panel's bottom margin (the strip's 44 px). The grid fit already observes the panel's box,
// so the waterfall ends above the band, and the month view's scroller with it. A narrow window wraps the tiles onto
// a second row (owner: nothing cut off), and the measured height follows.
const plural = (n, unit) => n + ' ' + unit + (n === 1 ? '' : 's')
function bandGroups(band) {
  const v = band.values || {}, same = band.same || {}, labels = band.labels || {}
  const val = (k, text) => ({ k, text, same: !!same[k] })
  const groups = []
  if (v.loc) groups.push({ label: 'Location', items: [val('loc', v.loc)] })
  // The label names the unit, so the value is the bare count: "Episodes 8", "Blocks 5".
  if (v.count) groups.push({ label: v.count.unit === 'block' ? 'Blocks' : 'Episodes', items: [val('count', String(v.count.n))] })
  const wr = [v.wrOpen && val('wrOpen', fmt(v.wrOpen)), v.wrWeeks != null && val('wrWeeks', plural(v.wrWeeks, 'wk'))].filter(Boolean)
  if (wr.length) groups.push({ label: labels.wr || 'Writer’s Rm', items: wr })
  const pr = [v.first && val('first', fmt(v.first)), v.span != null && val('span', plural(v.span, 'wk'))].filter(Boolean)
  if (pr.length) groups.push({ label: labels.prod || 'Production', items: pr })
  if (v.wrap) groups.push({ label: 'Wrap', items: [val('wrap', fmt(v.wrap))] })
  return groups
}
// Writes the band's room, only when it changed: a style write on <html> is a mutation the grid fit observes.
function putBandSpace(el) {
  const root = document.documentElement
  const v = el ? Math.ceil(el.offsetHeight) + 8 + 'px' : ''
  if (root.style.getPropertyValue('--sc-band-space') === v) return
  if (v) root.style.setProperty('--sc-band-space', v)
  else root.style.removeProperty('--sc-band-space')
}
// CENTRED OVER THE CALENDAR (owner, 23 Oct 2026, option A), the band hugging its tiles: its middle is the middle of
// the calendar's area, `left` to `innerWidth - right`, the edges the band first spanned. The owner first chose the
// WINDOW's centre (option B), saw it live and asked "how is this centered?": the sidebar fills the left of the window,
// so the window's middle fell well inside the calendar box's left half (about 250 px short on a 1,000 px window). The
// calendar's own middle is what reads as centred. A band wider than the area wraps inside it and starts at its left.
// Written straight onto the element (its width is known only once laid out), and again on every render, a size
// change of its own, and a window resize, which moves the middle without re-rendering the strip.
function placeBand(el, left, right) {
  const w = el.offsetWidth, area = window.innerWidth - left - right
  const x = Math.round(left + Math.max(0, (area - w) / 2))
  if (el.style.left !== x + 'px') el.style.left = x + 'px'
}
function FactsBand({ band, left, right }) {
  const ref = useRef(null)
  const groups = bandGroups(band)
  const edges = useRef({ left, right })
  edges.current = { left, right }
  // Measured on EVERY render (new facts, a new left/right from a resize), not only by the observer below: a
  // ResizeObserver reports only at a rendering opportunity, which a hidden or backgrounded page never gets (the
  // grid fit's own lesson, app.js "THE APP SHELL'S GRID FIT"). The observer catches a wrap no render caused.
  useLayoutEffect(() => {
    if (ref.current) placeBand(ref.current, left, right)
    putBandSpace(ref.current)
  })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const again = () => { placeBand(el, edges.current.left, edges.current.right); putBandSpace(el) }
    const ro = new ResizeObserver(again)
    ro.observe(el)
    window.addEventListener('resize', again)
    return () => { ro.disconnect(); window.removeEventListener('resize', again); putBandSpace(null) }
  }, [groups.length > 0])
  if (!groups.length) return null
  // One tile per fact: the label on top, its value under it. A phase's start and its length share one tile, so the
  // weeks can only belong to the label above them.
  return (
    <div className="sc-band" ref={ref} style={{ maxWidth: 'calc(100vw - ' + (left + right) + 'px)' }}
         aria-label="Key facts of this scenario">
      {groups.map((g) => (
        <div key={g.label} className="sc-band-stat">
          <span className="sc-band-lab">{g.label}</span>
          <span className="sc-band-val">
            {g.items.map((it, ii) => (
              <span key={it.k} className="sc-band-item">
                {ii > 0 && <span className="sc-band-sep" aria-hidden="true">·</span>}
                <span className={'sc-band-v' + (it.same ? ' is-same' : '')}>{it.text}</span>
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}

function send(detail) {
  document.dispatchEvent(new CustomEvent('sptcal-scenario', { detail }))
}

function IconCaret(props) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      <path d="M4.5 6.5 8 10l3.5-3.5" />
    </svg>
  )
}
function IconCompare(props) {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      <rect x="2" y="3" width="5" height="10" rx="1" /><rect x="9" y="3" width="5" height="10" rx="1" />
    </svg>
  )
}

export function ScenarioTabs() {
  const [st, setSt] = useState({ tabs: [], current: null, max: 50, visible: false })
  const [editing, setEditing] = useState(null)      // the tab whose name is being typed
  const [menu, setMenu] = useState(null)            // { id, x, y }: the tab menu, opened at a point
  const [drag, setDrag] = useState(null)            // the tab being dragged
  const [left, setLeft] = useState(28)
  const [right, setRight] = useState(28)   // the band's right edge: where the calendar ends
  const stripRef = useRef(null)

  useLayoutEffect(() => {
    installChrome({ scenarios: (s) => setSt((p) => ({ ...p, ...s })) })
  }, [])

  // Under the calendar, not under the sidebar: the strip starts where the preview panel does (plus its 28 px of
  // side padding, which is also where the grid starts), and follows it when the sidebar or the window resizes.
  useEffect(() => {
    const panel = document.querySelector('.preview-panel')
    if (!panel) return undefined
    const sync = () => {
      const r = panel.getBoundingClientRect()
      setLeft(Math.round(r.left) + 28)
      // clientWidth, not the rect: a month view scrolling in the panel has a scrollbar the calendar stops short of.
      setRight(Math.round(window.innerWidth - (r.left + panel.clientLeft + panel.clientWidth)) + 28)
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(panel)
    window.addEventListener('resize', sync)
    return () => { ro.disconnect(); window.removeEventListener('resize', sync) }
  }, [])

  // A fresh copy's name opens ready to type over (the engine asks with a new editSeq).
  useEffect(() => { if (st.edit) setEditing(st.edit) }, [st.editSeq])

  // The tab on screen stays in view when the strip scrolls sideways.
  useEffect(() => {
    const el = stripRef.current && stripRef.current.querySelector('.sc-tab.is-current')
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [st.current, st.tabs.length])

  if (!st.visible || !st.tabs.length) return null
  const many = st.tabs.length > 1
  const full = st.tabs.length >= st.max

  if (!many) {
    return (
      <div className="sc-strip" style={{ left }} role="group" aria-label="Scenarios">
        <Button variant="subtle" color="gray" size="compact-xs" leftSection={<IconPlus width={11} height={11} />}
                onClick={() => send({ op: 'add' })}
                title="Copy this calendar into a second scenario, to try a different version and compare the two">
          Scenario
        </Button>
      </div>
    )
  }

  const openMenu = (id, x, y) => setMenu({ id, x, y })
  // Once per box: Enter and the blur that follows it must not rename twice.
  const finishRename = (el, id, keep) => {
    if (el.dataset.done) return
    el.dataset.done = '1'
    if (keep) send({ op: 'rename', id, name: el.value })
    setEditing(null)
  }
  const menuTab = menu && st.tabs.find((t) => t.id === menu.id)

  return (
    <>
    {st.band && <FactsBand band={st.band} left={left} right={right} />}
    <div className="sc-strip" style={{ left }} role="group" aria-label="Scenarios">
      <div className="sc-tabs" ref={stripRef} role="tablist" aria-label="Scenarios"
           onWheel={(e) => { if (e.deltaY && stripRef.current) stripRef.current.scrollLeft += e.deltaY }}>
        {st.tabs.map((t, i) => {
          const on = t.id === st.current
          if (editing === t.id) {
            return (
              <span key={t.id} className={'sc-tab is-editing' + (on ? ' is-current' : '')}>
                <input className="sc-tab-input" defaultValue={t.name} maxLength={40} autoFocus
                  aria-label="Scenario name" spellCheck={false}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    // Enter keeps the name, Escape keeps the old one -- both directly, not through a blur, which
                    // never comes if the box had lost focus first.
                    if (e.key === 'Enter') { e.preventDefault(); finishRename(e.currentTarget, t.id, true) }
                    else if (e.key === 'Escape') { e.preventDefault(); finishRename(e.currentTarget, t.id, false) }
                    e.stopPropagation()
                  }}
                  onBlur={(e) => finishRename(e.currentTarget, t.id, true)} />
              </span>
            )
          }
          return (
            <UnstyledButton key={t.id} role="tab" aria-selected={on}
              className={'sc-tab' + (on ? ' is-current' : '') + (drag === t.id ? ' is-dragging' : '')}
              draggable
              onDragStart={(e) => { setDrag(t.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.name) }}
              onDragOver={(e) => { if (drag) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
              onDrop={(e) => { e.preventDefault(); if (drag && drag !== t.id) send({ op: 'move', id: drag, to: i }); setDrag(null) }}
              onDragEnd={() => setDrag(null)}
              onClick={() => { if (!on) send({ op: 'switch', id: t.id }) }}
              onDoubleClick={() => setEditing(t.id)}
              onContextMenu={(e) => { e.preventDefault(); if (!on) send({ op: 'switch', id: t.id }); openMenu(t.id, e.clientX, e.clientY) }}
              title={on ? 'Double-click to rename · right-click for more' : 'Show ' + t.name}>
              <span className="sc-tab-name">{t.name}</span>
              {on && (
                <span className="sc-tab-caret" role="button" aria-label={'More for ' + t.name}
                  onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); openMenu(t.id, r.left, r.top) }}>
                  <IconCaret />
                </span>
              )}
            </UnstyledButton>
          )
        })}
      </div>
      <ActionIcon variant="subtle" color="gray" size="sm" radius="md" onClick={() => send({ op: 'add' })} disabled={full}
                  aria-label="Duplicate this scenario" title={full ? 'A calendar holds at most ' + st.max + ' scenarios' : 'Duplicate this scenario'}>
        <IconPlus width={12} height={12} />
      </ActionIcon>
      <Button variant="default" size="compact-xs" leftSection={<IconCompare />} onClick={() => send({ op: 'compare' })}>
        Compare
      </Button>

      {/* One menu, opened at the tab that asked for it. Upward: the strip is at the bottom of the window. */}
      <Menu opened={!!menu} onChange={(o) => { if (!o) setMenu(null) }} position="top-start" withinPortal={false}
            width={250} closeOnItemClick returnFocus={false}>
        <Menu.Target>
          <span className="sc-menu-anchor" style={menu ? { left: menu.x, top: menu.y } : undefined} />
        </Menu.Target>
        {menuTab && (
          <Menu.Dropdown>
            <Menu.Label>{menuTab.name}</Menu.Label>
            {/* After the menu has closed and settled, or its focus handling blurs the box straight away. */}
            <Menu.Item onClick={() => { const id = menuTab.id; setTimeout(() => setEditing(id), 0) }}>Rename…</Menu.Item>
            <Menu.Item onClick={() => send({ op: 'add' })} disabled={full}
                       title={full ? 'A calendar holds at most ' + st.max + ' scenarios' : undefined}>Duplicate</Menu.Item>
            <Menu.Item onClick={() => send({ op: 'compare' })}>Compare scenarios…</Menu.Item>
            <Menu.Item onClick={() => send({ op: 'saveOwn', id: menuTab.id })}>Save this scenario as its own file…</Menu.Item>
            <Menu.Divider />
            <Menu.Item onClick={() => send({ op: 'keep', id: menuTab.id })}>Keep only this scenario…</Menu.Item>
            <Menu.Item color="red" onClick={() => send({ op: 'delete', id: menuTab.id })}>Delete scenario…</Menu.Item>
          </Menu.Dropdown>
        )}
      </Menu>
    </div>
    </>
  )
}
