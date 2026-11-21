import { Lead, Ui } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Need a phase the six built-in ones don’t cover? Add your own.</Lead>
    <p>Click <Ui>+ Add phase</Ui> on the Phases tab. Give it a name, a color, a start and a length, like any other phase.
      Phases can overlap: when two or more run in the same week, the Waterfall adds columns so they sit side by side.</p>
  </>
}
