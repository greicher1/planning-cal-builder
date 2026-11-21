import { Lead, Sec, Shot, Ui, Related } from '../parts.jsx'
import pic from '../shots/wf-grid.webp'

export default function Article() {
  return <>
    <Lead>The waterfall is the whole production on one page: one row for every week, with each phase in its own color.</Lead>
    <Sec title="How it is laid out">
      <Shot src={pic} pins={[[8.6, 3.45], [26.5, 3.45], [53, 3.45], [80.3, 3.45], [82.3, 7.1]]}
        items={[
          <><b>Date</b> · the Monday that starts each week.</>,
          <><b>A year’s columns</b> · the weeks of one year, with their phases.</>,
          <><b>Notes</b> · milestones, holidays and anything you type.</>,
          <><b>The next year</b> sits beside the first, with its own Date and Notes, so a long show fits on one page.</>,
          <><b>A phase cell</b> · colored, and numbered by week, such as “Post wk 7”.</>,
        ]} />
    </Sec>
    <Sec title="When phases overlap">
      <p>Phases that run in the same week sit side by side, each in a column of its own. With <Ui>Fill Gaps</Ui> off in the
        toolbar, every phase keeps its own column for its whole run, so a phase running alone can leave the column beside it
        empty. Switch Fill Gaps on to let phases widen into the empty columns beside them.</p>
      <p>When Simultaneous Post is on, it gets a column beside Production, so you can see post starting while the shoot is
        still going.</p>
      <p>If you have moved columns around and want the automatic layout back, press <Ui>Reset Columns</Ui> at the top of the window.</p>
    </Sec>
    <Related ids={['sizing', 'headings', 'keys']} />
  </>
}
