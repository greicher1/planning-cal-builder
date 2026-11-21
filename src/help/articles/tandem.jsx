import { Lead, Ui, To } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>A tandem day is an extra day, after an episode’s shoot days, when a second crew shoots it while the first crew starts the next.</Lead>
    <p>“8 + 1” means eight shoot days plus one tandem day. Set the default in <Ui>Tandem Days</Ui>, beside Shooting Days per
      Episode in Show info, or on the <Ui>Tandem</Ui> card on the Phases tab. The card also gives any episode its own count and
      its own name; the pill reads “Tandem 101” unless you rename it. (You may also hear these called double-ups.) The last
      episode has none unless you give it one.</p>
    <p>In the Month view you can drag a tandem day onto another episode’s days or after wrap. Right-click one to rename it,
      put it back or remove it. Tandem days never change Production’s days, and they are not in the Waterfall or Excel.
      See <To id="production" />.</p>
  </>
}
