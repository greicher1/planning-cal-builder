import { Lead, Sec, Steps, Step, Shot, Keys, Ui, Info, Related } from '../parts.jsx'
import bar from '../shots/text-bar.webp'

export default function Article() {
  return <>
    <Lead>The text style bar in the toolbar changes how text looks in the waterfall: bold, italic, color, alignment and size.</Lead>
    <Sec title="Style some text">
      <Steps>
        <Step t="Pick what to style.">Click a date, a heading, a phase week, a hiatus band or a note. To pick several, drag
          across cells, Shift-click, or <Keys k="Mod+click" /> them.</Step>
        <Step t="Use the bar.">Choose bold, italic, a color, an alignment or a size.</Step>
      </Steps>
      <Shot src={bar} w={242} caption="The bar is dimmed until something is picked." />
      <p>Sizes run from 6 to 12 and always fit the row, so styling never changes the shape of the calendar or how it prints.</p>
    </Sec>
    <Sec title="Header lines too">
      <p>Click a header line above the calendar to style it the same way, in either view.</p>
      <Info title="Saved and printed">Styles are saved with the calendar and appear in the Excel file and the PDF.</Info>
    </Sec>
    <Related ids={['keys', 'sizing']} />
  </>
}
