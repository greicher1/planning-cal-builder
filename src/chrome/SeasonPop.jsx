// Show info's Season dropdown, with a checkbox per season inside it (owner, 27 Oct 2026: "I'd like to keep the
// selector as a drop down menu with the checkboxes inside the drop down"). Two or more ticked seasons share one
// calendar, and every header names them ("S3 & S4"; the engine's seasonLabel()).
//
// ⛔ THE SAME SHAPE AS SelectPop, for its reasons:
//   * #season-num stays the native <select> it always was: the same id, options and listeners, and the save
//     format's season (fields.byId). It holds the FIRST ticked season. Only its OPEN POPUP is replaced:
//     mousedown-preventDefault plus the keyboard openers suppress Chrome's list, and this panel opens instead.
//     The keys that would change the value natively (arrows, Home/End, typeahead) open the panel too, so a
//     keystroke can never quietly drop a second season.
//   * Mantine's Combobox / Checkbox are out: they mint random ids (UI-CONVENTIONS §8.3), and every id'd input is
//     swept into a saved file. The rows here are BUTTONS with a drawn box, and carry no id.
//   * The engine owns the state. A row's click reaches its document listener by `data-season`; what the rows
//     show comes back through the bridge (chrome.seasons, pushed by update()). So an undo, a Load or New
//     re-draws an open panel.
//
// Rendered straight into #react-root (main.jsx), like DatePop: a direct child of <body>, so both print paths
// hide it. Classed `select-pop`, which buildSavedHtml() strips from shareable copies.
import { useState, useLayoutEffect, useCallback, useRef } from 'react'
import { installChrome } from './bridge.js'

// The pushed list, in a tiny store rather than one component's state: the Season select's option text
// (Sidebar.jsx) reads it too. Installed at import, so a push that lands before React mounts is kept.
let current = []
const subs = new Set()
installChrome({
  seasons: (list) => {
    current = Array.isArray(list) ? list.slice() : []
    subs.forEach((f) => f(current))
  },
})
export function useSeasons() {
  const [list, setList] = useState(current)
  useLayoutEffect(() => {
    subs.add(setList)
    setList(current)
    return () => { subs.delete(setList) }
  }, [])
  return list
}

// What the closed select says with two or more ticked: "Seasons 3 & 4", "Seasons 3, 4 & 5". One season keeps
// the option's own "Season 3", and none its "—".
export function seasonsText(list) {
  if (list.length < 2) return ''
  return 'Seasons ' + list.slice(0, -1).join(', ') + ' & ' + list[list.length - 1]
}

const NUMS = Array.from({ length: 10 }, (_, i) => i + 1)   // Seasons 1-10, the old dropdown's
const ROW_H = 32, PAD = 10                                 // for the flip above the field only

const isField = (el) => !!el && el.id === 'season-num'
// The keys a focused native select acts on by itself. Each opens the panel instead.
const opensPanel = (e) => !e.metaKey && !e.ctrlKey &&
  (['Enter', ' ', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key) ||
   (e.key.length === 1 && !e.altKey))

export function SeasonPop() {
  const list = useSeasons()
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const [pos, setPos] = useState(null)
  const panelRef = useRef(null)

  const place = useCallback(() => {
    const el = document.getElementById('season-num')
    if (!el) return
    const r = el.getBoundingClientRect(), h = NUMS.length * ROW_H + PAD
    const below = r.bottom + 4
    const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 4) : below
    setPos({ left: r.left, top, width: r.width })
  }, [])
  const close = useCallback(() => { setOpen(false); setHi(-1) }, [])
  const show = useCallback(() => {
    place()
    setHi(Math.max(0, NUMS.indexOf(current[0])))
    setOpen(true)
  }, [place])

  // Opening, document-delegated so the select's own markup is never involved. mousedown, not click:
  // preventDefault here is what keeps Chrome's list shut.
  useLayoutEffect(() => {
    const onDown = (e) => {
      if (!isField(e.target)) return
      e.preventDefault()
      e.target.focus()
      if (open) close(); else show()
    }
    const onKey = (e) => {
      if (open || !isField(e.target) || !opensPanel(e)) return
      e.preventDefault()
      show()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, show, close])

  // While open: a press outside closes it (a press on a row is preventDefault'd below, so focus stays on the
  // select, and the panel stays open for the next tick); Escape closes it and is consumed; Tab closes it and moves
  // on; arrows move the highlight; Space or Enter ticks the highlighted row through the row's own click, the
  // same path as a mouse. It follows the field while the sidebar scrolls.
  useLayoutEffect(() => {
    if (!open) return undefined
    const onDocDown = (e) => {
      if (isField(e.target)) return
      if (e.target.closest && e.target.closest('.season-pop')) return
      close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return }
      if (e.key === 'Tab') { close(); return }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation()
        setHi((h) => (h + (e.key === 'ArrowDown' ? 1 : -1) + NUMS.length) % NUMS.length)
        return
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation()
        const row = panelRef.current && panelRef.current.querySelector('[data-season="' + NUMS[hi] + '"]')
        if (row) row.click()
      }
    }
    const onMove = () => place()
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  })

  if (!open || !pos) return null
  return (
    <div
      ref={panelRef}
      className="select-pop season-pop"
      role="listbox"
      aria-multiselectable="true"
      aria-label="Seasons"
      style={{ left: pos.left, top: pos.top, minWidth: pos.width }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {NUMS.map((n, i) => {
        const on = list.includes(n)
        return (
          <button
            key={n}
            type="button"
            role="option"
            aria-selected={on}
            data-season={n}
            className={'sp-item season-item' + (i === hi ? ' sp-hi' : '')}
            onMouseEnter={() => setHi(i)}
          >
            <span className={'season-box' + (on ? ' on' : '')} aria-hidden="true" />
            <span className="sp-name">Season {n}</span>
          </button>
        )
      })}
    </div>
  )
}
