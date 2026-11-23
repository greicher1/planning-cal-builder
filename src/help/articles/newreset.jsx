import { Lead, Ui, Path, Keys, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>New starts over. The narrower resets clear just one thing and leave the rest of the calendar alone.</Lead>
    <p><Ui>New</Ui> clears everything and starts a blank calendar, so the next Save asks where to put it instead of writing
      over the one you had open. It asks first only when you have unsaved changes, and it can’t be undone: it starts a fresh
      Undo history.</p>
    <p>The narrower resets:</p>
    <ul>
      <li><b>Waterfall:</b> <Ui>Reset Waterfall Notes</Ui> and <Ui>Reset Columns</Ui>.</li>
      <li><b>Month view:</b> <Ui>Reset Month Notes</Ui> and <Ui>Reset Bar Order</Ui>.</li>
      <li><b>Holidays:</b> <Ui>Reset holidays</Ui> in <Path>Settings › Region</Path>.</li>
      <li><b>Header:</b> <Ui>Auto</Ui> in the Header menu.</li>
    </ul>
    <p>The two notes resets and Reset holidays ask first (the notes resets say how many notes they clear, and Reset Waterfall
      Notes clears them in the Month view too). Reset Columns, Reset Bar Order and the Header’s Auto switch just do it. Each
      is one Undo step, so <Keys k="Mod+Z" /> brings it back.</p>
    <Related ids={['save', 'region', 'hdrmodes']} />
  </>
}
