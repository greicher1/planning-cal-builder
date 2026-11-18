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
import { Modal, Button, Text, Group, Stack, SegmentedControl, Chip, UnstyledButton } from '@mantine/core'
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
// ⛔ joinName repeats the engine's exportNameFrom (app.js): the scenario keeps its " – " only when it is last.
function joinName(parts, off, ext) {
  const shown = parts.filter((p) => p.locked || !off.includes(p.k))
  let out = ''
  shown.forEach((p, i) => {
    out += (i ? ((p.join && i === shown.length - 1) ? p.join : ' ') : '') + p.val
  })
  return out + (ext || '')
}

function FileNameRow({ parts, off, setOff, order, setOrder, orderDefault, ext }) {
  const [dragK, setDragK] = useState(null)
  const orderRef = useRef(order)
  orderRef.current = order
  const press = useRef(null)      // {k, x, y, dragging} from pointerdown until pointerup
  const swallow = useRef(false)   // the click that ends a drag must not switch the chip
  const sorted = parts.slice().sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k))
  const toggle = (k) => setOff(off.includes(k) ? off.filter((x) => x !== k) : off.concat([k]))
  const changed = parts.some((p) => !p.locked && off.includes(p.k)) || order.join() !== orderDefault.join()
  // A DRAG is a press that moves more than 4 px. Pointer events, not the browser's own drag and drop, so it works the
  // same with a mouse, a pen or a finger. While it moves, the pressed part is moved before or after the chip under the
  // pointer (by which half of it the pointer is over), live, so the chips and the name show where it will land. Moved
  // within the WHOLE order, parts not shown included.
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
      const after = ev.clientX > r.left + r.width / 2
      const next = orderRef.current.filter((x) => x !== pr.k)
      next.splice(next.indexOf(over.dataset.namepart) + (after ? 1 : 0), 0, pr.k)
      if (next.join() !== orderRef.current.join()) { orderRef.current = next; setOrder(next) }
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
          <UnstyledButton onClick={() => { setOff([]); setOrder(orderDefault.slice()) }} data-pdfdlg="name-reset"
            style={{ fontSize: 12, color: 'var(--mantine-color-dimmed)', textDecoration: 'underline' }}>
            Put all back
          </UnstyledButton>
        )}
      </Group>
      <Text size="sm" className="pdfdlg-name-preview"
        style={{ background: 'var(--mantine-color-gray-0)', border: '1px solid var(--mantine-color-gray-2)',
                 borderRadius: 7, padding: '7px 10px', wordBreak: 'break-word', lineHeight: 1.45 }}>
        {joinName(sorted, off, '')}<span style={{ color: 'var(--mantine-color-dimmed)' }}>{ext}</span>
      </Text>
      <Group gap={6} mt={8} onClickCapture={onClickCapture} style={{ touchAction: 'none' }}>
        {sorted.map((p) => (
          <span key={p.k} data-namepart={p.k} onPointerDown={(e) => onPointerDown(e, p.k)}
            style={{ cursor: dragK ? 'grabbing' : 'grab', opacity: dragK === p.k ? 0.5 : 1, display: 'inline-flex',
                     userSelect: 'none', WebkitUserSelect: 'none' }}>
            <Chip size="xs" checked={p.locked || !off.includes(p.k)} disabled={p.locked}
              onChange={() => { if (!p.locked) toggle(p.k) }}
              title={p.locked ? 'The show title always stays. Drag to move it.' : p.val + '. Click to take it out or put it back; drag to move it.'}>
              {p.label}
            </Chip>
          </span>
        ))}
      </Group>
      <Text size="xs" c="dimmed" mt={6}>Click a part to take it out or put it back. Drag it to move it.</Text>
    </div>
  )
}

export function ExportPdfDialog() {
  const [dlg, setDlg] = useState(null)   // the opts the engine passed, plus `n` to remount per opening
  const [paper, setPaper] = useState('letter')
  const [orient, setOrient] = useState('')   // '' = follow the paper's recommendation
  const [grid, setGrid] = useState('none')
  const [nameOff, setNameOff] = useState([])
  const [nameOrder, setNameOrder] = useState([])
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
  const doExport = () => finish({ paper, orientation: shown, gridlines: grid, nameOff, nameOrder })
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
      size="md"
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
            <FileNameRow parts={dlg.nameParts} off={nameOff} setOff={setNameOff} order={nameOrder} setOrder={setNameOrder}
              orderDefault={dlg.nameOrderDefault || nameOrder} ext={dlg.nameExt || '.pdf'} />
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
