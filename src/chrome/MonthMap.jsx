// The phase map above the month view (MONTH-RAIL-PLAN.md; owner, 27 Oct 2026, option 3d+): every month of the
// calendar with the phases drawn over them as named bars. Click a month to go there, click a phase to go to the
// month it starts in, or step with ‹ ›. In the month view only; in the waterfall it renders nothing.
//
// It DRAWS what the engine pushes (`monthMap`, app.js "THE PHASE MAP": monthMapModel's output) and decides nothing:
// which months, which are dimmed, where a bar sits and on which row are all the model's. Its buttons hand the
// action back as data, `data-mvgo="2026-10"` and `data-mvstep="-1|1"`, which the engine catches on document
// (goToMonth, the frozen arrow handler's own range rule). So it holds no month of its own and cannot disagree
// with the month on screen.
//
// ⛔ Rendered by PreviewToolbar INSIDE .view-toggle-row, before .style-bar-host: a sibling between that row and
// #table-wrap would break the pair the contracts there need. buildSavedHtml() empties .view-toggle-row, so the
// map never travels in a shareable copy.
// ⛔ No id on anything here (collectFieldValues), and plain buttons rather than Mantine's, which would add nothing
// the CSS does not and could generate ids.
import { useState, useLayoutEffect, useRef } from 'react'
import { installChrome } from './bridge.js'

// Sizes in px (plan §5, the owner's "slimmer rows"; §12 for the two minimums).
const NAMED_H = 13       // a named row
const THIN_H = 4         // a thin row (R1)
const ROW_GAP = 2
const MONTH_MIN = 36     // a month column's least width (R4, after step 1's measurement)
const BAR_MIN = 8        // a bar's least width, so a one-day phase can be seen and clicked
const LABEL_MIN = 30     // a bar narrower than this keeps its name for the tooltip only

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const monthName = (key) => MONTHS[+key.slice(5, 7) - 1] + ' ' + key.slice(0, 4)
// m/d/yy, the calendar's own short date.
const short = (iso) => +iso.slice(5, 7) + '/' + +iso.slice(8, 10) + '/' + iso.slice(2, 4)
const dayBefore = (iso) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function MonthMap() {
  const [model, setModel] = useState(null)
  const [width, setWidth] = useState(0)
  const scroller = useRef(null)

  useLayoutEffect(() => {
    installChrome({ monthMap: (m) => setModel(m || null) })
  }, [])

  // The scroller's width decides a month's width (and so which bars have room for their name).
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [model === null])

  // A long show scrolls sideways: keep the month on screen in view after every push.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || !model) return
    const on = el.querySelector('.mm-month.on')
    if (!on) return
    const l = on.offsetLeft, r = l + on.offsetWidth
    if (l < el.scrollLeft) el.scrollLeft = l
    else if (r > el.scrollLeft + el.clientWidth) el.scrollLeft = r - el.clientWidth
  }, [model, width])

  if (!model || !model.months.length) return null
  const n = model.months.length
  const monthW = Math.max(MONTH_MIN, width / n)
  const named = model.rows.named, thin = model.rows.thin
  const rowTop = (b) => (b.thin ? named * (NAMED_H + ROW_GAP) + (b.row - named) * (THIN_H + ROW_GAP) : b.row * (NAMED_H + ROW_GAP))
  const bandsH = Math.max(NAMED_H, named * (NAMED_H + ROW_GAP) + thin * (THIN_H + ROW_GAP) - ROW_GAP)
  const at = (v) => (v / n) * 100 + '%'
  const onIdx = model.months.findIndex((m) => m.on)

  return (
    <nav className="month-map" aria-label="Months of the calendar">
      <button type="button" className="mm-step" data-mvstep="-1" disabled={onIdx <= 0}
        aria-label="Previous month" title="Previous month">‹</button>
      <div className="mm-scroll" ref={scroller}>
        <div className="mm-body" style={{ minWidth: n * MONTH_MIN + 'px' }}>
          {onIdx >= 0 && <span className="mm-sel" style={{ left: at(onIdx), width: at(1) }} />}
          <div className="mm-bands" style={{ height: bandsH + 'px' }}>
            {model.months.map((m, i) => (i === 0 ? null :
              <span key={m.key} className={'mm-line' + (m.m === 0 ? ' yr' : '')} style={{ left: at(i) }} />))}
            {model.bands.map((b, i) => {
              const px = (b.to - b.from) * monthW
              const tip = `${b.name}, ${short(b.start)} to ${short(dayBefore(b.end))}. Click to go to ${monthName(b.startMonth)}`
              return (
                <button key={b.key + i} type="button" className={'mm-band' + (b.thin ? ' thin' : '')}
                  data-mvgo={b.startMonth} title={tip} aria-label={tip}
                  style={{ left: at(b.from), width: `max(${BAR_MIN}px, ${at(b.to - b.from)})`, top: rowTop(b) + 'px',
                           background: b.fill, color: b.ink, borderColor: b.ink }}>
                  {!b.thin && px >= LABEL_MIN ? b.name : ''}
                </button>
              )
            })}
          </div>
          <div className="mm-months">
            {model.hiatus.map((h, i) => (
              <span key={'h' + i} className="mm-hiatus" title={`${h.name}, ${short(h.start)} to ${short(dayBefore(h.end))}`}
                style={{ left: at(h.from), width: `max(4px, ${at(h.to - h.from)})` }} />
            ))}
            {model.months.map((m) => (
              <button key={m.key} type="button" data-mvgo={m.key}
                className={'mm-month' + (m.on ? ' on' : '') + (m.edge ? ' edge' : '') + (m.today ? ' today' : '')}
                aria-current={m.on ? 'date' : undefined}
                aria-label={monthName(m.key) + (m.today ? ', this month' : '') + (m.edge ? ', no phases' : '')}
                title={monthName(m.key) + (m.today ? ' (this month)' : '')}>
                <span className="mm-year">{m.year}</span>
                <span className="mm-label">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <button type="button" className="mm-step" data-mvstep="1" disabled={onIdx < 0 || onIdx >= n - 1}
        aria-label="Next month" title="Next month">›</button>
    </nav>
  )
}
