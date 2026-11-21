// parts.jsx -- the building blocks Help's articles are written in (README.md beside this file shows each in use).
//
// Everything here is plain presentation: no state is saved, nothing reaches a calendar file, and nothing touches the
// calendar itself except <ShowMe>, which closes Help and draws a ring around a control (showme.js).
import { createContext, useContext, useState } from 'react'
import { KEYS_MAC } from '../chrome/keys.js'
import { showMe } from './showme.js'
import { ARTICLE } from './toc.js'

// The window hands its navigation down: go(id) opens an article.
export const HelpNav = createContext({ go: () => {} })

// ---- text ---------------------------------------------------------------------------------------------------------
export function Lead({ children }) { return <p className="hp-lead">{children}</p> }

// A section of an article. Its title is a heading in "On this page".
export function Sec({ title, children }) {
  return <section className="hp-sec">{title && <h2>{title}</h2>}{children}</section>
}

// A control's name, drawn like the control: <Ui>Build Around</Ui>.
export function Ui({ children }) { return <span className="hp-ui">{children}</span> }

// Where a setting lives: <Path>Settings › Preferences › Hiatus</Path>. Split on ›.
export function Path({ children }) {
  const parts = String(children).split('›').map(s => s.trim())
  return <span className="hp-path">{parts.map((p, i) => <span key={i}>{i > 0 && <i>›</i>}{p}</span>)}</span>
}

// Keys for THIS computer, one cap each: <Keys k="Mod+Shift+Z" /> is ⇧ ⌘ Z on a Mac, Ctrl Shift Z elsewhere.
// Same spec as keys.js (Mod = ⌘ / Ctrl). A last part of "click" reads as a word: <Keys k="Mod+click" />.
const MAC_GLYPH = { Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Mod: '⌘' }
const MAC_ORDER = ['Ctrl', 'Alt', 'Shift', 'Mod']
const PC_ORDER = ['Mod', 'Ctrl', 'Alt', 'Shift']
const ARROWS = { Left: '←', Right: '→', Up: '↑', Down: '↓' }
export function capsFor(spec, mac = KEYS_MAC) {
  const parts = String(spec).split('+')
  const key = parts.pop()
  const mods = new Set(parts)
  const caps = mac
    ? MAC_ORDER.filter(m => mods.has(m)).map(m => MAC_GLYPH[m])
    : PC_ORDER.filter(m => mods.has(m)).map(m => (m === 'Mod' ? 'Ctrl' : m)).filter((m, i, a) => a.indexOf(m) === i)
  return { caps, key: ARROWS[key] || key }
}
export function Keys({ k }) {
  const { caps, key } = capsFor(k)
  return (
    <span className="hp-keys">
      {caps.map((c, i) => <kbd key={i}>{c}</kbd>)}
      {key === 'click' ? <span className="hp-click">-click</span> : <kbd>{key}</kbd>}
    </span>
  )
}

// ---- lists and boxes ----------------------------------------------------------------------------------------------
// <Steps><Step t="Click Shift ▾.">The box opens.</Step>...</Steps>
export function Steps({ children }) { return <ol className="hp-steps">{children}</ol> }
export function Step({ t, children }) { return <li><b>{t}</b>{children ? <span> {children}</span> : null}</li> }

function Callout({ kind, mark, title, children }) {
  return (
    <div className={'hp-callout ' + kind}>
      <span className="hp-ci" aria-hidden="true">{mark}</span>
      <div>{title && <b className="hp-ct">{title}</b>}{children}</div>
    </div>
  )
}
export const Tip = ({ title = 'Tip', children }) => <Callout kind="tip" mark="✓" title={title}>{children}</Callout>
export const Info = ({ title = 'Good to know', children }) => <Callout kind="info" mark="i" title={title}>{children}</Callout>
export const Careful = ({ title = 'Careful', children }) => <Callout kind="warn" mark="!" title={title}>{children}</Callout>

// Edge cases, folded: <More title="why the wrap can move">...</More>
export function More({ title, children }) {
  return <details className="hp-more"><summary>More detail{title ? ': ' + title : ''}</summary><div>{children}</div></details>
}

// <Table head={['', 'Shift', 'Build Around']} rows={[['Gaps', 'Kept', 'Closed'], ...]} />
export function Table({ head, rows }) {
  return (
    <table className="hp-table">
      {head && <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>}
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  )
}

// ---- links --------------------------------------------------------------------------------------------------------
// An inline link to another article: <To id="shift">Shift in detail</To>.
export function To({ id, children }) {
  const { go } = useContext(HelpNav)
  return <button type="button" className="hp-to" onClick={() => go(id)}>{children || (ARTICLE[id] && ARTICLE[id].title)}</button>
}

// Cards at the end of an article.
export function Related({ ids }) {
  const { go } = useContext(HelpNav)
  const list = ids.filter(id => ARTICLE[id])
  if (!list.length) return null
  return (
    <section className="hp-sec hp-related">
      <h2>Related</h2>
      <div className="hp-rel">
        {list.map(id => (
          <button type="button" key={id} onClick={() => go(id)}>{ARTICLE[id].title}<small>{ARTICLE[id].groupName}</small></button>
        ))}
      </div>
    </section>
  )
}

// Closes Help and rings the control: <ShowMe at="#pop-shift-btn" />. `view` ('sheet' | 'month') and `tab` ('show' |
// 'phases' | 'settings') switch there first. ⛔ `at` must stay a selector the app keeps: the help leg checks every one.
export function ShowMe({ at, view, tab, children = 'Show me' }) {
  return <button type="button" className="hp-showme" data-showme={at} onClick={() => showMe({ at, view, tab })}>{children}</button>
}

// ---- pictures -----------------------------------------------------------------------------------------------------
// A screenshot with numbered dots and the list that explains them. Dots are [left %, top %] of the picture.
//   <Shot src={img} w={380} pins={[[13, 27], [50, 68]]} items={[<>...</>, <>...</>]} />
// `w` is the width it is drawn at (a crop shot about as wide as it was taken); leave it out for a whole-window shot,
// which fills the column with the list below it.
export function Shot({ src, w, pins = [], items = [], caption }) {
  const [hot, setHot] = useState(null)
  const wide = !w
  return (
    <div className={'hp-shot' + (wide ? ' wide' : '')} onMouseLeave={() => setHot(null)}>
      <figure style={w ? { width: w } : undefined}>
        <div className="hp-frame">
          <img src={src} alt="" draggable="false" />
          {pins.map((p, i) => (
            <b key={i} className={'hp-pin' + (hot === i ? ' hot' : '')} style={{ left: p[0] + '%', top: p[1] + '%' }}
              onMouseEnter={() => setHot(i)}>{i + 1}</b>
          ))}
        </div>
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
      {items.length > 0 && (
        <ol className="hp-legend">
          {items.map((it, i) => (
            <li key={i} className={hot === i ? 'hot' : ''} onMouseEnter={() => setHot(i)}><span>{i + 1}</span><div>{it}</div></li>
          ))}
        </ol>
      )}
    </div>
  )
}

// A small timeline in the phase colors, with buttons that play a change.
//   <Timeline weeks={22} states={['Before', 'After']} captions={[..., ...]}
//     rows={[{ label: 'Post', bars: [{ ph: 'post', text: 'Post', at: [[17, 3], [19, 3]] }] }]} />
// `at` is [first week, length] per state. `hiatus: true` draws a hatched band; `pinIn: n` shows a pin in state n.
const PHASE_INK = {
  writersRoom: ['#FFF2CC', '#7A6215'], prePrep: ['#DAE3F3', '#203864'], prodPrep: ['#D6DCE5', '#222A35'],
  production: ['#E2F0D9', '#375623'], post: ['#FBE5D6', '#8A4A1F'], localization: ['#EDEDED', '#3A3A3A'],
}
export function Timeline({ weeks, states, rows, captions = [] }) {
  const [st, setSt] = useState(0)
  const pos = ([s, w]) => ({ left: ((s - 1) / weeks) * 100 + '%', width: (w / weeks) * 100 + '%' })
  const ticks = []
  for (let i = 1; i <= weeks; i += 4) ticks.push(i)
  return (
    <div className="hp-tl">
      <div className="hp-tl-ctl" role="group">
        {states.map((s, i) => (
          <button type="button" key={i} className={i === st ? 'on' : ''} onClick={() => setSt(i)}>{s}</button>
        ))}
      </div>
      <div className="hp-tl-grid" style={{ '--weeks': weeks }}>
        {rows.map((r, ri) => (
          <div className="hp-tl-row" key={ri}>
            <div className="hp-tl-l">{r.label}</div>
            <div className="hp-tl-track">
              {r.bars.map((b, bi) => {
                const now = b.at[st] || b.at[0]
                const moved = st > 0 && (now[0] !== b.at[0][0] || now[1] !== b.at[0][1])
                const ink = PHASE_INK[b.ph] || ['#EEE', '#333']
                return [
                  <div key={bi + 'g'} className="hp-tl-ghost" style={{ ...pos(b.at[0]), opacity: moved ? 1 : 0 }} />,
                  <div key={bi} className={'hp-tl-bar' + (b.hiatus ? ' hiatus' : '') + (b.pinIn === st ? ' pin' : '')}
                    style={{ ...pos(now), background: b.hiatus ? undefined : ink[0], color: ink[1], boxShadow: `inset 0 0 0 1px ${ink[1]}33` }}>
                    {b.text}
                  </div>,
                ]
              })}
            </div>
          </div>
        ))}
        <div className="hp-tl-row"><div /><div className="hp-tl-ax">{ticks.map(t => <span key={t} style={{ left: ((t - 0.5) / weeks) * 100 + '%' }}>wk {t}</span>)}</div></div>
      </div>
      {captions[st] && <div className="hp-tl-cap">{captions[st]}</div>}
    </div>
  )
}
