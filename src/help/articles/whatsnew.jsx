import { Lead, Sec } from '../parts.jsx'
import { WHATS_NEW } from '../../whats-new.js'

// Every release's What's New list (src/whats-new.js), newest first: the window shows them once, this keeps them.
export default function Article() {
  return <>
    <Lead>What changed in each update that you’d notice, newest first.</Lead>
    {WHATS_NEW.map(e => (
      <Sec key={e.id} title={e.version ? 'Version ' + e.version + ' · ' + e.date : e.date}>
        <ul className="hp-list">
          {e.items.map((it, i) => <li key={i}><b>{it.title}.</b> {it.text}</li>)}
        </ul>
      </Sec>
    ))}
  </>
}
