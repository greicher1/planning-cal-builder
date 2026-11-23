import { Lead, Ui, To } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Each phase card on the Phases tab sets where a phase starts and how long it runs.</Lead>
    <p>The <Ui>Starts</Ui> / <Ui>Ends</Ui> switch says which date you type, and <Ui>Weeks</Ui> / <Ui>Dates</Ui> says whether you give
      a length or an end date. In a phase counted in weeks, a start date you pick snaps to the Monday of its week (the card’s
      <Ui> Snap to Monday</Ui> switch, on to begin with). A phase counted in days starts on its first working day, and a Dates
      phase starts and ends exactly as typed. An end date lands on the Friday of its week; Production’s Ends takes the exact wrap day. <Ui>Start after previous phase</Ui> puts a
      phase right after the one before it. Its backwards twin, <Ui>Finish before</Ui> the next phase, shows on a card that sits
      before a phase set on Ends, or on an empty card before a dated phase: it puts the phase’s last working week just before
      that phase.</p>
    <p>Click a phase’s name to rename it, and the color square beside it to pick a color. Both carry through every view and export.
      To move one phase a week, see <To id="nudge" />.</p>
  </>
}
