// The calendar zoom (owner, 20 Oct 2026: "a zoom in/zoom out slider in the bottom right corner of
// both the waterfall view and month view"). It sits just left of the help button, in both views, and
// only while there is a calendar to zoom.
//
// The VALUE is the engine's (app.js, "CALENDAR ZOOM"): one zoom per view, applied to #table-wrap
// before the frozen render runs, which only the engine can time. This component shows what the
// engine pushes through the bridge (`calZoom`) and hands each change back as a DOM event, the way
// DatePop hands back a date. So it holds no zoom of its own and cannot disagree with the grid.
//
// ⛔ No id on anything here. collectFieldValues() sweeps every input[id] in the document into the
// saved file and the undo stack, and a zoom is neither. Mantine's Slider renders no input at all
// without a `name` (its hidden input is keyed by name, and has no id), and nothing else here is one.
//
// Rendered straight into #react-root (main.jsx), like DatePop: a direct child of <body> before
// #print-root, so both print paths hide it with no extra work, and buildSavedHtml() empties it.
import { useState, useLayoutEffect } from 'react'
import { ActionIcon, Slider, UnstyledButton } from '@mantine/core'
import { installChrome } from './bridge.js'
import { IconMinus, IconPlus } from './icons.jsx'

// The engine clamps to the same range (CAL_ZOOM_MIN / CAL_ZOOM_MAX); these only lay out the track.
const MIN = 0.25
const MAX = 2
// Two straight halves with 100% in the MIDDLE, the way a spreadsheet's zoom slider reads: the left
// half runs 25-100%, the right half 100-200%. A single straight track would put 100% two-fifths along.
const toPos = (z) => (z <= 1 ? ((z - MIN) / (1 - MIN)) * 50 : 50 + ((z - 1) / (MAX - 1)) * 50)
const fromPos = (p) => (p <= 50 ? MIN + (p / 50) * (1 - MIN) : 1 + ((p - 50) / 50) * (MAX - 1))
// Whole percents, and a small catch at 100% so the thumb can be put back on it by hand.
const tidy = (z) => (Math.abs(z - 1) < 0.03 ? 1 : Math.round(z * 100) / 100)

function send(zoom) {
  document.dispatchEvent(new CustomEvent('sptcal-zoom', { detail: { zoom } }))
}

export function ZoomControl() {
  const [st, setSt] = useState({ view: 'sheet', zoom: 1, visible: false })

  useLayoutEffect(() => {
    installChrome({ calZoom: (s) => setSt((p) => ({ ...p, ...s })) })
  }, [])

  if (!st.visible) return null
  const pct = Math.round(st.zoom * 100)
  // The buttons step to the next whole ten, so 105% goes to 110% or 100%, never 115% or 95%.
  const out = () => send(Math.max(MIN, (Math.ceil(pct / 10) - 1) / 10))
  const inn = () => send(Math.min(MAX, (Math.floor(pct / 10) + 1) / 10))
  // Until 22 Oct 2026 this also said the waterfall could be resized only at 100%; its handles now work
  // at every zoom (app.js, "CALENDAR ZOOM", frozen edits Z1-Z6).
  const resetTitle = pct === 100 ? 'Zoom: 100%' : 'Back to 100%'

  return (
    <div className="cal-zoom" role="group" aria-label="Calendar zoom">
      <ActionIcon variant="subtle" color="gray" size="sm" radius="xl" onClick={out}
        disabled={pct <= MIN * 100} aria-label="Zoom out" title="Zoom out">
        <IconMinus width={12} height={12} />
      </ActionIcon>
      <Slider className="cal-zoom-slider" min={0} max={100} step={0.5} size="xs" color="dark"
        value={toPos(st.zoom)} onChange={(p) => send(tidy(fromPos(p)))}
        label={null} marks={[{ value: 50 }]}
        thumbLabel="Calendar zoom" thumbValueText={(p) => Math.round(tidy(fromPos(p)) * 100) + '%'} />
      <ActionIcon variant="subtle" color="gray" size="sm" radius="xl" onClick={inn}
        disabled={pct >= MAX * 100} aria-label="Zoom in" title="Zoom in">
        <IconPlus width={12} height={12} />
      </ActionIcon>
      <UnstyledButton className="cal-zoom-pct" onClick={() => send(1)} title={resetTitle}>
        {pct}%
      </UnstyledButton>
    </div>
  )
}
