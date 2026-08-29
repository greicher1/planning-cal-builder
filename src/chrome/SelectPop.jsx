// The pop-out picker for the tool popovers' <select>s — Shift From / Anchor To / Rebuild From's
// phase pickers and Anchor To's starts-on/ends-by edge (owner, round 5: these should look like the
// loader's dropdown, not the OS select popup).
//
// ⛔ WHY THIS IS HAND-ROLLED, like DatePop and for the same family of reasons:
//   * The selects are ENGINE-OWNED. fillPhaseSelect() rewrites their innerHTML on every popover
//     open and after every tool run, three handlers read .value and split the selected option's
//     text on ' — ', and syncAnchorDate/syncSolveDate listen for 'change' on them directly. So the
//     native <select>s stay exactly as they are — same ids, same options, same listeners — and
//     only the OPEN POPUP is replaced. This component never owns the element; it is an additive
//     affordance that writes back through the native value setter plus dispatched events, exactly
//     like a user pick.
//   * Mantine's Select/Combobox are triply disqualified here: they portal by default (breaking the
//     .tools-menu ancestor test that keeps these eight id'd controls out of every saved file),
//     they mint random ids when none is passed (UI-CONVENTIONS §8.3), and they mount dropdowns
//     from effects (absent when the engine collects nodes by id at evaluation time).
//
// ⚠️ THE PANEL MUST LIVE INSIDE .tools-menu, NOT AT BODY LEVEL like DatePop. The engine's
// click-away closes every tool popover on any click outside .tools-wrap/.shift-group — a
// body-level panel would close the parent popover the moment an option was clicked. Portaled into
// the select's own .tools-menu, clicks land inside the guard, the panel hides automatically with
// the menu (display:none on the parent), and the collectFieldValues exclusion covers it twice
// over. It also means buildSavedHtml() must strip .select-pop, which it does (same same-tick
// reasoning as .date-pop).
//
// Native popup suppression is mousedown-preventDefault plus intercepting the keyboard openers
// (Enter / Space / Alt+ArrowDown). Chromium behaviour — Chrome/Edge are the decided target
// browsers. Plain ArrowUp/Down on the closed select stays native: it changes the value directly
// and fires 'change', which is exactly right.
//
// Save-format hygiene: NOTHING here carries an id — buttons only, inside .tools-menu.
import { useState, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// A select participates if it lives in a tool popover. The sidebar's selects (Season, Country,
// Area, Province) deliberately do not — the ask was the tool pickers, and those four are part of
// fields.byId with their own restore path; leave their UI native until asked.
function pickerTarget(el) {
  if (!el || el.tagName !== 'SELECT') return null
  if (!el.closest('.tools-menu')) return null
  return el
}

const readOptions = (sel) =>
  Array.from(sel.options).map((o) => ({
    value: o.value,
    label: o.textContent,
    selected: o.selected,
    // The engine's empty state is one option with value '' ("No phases scheduled yet") — render
    // it as an empty-state row, never as a committable choice.
    empty: o.value === '',
  }))

export function SelectPop() {
  const [target, setTarget] = useState(null)
  const [opts, setOpts] = useState([])
  const [hi, setHi] = useState(-1)

  const close = useCallback(() => { setTarget(null); setHi(-1) }, [])

  const open = useCallback((el) => {
    // Read the live DOM every time: fillPhaseSelect is the single source of truth and rebuilds
    // the options constantly. Never cache across opens.
    const list = readOptions(el)
    setOpts(list)
    setHi(list.findIndex((o) => o.selected))
    setTarget(el)
  }, [])

  // Document-delegated, so the engine's own wiring (and PreviewToolbar's render-once contract)
  // is never involved. mousedown rather than click: preventDefault here is what suppresses the
  // native popup.
  useLayoutEffect(() => {
    const onDown = (e) => {
      const el = pickerTarget(e.target)
      if (!el) return
      e.preventDefault()
      el.focus()
      if (target === el) close()
      else open(el)
    }
    const onKey = (e) => {
      const el = pickerTarget(e.target)
      if (!el) return
      const opens = e.key === 'Enter' || e.key === ' ' || (e.altKey && e.key === 'ArrowDown')
      if (opens) { e.preventDefault(); if (target !== el) open(el); }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [target, open, close])

  // While open: outside press closes (a press on the panel itself is preventDefault'd below, so
  // focus stays on the select); Escape closes the PANEL ONLY — capture phase + stopPropagation,
  // so the engine's own document Escape (which closes the whole tool popover) waits for a second
  // press. Arrow keys move the highlight; Enter commits it.
  useLayoutEffect(() => {
    if (!target) return undefined
    const onDocDown = (e) => {
      if (e.target === target) return
      if (e.target.closest && e.target.closest('.select-pop')) return
      close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation()
        setHi((h) => {
          const usable = opts.map((o, i) => (o.empty ? -1 : i)).filter((i) => i >= 0)
          if (!usable.length) return -1
          const dir = e.key === 'ArrowDown' ? 1 : -1
          const at = usable.indexOf(h)
          return usable[(at + dir + usable.length) % usable.length]
        })
        return
      }
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (hi >= 0 && opts[hi] && !opts[hi].empty) pick(opts[hi].value) }
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey, true)
    }
  })

  if (!target) return null

  const menu = target.closest('.tools-menu')
  if (!menu) return null

  // The write-back: the native setter plus real bubbling events, so the engine's direct 'change'
  // listeners (syncAnchorDate / syncSolveDate) fire exactly as they would for a native pick.
  const pick = (value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
    setter.call(target, value)
    target.dispatchEvent(new Event('input', { bubbles: true }))
    target.dispatchEvent(new Event('change', { bubbles: true }))
    close()
  }

  // Position under the select, in the menu's own coordinate space (.tools-menu is
  // position:absolute, so it is the containing block for an absolutely-positioned child).
  const mr = menu.getBoundingClientRect()
  const tr = target.getBoundingClientRect()
  const style = {
    left: tr.left - mr.left,
    top: tr.bottom - mr.top + 4,
    minWidth: tr.width,
  }

  return createPortal(
    <div
      className="select-pop"
      role="listbox"
      aria-label={target.getAttribute('aria-label') || 'Choose'}
      style={style}
      /* preventDefault keeps focus on the select — without it the press blurs it and the panel
         dies under the pointer before the click lands (same trick as DatePop). */
      onMouseDown={(e) => e.preventDefault()}
    >
      {opts.map((o, i) =>
        o.empty ? (
          <div key={i} className="sp-empty">{o.label}</div>
        ) : (
          <button
            key={i}
            type="button"
            role="option"
            aria-selected={o.selected || undefined}
            className={'sp-item' + (o.selected ? ' sp-cur' : '') + (i === hi ? ' sp-hi' : '')}
            onMouseEnter={() => setHi(i)}
            onClick={() => pick(o.value)}
          >
            {/* The loader look: name left, the ' — date' suffix dimmed on the right. The split is
                DISPLAY ONLY — the option's full text stays what the engine wrote, and the
                handlers keep splitting the real option text themselves. */}
            {o.label.includes(' — ') ? (
              <>
                <span className="sp-name">{o.label.slice(0, o.label.indexOf(' — '))}</span>
                <span className="sp-date">{o.label.slice(o.label.indexOf(' — ') + 3)}</span>
              </>
            ) : (
              <span className="sp-name">{o.label}</span>
            )}
          </button>
        )
      )}
    </div>,
    menu
  )
}
