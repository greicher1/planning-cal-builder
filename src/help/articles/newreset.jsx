import { Lead, Ui, Path, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>New starts over. The narrower resets clear just one thing and leave the rest of the calendar alone.</Lead>
    <p><Ui>New</Ui> clears everything and starts a new file, so the next Save asks where to put it instead of writing over
      the one you had open.</p>
    <p>The narrower resets:</p>
    <ul>
      <li><b>Waterfall:</b> <Ui>Reset Waterfall Notes</Ui> and <Ui>Reset Columns</Ui>.</li>
      <li><b>Month view:</b> <Ui>Reset Month Notes</Ui> and <Ui>Reset Bar Order</Ui>.</li>
      <li><b>Holidays:</b> <Ui>Reset holidays</Ui> in <Path>Settings › Region</Path>.</li>
      <li><b>Header:</b> <Ui>Auto</Ui> in the Header menu.</li>
    </ul>
    <p>Each one asks first, and each is a single undo.</p>
    <Related ids={['save', 'regiontab', 'hdrmodes']} />
  </>
}
