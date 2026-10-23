// The Compare window for scenarios (SCENARIOS-PLAN.md §2 and §5; owner, 22–23 Oct 2026). A Mantine Modal holding the
// chips that pick its columns, one Table, and a row of buttons -- nothing else (owner: "remove all the random
// explainations ... remember clean and simple").
//
// One column per scenario, the one on screen first, up to twelve (owner: "compare up to 12 scenarios at once,
// scrolling left to right"). Every row shows every value. A value that differs from the one on screen is bold, with
// the difference under it ("Pushed 2 wks", "+2"); a row that is the same everywhere is grey. The window grows with the table up
// to the browser window, then the table scrolls sideways with the row labels pinned.
//
// Owner, 23 Oct 2026, three notes on the window:
//   - a phase no column shows has no row ("hide phases that aren't used/empty");
//   - "Only differences" hides the rows that are the same everywhere;
//   - a date that moved says "Pushed"/"Pulled", never + or − (counts keep their signs);
//   - a shoot date that moved counts the holidays behind it, in a second chip ("+1 holiday").
// The exports and Copy table take the table as shown, so all three reach them too.
//
// The engine works out every value (openCompareScenarios in app.js: the header's own tokens, probing tabs not
// visited since Load) and pushes them here. This only lays them out; Export to Excel / Export PDF hand the table
// as shown back to the engine ('sptcal-compare-export'), which writes the file.
//
// ⛔ The root carries .compare-dlg: collectFieldValues() skips it, because Mantine mints an id for every Chip's
// checkbox and a crash backup or undo push taken while this is open must not carry them.
import { useState, useLayoutEffect, useCallback, useRef } from 'react'
import { Modal, Table, Text, Badge, Button, Group, Chip, Stack, Switch } from '@mantine/core'
import { installChrome } from './bridge.js'

const MAX_COLS = 12   // the tab on screen plus eleven (owner, 23 Oct 2026); more than fit scroll sideways
// Columns are as wide as what they hold, never narrower than these (owner, 23 Oct 2026: "the window needs to scale
// larger so we dont have elipses/things cut off"). Nothing in the table wraps or truncates: a long name, a long
// location or a pair of chips widens its column, and the window grows with the table up to the browser window.
const LABEL_MIN = 164   // the row labels' column, inside its padding
const COL_MIN = 168     // a scenario's column, inside its padding: "Pushed 12 days" and "+1 holiday" side by side
const COL_EST = 184     // a column's whole width, for the first sizing before the table is measured

const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d, t: Date.UTC(y, m - 1, d) } }
const fmt = (s) => { const o = parse(s); return o.m + '/' + o.d + '/' + String(o.y).slice(2) }
const days = (a, b) => Math.round((parse(b).t - parse(a).t) / 864e5)
const sign = (n) => (n > 0 ? '+' : '−') + Math.abs(n)
// A date that moved is PUSHED (later) or PULLED (earlier), never "+" or "−" (owner, 23 Oct 2026: "lets use pushed
// and pulled instead of + and -"). A count or a length keeps its sign: "+2" episodes, "+2 wks" of production.
const amount = (n) => (n % 7 === 0 ? Math.abs(n / 7) + ' wk' + (Math.abs(n) === 7 ? '' : 's') : Math.abs(n) + ' day' + (Math.abs(n) === 1 ? '' : 's'))
const moved = (n) => (n > 0 ? 'Pushed ' : 'Pulled ') + amount(n)
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1)
const missing = (v) => v == null || v === ''

// One cell against the one on screen: {text, diff, delta, none}. A value one of them lacks (a phase only one
// scenario has, an unset count) is a dash, and a difference, with nothing to subtract.
function cell(row, value, ref) {
  if (missing(value) || missing(ref)) {
    return { text: missing(value) ? '—' : show(row, value), diff: missing(value) !== missing(ref), delta: '', none: missing(value) }
  }
  if (row.type === 'date') {
    const n = days(ref, value)
    return { text: fmt(value), diff: n !== 0, delta: n ? moved(n) : '' }
  }
  if (row.type === 'range') {
    const a = days(ref[0], value[0]), b = days(ref[1], value[1])
    const delta = a || b ? (a === b ? moved(a) : 'Start ' + (a ? lower(moved(a)) : 'same') + ', end ' + (b ? lower(moved(b)) : 'same')) : ''
    return { text: show(row, value), diff: !!(a || b), delta }
  }
  if (row.type === 'number') {
    const n = Math.round((value - ref) * 10) / 10
    return { text: show(row, value), diff: n !== 0, delta: n ? sign(n) + (row.unit || '') : '' }
  }
  return { text: String(value), diff: value !== ref, delta: '' }
}
function show(row, v) {
  if (row.type === 'date') return fmt(v)
  if (row.type === 'range') return fmt(v[0]) + ' – ' + fmt(v[1])
  if (row.type === 'number') return v + (row.unit || '')
  return String(v)
}

// The holidays behind a moved shoot date, as a COUNT in a second chip beside its "Pushed"/"Pulled" (owner, 23 Oct
// 2026: "lets not name the specific holidays, lets just say + or - a number of holidays with the same yellow
// chip"). It is how many more days this scenario's shoot lost to a holiday than the one on screen's, each from its
// own production walk (values.hols, the days it actually skipped); equal counts make no chip. A count, so it keeps
// its sign. First shoot day counts only the holidays before it, the ones that held up the start.
function holidayDelta(which, mine, theirs) {
  const lost = (v) => (v.hols || []).filter((h) => which !== 'first' || h.d < v.first).length
  const n = lost(mine) - lost(theirs)
  return n ? sign(n) + ' holiday' + (Math.abs(n) === 1 ? '' : 's') : ''
}

// The yellow chip under a value that differs. Its column grows to fit it, so it never clips.
function DeltaChip({ children }) {
  return <Badge size="sm" variant="light" color="warn" radius="sm" tt="none" fw={500} style={{ flex: 'none' }}>{children}</Badge>
}

function Icon({ d, ...props }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {d}
    </svg>
  )
}
const ICON_SHEET = <><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /><path d="M2.5 6.5h11M2.5 10h11M6.5 6.5v7" /></>
const ICON_DOC = <><path d="M4 1.5h5.5L13 5v9.5H4z" /><path d="M9.5 1.5V5H13M6.5 9h4M6.5 11.5h4" /></>
const ICON_COPY = <><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 5.5V3.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" /></>

// Held in place while the table scrolls sideways: the row labels stay beside their values.
const STICKY = { position: 'sticky', left: 0, zIndex: 1, background: 'var(--mantine-color-body)',
                 boxShadow: 'inset -1px 0 0 var(--table-border-color)' }

export function CompareDialog() {
  const [dlg, setDlg] = useState(null)                    // {scenarios, currentId, rows}, or null when closed
  const [picked, setPicked] = useState({ ref: null, ids: null })
  const [copied, setCopied] = useState(false)
  const [onlyDiff, setOnlyDiff] = useState(false)          // kept while the app is open, like the chips
  // The table's own width, measured: it is laid out at its content's width (max-content), so this never depends on
  // the window's, and sizing the window from it cannot loop. offsetWidth, not getBoundingClientRect(): the Modal's
  // opening transition scales the content, and a scaled read would size the window small.
  const [natW, setNatW] = useState(0)
  const ro = useRef(null)
  const measure = useCallback((el) => {
    if (ro.current) { ro.current.disconnect(); ro.current = null }
    if (!el) return
    const read = () => setNatW(el.offsetWidth)
    ro.current = new ResizeObserver(read)
    ro.current.observe(el)
    read()
  }, [])

  useLayoutEffect(() => {
    installChrome({ compareDialog: (opts) => { setCopied(false); setDlg(opts) } })
  }, [])

  if (!dlg) return null
  const { scenarios, currentId, rows } = dlg
  const ref = scenarios.find((s) => s.id === currentId) || scenarios[0]
  const others = scenarios.filter((s) => s.id !== ref.id)
  const showChips = others.length >= 2
  // To start, every other scenario up to eleven: the next ones in tab order after the one on screen. The choice is
  // kept for that scenario only; with another on screen it starts afresh, so the old one can't drop out unnoticed.
  const defaultPick = () => {
    const i = scenarios.indexOf(ref)
    return Array.from({ length: Math.min(MAX_COLS - 1, others.length) }, (_, k) => scenarios[(i + 1 + k) % scenarios.length].id)
  }
  const pick = (picked.ref === ref.id && picked.ids ? picked.ids : defaultPick()).filter((id) => others.some((o) => o.id === id))
  const cols = [ref].concat(others.filter((o) => pick.includes(o.id)))

  const table = rows.map((r) => {
    const cells = cols.map((s) => {
      const c = cell(r, s.values[r.key], ref.values[r.key])
      c.holidays = r.hols && c.delta ? holidayDelta(r.hols, s.values, ref.values) : ''
      return c
    })
    return { row: r, cells, same: cells.every((c) => !c.diff) }
  })
    // A phase none of the columns has is no row at all; then, if asked, nor is a row that is the same everywhere.
    .filter((t) => !(t.row.phase && t.cells.every((c) => c.none)))
    .filter((t) => !onlyDiff || !t.same)
  const tableW = natW || (LABEL_MIN + 16 + COL_EST * cols.length)
  const model = () => ({
    cols: cols.map((s, i) => ({ name: s.name, onScreen: i === 0 })),
    rows: table.map((t) => ({ label: t.row.label, same: t.same,
                              cells: t.cells.map((c) => ({ text: c.text, delta: c.delta, diff: c.diff, holidays: c.holidays })) })),
  })
  const exportAs = (kind) => document.dispatchEvent(new CustomEvent('sptcal-compare-export', { detail: { kind, model: model() } }))
  const copy = () => {
    const head = [''].concat(cols.map((c) => c.name)).join('\t')
    const note = (c) => (c.delta ? ' (' + [c.delta, c.holidays].filter(Boolean).join(', ') + ')' : '')
    const body = table.map((t) => [t.row.label].concat(t.cells.map((c) => c.text + note(c))).join('\t'))
    const text = [head].concat(body).join('\n')
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => setCopied(true), () => {})
  }

  return (
    <Modal
      opened
      onClose={() => setDlg(null)}
      withinPortal={false}
      centered
      size={'min(' + Math.max(660, tableW + 48) + 'px, calc(100vw - 48px))'}
      // 24 px from the browser window's edges, not Mantine's 5%: a wide table gets the room (the size's own cap).
      xOffset={24}
      yOffset={24}
      radius="lg"
      shadow="xl"
      title="Compare scenarios"
      className="compare-dlg"
      styles={{ title: { fontWeight: 600 } }}
      overlayProps={{ backgroundOpacity: 0.35 }}
    >
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="lg">
          {showChips ? (
            <Chip.Group multiple value={pick} onChange={(v) => setPicked({ ref: ref.id, ids: v.slice(0, MAX_COLS - 1) })}>
              <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                {others.map((o) => (
                  <Chip key={o.id} value={o.id} size="xs" variant="outline"
                        disabled={!pick.includes(o.id) && pick.length >= MAX_COLS - 1}>
                    {o.name}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          ) : <span />}
          {/* The label beside the switch, as every switch in Settings has it: the app imports no InlineInput CSS,
              so a Switch's own label would stack under its track. */}
          <Group gap={8} wrap="nowrap" className="sc-compare-onlydiff" style={{ flex: 'none' }}>
            <Text size="sm" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setOnlyDiff((v) => !v)}>Only differences</Text>
            <Switch size="sm" checked={onlyDiff} aria-label="Only differences" onChange={(e) => setOnlyDiff(e.currentTarget.checked)} />
          </Group>
        </Group>

        {/* Only a table wider than the browser window scrolls sideways (a dozen columns); the dialog never outgrows
            the window, and the row labels stay pinned. */}
        {/* The bottom padding is the sideways scrollbar's own room: an overlay scrollbar (macOS) otherwise sits on the
            last row. */}
        <Table.ScrollContainer minWidth={0} type="native" style={{ paddingBottom: 12 }}>
          <Table verticalSpacing="xs" horizontalSpacing="md" withRowBorders className="sc-compare-table" ref={measure}
                 style={{ width: 'max-content' }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={STICKY}><div style={{ minWidth: LABEL_MIN }} /></Table.Th>
                {cols.map((s, i) => (
                  <Table.Th key={s.id}>
                    <Group gap={6} wrap="nowrap" style={{ minWidth: COL_MIN }}>
                      <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>{s.name}</Text>
                      {i === 0 && <Badge size="xs" variant="light" color="navy" tt="none" fw={500} style={{ flex: 'none' }}>On screen</Badge>}
                    </Group>
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {table.map((t) => (
                <Table.Tr key={t.row.key}>
                  <Table.Td style={STICKY}><Text size="sm" fw={500} c={t.same ? 'dimmed' : undefined} style={{ whiteSpace: 'nowrap' }}>{t.row.label}</Text></Table.Td>
                  {t.cells.map((c, i) => (
                    <Table.Td key={cols[i].id}>
                      <Stack gap={4} align="flex-start">
                        <Text size="sm" fw={c.diff ? 600 : 400} c={t.same ? 'dimmed' : undefined} style={{ whiteSpace: 'nowrap' }}>{c.text}</Text>
                        {c.delta && (
                          <Group gap={4} wrap="nowrap">
                            <DeltaChip>{c.delta}</DeltaChip>
                            {c.holidays && <DeltaChip>{c.holidays}</DeltaChip>}
                          </Group>
                        )}
                      </Stack>
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
              {!table.length && (
                <Table.Tr>
                  <Table.Td colSpan={cols.length + 1}><Text size="sm" c="dimmed">No differences</Text></Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Group justify="space-between" gap="sm">
          <Group gap="sm">
            <Button variant="default" size="xs" leftSection={<Icon d={ICON_SHEET} />} onClick={() => exportAs('xlsx')}>Export to Excel</Button>
            <Button variant="default" size="xs" leftSection={<Icon d={ICON_DOC} />} onClick={() => exportAs('pdf')}>Export PDF</Button>
            <Button variant="default" size="xs" leftSection={<Icon d={ICON_COPY} />} onClick={copy}>{copied ? 'Copied' : 'Copy table'}</Button>
          </Group>
          <Button size="xs" onClick={() => setDlg(null)} data-autofocus>Done</Button>
        </Group>
      </Stack>
    </Modal>
  )
}
