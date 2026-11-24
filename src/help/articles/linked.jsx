import { Lead, Sec } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>A new note stays with its phase, not with a calendar week, so it moves whenever the phase does.</Lead>
    <Sec>
      <p>A note you write in an empty Notes cell, add with the Month view’s +, or paste starts out staying with the first phase
        running there (when that phase’s week holds no note yet; otherwise it stays on the week), and you won’t be asked (pasted notes link with no editor open). In the note’s editor, <b>Stays with</b>{' '}
        shows it, like “Production wk 2”. The note then follows Production through Shift, Build Around, the ▲ ▼ arrows, a new start date or a hiatus, and stays on its second week,
        on the same weekday. In the Month view, a note on a shoot day can stay with that shoot day: “Production · Day 7”.</p>
      <p>Pick <b>Week of …</b> in <b>Stays with</b> and the note stays where it is instead. A note you wrote before this
        default keeps the home it had. A note whose phase gets shorter waits on the phase’s last week.</p>
    </Sec>
  </>
}
