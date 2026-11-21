import { Lead, Sec } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>A note can stay with a phase instead of a calendar week, so it moves whenever the phase does.</Lead>
    <Sec>
      <p>In a note’s editor, set <b>Stays with</b> to a week of a phase, like “Production wk 2”. The note then follows
        Production through Shift, Build Around, the ▲ ▼ arrows, a new start date or a hiatus, and stays on its second week,
        on the same weekday. In the Month view, a note on a shoot day can stay with that shoot day: “Production · Day 7”.</p>
      <p>Leave it on the week and the note stays where it is. A note whose phase gets shorter waits on the phase’s last week.</p>
    </Sec>
  </>
}
