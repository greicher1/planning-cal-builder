import { Lead, Sec, Steps, Step, Shot, Timeline, Info, Ui, Path, More, Keys, Related, ShowMe } from '../parts.jsx'
import prefs from '../shots/hiatus-prefs.webp'

const ROWS = [
  { label: 'Pre-Prep', bars: [{ ph: 'prePrep', text: 'Pre-Prep', at: [[1, 4], [1, 4]] }] },
  { label: 'Production', bars: [
    { ph: 'production', text: 'Prod', at: [[6, 2], [6, 2]] },
    { ph: 'production', text: 'Production', at: [[10, 3], [10, 3]] },
  ] },
  { label: 'Hiatus', bars: [{ hiatus: true, text: 'Hiatus', at: [[8, 2], [8, 2]] }] },
  { label: 'Post', bars: [{ ph: 'post', text: 'Post', at: [[11, 3], [13, 3]] }] },
]

export default function Article() {
  return <>
    <Lead>When you add or change a hiatus (an all-phase one, or a phase’s own), the phases after it move by the same number of weeks, so the gaps between
      phases stay as they were. It is on unless you turn it off.</Lead>
    <Sec title="What it does">
      <Timeline weeks={16} states={['Ripple off', 'Ripple on']} rows={ROWS}
        captions={['Production pauses, but Post stays on its date.',
          'Post is Pushed 2 wks, the length of the hiatus. Pre-Prep, before the hiatus, stays.']} />
      <p><b>Moves:</b> every phase that starts on or after the hiatus, and the notes and unlocked hiatuses after it.
        Like Shift, it counts working weeks, so a phase crossing a locked hiatus moves that much further.</p>
      <p><b>Stays:</b> locked hiatuses, holidays, notes with a date in them, and notes written inside the hiatus.
        Production’s day marks (Off, worked and half days) stay on their dates too, unless the change moves Production itself.</p>
    </Sec>
    <Sec title="When it runs">
      <p>Changing <Ui>Weeks</Ui> moves the phases at once. A start date moves them when you finish it: pick it in the
        calendar, press Enter, or leave the box, so a date half typed never moves anything. A line under the hiatus says
        what moved.</p>
      <p>Changed your mind? <Keys k="Mod+Z" /> takes back your change and its push together.</p>
    </Sec>
    <Sec title="Turn it off">
      <Shot src={prefs} w={265} pins={[[62, 50]]} items={[<><b>Ripple Hiatus Periods</b> · off, a hiatus only pauses the phases running through it.</>]} />
      <p>It lives in <Path>Settings › Preferences › Hiatus</Path> and is kept on this computer, not in the calendar. <ShowMe at=".prefs-card:has(#pref-hiatus-ripple)" tab="settings" sw="Preferences" />{' '}
        Turn it off first when you want to change a hiatus without moving anything else.</p>
    </Sec>
    <Related ids={['hiatus', 'move']} />
  </>
}
