import { Lead, Path, Ui, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Three settings change how the Month view looks and reads, in <Path>Settings › Preferences › Month view</Path>.</Lead>
    <p><Ui>Size</Ui> is Standard, Large or Extra Large, for the phase bars, hiatus bands and notes together.{' '}
      <Ui>Number Production Days</Ui> writes “Day 1”, “Day 2” and so on on every shoot day. The grey label inside
      Production’s bars (its week, block or episodes) each have a switch, such as <Ui>Add Production Week Label in Month View</Ui>. Only the ones the bars can carry are shown.</p>
    <p>Size and numbering are saved with the calendar. The grey labels are a setting of this computer. All three show in
      the month PDF.</p>
    <Related ids={['month']} />
  </>
}
