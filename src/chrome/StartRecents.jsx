// The recent calendars on an empty start (audit 2026-11, AUD2-030; default: shown in the empty preview, no reopening of
// the last file by itself, no intake screen). Portalled into the static `.start-recents` host that sits right AFTER
// #table-wrap in main.preview-panel (src/index.html) -- beside the grid, never inside it.
//
// THE LOOK (owner, 16 Nov 2026, version 7 of mockups/start-recents.html, "Build 7, two cards", after asking to "combine
// 2 and 3"): two white cards. The most recent calendar gets its own card ("Pick up where you left off", when it was last
// opened, and Open); the rest follow in a second card, "Other recent calendars", with Load… in its title row, one
// two-line row each (the name, then when it was last opened). With one recent calendar the second card is a "Load
// another calendar…" button; with none, one card says where they will appear, with Load…. The list it replaced (the
// file menu's white box with hairlines, every name ending ".sptcal", Load… under it) read as a form to fill in.
//
// Names drop ".sptcal": every calendar saved since v1.1.0 is one, and eight of them said so eight times. An older
// ".html" calendar keeps its extension, faintly, so the two can still be told apart. The whole name, extension
// included, is the row's title=. (The File menu still shows ".sptcal", deliberately: there it names the open file.)
// "When" is the recents list's own savedAt, which Save and every load set: "Today at 9:40 AM", "Yesterday at 4:15
// PM", then the date.
//
// Output only, like the file menu: the engine decides WHEN the list shows (reflectStartRecents() sets the host's
// `hidden` itself, in the same task as the render) and pushes the rows through the bridge. The input half needs no
// bridge: the last calendar's card and every row carry `data-id`, and each Load… carries `data-action="open"`, which
// the file menu's ONE delegated click handler in the engine matches on (`.start-recents` is in its closest() test,
// `.start-recent-item` in its item test), so a click here takes exactly the path a click in the File menu takes,
// unsaved-work question included.
//
// ⛔ No id on anything, and no input: collectFieldValues() sweeps input/select/textarea[id] into every saved file.
// buildSavedHtml() empties the host in a shareable copy: these are the SENDER's file names.
import { useState, useLayoutEffect, useCallback } from 'react'
import { Button, UnstyledButton } from '@mantine/core'
import { installChrome } from './bridge.js'
import { IconFolder, IconCalendarPlain, IconArrowRight } from './icons.jsx'

// A recent file's name as the list shows it: ".sptcal" dropped, ".html" kept and faint.
function FileName({ name }) {
  const m = /^(.*?)(\.(sptcal|html))$/i.exec(name || '')
  if (!m) return name
  if (m[3].toLowerCase() !== 'html') return m[1]
  return <>{m[1]}<span className="sr-ext">{m[2]}</span></>
}

// When a recent file was last opened or saved, in the user's own clock: "Today at 9:40 AM", "Yesterday at 4:15 PM",
// "Thursday, Nov 12", and with the year once it is another year's. Calendar days, not 24-hour spans, and rounded, so
// a daylight-saving night still counts as one day.
export function whenLabel(ts, now = new Date()) {
  if (!ts || !isFinite(ts)) return ''
  const d = new Date(ts)
  const dayOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((dayOf(now) - dayOf(d)) / 86400000)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (days === 0) return `Today at ${time}`
  if (days === 1) return `Yesterday at ${time}`
  const opts = { weekday: 'long', month: 'short', day: 'numeric' }
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric'
  return d.toLocaleDateString('en-US', opts)
}

function LoadButton({ children = 'Load…' }) {
  // "Load…", per the terminology rule; data-action="open" is the engine contract, as in the File menu.
  return (
    <Button size="xs" radius="md" variant="default" className="start-recent-item sr-load" data-action="open"
            leftSection={<IconFolder className="btn-ic" />}>
      {children}
    </Button>
  )
}

export function StartRecents() {
  const [state, setState] = useState({ items: [] })
  const merge = useCallback((patch) => setState((s) => ({ ...s, ...patch })), [])
  // useLayoutEffect, as Header.jsx: the bridge must be installed before the engine's first push.
  useLayoutEffect(() => { installChrome({ startRecents: merge }) }, [merge])

  const [first, ...rest] = state.items
  const now = new Date()
  const firstWhen = first ? whenLabel(first.savedAt, now) : ''

  return (
    <div className="sr-stack">
      {first && (
        <UnstyledButton className="start-recent-item sr-hero" data-id={first.id} title={first.name}>
          <span className="sr-tile"><IconCalendarPlain /></span>
          <span className="sr-txt">
            <span className="sr-over">Pick up where you left off</span>
            <span className="sr-hero-name"><FileName name={first.name} /></span>
            {firstWhen && <span className="sr-meta">Last opened {firstWhen.charAt(0).toLowerCase() + firstWhen.slice(1)}</span>}
          </span>
          <span className="sr-open">Open <IconArrowRight /></span>
        </UnstyledButton>
      )}
      {rest.length > 0 ? (
        <div className="sr-card">
          <div className="sr-head"><span className="sr-title">Other recent calendars</span><LoadButton /></div>
          {rest.map((f) => (
            <UnstyledButton key={f.id} className="start-recent-item sr-row" data-id={f.id} title={f.name}>
              <span className="sr-tile"><IconCalendarPlain /></span>
              <span className="sr-txt">
                <span className="sr-name"><FileName name={f.name} /></span>
                <span className="sr-meta">{whenLabel(f.savedAt, now)}</span>
              </span>
              <span className="sr-go"><IconArrowRight /></span>
            </UnstyledButton>
          ))}
        </div>
      ) : first ? (
        <div className="sr-foot"><LoadButton>Load another calendar…</LoadButton></div>
      ) : (
        <div className="sr-card">
          <div className="sr-head"><span className="sr-title">Recent calendars</span><LoadButton /></div>
          <div className="sr-empty">Calendars you save or load will show up here.</div>
        </div>
      )}
    </div>
  )
}
