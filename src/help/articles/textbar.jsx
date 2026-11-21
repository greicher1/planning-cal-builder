import { Lead, Sec, Steps, Step, Shot, Keys, Ui, Info, Related, ShowMe } from '../parts.jsx'
import bar from '../shots/text-bar.webp'

export default function Article() {
  return <>
    <Lead>The text style bar in the toolbar changes how text looks in the waterfall: bold, italic, color, alignment and size.</Lead>
    <Sec title="Style some text">
      <Steps>
        <Step t="Pick what to style.">Click a date, a heading, a phase week, a hiatus band or a note. To pick several, drag
          across cells, Shift-click, or <Keys k="Mod+click" /> them.</Step>
        <Step t="Use the bar.">Choose bold, italic, a color, an alignment or a size. <ShowMe at=".style-bar-host" view="sheet" /></Step>
      </Steps>
      <Shot src={bar} w={242} caption="With a cell picked: size, bold, italic, text color, highlight (for header and side-box lines), alignment, and ∅ to clear. Until something is picked, the bar is dimmed." />
      <p>Sizes run from 6 to 12 and always fit the row, so styling never changes the shape of the calendar or how it prints.</p>
    </Sec>
    <Sec title="Header lines and the Month view too">
      <p>Click a header line above the calendar to style it the same way, in either view. In the Month view the same bar
        styles a bar’s name, a note, a hiatus band, or the month’s title and weekdays: click one, then use the bar.</p>
      <Info title="Saved and printed">Styles are saved with the calendar and appear in the Excel file and the PDF.</Info>
    </Sec>
    <Related ids={['keys', 'sizing']} />
  </>
}
