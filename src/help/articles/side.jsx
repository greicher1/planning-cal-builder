import { Lead, Sec, Steps, Step, Shot, Ui, Tip, More, Related, ShowMe } from '../parts.jsx'
import pic from '../shots/side-boxes.webp'

export default function Article() {
  return <>
    <Lead>Side boxes sit beside the waterfall. Use a color key to explain the colors, or a text box for anything else you
      want printed with the calendar.</Lead>
    <Sec title="Add a box">
      <Steps>
        <Step t={<>Click <Ui>Side Boxes</Ui> in the toolbar.</>}>It is in the Waterfall view only. <ShowMe at="#tb-side-boxes-btn" view="sheet" /></Step>
        <Step t="Choose a kind and a side.">Color key or Text box, on the left or the right.</Step>
        <Step t="Type.">The cursor lands in the box’s title. Typing renames it.</Step>
      </Steps>
      <Shot src={pic} w={591} pins={[[52.5, 15.8], [91.4, 40.6]]}
        items={[
          <><b>Side Boxes</b> · adds a box.</>,
          <><b>A color key</b> · one row for each color the calendar shows. Click a row to rename it.</>,
        ]} />
      <p>A text box has a title and free text. It grows as you type, and each line can have its own style from the text bar.</p>
    </Sec>
    <Sec title="Arrange and remove">
      <p>Drag a box by its grip (⋮⋮) to move it up, down, or to the other side. Drag the inner edge of a side to change its
        width. Click the × on a box to delete it. Undo brings it back.</p>
      <p>Boxes print: they appear in Excel and in the waterfall PDF. To keep one on screen only, hover under it and click
        <Ui> Hide from Exports</Ui>. Click it again to print it.</p>
      <More title="the color key’s rows">A color key lists only the colors on screen, and phases that share a color share a row.
        Click the × on a row to hide it. A “Show N hidden rows” button under the key brings them back.</More>
    </Sec>
    <Related ids={['read', 'textbar']} />
  </>
}
