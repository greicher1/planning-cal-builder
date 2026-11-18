// The Export PDF dialog (owner, 21 Oct 2026; PAPER-SIZE-PLAN.md §5a, rulings D1-D3): before the waterfall
// PDF is written, confirm or change the paper, the orientation and the grid lines.
//
// HOW THE ENGINE CALLS IT. The Export PDF click handler awaits `chrome.pdfExportDialog(opts)`, where opts is
//   { paper: 'letter'|'legal'|'tabloid', orientation: ''|'portrait'|'landscape', gridlines,
//     papers: [{value, label, size}], fits: { <paper>: {recommended, portrait, landscape} } }
// and it resolves { paper, orientation, gridlines } for Export, or null for Cancel / Escape / outside-click (an
// outside click within DOUBLE_CLICK_MS of opening is the double-click that opened it, and is ignored: modalGuard.js).
// The engine applies the answer; this component only shows it.
//  - `fits` is the ENGINE'S answer for every paper, worked out before the dialog opens by frozen
//    sheetPageOrientation() (the rule both exports use), so a paper clicked here needs no call back into the
//    engine, and there is no second copy of the rule to drift. `portrait` / `landscape` are that rule's own
//    fit numbers, capped at 100%: "about", because the rule measures rows flat while the PDF measures each.
//  - `orientation: ''` means "follow the recommendation", and the selection then FOLLOWS the paper: clicking
//    Tabloid moves it to Tabloid's recommended orientation. Once an orientation is clicked, or when the
//    calendar already carries one (D1), it stays put whatever paper is clicked.
//  - `paperRec` is the ENGINE'S answer to "Letter or Legal?" (recommendPaper, PAPER-SIZE-PLAN.md §9):
//    { follow, portrait, landscape }, each { paper: 'letter'|'legal', gain }. The component only picks the case
//    for its orientation state ('' = follow) and shows it. It MARKS a paper and never selects one (ruling P-R2),
//    so the dialog still opens on the calendar's own paper. Tabloid is never marked.
//
// ⛔ THE ROOT'S CLASS, export-pdf-dlg, IS LOAD-BEARING. Mantine mints an id for every control it renders
// (UI-CONVENTIONS §8.3), and collectFieldValues() sweeps every input[id] in the document; it skips this class.
// Without it a crash backup or an undo push taken while the dialog is open would carry its radios.
//
// withinPortal={false}, as in Dialogs.jsx: Mantine's portal would append after #print-root, which must stay
// <body>'s last child (MANTINE-SEAM §3.1).
import { useState, useLayoutEffect, useCallback, useRef } from 'react'
import { Modal, Button, Text, Group, Stack, SegmentedControl, UnstyledButton, TextInput } from '@mantine/core'
import { installChrome } from './bridge.js'
import { useOutsideCloseGuard } from './modalGuard.js'

const GRID_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
]
const ORIENTS = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
]

// A segment's two lines. The second line always renders (a no-break space when empty), so the two
// orientation segments stay the same height whichever one is recommended. A paper segment passes `tag` as
// well, a third line that is always there for the same reason, holding "Recommended" on Letter or Legal.
// Shared with the month view's dialog (MonthPdfDialog.jsx), so the two Export PDF dialogs read alike.
export function SegLabel({ main, sub, strong, tag }) {
  return (
    <Stack gap={0} align="center">
      <Text size="sm" fw={500} lh={1.3}>{main}</Text>
      <Text size="xs" c={strong ? undefined : 'dimmed'} fw={strong ? 600 : 400} lh={1.3}>{sub || ' '}</Text>
      {tag !== undefined && <Text size="xs" fw={600} lh={1.3}>{tag || ' '}</Text>}
    </Stack>
  )
}

export function Row({ label, children }) {
  return (
    <div>
      <Text size="sm" fw={600} mb={6}>{label}</Text>
      {children}
    </div>
  )
}

// ⭐ THE FILE NAME (owner, 18 Nov 2026: "an easy to use system that lets you add/unadd parts of the file name", then
// "make it actually work"; mockups/export-file-name-parts.html, layout A; then "Allow me to be able to drag and reorder
// the chips to reorder the file name"). The engine passes `nameParts`, the parts as the PDF will be named ({k, label,
// val, join?, locked?}: exportNameParts, the list the name itself is built from), `nameExt`, `nameOff` (the keys
// switched off) and `nameOrder` / `nameOrderDefault` (every key, in order), both per-computer preferences. One chip per
// part: a click switches it off or on (the title is locked on), a drag moves it. The name above them is exactly what
// will download. The answer carries `nameOff` and `nameOrder`, which the engine stores only if they changed, and which
// every export's name then follows.
// ⭐ The name is a TEXT BOX (owner, 18 Nov 2026: "you need to be able to manually edit the file name"): what is typed
// names this one export (the answer's `nameTyped`; the engine never remembers it). A click on a chip, a drag or Put all
// back builds the name from the parts again. The title chip can be switched off like any part ("also allow removing
// show title").
// ⛔ joinName repeats the engine's exportNameFrom (app.js): two neighbours are joined by " - " when either is set off
// (the scenario, the edited date), else by a space; with every part off the name is the calendar's words alone.
function joinName(parts, off, ext) {
  let shown = parts.filter((p) => p.locked || !off.includes(p.k))
  if (!shown.length) shown = parts.filter((p) => p.k === 'words')
  let out = ''
  shown.forEach((p, i) => {
    out += (i ? ((p.setOff || shown[i - 1].setOff) ? ' - ' : ' ') : '') + p.val
  })
  return out + (ext || '')
}

function FileNameRow({ parts, off, setOff, offDefault, order, setOrder, orderDefault, ext, typed, setTyped, onWidth }) {
  const [dragK, setDragK] = useState(null)
  const orderRef = useRef(order)
  orderRef.current = order
  const press = useRef(null)      // {k, x, y, dragging} from pointerdown until pointerup
  const swallow = useRef(false)   // the click that ends a drag must not switch the chip
  const sorted = parts.slice().sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k))
  const toggle = (k) => { setTyped(null); setOff(off.includes(k) ? off.filter((x) => x !== k) : off.concat([k])) }
  // Changed from the default: the scenario is OFF by default (owner, 18 Nov 2026), so "Put all back" unticks it again.
  const offKey = (list) => parts.filter((p) => list.includes(p.k)).map((p) => p.k).join()
  const changed = typed !== null || offKey(off) !== offKey(offDefault) || order.join() !== orderDefault.join()
  const built = joinName(sorted, off, '')
  // ⭐ THE WINDOW WIDENS TO SHOW THE WHOLE NAME (owner, 18 Nov 2026: "extend the width of the window if necessary to
  // always show the full file name"). A hidden copy of the name, in the box's own font, is measured after every change
  // (typing included) and reported up; ExportPdfDialog sizes the modal from it (WINDOW_W, capped by the screen).
  const measureRef = useRef(null)
  const shownName = typed !== null ? typed : built
  useLayoutEffect(() => {
    if (measureRef.current && onWidth) onWidth(Math.ceil(measureRef.current.getBoundingClientRect().width))
  }, [shownName, onWidth])
  // ⭐ A LIST WITH DRAG HANDLES (owner, 18 Nov 2026: "we might need to change it to the list version with drag handles
  // so you can easily reoder"; it was chips). A click on a row ticks it; its handle (six dots) drags it; Alt + Up / Down
  // moves it from the keyboard. A DRAG is a press on the handle that moves more than 4 px. Pointer events, not the
  // browser's own drag and drop, so it works the same with a mouse, a pen or a finger. While it moves, the pressed part
  // is moved above or below the row under the pointer (by which half of it the pointer is over), live, so the rows and
  // the name show where it will land. Moved within the WHOLE order, parts not shown included.
  const onPointerDown = (e, k) => {
    if (e.button !== 0) return
    swallow.current = false
    press.current = { k, x: e.clientX, y: e.clientY, dragging: false }
    const move = (ev) => {
      const pr = press.current
      if (!pr) return
      if (!pr.dragging) {
        if (Math.abs(ev.clientX - pr.x) + Math.abs(ev.clientY - pr.y) < 5) return
        pr.dragging = true
        setDragK(pr.k)
      }
      ev.preventDefault()
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const over = el && el.closest && el.closest('[data-namepart]')
      if (!over || over.dataset.namepart === pr.k) return
      const r = over.getBoundingClientRect()
      const after = ev.clientY > r.top + r.height / 2
      const next = orderRef.current.filter((x) => x !== pr.k)
      next.splice(next.indexOf(over.dataset.namepart) + (after ? 1 : 0), 0, pr.k)
      if (next.join() !== orderRef.current.join()) { orderRef.current = next; setTyped(null); setOrder(next) }
    }
    const up = () => {
      if (press.current && press.current.dragging) swallow.current = true
      press.current = null
      setDragK(null)
      document.removeEventListener('pointermove', move, true)
      document.removeEventListener('pointerup', up, true)
      document.removeEventListener('pointercancel', up, true)
    }
    document.addEventListener('pointermove', move, true)
    document.addEventListener('pointerup', up, true)
    document.addEventListener('pointercancel', up, true)
  }
  // ⛔ The click a drag ends with is swallowed here, and the NEXT press drops the guard (never a timer: a press whose
  // click never comes would leave a timer to eat the next real one; CLAUDE.md, the Shift list's press guard).
  const onClickCapture = (e) => {
    if (!swallow.current) return
    swallow.current = false
    e.preventDefault()
    e.stopPropagation()
  }
  return (
    <div className="pdfdlg-name">
      <Group justify="space-between" align="baseline" mb={6} wrap="nowrap">
        <Text size="sm" fw={600}>File name</Text>
        {changed && (
          <UnstyledButton onClick={() => { setTyped(null); setOff(offDefault.slice()); setOrder(orderDefault.slice()) }} data-pdfdlg="name-reset"
            style={{ fontSize: 12, color: 'var(--mantine-color-dimmed)', textDecoration: 'underline' }}>
            Put all back
          </UnstyledButton>
        )}
      </Group>
      <span ref={measureRef} aria-hidden="true"
        style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', fontSize: 'var(--mantine-font-size-sm)',
                 fontFamily: 'inherit', left: -9999, top: 0 }}>{shownName}</span>
      <TextInput size="sm" className="pdfdlg-name-input" aria-label="File name" spellCheck={false}
        value={typed !== null ? typed : built} onChange={(e) => setTyped(e.currentTarget.value)}
        rightSection={<Text size="sm" c="dimmed">{ext}</Text>} rightSectionWidth={44} />
      <div onClickCapture={onClickCapture} onPointerDownCapture={() => { swallow.current = false }}
        className="pdfdlg-name-list"
        style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: 7, marginTop: 8, overflow: 'hidden' }}>
        {sorted.map((p, i) => {
          const on = !off.includes(p.k)
          return (
            <div key={p.k} data-namepart={p.k} role="checkbox" aria-checked={on} tabIndex={0}
              onClick={() => toggle(p.k)}
              onKeyDown={(e) => {
                if (e.key === ' ') { e.preventDefault(); toggle(p.k) }
                // Alt + Up / Down moves the row, for the keyboard.
                if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                  e.preventDefault()
                  const next = order.slice(), at = next.indexOf(p.k)
                  const to = Math.max(0, Math.min(next.length - 1, at + (e.key === 'ArrowUp' ? -1 : 1)))
                  next.splice(at, 1); next.splice(to, 0, p.k)
                  setTyped(null); setOrder(next)
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 10px 3px 4px', fontSize: 13,
                       borderTop: i ? '1px solid var(--mantine-color-gray-1)' : 0, cursor: 'pointer',
                       userSelect: 'none', WebkitUserSelect: 'none',
                       background: dragK === p.k ? 'var(--mantine-color-gray-1)' : '#fff',
                       boxShadow: dragK === p.k ? 'inset 0 0 0 1px var(--mantine-color-gray-4)' : 'none' }}>
              <span data-namehandle aria-label="Drag to move" title="Drag to move it in the name"
                onPointerDown={(e) => onPointerDown(e, p.k)} onClick={(e) => e.stopPropagation()}
                style={{ cursor: dragK ? 'grabbing' : 'grab', touchAction: 'none', display: 'inline-grid', placeItems: 'center',
                         width: 22, height: 22, borderRadius: 4, color: 'var(--mantine-color-gray-5)', flex: '0 0 auto' }}>
                <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
                  {[2, 7, 12].map((y) => [2.5, 7.5].map((x) => <circle key={x + '-' + y} cx={x} cy={y} r="1.3" fill="currentColor" />))}
                </svg>
              </span>
              <span style={{ width: 16, height: 16, borderRadius: 4, flex: '0 0 auto', display: 'inline-grid', placeItems: 'center',
                             border: '1.5px solid ' + (on ? 'var(--mantine-color-navy-6, #2C3E50)' : 'var(--mantine-color-gray-4)'),
                             background: on ? 'var(--mantine-color-navy-6, #2C3E50)' : '#fff', color: '#fff', fontSize: 11, lineHeight: 1 }}>
                {on ? '✓' : ''}
              </span>
              <span style={{ fontWeight: 500, flex: '0 0 auto', width: 86 }}>{p.label}</span>
              <span style={{ marginLeft: 'auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                             textAlign: 'right', color: on ? 'var(--mantine-color-dimmed)' : 'var(--mantine-color-gray-5)',
                             textDecoration: on ? 'none' : 'line-through' }}>{p.val}</span>
            </div>
          )
        })}
      </div>
      <Text size="xs" c="dimmed" mt={6} className="pdfdlg-name-hint">
        {typed !== null
          ? 'Your typed name is used for this export only. Tick or move a part to build the name from the parts again.'
          : 'Type in the box to name this export yourself, or tick the parts to use. Drag a part by its handle to move it.'}
      </Text>
    </div>
  )
}

// The window's width for a name `nameW` px wide: its usual 440 (Mantine's md), or wide enough for the whole name in the
// box (the box's 12 px left padding, the 44 px ".pdf" section, its border, a little room for the caret, and the modal's
// own 16 px padding each side), never wider than the screen less 16 px each side. Past that the box scrolls.
const WINDOW_W = 440
function windowWidth(nameW) {
  const need = (nameW || 0) + 12 + 44 + 2 + 12 + 32
  const cap = Math.max(WINDOW_W, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 32)
  return Math.max(WINDOW_W, Math.min(need, cap))
}

export function ExportPdfDialog() {
  const [dlg, setDlg] = useState(null)   // the opts the engine passed, plus `n` to remount per opening
  const [paper, setPaper] = useState('letter')
  const [orient, setOrient] = useState('')   // '' = follow the paper's recommendation
  const [grid, setGrid] = useState('none')
  const [nameOff, setNameOff] = useState([])
  const [nameOrder, setNameOrder] = useState([])
  const [nameTyped, setNameTyped] = useState(null)   // null = built from the parts
  const [nameW, setNameW] = useState(0)              // the name's measured width (FileNameRow), for windowWidth()
  const [, setVw] = useState(0)                      // re-render on a window resize, so the cap follows the screen
  useLayoutEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const resolveRef = useRef(null)
  const openCount = useRef(0)

  useLayoutEffect(() => {
    installChrome({
      pdfExportDialog: (opts) =>
        new Promise((resolve) => {
          if (resolveRef.current) resolveRef.current(null)
          resolveRef.current = resolve
          openCount.current += 1
          setPaper(opts.paper || 'letter')
          setOrient(opts.orientation || '')
          setGrid(opts.gridlines || 'none')
          setNameOff(Array.isArray(opts.nameOff) ? opts.nameOff : [])
          setNameOrder(Array.isArray(opts.nameOrder) ? opts.nameOrder : (opts.nameOrderDefault || []))
          setNameTyped(null)
          setDlg({ ...opts, n: openCount.current })
        }),
    })
  }, [])

  const finish = useCallback((answer) => {
    const r = resolveRef.current
    resolveRef.current = null
    setDlg(null)
    if (r) r(answer)
  }, [])
  // A click outside cancels, except the second press of the double-click that opened it (modalGuard.js, AUD2-061).
  const outside = useOutsideCloseGuard(dlg, () => finish(null))

  if (!dlg) return null

  const fits = dlg.fits || {}
  const fit = fits[paper] || fits.letter || { recommended: 'portrait', portrait: 100, landscape: 100 }
  const shown = orient || fit.recommended
  const paperRec = (dlg.paperRec || {})[orient || 'follow'] || { paper: 'letter', gain: 0 }
  const gridData = GRID_OPTIONS.some((g) => g.value === grid)
    ? GRID_OPTIONS : GRID_OPTIONS.concat([{ value: grid, label: grid.charAt(0).toUpperCase() + grid.slice(1) }])
  const doExport = () => finish({ paper, orientation: shown, gridlines: grid, nameOff, nameOrder,
    nameTyped: (nameTyped !== null && nameTyped.trim()) ? nameTyped : '' })
  // Enter exports, as the app's other dialogs confirm on Enter -- except on a button, whose own Enter
  // (a native click) must stay the button's: Enter on Cancel cancels.
  const onKey = (e) => {
    if (e.key !== 'Enter' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
    if (e.target && e.target.tagName === 'BUTTON') return
    e.preventDefault()
    doExport()
  }

  return (
    <Modal
      key={dlg.n}
      opened
      onClose={() => finish(null)}
      closeOnClickOutside={false}
      withinPortal={false}
      centered
      size={windowWidth(nameW)}
      radius="lg"
      shadow="xl"
      title="Export PDF"
      className="export-pdf-dlg"
      styles={{ title: { fontWeight: 600 } }}
      overlayProps={{ backgroundOpacity: 0.35, onClick: outside }}
    >
      <div onKeyDown={onKey}>
        <Stack gap="md">
          <Row label="Paper">
            <SegmentedControl fullWidth size="sm" value={paper} onChange={setPaper} aria-label="Paper"
              data={(dlg.papers || []).map((p) => ({
                value: p.value,
                label: <SegLabel main={p.label} sub={p.size} tag={p.value === paperRec.paper ? 'Recommended' : ''} />,
              }))} />
            {paperRec.paper === 'legal' && (
              <Text size="xs" c="dimmed" mt={6} className="pdfdlg-paperrec">
                Legal prints this calendar about {paperRec.gain}% larger.
              </Text>
            )}
          </Row>
          <Row label="Orientation">
            <SegmentedControl fullWidth size="sm" value={shown} onChange={setOrient} aria-label="Orientation"
              data={ORIENTS.map((o) => ({
                value: o.value,
                label: <SegLabel main={o.label} sub={o.value === fit.recommended ? 'Recommended' : ''}
                                 strong={o.value === fit.recommended} />,
              }))} />
            <Text size="xs" c="dimmed" mt={6} className="pdfdlg-sizes">
              Portrait prints this calendar at about {fit.portrait}% of full size, landscape at about {fit.landscape}%.
            </Text>
          </Row>
          <Row label="Grid lines">
            <SegmentedControl fullWidth size="sm" value={grid} onChange={setGrid} aria-label="Grid lines" data={gridData} />
          </Row>
          {Array.isArray(dlg.nameParts) && dlg.nameParts.length > 0 && (
            <FileNameRow parts={dlg.nameParts} off={nameOff} setOff={setNameOff} offDefault={dlg.nameOffDefault || []}
              order={nameOrder} setOrder={setNameOrder}
              orderDefault={dlg.nameOrderDefault || nameOrder} ext={dlg.nameExt || '.pdf'}
              typed={nameTyped} setTyped={setNameTyped} onWidth={setNameW} />
          )}
          <Text size="xs" c="dimmed">
            The paper and orientation are saved with this calendar, and Export to Excel uses them too.
            Grid lines and the file name’s parts stay on this computer, and every export’s name follows them.
          </Text>
        </Stack>
        <Group justify="flex-end" mt="lg" gap="sm">
          <Button variant="default" size="xs" onClick={() => finish(null)} data-pdfdlg="cancel">Cancel</Button>
          <Button variant="filled" size="xs" onClick={doExport} data-autofocus data-pdfdlg="export">Export</Button>
        </Group>
      </div>
    </Modal>
  )
}
