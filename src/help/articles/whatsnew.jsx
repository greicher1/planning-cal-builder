import { Lead, Sec } from '../parts.jsx'
import { WHATS_NEW } from '../../whats-new.js'

// Two releases on one day (ids ending -2) share a heading, so their items are listed under it once.
const GROUPS = []
for (const e of WHATS_NEW) {
  const title = e.version ? 'Version ' + e.version + ' · ' + e.date : e.date
  const last = GROUPS[GROUPS.length - 1]
  if (last && last.title === title) last.items.push(...e.items)
  else GROUPS.push({ title, items: [...e.items] })
}

// Every release's What's New list (src/whats-new.js), newest first: the window shows them once, this keeps them.
export default function Article() {
  return <>
    <Lead>What changed in each update that you’d notice, newest first.</Lead>
    {GROUPS.map(g => (
      <Sec key={g.title} title={g.title}>
        <ul className="hp-list">
          {g.items.map((it, i) => <li key={i}><b>{it.title}.</b> {it.text}</li>)}
        </ul>
      </Sec>
    ))}
  </>
}
