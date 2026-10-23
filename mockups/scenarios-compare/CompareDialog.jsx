// The Compare window for scenarios (SCENARIOS-PLAN.md §5), as it would ship in src/chrome/: a Mantine Modal holding
// one Table, the chips that pick its columns, and a row of buttons, and nothing else. Written for the mockup first, so it takes plain props and knows nothing
// of the engine; in the app the engine would push the same props through the bridge, as it does for the Export PDF
// dialog.
//
// One column per scenario, the one on screen first. Every row shows every value. A value that differs from the one on
// screen is bold, with the difference under it ("+2 wks"); a row that is the same everywhere is greyed. With three or
// more scenarios, chips above the table pick which ones are compared with the one on screen: up to twelve columns,
// scrolled sideways, with the row labels held in place. The table exports to Excel and PDF; the window only builds the
// table's model, and whoever opens it writes the files (in the app, the engine: ExcelJS, and the direct PDF writer).
import { useState } from 'react'
import { Modal, Table, Text, Badge, Button, Group, Chip, Stack } from '@mantine/core'

const MAX_COLS = 12   // the tab on screen plus eleven (owner, 23 Oct 2026); more than fit scroll sideways
const LABEL_W = 180
const COL_W = 160

const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d, t: Date.UTC(y, m - 1, d) } }
const fmt = (s) => { const o = parse(s); return o.m + '/' + o.d + '/' + String(o.y).slice(2) }
const days = (a, b) => Math.round((parse(b).t - parse(a).t) / 864e5)
const sign = (n) => (n > 0 ? '+' : '−') + Math.abs(n)
const dayDelta = (n) => (n % 7 === 0 ? sign(n / 7) + ' wk' + (Math.abs(n) === 7 ? '' : 's') : sign(n) + ' day' + (Math.abs(n) === 1 ? '' : 's'))

// One cell against the one on screen: {text, diff, delta}.
function cell(row, value, ref) {
  if (row.type === 'date') {
    const n = days(ref, value)
    return { text: fmt(value), diff: n !== 0, delta: n ? dayDelta(n) : '' }
  }
  if (row.type === 'range') {
    const a = days(ref[0], value[0]), b = days(ref[1], value[1])
    const delta = a || b ? (a === b ? dayDelta(a) : 'start ' + (a ? dayDelta(a) : 'same') + ', end ' + (b ? dayDelta(b) : 'same')) : ''
    return { text: fmt(value[0]) + ' – ' + fmt(value[1]), diff: !!(a || b), delta }
  }
  if (row.type === 'number') {
    const n = Math.round((value - ref) * 10) / 10
    return { text: value + (row.unit || ''), diff: n !== 0, delta: n ? sign(n) + (row.unit || '') : '' }
  }
  return { text: String(value), diff: value !== ref, delta: '' }
}

function IconCopy(props) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5V3.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
    </svg>
  )
}

function IconSheet(props) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /><path d="M2.5 6.5h11M2.5 10h11M6.5 6.5v7" />
    </svg>
  )
}
function IconDoc(props) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      <path d="M4 1.5h5.5L13 5v9.5H4z" /><path d="M9.5 1.5V5H13M6.5 9h4M6.5 11.5h4" />
    </svg>
  )
}

// Held in place while the table scrolls sideways: the row labels stay beside their values.
const STICKY = { position: 'sticky', left: 0, zIndex: 1, background: 'var(--mantine-color-body)',
                 boxShadow: 'inset -1px 0 0 var(--table-border-color)' }

/**
 * @param opened      whether the window is open
 * @param scenarios   [{id, name, values}] in tab order; `values` holds one entry per row key
 * @param currentId   the tab on screen: the first column, and what every other value is compared with
 * @param rows        [{key, label, type: 'date' | 'range' | 'number' | 'text', unit?}], in table order
 * @param onClose()   the window closed
 * @param onCopy(tsv) "Copy table": the whole table, tab-separated
 * @param onExport(kind, model)  "Export to Excel" (kind 'xlsx') or "Export PDF" ('pdf'). `model` is the table as shown:
 *                    {cols: [{name, onScreen}], rows: [{label, same, cells: [{text, delta, diff}]}]}
 */
export function CompareDialog({ opened, scenarios, currentId, rows, onClose, onCopy, onExport }) {
  // The chips' choice, remembered for the scenario it was made against. Once another scenario is on screen it starts
  // afresh, because the one that was on screen would otherwise drop out of the table unnoticed.
  const [picked, setPicked] = useState({ ref: null, ids: null })

  const ref = scenarios.find((s) => s.id === currentId) || scenarios[0]
  const others = scenarios.filter((s) => s.id !== ref.id)
  const showChips = others.length >= 2   // with one other scenario there is nothing to choose
  // To start, every other scenario, up to five: the next ones in tab order after the one on screen.
  const defaultPick = () => {
    const i = scenarios.indexOf(ref)
    return Array.from({ length: Math.min(MAX_COLS - 1, others.length) }, (_, k) => scenarios[(i + 1 + k) % scenarios.length].id)
  }
  const pick = (picked.ref === ref.id && picked.ids ? picked.ids : defaultPick()).filter((id) => others.some((o) => o.id === id))
  const cols = [ref].concat(others.filter((o) => pick.includes(o.id)))

  const table = rows.map((r) => {
    const cells = cols.map((s) => cell(r, s.values[r.key], ref.values[r.key]))
    return { row: r, cells, same: cells.every((c) => !c.diff) }
  })

  // The window grows with the table, up to the browser window; past that the table scrolls sideways inside it.
  const tableW = LABEL_W + COL_W * cols.length
  const model = () => ({
    cols: cols.map((s, i) => ({ name: s.name, onScreen: i === 0 })),
    rows: table.map((t) => ({ label: t.row.label, same: t.same, cells: t.cells.map((c) => ({ text: c.text, delta: c.delta, diff: c.diff })) })),
  })
  const copy = () => {
    const head = [''].concat(cols.map((c) => c.name)).join('\t')
    const body = table.map((t) => [t.row.label].concat(t.cells.map((c) => c.text + (c.delta ? ' (' + c.delta + ')' : ''))).join('\t'))
    onCopy && onCopy([head].concat(body).join('\n'))
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size={'min(' + Math.max(660, tableW + 44) + 'px, calc(100vw - 48px))'}
      radius="lg"
      shadow="xl"
      title="Compare scenarios"
      styles={{ title: { fontWeight: 600 } }}
      overlayProps={{ backgroundOpacity: 0.35 }}
    >
      <Stack gap="lg">
        {showChips && (
          <Chip.Group multiple value={pick} onChange={(v) => setPicked({ ref: ref.id, ids: v.slice(0, MAX_COLS - 1) })}>
            <Group gap="xs">
              {others.map((o) => (
                <Chip key={o.id} value={o.id} size="xs" variant="outline"
                      disabled={!pick.includes(o.id) && pick.length >= MAX_COLS - 1}>
                  {o.name}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        )}

        {/* A narrow window scrolls the table sideways inside the dialog; the dialog never outgrows the window. */}
        <Table.ScrollContainer minWidth={tableW} type="native">
          <Table layout="fixed" verticalSpacing="xs" horizontalSpacing="md" withRowBorders className="sc-compare-table" style={{ width: tableW }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={LABEL_W} style={STICKY} />
                {cols.map((s, i) => (
                  <Table.Th key={s.id} w={COL_W}>
                    <Group gap={6} wrap="nowrap">
                      <Text size="sm" fw={600} truncate>{s.name}</Text>
                      {i === 0 && <Badge size="xs" variant="light" color="navy" tt="none" fw={500} style={{ flex: 'none' }}>On screen</Badge>}
                    </Group>
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {table.map((t) => (
                <Table.Tr key={t.row.key}>
                  <Table.Td style={STICKY}><Text size="sm" fw={500} c={t.same ? 'dimmed' : undefined}>{t.row.label}</Text></Table.Td>
                  {t.cells.map((c, i) => (
                    <Table.Td key={cols[i].id}>
                      <Stack gap={4} align="flex-start">
                        <Text size="sm" fw={c.diff ? 600 : 400} c={t.same ? 'dimmed' : undefined} style={{ whiteSpace: 'nowrap' }}>{c.text}</Text>
                        {c.delta && <Badge size="sm" variant="light" color="warn" radius="sm" tt="none" fw={500}>{c.delta}</Badge>}
                      </Stack>
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Group justify="space-between" gap="sm">
          <Group gap="sm">
            <Button variant="default" size="xs" leftSection={<IconSheet />} onClick={() => onExport && onExport('xlsx', model())}>Export to Excel</Button>
            <Button variant="default" size="xs" leftSection={<IconDoc />} onClick={() => onExport && onExport('pdf', model())}>Export PDF</Button>
            <Button variant="default" size="xs" leftSection={<IconCopy />} onClick={copy}>Copy table</Button>
          </Group>
          <Button size="xs" onClick={onClose} data-autofocus>Done</Button>
        </Group>
      </Stack>
    </Modal>
  )
}
