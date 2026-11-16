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
//   - a wrap that moved counts the holidays behind it, in a second chip ("1 more holiday"; owner, 4 Nov 2026:
//     Wrap only, in words, never "+1"/"−1").
// The exports and Copy table take the table as shown, so all three reach them too.
//
// Audit 2026-11, item 2.10 (decision D8 = c, defaults approved): an "All-phase hiatus" row lists each all-phase hiatus
// with its dates and length, and says what differs ("1st hiatus longer by 1 wk", "1 more hiatus"); a phase's own
// hiatus is not in it. The exports and Copy table head the first column "Baseline: <name>" (BASELINE), since
// "On screen" means nothing on paper; the window itself still tags it "On screen" and measures from it (ruling D3).
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
import { useOutsideCloseGuard } from './modalGuard.js'

const MAX_COLS = 12   // the tab on screen plus eleven (owner, 23 Oct 2026); more than fit scroll sideways
// What the exports and Copy table call the first column (audit 2026-11 AUD2-024, approved default): "On screen" means
// nothing on paper, and every difference is measured from this column, so a reader is told which one it is. On screen
// the window keeps its "On screen" tag: there it is the tab on screen, and differences are measured from it (D3).
const BASELINE = 'Baseline: '
// Columns are as wide as what they hold, never narrower than these (owner, 23 Oct 2026: "the window needs to scale
// larger so we dont have elipses/things cut off"). Nothing in the table wraps or truncates: a long name, a long
// location or a pair of chips widens its column, and the window grows with the table up to the browser window.
const LABEL_MIN = 164   // the row labels' column, inside its padding
const COL_MIN = 168     // a scenario's column, inside its padding; "Pulled 12 days" and "2 fewer holidays" widen it
const COL_EST = 184     // a column's whole width, for the first sizing before the table is measured

const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d, t: Date.UTC(y, m - 1, d) } }
// Exported for the scenario band (ScenarioTabs.jsx), so its dates read exactly as this table's do. `dayFirst`: the
// calendar on screen's Dates setting is DD/MM (audit item 2.4, the owner's decision D3 (a)), sent by the engine with
// the window's model and the band's; month first otherwise, exactly as before.
export const fmt = (s, dayFirst) => { const o = parse(s); return (dayFirst ? o.d + '/' + o.m : o.m + '/' + o.d) + '/' + String(o.y).slice(2) }
const days = (a, b) => Math.round((parse(b).t - parse(a).t) / 864e5)
const sign = (n) => (n > 0 ? '+' : '−') + Math.abs(n)
// A date that moved is PUSHED (later) or PULLED (earlier), never "+" or "−" (owner, 23 Oct 2026: "lets use pushed
// and pulled instead of + and -"). A count or a length keeps its sign: "+2" episodes, "+2 wks" of production.
const amount = (n) => (n % 7 === 0 ? Math.abs(n / 7) + ' wk' + (Math.abs(n) === 7 ? '' : 's') : Math.abs(n) + ' day' + (Math.abs(n) === 1 ? '' : 's'))
const moved = (n) => (n > 0 ? 'Pushed ' : 'Pulled ') + amount(n)
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1)
const missing = (v) => v == null || v === ''

// The all-phase hiatuses (audit 2026-11 AUD2-023): each [first Monday, last Friday, weeks] as
// "12/21/26 – 1/1/27, 2 wks", one per line.
const weeks = (n) => n + ' wk' + (n === 1 ? '' : 's')
// `df`: the calendar's date order (audit 2.4, D3 (a)), as every other date in this window and its exports.
const hiatusLine = (h, df) => fmt(h[0], df) + ' – ' + fmt(h[1], df) + ', ' + weeks(h[2])
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th')
// What differs, in words, as the other chips are: a count that differs ("1 more hiatus"), else each hiatus that moved
// or changed length ("Longer by 1 wk", "Pushed 1 wk, shorter by 1 wk"), named by its place when there are several
// ("2nd hiatus longer by 1 wk"). A date that moved is Pushed or Pulled (owner, 23 Oct 2026), never + or −.
function hiatusDelta(v, r) {
  const n = v.length - r.length
  if (n) return Math.abs(n) + (n > 0 ? ' more' : ' fewer') + (Math.abs(n) === 1 ? ' hiatus' : ' hiatuses')
  const parts = []
  v.forEach((h, i) => {
    const d = days(r[i][0], h[0]), w = h[2] - r[i][2], bits = []
    if (d) bits.push(lower(moved(d)))
    if (w) bits.push((w > 0 ? 'longer' : 'shorter') + ' by ' + weeks(Math.abs(w)))
    if (bits.length) parts.push((v.length > 1 ? ordinal(i + 1) + ' hiatus ' : '') + bits.join(', '))
  })
  const s = parts.join('; ')
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

// One cell against the one on screen: {text, diff, delta, none}. A value one of them lacks (a phase only one
// scenario has, an unset count) is a dash, and a difference, with nothing to subtract.
function cell(row, value, ref, df) {
  if (missing(value) || missing(ref)) {
    return { text: missing(value) ? '—' : show(row, value, df), diff: missing(value) !== missing(ref), delta: '', none: missing(value) }
  }
  if (row.type === 'breaks') {
    const delta = hiatusDelta(value, ref)
    return { text: show(row, value, df), diff: !!delta, delta, none: !value.length }
  }
  if (row.type === 'date') {
    const n = days(ref, value)
    return { text: fmt(value, df), diff: n !== 0, delta: n ? moved(n) : '' }
  }
  if (row.type === 'range') {
    const a = days(ref[0], value[0]), b = days(ref[1], value[1])
    const delta = a || b ? (a === b ? moved(a) : 'Start ' + (a ? lower(moved(a)) : 'same') + ', end ' + (b ? lower(moved(b)) : 'same')) : ''
    return { text: show(row, value, df), diff: !!(a || b), delta }
  }
  if (row.type === 'number') {
    const n = Math.round((value - ref) * 10) / 10
    return { text: show(row, value, df), diff: n !== 0, delta: n ? sign(n) + (row.unit || '') : '' }
  }
  return { text: String(value), diff: value !== ref, delta: '' }
}
function show(row, v, df) {
  if (row.type === 'breaks') return v.length ? v.map((h) => hiatusLine(h, df)).join('\n') : 'None'
  if (row.type === 'date') return fmt(v, df)
  if (row.type === 'range') return fmt(v[0], df) + ' – ' + fmt(v[1], df)
  if (row.type === 'number') return v + (row.unit || '')
  return String(v)
}

// The holidays behind a moved wrap, as a COUNT in a second chip beside its "Pushed"/"Pulled" (owner, 23 Oct 2026:
// "lets not name the specific holidays, lets just say + or - a number of holidays with the same yellow chip"). It
// is how many more or fewer days this scenario's SHOOT lost to a holiday than the one on screen's, each from its own
// production walk (values.hols, the days it actually skipped); equal counts make no chip.
// Owner, 4 Nov 2026 ("what does -1 holidays even mean", then "why would wrap and first shoot have different number
// of holidays"): in WORDS, "1 more holiday" / "2 fewer holidays", and on Wrap ONLY (compareRows marks Wrap alone).
// ⚠️ Only the holidays AFTER the first shoot day count. A holiday on Production's start date (the walk skips it, so
// it is in holidaysHit) is before any shooting: counting it said "1 fewer holiday" beside a wrap that moved exactly
// as far as the first shoot day did. Counted from the first shoot day, a wrap that moved one working day further
// than First shoot day reads "1 fewer/more holiday", which is the question the chip answers.
function holidayDelta(mine, theirs) {
  const inShoot = (v) => (v.hols || []).filter((h) => h.d > v.first).length
  const n = inShoot(mine) - inShoot(theirs)
  return n ? Math.abs(n) + (n > 0 ? ' more' : ' fewer') + ' holiday' + (Math.abs(n) === 1 ? '' : 's') : ''
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
  // A click outside closes it, except the second press of the double-click that opened it (modalGuard.js, AUD2-061).
  const outside = useOutsideCloseGuard(dlg, () => setDlg(null))

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
      const c = cell(r, s.values[r.key], ref.values[r.key], dlg.dayFirst)
      c.holidays = r.hols && c.delta ? holidayDelta(s.values, ref.values) : ''
      return c
    })
    return { row: r, cells, same: cells.every((c) => !c.diff) }
  })
    // A phase none of the columns has is no row at all, nor a hiatus row none of them has (`optional`); then, if
    // asked, nor is a row that is the same everywhere.
    .filter((t) => !((t.row.phase || t.row.optional) && t.cells.every((c) => c.none)))
    .filter((t) => !onlyDiff || !t.same)
  const tableW = natW || (LABEL_MIN + 16 + COL_EST * cols.length)
  // `head` is what an export prints over a column: the first one is the Baseline (BASELINE), the rest their names.
  const model = () => ({
    cols: cols.map((s, i) => ({ name: s.name, onScreen: i === 0, head: (i === 0 ? BASELINE : '') + s.name })),
    rows: table.map((t) => ({ label: t.row.label, same: t.same,
                              cells: t.cells.map((c) => ({ text: c.text, delta: c.delta, diff: c.diff, holidays: c.holidays })) })),
  })
  const exportAs = (kind) => document.dispatchEvent(new CustomEvent('sptcal-compare-export', { detail: { kind, model: model() } }))
  // Copy table is a send-out too, so its first column is the Baseline, as in both exports (audit AUD2-024). A cell of
  // several lines (the hiatuses) is one line here, or it would break the pasted table's rows.
  const copy = () => {
    const head = [''].concat(cols.map((c, i) => (i === 0 ? BASELINE : '') + c.name)).join('\t')
    const note = (c) => (c.delta ? ' (' + [c.delta, c.holidays].filter(Boolean).join(', ') + ')' : '')
    const body = table.map((t) => [t.row.label].concat(t.cells.map((c) => c.text.split('\n').join('; ') + note(c))).join('\t'))
    const text = [head].concat(body).join('\n')
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => setCopied(true), () => {})
  }

  return (
    <Modal
      opened
      onClose={() => setDlg(null)}
      closeOnClickOutside={false}
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
      overlayProps={{ backgroundOpacity: 0.35, onClick: outside }}
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
                        {/* 'pre' keeps a cell of several lines (the hiatuses) on its lines, and still never wraps one. */}
                        <Text size="sm" fw={c.diff ? 600 : 400} c={t.same ? 'dimmed' : undefined} style={{ whiteSpace: c.text.indexOf('\n') >= 0 ? 'pre' : 'nowrap' }}>{c.text}</Text>
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
