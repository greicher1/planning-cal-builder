import { Lead, Ui } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>You can leave a phase out of the Waterfall while keeping it in the plan.</Lead>
    <p>Click the eye in the top corner of a phase’s card. The phase disappears from the Waterfall, its Excel file and its PDF.
      It still shows in the Month view, and its dates still count everywhere else, so nothing else moves.</p>
    <p>The eye in the card’s corner turns into a blue struck-through eye (hover it for <Ui>Month view only</Ui>). Click it to
      put the phase back in the Waterfall. Production can’t be hidden.</p>
  </>
}
