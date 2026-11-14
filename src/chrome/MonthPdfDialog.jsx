// The month view's Export PDF dialog (audit AUD2-026, item 2.11; owner D8 = c, 13 Nov 2026): which months the
// month PDF writes. All (the default), the month on screen, or a run of months, From .. to.
//
// HOW THE ENGINE CALLS IT. exportMonthPdfDirect awaits `chrome.monthPdfDialog(opts)` (askMonthPdfMonths), where opts is
//   { months: [{ value: 'YYYY-MM', label: 'July 2026', short: 'Jul 2026' }], current: 'YYYY-MM' | '' }
// `months` are the months the PDF can print, first to last (the engine's monthPrintRange); `current` is the month on
// screen, or '' when that month has nothing to print (an empty month at either end), and This month is then greyed.
// It resolves { all: true } or { from, to } for Export, or null for Cancel / Escape / outside-click.
//  - It opens on All every time. The choice is not saved anywhere (owner-approved default: session only), so
//    Export or Enter at the default writes exactly the file from before the dialog existed.
//  - The engine skips the dialog when there is only one month to print.
//
// ⛔ THE ROOT'S CLASS, export-pdf-dlg, IS LOAD-BEARING, as on the waterfall's dialog (ExportPdfDialog.jsx): Mantine
// mints an id for every control it renders, and collectFieldValues() skips this class, so nothing here can reach a
// saved file or an undo step. The harness answers any `.export-pdf-dlg` at its defaults by its Export button
// (`data-pdfdlg="export"`, t/lib.js), which is what keeps every month-PDF leg and gate 13 on the all-months file.
// month-pdf-dlg tells the two dialogs apart.
//
// withinPortal={false}, and NativeSelect rather than a Combobox, for the same reason: nothing may be appended after
// #print-root, which must stay <body>'s last child (MANTINE-SEAM §3.1).
import { useState, useLayoutEffect, useCallback, useRef } from 'react'
import { Modal, Button, Text, Group, Stack, SegmentedControl, NativeSelect } from '@mantine/core'
import { installChrome } from './bridge.js'
import { SegLabel, Row } from './ExportPdfDialog.jsx'

export function MonthPdfDialog() {
  const [dlg, setDlg] = useState(null)   // the opts the engine passed, plus `n` to remount per opening
  const [which, setWhich] = useState('all')   // 'all' | 'this' | 'some'
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const resolveRef = useRef(null)
  const openCount = useRef(0)

  useLayoutEffect(() => {
    installChrome({
      monthPdfDialog: (opts) =>
        new Promise((resolve) => {
          if (resolveRef.current) resolveRef.current(null)
          resolveRef.current = resolve
          openCount.current += 1
          const months = opts.months || []
          const first = months.length ? months[0].value : ''
          const last = months.length ? months[months.length - 1].value : ''
          setWhich('all')
          // Some months starts on the month on screen through the last month.
          setFrom(opts.current || first)
          setTo(last)
          setDlg({ ...opts, months, n: openCount.current })
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

  const months = dlg.months
  const first = months[0] || { value: '', label: '', short: '' }
  const last = months[months.length - 1] || first
  const current = months.find((m) => m.value === dlg.current)
  const options = months.map((m) => ({ value: m.value, label: m.label }))
  // The run always reads forwards: moving From past To moves To with it, and the other way round.
  const pickFrom = (v) => { setFrom(v); if (v > to) setTo(v) }
  const pickTo = (v) => { setTo(v); if (v < from) setFrom(v) }
  const doExport = () => {
    if (which === 'this' && current) finish({ from: current.value, to: current.value })
    else if (which === 'some') finish({ from, to })
    else finish({ all: true })
  }
  // Enter exports, as on the waterfall's dialog -- except on a button, whose own Enter must stay the button's.
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
      className="export-pdf-dlg month-pdf-dlg"
      styles={{ title: { fontWeight: 600 } }}
      overlayProps={{ backgroundOpacity: 0.35 }}
    >
      <div onKeyDown={onKey}>
        <Stack gap="md">
          <Row label="Months">
            <SegmentedControl fullWidth size="sm" value={which} onChange={setWhich} aria-label="Months"
              data={[
                { value: 'all', label: <SegLabel main="All" sub={first.short + ' – ' + last.short} /> },
                { value: 'this', disabled: !current,
                  label: <SegLabel main="This month" sub={current ? current.label : 'Nothing to print'} /> },
                { value: 'some', label: <SegLabel main="Some months" sub="From … to" /> },
              ]} />
          </Row>
          {which === 'some' && (
            <Group gap="xs" wrap="nowrap" align="center">
              <Text size="sm">From</Text>
              <NativeSelect size="sm" style={{ flex: 1 }} aria-label="From" data-pdfdlg="from"
                value={from} onChange={(e) => pickFrom(e.currentTarget.value)} data={options} />
              <Text size="sm">to</Text>
              <NativeSelect size="sm" style={{ flex: 1 }} aria-label="To" data-pdfdlg="to"
                value={to} onChange={(e) => pickTo(e.currentTarget.value)} data={options} />
            </Group>
          )}
        </Stack>
        <Group justify="flex-end" mt="lg" gap="sm">
          <Button variant="default" size="xs" onClick={() => finish(null)} data-pdfdlg="cancel">Cancel</Button>
          <Button variant="filled" size="xs" onClick={doExport} data-autofocus data-pdfdlg="export">Export</Button>
        </Group>
      </div>
    </Modal>
  )
}
