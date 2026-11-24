import { Lead, Ui } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Simultaneous Post marks weeks where post runs alongside the shoot.</Lead>
    <p>Switch on <Ui>Simultaneous Post</Ui> at the bottom of the Production card. The offset box sets how many
      calendar weeks after Production begins the flag starts, and a hiatus inside that stretch still counts as weeks. To call it something else, type a name in
      the box at the top of its settings; the new name shows in both views and every export.</p>
    <p>Switch on <Ui>Number these weeks and continue Post’s count</Ui> to have them read “Simultaneous Post wk 1”, “wk 2” and Post
      carry on from the next number. Left off, they just read “Simultaneous Post” and Post counts from wk 1.</p>
  </>
}
