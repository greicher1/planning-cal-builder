import { Lead, Sec, Shot, Info, Ui, Path, To, Related } from '../parts.jsx'
import list from '../shots/holiday-list.webp'
import editor from '../shots/mv-holiday-editor.webp'

export default function Article() {
  return <>
    <Lead>Every union holiday that falls inside a phase is written into the notes with its date. You choose which ones
      show in each view, and you can rename them and color them.</Lead>
    <Sec title="Choose where each holiday shows">
      <p><Path>Settings › Region</Path> lists the holidays for your Production Region. Two boxes on each choose where its
        note is written. To begin with, none show in the Waterfall and all show in the Month view.</p>
      <Shot src={list} w={265} pins={[[67.5, 22], [84.5, 22]]}
        items={[<><b>W’fall Note</b> · in the Waterfall and Excel.</>, <><b>Month Note</b> · in the Month view and its PDF.</>]} />
      <Info title="Notes only">Showing or hiding a holiday’s note never moves a date. To stop a holiday costing a shoot day,
        see <To id="region" />.</Info>
    </Sec>
    <Sec title="Rename or color a holiday">
      <p>Double-click a holiday in the Month view, or its line in a Waterfall note. A new name shows everywhere the holiday
        does, in both views and every export. Its color is for the Month view.</p>
      <Shot src={editor} w={302} pins={[[67, 20.4], [80, 31], [25, 58.7], [72, 86]]}
        items={[
          <><b>Hide Holiday</b> · takes it out of this view only.</>,
          <><b>Its name</b></>,
          <><b>Color</b> · in the Month view.</>,
          <><b>Save</b></>,
        ]} />
    </Sec>
    <Sec title="Hide one, and bring it back">
      <p><Ui>Hide Holiday</Ui> takes it out of the view you’re in at once. The other view keeps its own setting, and the
        day is still a holiday. In the Waterfall, pressing Delete on a holiday’s line does the same.</p>
      <p>To bring one back, tick its box again in Settings › Region, or right-click its day in the Month view.</p>
    </Sec>
    <Related ids={['region', 'auto', 'mvnotes']} />
  </>
}
