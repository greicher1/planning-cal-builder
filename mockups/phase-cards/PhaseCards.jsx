// Four directions for the sidebar's Phases card, drawn with the app's real Mantine 9.5.2 and theme.
// MOCKUP ONLY: nothing here is wired to the engine. Every control today's card has is present in
// every option (same fields, same order of decisions); the one addition is "Hide in waterfall" and
// its "Month view only" tag (owner, 23 Oct 2026). Sample data is synthetic.
import { useState } from 'react'
import {
  Paper, Group, Stack, Text, TextInput, NumberInput, NativeSelect, Checkbox, Switch, Badge,
  ActionIcon, CloseButton, Collapse, Accordion, ColorSwatch, Divider, UnstyledButton, Anchor,
  Box, SimpleGrid, Title, Tooltip, Indicator,
} from '@mantine/core'

// ---------- sample calendar ----------
// PHASE_COLOR_OPTIONS entries: three of the defaults and three of the stronger set, so both are seen.
const C = {
  gold:   { color: '#92D050', text: '#1E4620' },   // Bright green
  blue:   { color: '#DAE3F3', text: '#203864' },   // Blue (like Pre Prep)
  green:  { color: '#E2F0D9', text: '#375623' },   // Green (like Production)
  orange: { color: '#F4B084', text: '#6B2E0C' },   // Peach
  purple: { color: '#5B9BD5', text: '#0B2545' },   // Strong blue
  slate:  { color: '#D6DCE5', text: '#222A35' },   // Slate (like Prod Prep)
}
const EPISODES = ['Episode 101', 'Episode 102', 'Episode 103', 'Episode 104', 'Episode 105', 'Episode 106']

function samplePhases() {
  return [
    { key: 'writersRoom', kind: 'weeks', name: "Writer's Room", ...C.gold, start: '2026-05-11', unit: 'weeks', weeks: 10,
      end: '', snap: true, hideWf: false, after: null, hiatus: { on: true, name: "Writer's Room Hiatus", start: '2026-06-29', weeks: 2, wknum: false } },
    { key: 'prodPrep', kind: 'weeks', name: 'Prod Prep', ...C.blue, start: '2026-07-27', unit: 'weeks', weeks: 7,
      end: '', snap: true, hideWf: false, after: "Writer's Room", hiatus: { on: false, name: 'Prod Prep Hiatus', start: '', weeks: '', wknum: false } },
    { key: 'prep', kind: 'prep', name: 'Episodic Prep', ...C.slate, defaultDays: 5,
      eps: EPISODES.map((n, i) => ({ name: n, days: i === 2 ? 8 : '' })) },
    { key: 'production', kind: 'production', name: 'Production', ...C.green, start: '2026-09-14', snap: true, after: 'Prod Prep',
      eps: EPISODES.map(n => ({ name: n, days: 5 })),
      hiatus: { on: false, name: 'Production Hiatus', start: '', weeks: '', wknum: false },
      sim: { on: true, offset: 2, count: true } },
    { key: 'post', kind: 'weeks', name: 'Post', ...C.orange, start: '2026-11-02', unit: 'weeks', weeks: 16,
      end: '', snap: true, hideWf: false, after: 'Production', hiatus: { on: false, name: 'Post Hiatus', start: '', weeks: '', wknum: false } },
    { key: 'custom1', kind: 'custom', name: 'Colour Grading', ...C.purple, start: '2027-01-11', unit: 'dates', weeks: '',
      end: '2027-01-15', days: '', snap: false, wknum: false, hideWf: true, after: null, hiatus: { on: false, name: 'Colour Grading Hiatus', start: '', weeks: '', wknum: false } },
  ]
}

// ---------- the derived readouts the engine prints today (display only here) ----------
const DAY = 86400000
const iso2d = s => (s ? new Date(s + 'T00:00:00Z') : null)
const fmt = d => (d ? `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${String(d.getUTCFullYear()).slice(2)}` : '')
function rangeOf(p) {
  if (p.kind === 'prep') return '6 preps · Fri 8/28/26 → Mon 10/26/26'
  if (p.kind === 'production') return '30 shoot days → 7 wk · 9/14/26 → 10/30/26'
  const s = iso2d(p.start)
  if (!s) return ''
  if (p.unit === 'dates') {   // the engine's unit line: "Mon 1/11/27 → Fri 1/15/27 (1 wk)"
    const e = iso2d(p.end); if (!e) return fmt(s)
    const wd = d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]
    const wk = Math.max(1, Math.ceil((Math.round((e - s) / DAY) + 1) / 7))
    return `${wd(s)} ${fmt(s)} → ${wd(e)} ${fmt(e)} (${wk} wk)`
  }
  if (p.unit === 'days') return `${fmt(s)} → … (${p.days || 0} days)`
  const w = Number(p.weeks) || 0
  const hi = p.hiatus && p.hiatus.on ? Number(p.hiatus.weeks) || 0 : 0
  const e = new Date(s.getTime() + ((w + hi) * 7 - 1) * DAY)
  return `${fmt(s)} → ${fmt(e)} (${w} wk)`
}
// The summary row's shorter form: years dropped, "(10 wk)" as "· 10 wk".
const shortRange = p => rangeOf(p).replace(/(\d+\/\d+)\/\d\d/g, '$1').replace(/ \((\d+) wk\)/, ' · $1 wk')

function usePhases() {
  const [phases, setPhases] = useState(samplePhases)
  const set = (key, patch) => setPhases(list => list.map(p => (p.key === key ? { ...p, ...(typeof patch === 'function' ? patch(p) : patch) } : p)))
  const setH = (key, patch) => set(key, p => ({ hiatus: { ...p.hiatus, ...patch } }))
  return [phases, set, setH]
}

// ---------- the All-phase hiatus card's rows (addHiatusRow): name, start, weeks, ×, Lock in place, Number weeks ----------
const HIATUS_RED = '#FF0000'   // HIATUS_COLOR: every all-phase band is this red
function sampleHiatuses() {
  return [
    { id: 'h1', name: 'Holiday Hiatus', start: '2026-12-21', weeks: 2, locked: true, num: false },
    { id: 'h2', name: '', start: '2027-03-29', weeks: 1, locked: false, num: false },   // blank name: the band reads "Hiatus"
    { id: 'h3', name: 'Holiday Hiatus', start: '2027-12-20', weeks: 2, locked: true, num: true },
  ]
}
function useHiatuses() {
  const [list, setList] = useState(sampleHiatuses)
  const set = (id, patch) => setList(l => l.map(h => (h.id === id ? { ...h, ...patch } : h)))
  const remove = id => setList(l => l.filter(h => h.id !== id))
  return [list, set, remove]
}
function hRange(h) {
  const s = iso2d(h.start); if (!s) return ''
  const w = Number(h.weeks) || 0
  return `${fmt(s)} → ${fmt(new Date(s.getTime() + (w * 7 - 1) * DAY))} (${w} wk)`
}
const hShort = h => hRange(h).replace(/(\d+\/\d+)\/\d\d/g, '$1').replace(/ \((\d+) wk\)/, ' · $1 wk')
const ILock = () => <svg {...sv} width={11} height={11}><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" /></svg>
const Locked = () => (
  <Badge size="xs" variant="light" color="gray" radius="sm" leftSection={<ILock />} style={{ textTransform: 'none', fontWeight: 500, flex: 'none' }}>Locked</Badge>
)
const HName = ({ h, set, ...rest }) => (
  <TextInput variant="unstyled" value={h.name} placeholder="Hiatus" onChange={e => set(h.id, { name: e.currentTarget.value })}
    styles={{ input: { fontWeight: 500, fontSize: 14, height: 26, minHeight: 26, padding: '0 4px', borderRadius: 5 } }}
    style={{ flex: 1, minWidth: 0 }} {...rest} />
)
const HStartWeeks = ({ h, set }) => (
  <SimpleGrid cols={2} spacing={8}>
    <div><L>Starts</L><DateIn value={h.start} onChange={e => set(h.id, { start: e.currentTarget.value })} /></div>
    <div><L>Weeks</L><NumberInput size="xs" hideControls allowDecimal={false} allowNegative={false} value={h.weeks} onChange={v => set(h.id, { weeks: v })} /></div>
  </SimpleGrid>
)
const HTicks = ({ h, set, stack }) => {
  const a = <Cb checked={h.locked} onChange={e => set(h.id, { locked: e.currentTarget.checked })} label="Lock in place" />
  const b = <Cb checked={h.num} onChange={e => set(h.id, { num: e.currentTarget.checked })} label="Number weeks" />
  return stack ? <Stack gap={8}>{a}{b}</Stack> : <Group gap={14}>{a}{b}</Group>
}

// ---------- icons (inline, stroke = currentColor) ----------
const sv = { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
const IChevron = ({ open }) => <svg {...sv} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }}><path d="M4 6l4 4 4-4" /></svg>
const IGrip = () => <svg {...sv} width={12} height={12} stroke="none" fill="currentColor"><circle cx="5.5" cy="3.5" r="1.2" /><circle cx="10.5" cy="3.5" r="1.2" /><circle cx="5.5" cy="8" r="1.2" /><circle cx="10.5" cy="8" r="1.2" /><circle cx="5.5" cy="12.5" r="1.2" /><circle cx="10.5" cy="12.5" r="1.2" /></svg>
const ISliders = () => <svg {...sv}><path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" /><circle cx="10" cy="4.5" r="1.5" /><circle cx="6" cy="11.5" r="1.5" /></svg>
const IAfter = () => <svg {...sv} width={12} height={12}><path d="M4 3v5.5a2 2 0 002 2h6.5M10 8l2.5 2.5L10 13" /></svg>
const IEyeOff = () => <svg {...sv} width={11} height={11}><path d="M2 2l12 12M6.6 6.7a2 2 0 002.7 2.7M4.2 4.4C2.9 5.3 2 6.6 1.5 8c1.2 3 3.8 5 6.5 5 1.3 0 2.5-.4 3.6-1.1M7 3.1c.3 0 .7-.1 1-.1 2.7 0 5.3 2 6.5 5-.3.8-.7 1.5-1.2 2.2" /></svg>

// ---------- small shared pieces ----------
const L = ({ children }) => <Text size="xs" c="gray.6" fw={500} mb={3}>{children}</Text>
const DateIn = props => <TextInput type="date" size="xs" {...props} />
const MonthOnly = ({ size = 'xs' }) => (
  <Badge size={size} variant="light" color="info" radius="sm" leftSection={<IEyeOff />} style={{ textTransform: 'none', fontWeight: 500, flex: 'none' }}>
    Month view only
  </Badge>
)
const Swatch = ({ p, size = 16 }) => (
  <Tooltip label="Colour" withArrow openDelay={400}>
    <ColorSwatch component="button" color={p.color} size={size} radius="xs" style={{ cursor: 'pointer', flex: 'none', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.12)' }} />
  </Tooltip>
)
const Caret = ({ open, onClick }) => (
  <ActionIcon variant="subtle" color="gray" size="sm" onClick={onClick} aria-label={open ? 'Fold' : 'Unfold'}><IChevron open={open} /></ActionIcon>
)
const NameIn = ({ p, set, ...rest }) => (
  <TextInput variant="unstyled" value={p.name} placeholder="Hiatus" onChange={e => set(p.key, { name: e.currentTarget.value })}
    styles={{ input: { fontWeight: 500, fontSize: 14, height: 26, minHeight: 26, padding: '0 4px', borderRadius: 5 } }}
    style={{ flex: 1, minWidth: 0 }} {...rest} />
)
const unitData = p => (p.kind === 'custom' ? ['Weeks', 'Days', 'Dates'] : ['Weeks', 'Dates'])
// As today: Snap to Mon shows for Production always and for a Weeks length only; Number weeks is a
// custom phase's, in every unit; the built-ins have no Number weeks box.
const showSnap = p => p.kind === 'production' || p.unit === 'weeks'
const showWk = p => p.kind === 'custom'
const unitVal = u => u[0].toUpperCase() + u.slice(1)

// "Length": the number (or, for Dates, the end date) with its unit. Two shapes, the same three controls:
//  - 'stacked': the unit is a small select on the label's line and the field takes the full width, so an end
//    date never gets squeezed beside a select in a two-column row (A, B, C);
//  - 'attached': number and unit joined as one control, for a row with its label on the left (D).
function LengthIn({ p, set, shape = 'stacked' }) {
  const unitSel = attached => (
    <NativeSelect size="xs" data={unitData(p)} value={unitVal(p.unit)} aria-label="Length given by"
      onChange={e => set(p.key, { unit: e.currentTarget.value.toLowerCase() })}
      variant={attached ? 'default' : 'unstyled'}
      styles={attached
        ? { input: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, width: 76, paddingRight: 20 } }
        : { input: { height: 18, minHeight: 18, lineHeight: '18px', fontSize: 11, fontWeight: 500, color: 'var(--mantine-color-navy-5)', paddingLeft: 0, paddingRight: 16, width: 'auto' }, section: { width: 14 } }} />
  )
  const join = { borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 0 }
  const field = p.unit === 'dates'
    ? <DateIn value={p.end} onChange={e => set(p.key, { end: e.currentTarget.value })} aria-label="End date" style={{ flex: 1, minWidth: 0 }} styles={shape === 'attached' ? { input: join } : undefined} />
    : <NumberInput size="xs" hideControls allowDecimal={false} allowNegative={false} value={p.unit === 'days' ? p.days : p.weeks}
        onChange={v => set(p.key, p.unit === 'days' ? { days: v } : { weeks: v })} placeholder="e.g. 12" aria-label={unitVal(p.unit)}
        style={{ flex: 1, minWidth: 0 }} styles={shape === 'attached' ? { input: join } : undefined} />
  if (shape === 'attached') return <Group gap={0} wrap="nowrap">{field}{unitSel(true)}</Group>
  return (
    <div>
      <Group gap={4} wrap="nowrap" mb={3} h={17}>
        <Text size="xs" c="gray.6" fw={500}>{p.unit === 'dates' ? 'Ends' : 'Length'} ·</Text>{unitSel(false)}
      </Group>
      {field}
    </div>
  )
}
const AfterLink = ({ p }) => p.after && (
  <Anchor component="button" size="xs" c="navy.5" mt={4} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    <IAfter /> Start after {p.after}
  </Anchor>
)
const Cb = props => <Checkbox size="xs" styles={{ label: { paddingLeft: 6, fontSize: 12, color: 'var(--mantine-color-gray-7)' } }} {...props} />

// Production's own blocks, shared by every option (they are content, not layout).
function ShootTotal({ compact }) {
  if (compact) return (
    <Group gap={5} align="baseline" wrap="nowrap"><Text fw={600} fz={16} lh={1}>30</Text><Text size="xs" c="gray.6" lh={1.2}>shooting days · 6 episodes</Text></Group>
  )
  return (
    <Group justify="space-between" wrap="nowrap" p={compact ? 0 : 8} bg={compact ? undefined : 'gray.0'} style={{ borderRadius: 7 }}>
      <Group gap={6} align="baseline" wrap="nowrap">
        <Text fw={600} fz={compact ? 16 : 20} lh={1}>30</Text><Text size="xs" c="gray.6">shooting days</Text>
      </Group>
      <Badge size="sm" variant="light" color="gray" radius="sm" style={{ textTransform: 'none', fontWeight: 500 }}>6 episodes</Badge>
    </Group>
  )
}
function EpisodeList({ p, set, unitLabel = 'days', field = 'days', placeholder }) {
  return (
    <Stack gap={4}>
      {p.eps.map((ep, i) => (
        <Group key={ep.name} gap={6} wrap="nowrap">
          {p.kind === 'production' && <Box c="gray.5" style={{ cursor: 'grab', display: 'flex' }}><IGrip /></Box>}
          <Text size="sm" style={{ flex: 1 }}>{ep.name}</Text>
          <NumberInput size="xs" hideControls w={78} value={ep[field]} placeholder={placeholder}
            rightSection={<Text size="xs" c="gray.5" pr={6}>{unitLabel}</Text>} rightSectionWidth={34}
            onChange={v => set(p.key, q => ({ eps: q.eps.map((x, j) => (j === i ? { ...x, [field]: v } : x)) }))} />
        </Group>
      ))}
    </Stack>
  )
}
function SimPost({ p, set }) {
  const s = p.sim
  const setS = patch => set(p.key, q => ({ sim: { ...q.sim, ...patch } }))
  return (
    <Stack gap={6}>
      <Cb checked={s.on} onChange={e => setS({ on: e.currentTarget.checked })} label="Simultaneous Post" />
      {s.on && (
        <Stack gap={6} pl={24}>
          <Group gap={6} wrap="nowrap">
            <Text size="xs" c="gray.6">Starts</Text>
            <NumberInput size="xs" hideControls w={52} value={s.offset} onChange={v => setS({ offset: v })} />
            <Text size="xs" c="gray.6">weeks after Production begins</Text>
          </Group>
          <Cb checked={s.count} onChange={e => setS({ count: e.currentTarget.checked })} label="Number these weeks & continue Post's count" />
        </Stack>
      )}
    </Stack>
  )
}
function HiatusFields({ p, setH, cols = 2 }) {
  const h = p.hiatus
  return (
    <Stack gap={8}>
      <SimpleGrid cols={cols} spacing={8}>
        <div><L>Starts</L><DateIn value={h.start} onChange={e => setH(p.key, { start: e.currentTarget.value })} /></div>
        <div><L>Weeks</L><NumberInput size="xs" hideControls value={h.weeks} onChange={v => setH(p.key, { weeks: v })} /></div>
      </SimpleGrid>
      <Cb checked={h.wknum} onChange={e => setH(p.key, { wknum: e.currentTarget.checked })} label="Number weeks" />
    </Stack>
  )
}
function PrepBody({ p, set, showRange = true }) {
  return (
    <Stack gap={8}>
      <Group gap={8} align="flex-end" wrap="nowrap">
        <div style={{ width: 110 }}><L>Default prep</L>
          <NumberInput size="xs" hideControls value={p.defaultDays} onChange={v => set(p.key, { defaultDays: v })}
            rightSection={<Text size="xs" c="gray.5" pr={6}>days</Text>} rightSectionWidth={34} /></div>
        {showRange && <Text size="xs" c="gray.6" pb={6}>{rangeOf(p)}</Text>}
      </Group>
      <EpisodeList p={p} set={set} placeholder="5" />
      <Text size="xs" c="gray.6">Blank uses the default · 0 gives that episode no prep</Text>
    </Stack>
  )
}

// =====================================================================================
// OPTION A — TIDY CARD. Today's card, decluttered: a colour edge instead of a bar, the length
// and its unit as one control, the three ticks on one line, the hiatus folded into its own box.
// =====================================================================================
// The owner picked A (23 Oct 2026): "tidy card but please clean up/refine the production phase cuz its still messy
// with hiatus and sim post". So in A every optional block -- a phase's hiatus, Production's hiatus, Sim Post -- is the
// same OPTION BOX: one line with its tick when off, its fields underneath when on. Production's card reads top to
// bottom in three plain parts: when it starts, the shooting order (with the total on its heading), then the two boxes.
function OptBox({ on, onToggle, label, title, children }) {
  return (
    <Box style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: 7, background: on ? 'var(--mantine-color-gray-0)' : 'var(--mantine-color-white)' }}>
      <Group gap={6} wrap="nowrap" px={8} h={32}>
        <Checkbox size="xs" checked={on} onChange={onToggle} aria-label={label} />
        {title}
      </Group>
      {on && <Box px={8} pb={10} pt={2}>{children}</Box>}
    </Box>
  )
}
const SectionHead = ({ children, right }) => (
  <Group justify="space-between" wrap="nowrap" mb={6}>
    <Text fz={10} fw={600} c="gray.6" tt="uppercase" style={{ letterSpacing: '.06em' }}>{children}</Text>
    {right}
  </Group>
)
function HiatusBoxA({ p, setH }) {
  return (
    <OptBox on={p.hiatus.on} onToggle={e => setH(p.key, { on: e.currentTarget.checked })} label="Hiatus"
      title={<NameIn p={{ ...p, name: p.hiatus.name }} set={(k, v) => setH(k, { name: v.name })} placeholder={`${p.name} Hiatus`}
        styles={{ input: { fontSize: 12, fontWeight: 500, height: 24, minHeight: 24, padding: '0 4px' } }} />}>
      <HiatusFields p={p} setH={setH} />
    </OptBox>
  )
}
function SimPostBoxA({ p, set }) {
  const s = p.sim
  const setS = patch => set(p.key, q => ({ sim: { ...q.sim, ...patch } }))
  return (
    <OptBox on={s.on} onToggle={e => setS({ on: e.currentTarget.checked })} label="Simultaneous Post"
      title={<Text size="xs" fw={500} px={4}>Simultaneous Post</Text>}>
      <Stack gap={8}>
        <Group gap={6} wrap="nowrap">
          <Text size="xs" c="gray.7">Starts</Text>
          <NumberInput size="xs" hideControls allowDecimal={false} allowNegative={false} w={48} value={s.offset} onChange={v => setS({ offset: v })} aria-label="Weeks after Production begins" />
          <Text size="xs" c="gray.7">weeks into Production</Text>
        </Group>
        <Cb checked={s.count} onChange={e => setS({ count: e.currentTarget.checked })} label="Number these weeks and continue Post's count" />
      </Stack>
    </OptBox>
  )
}
function ProductionBodyA({ p, set, setH }) {
  return (<>
    <div>
      <L>Starts</L>
      <Group gap={12} wrap="nowrap">
        <DateIn value={p.start} onChange={e => set(p.key, { start: e.currentTarget.value })} style={{ flex: 1, minWidth: 0 }} />
        <Cb checked={p.snap} onChange={e => set(p.key, { snap: e.currentTarget.checked })} label="Snap to Mon" />
      </Group>
      <AfterLink p={p} />
    </div>
    <div>
      <SectionHead right={<Text size="xs" c="gray.7"><b style={{ fontWeight: 600 }}>30</b> days · 6 episodes</Text>}>Shooting order</SectionHead>
      <Box p={6} style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: 7 }}>
        <EpisodeList p={p} set={set} />
      </Box>
    </div>
    <Stack gap={6}>
      <HiatusBoxA p={p} setH={setH} />
      <SimPostBoxA p={p} set={set} />
    </Stack>
  </>)
}
// Episodic Prep in A takes Production's shape: the range on the meta line like every card, the default, then the
// per-episode list boxed under its own heading, with the blank/0 rule on that heading.
function PrepBodyA({ p, set }) {
  return (<>
    <Text size="xs" c="gray.6" mt={-6}>{rangeOf(p)}</Text>
    <div style={{ width: 130 }}><L>Default prep</L>
      <NumberInput size="xs" hideControls value={p.defaultDays} onChange={v => set(p.key, { defaultDays: v })}
        rightSection={<Text size="xs" c="gray.5" pr={6}>days</Text>} rightSectionWidth={34} /></div>
    <div>
      <SectionHead right={<Text size="xs" c="gray.6">Blank = default · 0 = none</Text>}>Per episode</SectionHead>
      <Box p={6} style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: 7 }}>
        <EpisodeList p={p} set={set} placeholder="5" />
      </Box>
    </div>
  </>)
}
function CardA({ p, set, setH }) {
  const [open, setOpen] = useState(true)
  const isProd = p.kind === 'production'
  return (
    <Paper withBorder radius="lg" p={12} style={{ borderLeft: `5px solid ${p.color}` }}>
      <Group gap={6} wrap="nowrap">
        <Caret open={open} onClick={() => setOpen(o => !o)} />
        <Swatch p={p} size={14} />
        <NameIn p={p} set={set} />
        {p.hideWf && <MonthOnly />}
        {p.kind === 'prep' && <MonthOnly />}
        {p.kind === 'custom' && <CloseButton size="sm" aria-label="Remove phase" />}
      </Group>
      {!open ? null : (
        <Stack gap={12} mt={8} pl={30}>
          {p.kind === 'prep' ? <PrepBodyA p={p} set={set} /> : (<>
            <Text size="xs" c="gray.6" mt={-6}>{rangeOf(p)}</Text>
            {isProd ? <ProductionBodyA p={p} set={set} setH={setH} /> : (<>
              <div>
                <SimpleGrid cols={2} spacing={8}>
                  <div><L>Starts</L><DateIn value={p.start} onChange={e => set(p.key, { start: e.currentTarget.value })} /></div>
                  <LengthIn p={p} set={set} />
                </SimpleGrid>
                <AfterLink p={p} />
              </div>
              <Group gap={14} wrap="wrap">
                {showSnap(p) && <Cb checked={p.snap} onChange={e => set(p.key, { snap: e.currentTarget.checked })} label="Snap to Mon" />}
                {showWk(p) && <Cb checked={p.wknum} onChange={e => set(p.key, { wknum: e.currentTarget.checked })} label="Number weeks" />}
                <Cb checked={p.hideWf} onChange={e => set(p.key, { hideWf: e.currentTarget.checked })} label="Hide in waterfall" />
              </Group>
              <HiatusBoxA p={p} setH={setH} />
            </>)}
          </>)}
        </Stack>
      )}
    </Paper>
  )
}
function OptionA() {
  const [phases, set, setH] = usePhases()
  return <Stack gap={10}>{phases.map(p => <CardA key={p.key} p={p} set={set} setH={setH} />)}</Stack>
}

// =====================================================================================
// OPTION B — SUMMARY ROWS. Every phase is one line you can read the plan from: colour, name,
// dates, tags. Click a row to edit it underneath. Folded is the resting state.
// =====================================================================================
function RowB({ p }) {
  return (
    <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
      <Box w={4} h={30} style={{ background: p.color, borderRadius: 2, flex: 'none', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)' }} />
      <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
        <Group gap={6} wrap="nowrap">
          <Text size="sm" fw={500} truncate>{p.name}</Text>
          {(p.hideWf || p.kind === 'prep') && <MonthOnly />}
        </Group>
        <Text size="xs" c="gray.6" truncate>
          {shortRange(p)}{p.hiatus && p.hiatus.on ? ` · ${p.hiatus.weeks} wk hiatus` : ''}
        </Text>
      </Stack>
    </Group>
  )
}
function PanelB({ p, set, setH }) {
  if (p.kind === 'prep') return <Stack gap={10}><NameIn p={p} set={set} /><PrepBody p={p} set={set} /></Stack>
  return (
    <Stack gap={10}>
      <Group gap={6} wrap="nowrap"><Swatch p={p} /><NameIn p={p} set={set} />{p.kind === 'custom' && <CloseButton size="sm" aria-label="Remove phase" />}</Group>
      <SimpleGrid cols={p.kind === 'production' ? 1 : 2} spacing={8}>
        <div><L>Starts</L><DateIn value={p.start} onChange={e => set(p.key, { start: e.currentTarget.value })} /><AfterLink p={p} /></div>
        {p.kind !== 'production' && <LengthIn p={p} set={set} />}
      </SimpleGrid>
      <Group gap={14}>
        {showSnap(p) && <Cb checked={p.snap} onChange={e => set(p.key, { snap: e.currentTarget.checked })} label="Snap to Mon" />}
        {showWk(p) && <Cb checked={p.wknum} onChange={e => set(p.key, { wknum: e.currentTarget.checked })} label="Number weeks" />}
        {p.kind !== 'production' && <Cb checked={p.hideWf} onChange={e => set(p.key, { hideWf: e.currentTarget.checked })} label="Hide in waterfall" />}
      </Group>
      {p.kind === 'production' && (<><ShootTotal /><EpisodeList p={p} set={set} /></>)}
      <Divider color="gray.2" />
      <Cb checked={p.hiatus.on} onChange={e => setH(p.key, { on: e.currentTarget.checked })} label={p.hiatus.name} />
      {p.hiatus.on && <Box pl={24}><HiatusFields p={p} setH={setH} /></Box>}
      {p.kind === 'production' && <SimPost p={p} set={set} />}
    </Stack>
  )
}
function OptionB() {
  const [phases, set, setH] = usePhases()
  return (
    <Accordion multiple variant="separated" radius="lg" chevronPosition="right" defaultValue={['custom1']}
      styles={{ item: { background: 'var(--mantine-color-white)', border: '1px solid var(--mantine-color-gray-3)' },
                control: { padding: '6px 10px 6px 8px' }, label: { padding: '4px 0' }, content: { padding: '4px 12px 12px 20px' } }}>
      {phases.map(p => (
        <Accordion.Item key={p.key} value={p.key}>
          <Accordion.Control><RowB p={p} /></Accordion.Control>
          <Accordion.Panel><PanelB p={p} set={set} setH={setH} /></Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}

// =====================================================================================
// OPTION C — COMPACT + OPTIONS. Two lines per phase: name, then the two fields you set most.
// Everything set once and left alone sits behind the sliders button, which shows a dot when
// one of those is changed from its default.
// =====================================================================================
function CardC({ p, set, setH }) {
  const [more, setMore] = useState(p.key === 'custom1')
  const isProd = p.kind === 'production', isPrep = p.kind === 'prep'
  const changed = !isPrep && ((showSnap(p) && !p.snap) || (showWk(p) && !p.wknum) || p.hideWf || (p.hiatus && p.hiatus.on) || (isProd && p.sim.on))
  return (
    <Paper withBorder radius="lg" p={10}>
      <Group gap={8} wrap="nowrap" align="flex-start">
        <Tooltip label="Colour" withArrow openDelay={400}>
          <UnstyledButton aria-label="Colour" style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, background: p.color, flex: 'none', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.1)' }} />
        </Tooltip>
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={4} wrap="nowrap">
            <NameIn p={p} set={set} />
            {(p.hideWf || isPrep) && <MonthOnly />}
            {!isPrep && (
              <Tooltip label="More options" withArrow openDelay={400}>
                <Indicator disabled={!changed} size={7} offset={4} color="navy.5">
                  <ActionIcon variant={more ? 'light' : 'subtle'} color="gray" size="sm" onClick={() => setMore(m => !m)} aria-label="More options"><ISliders /></ActionIcon>
                </Indicator>
              </Tooltip>
            )}
            {p.kind === 'custom' && <CloseButton size="sm" aria-label="Remove phase" />}
          </Group>
          {isPrep ? <PrepBody p={p} set={set} /> : (<>
            <Group gap={6} wrap="nowrap" align="flex-start">
              <Box style={{ flex: '1 1 0', minWidth: 0 }}><L>Starts</L><DateIn value={p.start} onChange={e => set(p.key, { start: e.currentTarget.value })} /></Box>
              {isProd ? <Box style={{ flex: '1 1 0', alignSelf: 'flex-end' }} pb={4}><ShootTotal compact /></Box> : <Box style={{ flex: '1 1 0', minWidth: 0 }}><LengthIn p={p} set={set} /></Box>}
            </Group>
            <Text size="xs" c="gray.6">{rangeOf(p)}</Text>
            {isProd && <EpisodeList p={p} set={set} />}
            <Collapse expanded={more}>
              <Stack gap={8} pt={8} mt={2} style={{ borderTop: '1px dashed var(--mantine-color-gray-3)' }}>
                {p.after && <AfterLink p={p} />}
                {showSnap(p) && <Cb checked={p.snap} onChange={e => set(p.key, { snap: e.currentTarget.checked })} label="Snap to Mon" />}
                {showWk(p) && <Cb checked={p.wknum} onChange={e => set(p.key, { wknum: e.currentTarget.checked })} label="Number weeks" />}
                {!isProd && <Cb checked={p.hideWf} onChange={e => set(p.key, { hideWf: e.currentTarget.checked })} label="Hide in waterfall" />}
                <Cb checked={p.hiatus.on} onChange={e => setH(p.key, { on: e.currentTarget.checked })} label={p.hiatus.name} />
                {p.hiatus.on && <Box pl={24}><HiatusFields p={p} setH={setH} /></Box>}
                {isProd && <SimPost p={p} set={set} />}
              </Stack>
            </Collapse>
          </>)}
        </Stack>
      </Group>
    </Paper>
  )
}
function OptionC() {
  const [phases, set, setH] = usePhases()
  return <Stack gap={8}>{phases.map(p => <CardC key={p.key} p={p} set={set} setH={setH} />)}</Stack>
}

// =====================================================================================
// OPTION D — SETTINGS LIST. Label on the left, control on the right, one hairline per row, the
// way a settings screen reads. The card's head carries the phase colour and its dates.
// =====================================================================================
function RowD({ label, sub, children, last }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap={10} py={7} style={{ borderBottom: last ? 0 : '1px solid var(--mantine-color-gray-2)' }}>
      <div style={{ minWidth: 0 }}>
        <Text size="sm">{label}</Text>
        {sub}
      </div>
      <div style={{ flex: 'none' }}>{children}</div>
    </Group>
  )
}
const Sw = props => <Switch size="xs" {...props} />
function CardD({ p, set, setH }) {
  const [open, setOpen] = useState(true)
  const isProd = p.kind === 'production', isPrep = p.kind === 'prep'
  return (
    <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
      <Group gap={6} wrap="nowrap" px={8} py={6} style={{ background: p.color }}>
        <Caret open={open} onClick={() => setOpen(o => !o)} />
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <NameIn p={p} set={set} styles={{ input: { fontWeight: 600, fontSize: 14, height: 24, minHeight: 24, padding: '0 4px', color: p.text } }} />
          <Text size="xs" px={4} style={{ color: p.text, opacity: .85 }} truncate>{rangeOf(p)}</Text>
        </Stack>
        {(p.hideWf || isPrep) && <MonthOnly />}
        {p.kind === 'custom' && <CloseButton size="sm" aria-label="Remove phase" style={{ color: p.text }} />}
      </Group>
      <Collapse expanded={open}>
        <Box px={12} pb={4}>
          {isPrep ? <Box py={10}><PrepBody p={p} set={set} showRange={false} /></Box> : (<>
            <RowD label="Starts" sub={p.after && <Anchor component="button" size="xs" c="navy.5">after {p.after}</Anchor>}>
              <DateIn value={p.start} onChange={e => set(p.key, { start: e.currentTarget.value })} w={142} />
            </RowD>
            {isProd
              ? <RowD label="Shooting days" sub={<Text size="xs" c="gray.6">6 episodes</Text>}><Text fw={600} size="lg">30</Text></RowD>
              : <RowD label={p.unit === 'dates' ? 'Ends' : 'Length'}><Box w={p.unit === 'dates' ? 206 : 150}><LengthIn p={p} set={set} shape="attached" /></Box></RowD>}
            {isProd && <Box py={8} style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}><EpisodeList p={p} set={set} /></Box>}
            {showSnap(p) && <RowD label="Snap to Monday"><Sw checked={p.snap} onChange={e => set(p.key, { snap: e.currentTarget.checked })} /></RowD>}
            {showWk(p) && <RowD label="Number weeks"><Sw checked={p.wknum} onChange={e => set(p.key, { wknum: e.currentTarget.checked })} /></RowD>}
            {!isProd && <RowD label="Hide in waterfall"><Sw checked={p.hideWf} onChange={e => set(p.key, { hideWf: e.currentTarget.checked })} /></RowD>}
            <RowD label="Hiatus" last={!p.hiatus.on && !isProd}><Sw checked={p.hiatus.on} onChange={e => setH(p.key, { on: e.currentTarget.checked })} /></RowD>
            {p.hiatus.on && (
              <Box pl={12} ml={2} mb={6} style={{ borderLeft: `3px solid ${p.color}` }}>
                <RowD label="Name"><TextInput size="xs" w={150} value={p.hiatus.name} onChange={e => setH(p.key, { name: e.currentTarget.value })} /></RowD>
                <RowD label="Starts"><DateIn w={142} value={p.hiatus.start} onChange={e => setH(p.key, { start: e.currentTarget.value })} /></RowD>
                <RowD label="Weeks"><NumberInput size="xs" hideControls w={70} value={p.hiatus.weeks} onChange={v => setH(p.key, { weeks: v })} /></RowD>
                <RowD label="Number weeks" last><Sw checked={p.hiatus.wknum} onChange={e => setH(p.key, { wknum: e.currentTarget.checked })} /></RowD>
              </Box>
            )}
            {isProd && (() => {
              const setS = patch => set(p.key, q => ({ sim: { ...q.sim, ...patch } }))
              return (<>
                <RowD label="Simultaneous Post" last={!p.sim.on}><Sw checked={p.sim.on} onChange={e => setS({ on: e.currentTarget.checked })} /></RowD>
                {p.sim.on && (
                  <Box pl={12} ml={2} mb={6} style={{ borderLeft: `3px solid ${p.color}` }}>
                    <RowD label="Starts after" sub={<Text size="xs" c="gray.6">weeks after Production begins</Text>}>
                      <NumberInput size="xs" hideControls w={70} value={p.sim.offset} onChange={v => setS({ offset: v })} />
                    </RowD>
                    <RowD label="Continue Post's count" sub={<Text size="xs" c="gray.6">Number these weeks</Text>} last>
                      <Sw checked={p.sim.count} onChange={e => setS({ count: e.currentTarget.checked })} />
                    </RowD>
                  </Box>
                )}
              </>)
            })()}
          </>)}
        </Box>
      </Collapse>
    </Paper>
  )
}
function OptionD() {
  const [phases, set, setH] = usePhases()
  return <Stack gap={10}>{phases.map(p => <CardD key={p.key} p={p} set={set} setH={setH} />)}</Stack>
}

// =====================================================================================
// A + D BLEND (owner, 23 Oct 2026: "actually can i see a blend of A and D"). D's coloured head carrying the
// name and dates, and D's label-left switch rows for every yes/no; A's two fields side by side, A's refined
// Production (shooting order with its total on the heading) and Episodic Prep. An optional block (a hiatus, Sim
// Post) is a switch row that opens its fields underneath, ruled in the phase colour.
// =====================================================================================
function HeadAD({ p, set, open, setOpen, tags, onRemove, fg }) {
  const ink = fg || p.text
  return (
    <Group gap={6} wrap="nowrap" px={8} py={6} style={{ background: p.color }}>
      {setOpen && <ActionIcon variant="subtle" size="sm" onClick={() => setOpen(o => !o)} aria-label={open ? 'Fold' : 'Unfold'} style={{ color: ink }}><IChevron open={open} /></ActionIcon>}
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        {/* the tags and × share the NAME's line, so the dates under it get the full width */}
        <Group gap={6} wrap="nowrap">
          <NameIn p={p} set={set} styles={{ input: { fontWeight: 600, fontSize: 14, height: 24, minHeight: 24, padding: '0 4px', color: ink } }} />
          {tags}
          {onRemove && <CloseButton size="sm" aria-label="Remove" onClick={onRemove} style={{ color: ink }} />}
        </Group>
        <Text size="xs" px={4} style={{ color: ink, opacity: .85 }} truncate>{p.range}</Text>
      </Stack>
    </Group>
  )
}
// A switch row that opens a block under it, the block ruled in the phase colour (D's nested rows, A's fields).
function OptRowAD({ label, on, onToggle, color, last, children }) {
  return (<>
    <RowD label={label} last={last && !on}><Sw checked={on} onChange={onToggle} /></RowD>
    {on && <Box pl={12} ml={2} mb={8} mt={2} style={{ borderLeft: `3px solid ${color}` }}>{children}</Box>}
  </>)
}
function HiatusRowAD({ p, setH, last }) {
  const h = p.hiatus
  return (
    <OptRowAD label="Hiatus" on={h.on} onToggle={e => setH(p.key, { on: e.currentTarget.checked })} color={p.color} last={last}>
      <Stack gap={8} pt={4}>
        <TextInput size="xs" value={h.name} placeholder={`${p.name} Hiatus`} onChange={e => setH(p.key, { name: e.currentTarget.value })} aria-label="Hiatus name" />
        <SimpleGrid cols={2} spacing={8}>
          <div><L>Starts</L><DateIn value={h.start} onChange={e => setH(p.key, { start: e.currentTarget.value })} /></div>
          <div><L>Weeks</L><NumberInput size="xs" hideControls value={h.weeks} onChange={v => setH(p.key, { weeks: v })} /></div>
        </SimpleGrid>
        <RowD label="Number weeks" last><Sw checked={h.wknum} onChange={e => setH(p.key, { wknum: e.currentTarget.checked })} /></RowD>
      </Stack>
    </OptRowAD>
  )
}
function CardAD({ p, set, setH }) {
  const [open, setOpen] = useState(true)
  const isProd = p.kind === 'production', isPrep = p.kind === 'prep'
  const tags = (p.hideWf || isPrep) ? <MonthOnly /> : null
  const setS = patch => set(p.key, q => ({ sim: { ...q.sim, ...patch } }))
  return (
    <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
      <HeadAD p={{ ...p, range: rangeOf(p) }} set={set} open={open} setOpen={setOpen} tags={tags} onRemove={p.kind === 'custom' ? () => {} : null} />
      <Collapse expanded={open}>
        <Box px={12} pt={10} pb={4}>
          {isPrep ? (
            <Stack gap={10} pb={8}>
              <div style={{ width: 130 }}><L>Default prep</L>
                <NumberInput size="xs" hideControls value={p.defaultDays} onChange={v => set(p.key, { defaultDays: v })}
                  rightSection={<Text size="xs" c="gray.5" pr={6}>days</Text>} rightSectionWidth={34} /></div>
              <div>
                <SectionHead right={<Text size="xs" c="gray.6">Blank = default · 0 = none</Text>}>Per episode</SectionHead>
                <Box p={6} style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: 7 }}><EpisodeList p={p} set={set} placeholder="5" /></Box>
              </div>
            </Stack>
          ) : (<>
            <div>
              {isProd
                ? <div><L>Starts</L><DateIn value={p.start} onChange={e => set(p.key, { start: e.currentTarget.value })} /></div>
                : <SimpleGrid cols={2} spacing={8}>
                    <div><L>Starts</L><DateIn value={p.start} onChange={e => set(p.key, { start: e.currentTarget.value })} /></div>
                    <LengthIn p={p} set={set} />
                  </SimpleGrid>}
              <AfterLink p={p} />
            </div>
            {isProd && <Box mt={4}><RowD label="Snap to Monday" last><Sw checked={p.snap} onChange={e => set(p.key, { snap: e.currentTarget.checked })} /></RowD></Box>}
            {isProd && (
              <Box mt={8} mb={4}>
                <SectionHead right={<Text size="xs" c="gray.7"><b style={{ fontWeight: 600 }}>30</b> days · 6 episodes</Text>}>Shooting order</SectionHead>
                <Box p={6} style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: 7 }}><EpisodeList p={p} set={set} /></Box>
              </Box>
            )}
            <Box mt={6}>
              {showSnap(p) && !isProd && <RowD label="Snap to Monday"><Sw checked={p.snap} onChange={e => set(p.key, { snap: e.currentTarget.checked })} /></RowD>}
              {showWk(p) && <RowD label="Number weeks"><Sw checked={p.wknum} onChange={e => set(p.key, { wknum: e.currentTarget.checked })} /></RowD>}
              {!isProd && <RowD label="Hide in waterfall"><Sw checked={p.hideWf} onChange={e => set(p.key, { hideWf: e.currentTarget.checked })} /></RowD>}
              <HiatusRowAD p={p} setH={setH} last={!isProd} />
              {isProd && (
                <OptRowAD label="Simultaneous Post" on={p.sim.on} onToggle={e => setS({ on: e.currentTarget.checked })} color={p.color} last>
                  <Stack gap={4} pt={4}>
                    <Group gap={6} wrap="nowrap">
                      <Text size="xs" c="gray.7">Starts</Text>
                      <NumberInput size="xs" hideControls allowDecimal={false} allowNegative={false} w={48} value={p.sim.offset} onChange={v => setS({ offset: v })} aria-label="Weeks after Production begins" />
                      <Text size="xs" c="gray.7">weeks into Production</Text>
                    </Group>
                    <RowD label="Number these weeks and continue Post's count" last><Sw checked={p.sim.count} onChange={e => setS({ count: e.currentTarget.checked })} /></RowD>
                  </Stack>
                </OptRowAD>
              )}
            </Box>
          </>)}
        </Box>
      </Collapse>
    </Paper>
  )
}
function OptionAD() {
  const [phases, set, setH] = usePhases()
  return <Stack gap={10}>{phases.map(p => <CardAD key={p.key} p={p} set={set} setH={setH} />)}</Stack>
}
function HiatusAD() {
  const [list, set, remove] = useHiatuses()
  return (
    <Stack gap={10}>
      {list.map(h => (
        <Paper key={h.id} withBorder radius="lg" style={{ overflow: 'hidden' }}>
          <HeadAD p={{ key: h.id, name: h.name, color: HIATUS_RED, text: '#fff', range: hRange(h) }} set={(id, v) => set(id, { name: v.name })}
            tags={null} onRemove={() => remove(h.id)} />
          <Box px={12} pt={10} pb={4}>
            <SimpleGrid cols={2} spacing={8}>
              <div><L>Starts</L><DateIn value={h.start} onChange={e => set(h.id, { start: e.currentTarget.value })} /></div>
              <div><L>Weeks</L><NumberInput size="xs" hideControls allowDecimal={false} allowNegative={false} value={h.weeks} onChange={v => set(h.id, { weeks: v })} /></div>
            </SimpleGrid>
            <Box mt={6}>
              <RowD label="Lock in place"><Sw checked={h.locked} onChange={e => set(h.id, { locked: e.currentTarget.checked })} /></RowD>
              <RowD label="Number weeks" last><Sw checked={h.num} onChange={e => set(h.id, { num: e.currentTarget.checked })} /></RowD>
            </Box>
          </Box>
        </Paper>
      ))}
    </Stack>
  )
}

// ---------- the All-phase hiatus card, in each option's style ----------
function HiatusA() {
  const [list, set, remove] = useHiatuses()
  return (
    <Stack gap={10}>
      {list.map(h => (
        <Paper key={h.id} withBorder radius="lg" p={12} style={{ borderLeft: `5px solid ${HIATUS_RED}` }}>
          <Group gap={6} wrap="nowrap"><HName h={h} set={set} /><CloseButton size="sm" aria-label="Remove" onClick={() => remove(h.id)} /></Group>
          <Stack gap={10} mt={6}>
            <Text size="xs" c="gray.6" mt={-4} px={4}>{hRange(h)}</Text>
            <HStartWeeks h={h} set={set} />
            <HTicks h={h} set={set} />
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
function HiatusB() {
  const [list, set, remove] = useHiatuses()
  return (
    <Accordion multiple variant="separated" radius="lg" chevronPosition="right"
      styles={{ item: { background: 'var(--mantine-color-white)', border: '1px solid var(--mantine-color-gray-3)' },
                control: { padding: '6px 10px 6px 8px' }, label: { padding: '4px 0' }, content: { padding: '4px 12px 12px 20px' } }}>
      {list.map(h => (
        <Accordion.Item key={h.id} value={h.id}>
          <Accordion.Control>
            <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
              <Box w={4} h={30} style={{ background: HIATUS_RED, borderRadius: 2, flex: 'none' }} />
              <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                <Group gap={6} wrap="nowrap"><Text size="sm" fw={500} truncate c={h.name ? undefined : 'gray.6'}>{h.name || 'Hiatus'}</Text>{h.locked && <Locked />}</Group>
                <Text size="xs" c="gray.6" truncate>{hShort(h)}</Text>
              </Stack>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap={10}>
              <Group gap={6} wrap="nowrap"><HName h={h} set={set} /><CloseButton size="sm" aria-label="Remove" onClick={() => remove(h.id)} /></Group>
              <HStartWeeks h={h} set={set} />
              <HTicks h={h} set={set} />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
function HiatusRowC({ h, set, remove }) {
  const [more, setMore] = useState(false)
  const changed = !h.locked || h.num   // Lock in place is on by default; Number weeks off
  return (
    <Paper withBorder radius="lg" p={10}>
      <Group gap={8} wrap="nowrap" align="flex-start">
        <Box style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, background: HIATUS_RED, flex: 'none' }} />
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={4} wrap="nowrap">
            <HName h={h} set={set} />
            {h.locked && <Locked />}
            <Tooltip label="More options" withArrow openDelay={400}>
              <Indicator disabled={!changed} size={7} offset={4} color="navy.5">
                <ActionIcon variant={more ? 'light' : 'subtle'} color="gray" size="sm" onClick={() => setMore(m => !m)} aria-label="More options"><ISliders /></ActionIcon>
              </Indicator>
            </Tooltip>
            <CloseButton size="sm" aria-label="Remove" onClick={() => remove(h.id)} />
          </Group>
          <HStartWeeks h={h} set={set} />
          <Text size="xs" c="gray.6">{hRange(h)}</Text>
          <Collapse expanded={more}>
            <Box pt={8} mt={2} style={{ borderTop: '1px dashed var(--mantine-color-gray-3)' }}><HTicks h={h} set={set} stack /></Box>
          </Collapse>
        </Stack>
      </Group>
    </Paper>
  )
}
function HiatusC() {
  const [list, set, remove] = useHiatuses()
  return <Stack gap={8}>{list.map(h => <HiatusRowC key={h.id} h={h} set={set} remove={remove} />)}</Stack>
}
function HiatusD() {
  const [list, set, remove] = useHiatuses()
  return (
    <Stack gap={10}>
      {list.map(h => (
        <Paper key={h.id} withBorder radius="lg" style={{ overflow: 'hidden' }}>
          <Group gap={6} wrap="nowrap" px={10} py={6} style={{ background: HIATUS_RED }}>
            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
              <HName h={h} set={set} styles={{ input: { fontWeight: 600, fontSize: 14, height: 24, minHeight: 24, padding: '0 4px', color: '#fff' } }} />
              <Text size="xs" px={4} c="white" style={{ opacity: .9 }} truncate>{hRange(h)}</Text>
            </Stack>
            <CloseButton size="sm" aria-label="Remove" onClick={() => remove(h.id)} style={{ color: '#fff' }} />
          </Group>
          <Box px={12} pb={4}>
            <RowD label="Starts"><DateIn w={142} value={h.start} onChange={e => set(h.id, { start: e.currentTarget.value })} /></RowD>
            <RowD label="Weeks"><NumberInput size="xs" hideControls w={70} value={h.weeks} onChange={v => set(h.id, { weeks: v })} /></RowD>
            <RowD label="Lock in place"><Sw checked={h.locked} onChange={e => set(h.id, { locked: e.currentTarget.checked })} /></RowD>
            <RowD label="Number weeks" last><Sw checked={h.num} onChange={e => set(h.id, { num: e.currentTarget.checked })} /></RowD>
          </Box>
        </Paper>
      ))}
    </Stack>
  )
}

// ---------- the page ----------
const OPTIONS = [
  { id: 'A+D', name: 'Blend', fresh: true, blurb: "D's coloured head and switch rows for every yes/no; A's two fields side by side, A's tidy Production and Episodic Prep. A hiatus or Sim Post is a switch row that opens its fields.", C: OptionAD, H: HiatusAD },
  { id: 'A', name: 'Tidy card', picked: true, blurb: "Your first pick, with Production refined: when it starts, the shooting order with its total, then Hiatus and Simultaneous Post as matching boxes. Every hiatus uses that box.", C: OptionA, H: HiatusA },
  { id: 'D', parent: true, name: 'Settings list', blurb: 'Label left, control right, one row each, switches for the yes/no settings. The head carries the phase colour and dates.', C: OptionD, H: HiatusD },
  { id: 'B', name: 'Summary rows', blurb: 'One line per phase: colour, name, dates, tags. Click a row to edit it. You can read the whole plan without scrolling.', C: OptionB, H: HiatusB },
  { id: 'C', name: 'Compact + options', blurb: 'Two lines per phase: the name, then start and length. Settings you set once sit behind the sliders button; a dot shows one is changed.', C: OptionC, H: HiatusC },
]

const AddBtn = ({ children }) => (
  <Text size="sm" fw={500} ta="center" mt={12} py={6} style={{ borderRadius: 7, background: 'var(--mantine-primary-color-light)', color: 'var(--mantine-primary-color-light-color)' }}>{children}</Text>
)

export function PhaseCardMockups() {
  return (
    <Box p={24} style={{ minHeight: '100vh', background: 'var(--mantine-color-gray-0)' }}>
      <Title order={2} fz={20} fw={600}>Phases tab: an A + D blend, beside A and D</Title>
      <Text size="sm" c="gray.7" mt={4} maw={900}>
        Same controls in all four: the same six phases and three all-phase hiatuses. The only addition is Hide in waterfall,
        with its Month view only tag (Colour Grading has it on). Episodic Prep wears the same tag, since it is already month
        view only. Everything clicks: carets, rows, ticks, units, the sliders button.
      </Text>
      <div style={{ display: 'flex', gap: 24, marginTop: 20, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 24 }}>
        {OPTIONS.map(({ id, name, blurb, picked, fresh, parent, C: Opt, H: Hia }) => (
          <div key={id} style={{ flex: 'none', width: 360, opacity: (picked || fresh || parent) ? 1 : .55 }}>
            <Group gap={8} align="baseline"><Badge size="lg" radius="sm" variant="filled" color="navy">{id}</Badge><Text fw={600}>{name}</Text>{picked && <Badge size="sm" radius="sm" variant="light" color="navy" style={{ textTransform: 'none' }}>First pick</Badge>}{fresh && <Badge size="sm" radius="sm" variant="light" color="info" style={{ textTransform: 'none' }}>New</Badge>}</Group>
            <Text size="xs" c="gray.7" mt={4} mb={10} style={{ minHeight: 48 }}>{blurb}</Text>
            {/* the sidebar: white, 16px gutters, the Phases heading, as in the app */}
            <Box bg="white" px={16} py={12} style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 10 }}>
              <Text size="xs" fw={600} c="gray.6" tt="uppercase" mb={10} style={{ letterSpacing: '.06em' }}>Phases</Text>
              <Opt />
              <AddBtn>+ Add phase</AddBtn>
            </Box>
            <Box bg="white" px={16} py={12} mt={12} style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 10 }}>
              <Text size="xs" fw={600} c="gray.6" tt="uppercase" mb={10} style={{ letterSpacing: '.06em' }}>All-phase hiatus</Text>
              <Hia />
              <AddBtn>+ Add hiatus period</AddBtn>
              <Text size="xs" fw={500} c="gray.7" ta="center" mt={8}>Reset hiatus bands</Text>
            </Box>
          </div>
        ))}
      </div>
    </Box>
  )
}
