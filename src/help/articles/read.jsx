import { Lead, Sec, Shot, Ui, Related } from '../parts.jsx'
import pic from '../shots/app-waterfall.webp'

export default function Article() {
  return <>
    <Lead>The waterfall is the whole production on one page: one row for every week, with each phase in its own color.</Lead>
    <Sec title="How it is laid out">
      <Shot src={pic} pins={[[21, 24.2], [30.5, 24.2], [39.5, 24.2], [55, 24.2], [31.5, 26.8]]}
        items={[
          <><b>Date</b> · the Monday that starts each week.</>,
          <><b>A year’s columns</b> · the weeks of one year, with their phases.</>,
          <><b>Notes</b> · milestones, holidays and anything you type.</>,
          <><b>The next year</b> sits beside the first, with its own Date and Notes, so a long show fits on one page.</>,
          <><b>A phase cell</b> · colored, and numbered by week, such as “Production wk 3”.</>,
        ]} />
    </Sec>
    <Sec title="When phases overlap">
      <p>In a week where two phases run at once they sit side by side and share the width evenly: two get half each, three
        get a third. A phase running on its own fills the width.</p>
      <p>When Simultaneous Post is on, it gets a column beside Production, so you can see post starting while the shoot is
        still going.</p>
      <p>If you have moved columns around and want the automatic layout back, press <Ui>Reset Columns</Ui> at the top of the window.</p>
    </Sec>
    <Related ids={['sizing', 'headings', 'keys']} />
  </>
}
