// The pop-out date picker: a small calendar popover over the app's native date fields.
//
// ⛔ WHY THIS IS HAND-ROLLED and not Mantine's DateInput/DatePickerInput. Both are CONTROLLED
// components, and this app's restore path (applyStateSnapshot), shift tools (shiftCalendar,
// syncAnchorDate) and autostart all write `el.value` into the date fields imperatively — writes a
// controlled component ignores. UI-CONVENTIONS.md §2c settled it: every date field stays a native
// <input type="date">. This popover therefore never OWNS a field: it is an additive affordance
// that writes back into the existing input through the native value setter and a dispatched
// 'input' event, exactly like a keystroke — the engine cannot tell the difference.
//
// The design is UI-CONVENTIONS.md §5, delivered here because DateInput could not deliver it:
//   * Each field is picked the way the engine READS it (fieldKind below; owner, 30 Oct 2026). A
//     date the engine snaps to its Monday (a phase start with Snap to Monday on, every hiatus
//     start) can only be picked ON a Monday: the other days are disabled, so the field can no
//     longer show a Wednesday the phase does not start on. A date used to the day (Snap off, a
//     Days or Dates phase, a Dates end) is picked alone, with no week band. Only the fields where
//     any day picks its week (the calendar range, Anchor To's start) keep the band, and hovering
//     there previews the week a click would choose. Typing is untouched, and the engine's own
//     snapping still decides what a typed date means.
//   * Union holidays and all-phase hiatus weeks are MARKED (a dot), never excluded: a scheduler
//     must be able to choose a date that lands on a holiday and see the consequence. The data
//     arrives through the bridge (chrome.dateContext, pushed by update()) like every other chrome
//     surface — the popover never reaches into the engine.
//   * #custom-hol-date was the first single-DAY field to get no week band — that difference was
//     invisible before and is the reason it kept being mistaken for a week field.
//
// Save-format hygiene: NOTHING in here carries an id. collectFieldValues() sweeps every
// input[id]/select[id]/textarea[id] in the document; the popover is buttons only, and
// buildSavedHtml() additionally strips .date-pop from shareable copies (belt and braces — the
// popover unmounts when closed, but a Share click lands on the same tick as the outside-click
// that closes it, and the engine builds the copy before React commits).
import { useState, useLayoutEffect, useCallback } from 'react'
import { installChrome } from './bridge.js'

// UTC date math, matching the engine's convention (PROJECT-CONTEXT §4): all dates are UTC
// midnight, weeks are Monday-snapped. Tiny and local rather than imported — the engine's own
// helpers live inside its IIFE.
const MS = 86400000
const parseIso = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null
}
const iso = (t) => new Date(t).toISOString().slice(0, 10)
const mondayOf = (t) => t - ((new Date(t).getUTCDay() + 6) % 7) * MS
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const POP_W = 252
const POP_H = 286

// A date input participates if it lives in the sidebar or a tool popover. The note editors and
// anything inside #table-wrap deliberately do not: the grid is not this component's business.
function pickerTarget(el) {
  if (!el || el.tagName !== 'INPUT' || el.type !== 'date') return null
  if (!el.closest('.form-panel') && !el.closest('.tools-menu')) return null
  return el
}

// Is this phase's start snapped to its Monday? The engine's phaseSnapped(), read from the same
// DOM: a Days or Dates phase never snaps (its switch is hidden and ignored), and a MISSING
// snap-<key> box reads as snapped, readState()'s own default. Keep the two in step.
function phaseSnapped(key) {
  const unit = document.getElementById('unit-' + key)
  if (unit && (unit.value === 'days' || unit.value === 'dates')) return false
  const cb = document.getElementById('snap-' + key)
  return cb ? cb.checked : true
}

// How the engine reads the date in `el`, and so how it may be picked:
//   'monday' — snapped to its week's Monday (readState / computeSchedule), so only Mondays;
//   'day'    — used to the day, so a single day and no band;
//   'week'   — any day picks its week (the range is cut by whole weeks, and Anchor To's start
//              moves the calendar by whole weeks: weeksBetweenMondays), so the band stays.
// Read on every render: the popover closes on any outside press, so a switch cannot change
// under it.
function fieldKind(el) {
  if (el.id === 'custom-hol-date') return 'day'
  if (el.classList.contains('hiatus-start') || el.classList.contains('phiatus-start')) return 'monday'
  if (el.id.startsWith('end-')) return 'day'                       // a Dates phase's end
  if (el.id.startsWith('start-')) return phaseSnapped(el.id.slice(6)) ? 'monday' : 'day'
  // Rebuild From pins the chosen phase's start by that phase's own Snap to Monday (audit M-11).
  if (el.id === 'tool-solve-date') {
    const key = (document.getElementById('tool-solve-phase') || {}).value
    return key && !phaseSnapped(key) ? 'day' : 'monday'
  }
  // Anchor To's "ends by" is a deadline to the day (weeksToFinishBy floors on it).
  if (el.id === 'tool-anchor-date') {
    return (document.getElementById('tool-anchor-edge') || {}).value === 'end' ? 'day' : 'week'
  }
  return 'week'                                                     // the calendar range
}

export function DatePop() {
  const [target, setTarget] = useState(null)
  const [value, setValue] = useState(null)        // ms | null — the field's current value
  const [month, setMonth] = useState(null)        // ms of the 1st of the shown month
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState(null)        // ms | null
  const [ctx, setCtx] = useState({ holidays: [], hiatuses: [] })

  useLayoutEffect(() => {
    installChrome({ dateContext: (patch) => setCtx((s) => ({ ...s, ...patch })) })
  }, [])

  const place = useCallback((el) => {
    const r = el.getBoundingClientRect()
    const vw = window.innerWidth, vh = window.innerHeight
    const x = Math.max(8, Math.min(r.left, vw - POP_W - 8))
    const below = r.bottom + 6
    const y = below + POP_H > vh - 8 ? Math.max(8, r.top - POP_H - 6) : below
    setPos({ x, y })
  }, [])

  const close = useCallback(() => { setTarget(null); setHover(null) }, [])

  const open = useCallback((el) => {
    const v = parseIso(el.value)
    const base = v ?? Date.now()
    const d = new Date(base)
    setTarget(el)
    setValue(v)
    setMonth(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    place(el)
  }, [place])

  // Open on focus AND on click: focusin alone misses a click on the already-focused field after
  // the popover was dismissed. Both are document-delegated, so engine innerHTML rebuilds of the
  // rows can never orphan them.
  useLayoutEffect(() => {
    const onFocus = (e) => { const el = pickerTarget(e.target); if (el) open(el) }
    const onClick = (e) => { const el = pickerTarget(e.target); if (el) open(el) }
    document.addEventListener('focusin', onFocus)
    document.addEventListener('click', onClick)
    return () => { document.removeEventListener('focusin', onFocus); document.removeEventListener('click', onClick) }
  }, [open])

  // While open: dismiss on outside press or Escape; follow the field while the page scrolls or
  // resizes (capture-phase scroll, the sidebar is its own scroll container); track typing so the
  // band follows a hand-edited value.
  useLayoutEffect(() => {
    if (!target) return undefined
    const onDown = (e) => {
      if (e.target === target) return
      if (e.target.closest && e.target.closest('.date-pop')) return
      close()
    }
    // Escape closes THIS popover only, and consumes the key: the engine's own document-level
    // Escape closes every tool popover, so without this a single press would take the date
    // picker AND the Shift From / Anchor To / Rebuild From panel underneath it. Capture phase
    // so it runs before that handler regardless of registration order. Same rule as SelectPop.
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    const onMove = () => place(target)
    const onType = () => setValue(parseIso(target.value))
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    target.addEventListener('input', onType)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
      target.removeEventListener('input', onType)
    }
  }, [target, place, close])

  if (!target) return null

  const kind = fieldKind(target)
  const weekMode = kind === 'week'

  // The write-back: the native setter plus a real 'input' event, so React's value tracker (on the
  // uncontrolled Mantine inputs) and the engine's per-field listeners both see a normal edit.
  const pick = (t) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(target, iso(t))
    target.dispatchEvent(new Event('input', { bubbles: true }))
    target.dispatchEvent(new Event('change', { bubbles: true }))
    close()
  }

  const holidayByIso = {}
  for (const h of ctx.holidays || []) holidayByIso[h.iso] = h.name
  const hiatusDays = new Set()
  for (const h of ctx.hiatuses || []) {
    const start = parseIso(h.start)
    if (!start) continue
    const mon = mondayOf(start)
    const n = Math.max(1, +h.weeks || 1) * 7
    for (let i = 0; i < n; i++) hiatusDays.add(mon + i * MS)
  }

  const d0 = new Date(month)
  const y = d0.getUTCFullYear(), m = d0.getUTCMonth()
  const gridStart = mondayOf(month)
  const todayIso = iso(Date.now())
  const selWeek = weekMode && value != null ? mondayOf(value) : null
  const hoverWeek = weekMode && hover != null ? mondayOf(hover) : null
  // The one day shown as picked when there is no band. On a Monday-only field it is the Monday the
  // engine snaps to, so a Wednesday already in the field (typed, or saved before 30 Oct 2026)
  // shows the day the phase really starts.
  const selDay = weekMode || value == null ? null : (kind === 'monday' ? mondayOf(value) : value)

  const cells = []
  for (let i = 0; i < 42; i++) {
    const t = gridStart + i * MS
    const d = new Date(t)
    const inMonth = d.getUTCMonth() === m
    const dayIso = iso(t)
    const isMon = d.getUTCDay() === 1
    // ⚠️ aria-disabled, not `disabled`: Chrome drops mouse events on a disabled button, so the
    // popover's mousedown preventDefault never ran and a click on a greyed day took focus out
    // of the field.
    const off = kind === 'monday' && !isMon
    const cls = ['dp-day']
    if (off) cls.push('dp-off')
    if (!inMonth) cls.push('dp-out')
    if (dayIso === todayIso) cls.push('dp-today')
    if (selWeek != null && mondayOf(t) === selWeek) { cls.push('dp-band'); if (isMon) cls.push('dp-cap') }
    if (t === selDay) cls.push('dp-cap', 'dp-solo')
    if (hoverWeek != null && mondayOf(t) === hoverWeek) cls.push('dp-hband')
    const hol = holidayByIso[dayIso]
    cells.push(
      <button
        key={t}
        type="button"
        className={cls.join(' ')}
        title={hol || undefined}
        aria-disabled={off || undefined}
        tabIndex={off ? -1 : undefined}
        onMouseEnter={weekMode ? () => setHover(t) : undefined}
        onClick={off ? undefined : () => pick(t)}
      >
        {d.getUTCDate()}
        {(hol || hiatusDays.has(t)) && (
          <i className={'dp-dot' + (hol ? ' dp-dot-hol' : ' dp-dot-hia')} aria-hidden="true" />
        )}
      </button>
    )
  }

  const nav = (delta) => setMonth(Date.UTC(y, m + delta, 1))

  return (
    <div
      className="date-pop"
      role="dialog"
      aria-label="Choose a date"
      style={{ left: pos.x, top: pos.y }}
      /* preventDefault keeps focus in the field: without it the first click blurs the input,
         focusout fires, and the popover dies under the pointer before the click lands. */
      onMouseDown={(e) => e.preventDefault()}
      onMouseLeave={() => setHover(null)}
    >
      <div className="dp-head">
        <button type="button" className="dp-nav" aria-label="Previous month" onClick={() => nav(-1)}>‹</button>
        <span className="dp-title">{MONTHS[m]} {y}</span>
        <button type="button" className="dp-nav" aria-label="Next month" onClick={() => nav(1)}>›</button>
      </div>
      <div className="dp-dow" aria-hidden="true">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
      <div className={'dp-grid' + (kind === 'monday' ? ' dp-mondays' : '')}>{cells}</div>
      {weekMode && (
        <div className="dp-hint">Any day picks its week — the calendar snaps to that Monday.</div>
      )}
      {kind === 'monday' && (
        <div className="dp-hint">
          {target.classList.contains('hiatus-start') || target.classList.contains('phiatus-start')
            ? 'A hiatus always starts on a Monday.'
            : 'Snap to Monday is on, so only Mondays can be picked.'}
        </div>
      )}
    </div>
  )
}
