import { Lead, Sec, Steps, Step, Shot, Ui, Info, Related } from '../parts.jsx'
import pic from '../shots/heading-editor.webp'

export default function Article() {
  return <>
    <Lead>The headings above the waterfall, Date, a year and Notes, can be renamed. Use your own words, or one heading over
      several columns.</Lead>
    <Sec title="Rename a heading">
      <Steps>
        <Step t="Double-click a heading.">A small editor opens under it.</Step>
        <Step t="Type your own.">Press Enter to save, or Esc to cancel.</Step>
      </Steps>
      <Shot src={pic} w={284} pins={[[82.7, 35.4], [37, 43.8], [62.5, 43.8], [90.1, 43.5], [71.3, 58.7]]}
        items={[
          <><b>The heading</b> · type your own words.</>,
          <><b>← Merge</b> · one heading over this column and the one on its left.</>,
          <><b>Split</b> · gives each column under a merged heading its own again.</>,
          <><b>Merge →</b> · the same, with the column on its right.</>,
          <><b>Reset</b> · puts the heading back the way it was.</>,
        ]} />
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
