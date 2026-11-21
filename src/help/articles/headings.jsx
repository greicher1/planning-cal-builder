import { Lead, Sec, Steps, Step, Ui, Info, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>The headings above the waterfall, Date, a year and Notes, can be renamed. Use your own words, or one heading over
      several columns.</Lead>
    <Sec title="Rename a heading">
      <Steps>
        <Step t="Double-click a heading.">A small editor opens under it.</Step>
        <Step t="Type your own.">Press Enter to save, or Esc to cancel.</Step>
      </Steps>
      <p>The editor has buttons to <Ui>← Merge</Ui> or <Ui>Merge →</Ui> a heading with the one beside it, so one heading
        covers both columns, and <Ui>Split</Ui> to give each column under it a heading of its own. <Ui>Reset</Ui> puts the
        heading back to the way it was.</p>
    </Sec>
    <Sec title="What to know">
      <Info title="Headings never change the shape">A heading never widens a column. A long one shrinks to fit. The Excel file
        and the PDF show the same headings.</Info>
      <p>When the columns are rearranged (Reset Columns, or Update layout), each heading you typed moves with the phase
        under it. Only if two headings you typed end up over one column does one have to go. A line above the calendar says
        which, and Undo brings it back.</p>
    </Sec>
    <Related ids={['sizing', 'read']} />
  </>
}
