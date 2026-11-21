import { Lead, Ui, Path, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Changes since last save lists, in plain lines, what you’ve changed since you last saved or loaded the calendar. It’s
      handy for telling someone what moved.</Lead>
    <p>Open <Path>File › Changes since last save…</Path>. A line at the top says since when. Each change is one line, such as
      a phase that was pushed or pulled and where it now sits, or a hiatus added. Changes to notes, formatting or settings
      that have no line of their own show as one line saying so.</p>
    <p><Ui>Copy</Ui> puts the lines on your clipboard, one per line, ready to paste into an email. With scenario tabs, it
      lists the tab on screen.</p>
    <p>If the calendar has never been saved or loaded, there’s nothing to compare with yet, and the window says so.</p>
    <Related ids={['save', 'scen', 'compare']} />
  </>
}
