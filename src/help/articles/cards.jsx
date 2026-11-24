import { Lead, Sec, Shot, Ui, To, Related } from '../parts.jsx'
import phaseCard from '../shots/phase-card.webp'

export default function Article() {
  return <>
    <Lead>Each phase card on the Phases tab sets where a phase starts and how long it runs. It is also where you add your own
      phases, hide one from the Waterfall, rename it and color it.</Lead>
    <Sec title="Start and length">
      <p>The <Ui>Starts</Ui> / <Ui>Ends</Ui> switch says which date you type, and <Ui>Weeks</Ui> / <Ui>Dates</Ui> says whether you give
        a length or an end date. In a phase counted in weeks, a start date you pick snaps to the Monday of its week (the card’s
        <Ui> Snap to Monday</Ui> switch, on to begin with). A phase counted in days starts on its first working day, and a Dates
        phase starts and ends exactly as typed. An end date lands on the Friday of its week; Production’s Ends takes the exact
        wrap day.</p>
      <Shot src={phaseCard} w={265} pins={[[55.5, 10], [28, 30.5], [78, 42], [47.5, 55.8], [60.8, 80], [76.4, 90.2]]}
        items={[
          <><b>Name and color</b> · click either to change it.</>,
          <><b>Starts</b> · its first week. Switch it to <b>Ends</b> to set the last week instead.</>,
          <><b>▲ ▼</b> · move just this phase a week earlier or later.</>,
          <><b>Length</b> · in weeks, or switch to dates.</>,
          <><b>Start after Writer’s Rm</b> · starts it the week after the phase before.</>,
          <><b>Hiatus</b> · pause just this phase.</>,
        ]} />
      <p><Ui>Start after previous phase</Ui> puts a phase right after the one before it. Its backwards twin, <Ui>Finish before</Ui>{' '}
        the next phase, shows on a card that sits before a phase set on Ends, or on an empty card before a dated phase: it puts
        the phase’s last working week just before that phase. To move one phase a week, see <To id="move" />.</p>
      <p>Click a phase’s name to rename it, and the color square beside it to pick a color. Both carry through every view and
        export.</p>
    </Sec>
    <Sec title="Add your own phase">
      <p>Need a phase the six built-in ones don’t cover? Click <Ui>+ Add phase</Ui> on the Phases tab. Give it a name, a color, a
        start and a length, like any other phase. Phases can overlap: when two or more run in the same week, the Waterfall adds
        columns so they sit side by side.</p>
    </Sec>
    <Sec title="Hide a phase in the Waterfall">
      <p>Click the eye in the top corner of a phase’s card. The phase disappears from the Waterfall, its Excel file and its PDF.
        It still shows in the Month view, and its dates still count everywhere else, so nothing else moves.</p>
      <p>The eye turns into a blue struck-through eye (hover it for <Ui>Month view only</Ui>). Click it to put the phase back in
        the Waterfall. Production can’t be hidden.</p>
    </Sec>
    <Related ids={['production', 'move', 'hiatus']} />
  </>
}
