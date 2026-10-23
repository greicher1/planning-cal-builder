// The Export PDF dialog (owner, 21 Oct 2026; PAPER-SIZE-PLAN.md §5a, rulings D1-D3): before the waterfall
// PDF is written, confirm or change the paper, the orientation and the grid lines.
//
// HOW THE ENGINE CALLS IT. The Export PDF click handler awaits `chrome.pdfExportDialog(opts)`, where opts is
//   { paper: 'letter'|'legal'|'tabloid', orientation: ''|'portrait'|'landscape', gridlines,
//     papers: [{value, label, size}], fits: { <paper>: {recommended, portrait, landscape} } }
// and it resolves { paper, orientation, gridlines } for Export, or null for Cancel / Escape / outside-click.
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
import { Modal, Button, Text, Group, Stack, SegmentedControl } from '@mantine/core'
import { installChrome } from './bridge.js'

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
function SegLabel({ main, sub, strong, tag }) {
  return (
    <Stack gap={0} align="center">
      <Text size="sm" fw={500} lh={1.3}>{main}</Text>
      <Text size="xs" c={strong ? undefined : 'dimmed'} fw={strong ? 600 : 400} lh={1.3}>{sub || ' '}</Text>
      {tag !== undefined && <Text size="xs" fw={600} lh={1.3}>{tag || ' '}</Text>}
    </Stack>
  )
}

function Row({ label, children }) {
  return (
    <div>
      <Text size="sm" fw={600} mb={6}>{label}</Text>
      {children}
    </div>
  )
}

export function ExportPdfDialog() {
  const [dlg, setDlg] = useState(null)   // the opts the engine passed, plus `n` to remount per opening
  const [paper, setPaper] = useState('letter')
  const [orient, setOrient] = useState('')   // '' = follow the paper's recommendation
  const [grid, setGrid] = useState('none')
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

  if (!dlg) return null

  const fits = dlg.fits || {}
  const fit = fits[paper] || fits.letter || { recommended: 'portrait', portrait: 100, landscape: 100 }
  const shown = orient || fit.recommended
  const paperRec = (dlg.paperRec || {})[orient || 'follow'] || { paper: 'letter', gain: 0 }
  const gridData = GRID_OPTIONS.some((g) => g.value === grid)
    ? GRID_OPTIONS : GRID_OPTIONS.concat([{ value: grid, label: grid.charAt(0).toUpperCase() + grid.slice(1) }])
  const doExport = () => finish({ paper, orientation: shown, gridlines: grid })
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
      withinPortal={false}
      centered
      size="md"
      radius="lg"
      shadow="xl"
      title="Export PDF"
      className="export-pdf-dlg"
      styles={{ title: { fontWeight: 600 } }}
      overlayProps={{ backgroundOpacity: 0.35 }}
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
          <Text size="xs" c="dimmed">
            The paper and orientation are saved with this calendar, and Export to Excel uses them too.
            Grid lines stay on this computer.
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
