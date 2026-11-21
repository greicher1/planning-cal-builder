import { Lead, Sec, Shot, Table, Info, Tip, More, Ui, ShowMe, Related } from '../parts.jsx'
import shiftPanel from '../shots/shift-panel.webp'

export default function Article() {
  return <>
    <Lead>Shift moves phases by a number of weeks, or puts one phase’s start or end on a date. The phases that move keep
      the gaps between them.</Lead>
    <Sec title="The quick way">
      <p><Ui>← 1 wk</Ui> and <Ui>1 wk →</Ui> move the whole calendar one week. <ShowMe at="#shift-group" /></p>
    </Sec>
    <Sec title="Choose what moves">
      <p>Click <Ui>Shift ▾</Ui> for the box. It’s a list of your phases, in the order they start, with a tick on each.</p>
      <Shot src={shiftPanel} w={381} pins={[[7, 27], [7, 38.3], [44, 49.5], [50, 68.5]]}
        items={[
          <><b>The top box</b> ticks every phase, or clears them all.</>,
          <><b>A phase’s box</b> · a ticked phase Moves, an unticked one Stays. Press on a row and drag to tick or clear a run.</>,
          <><b>Click a row</b>, anywhere but its box, to choose it. Its tick doesn’t change.</>,
          <><b>Prior to / After</b> · ticks the chosen phase and every phase above or below it, in place of the ticks you had.</>,
        ]} />
    </Sec>
    <Sec title="Say how far">
      <Table rows={[
        ['By weeks', <>Type a number, then press <Ui>Earlier</Ui> or <Ui>Later</Ui>.</>],
        ['To a date', <>Pick the phase that lands, <Ui>starts on</Ui> or <Ui>ends by</Ui>, and the date. The ticked phases move with it.</>],
      ]} />
      <Info title="Ends by never overshoots">Starts on lands exactly on the week you pick. Ends by lands on or before your
        date, because Shift moves whole weeks. With every phase ticked, To a date also offers <b>Whole schedule</b>: use
        it with ends by for a delivery deadline.</Info>
    </Sec>
    <Sec title="Two common moves">
      <Table rows={[
        ['The shoot slipped, but prep is booked', <>Click Production, press <Ui>After Production</Ui>, then <Ui>Later</Ui>. Prep stays; the gap before the shoot grows.</>],
        ['Delivery is fixed, but the shoot starts earlier', <>Click Production, press <Ui>Prior to Production</Ui>, then <Ui>Earlier</Ui>. Post stays.</>],
      ]} />
      <Tip>A Writer’s Room that runs into Pre-Prep sits above it in the list, so <Ui>After Pre-Prep</Ui> leaves it behind.
        Tick it too if it should come along.</Tip>
      <More title="notes and hiatuses">Notes inside a ticked phase’s weeks move with it. Holidays, notes with a date and
        locked hiatuses stay put; a phase’s own hiatus always goes with it. A phase that crosses a locked hiatus moves that
        hiatus’s length further, so its gaps are kept.</More>
      <More title="keeping the box open">The box closes when you click outside it. Drag it by its grey top bar to a spot of
        your own and it stays open while you work, until you close it with ×, its button or Esc.</More>
    </Sec>
    <Related ids={['move', 'build', 'stays']} />
  </>
}
