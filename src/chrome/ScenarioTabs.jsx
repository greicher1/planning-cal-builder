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
  const stripRef = useRef(null)

  useLayoutEffect(() => {
    installChrome({ scenarios: (s) => setSt((p) => ({ ...p, ...s })) })
  }, [])

  // Under the calendar, not under the sidebar: the strip starts where the preview panel does (plus its 28 px of
  // side padding, which is also where the grid starts), and follows it when the sidebar or the window resizes.
  useEffect(() => {
    const panel = document.querySelector('.preview-panel')
    if (!panel) return undefined
    const sync = () => setLeft(Math.round(panel.getBoundingClientRect().left) + 28)
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
  )
}
