import { Lead, Sec, Keys } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>In the Month view, drag a phase’s bar to move its dates.</Lead>
    <Sec>
      <p>Drag the middle of a bar. A copy follows the pointer while the calendar underneath shows where it will land, and{' '}
        <Keys k="Mod+Z" /> takes the whole drag back. Drag a bar’s end instead to change where it starts or ends: the other end stays put. Double-click a bar to open its
        phase’s card on the Phases tab.</p>
    </Sec>
  </>
}
