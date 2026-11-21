import { Lead, Sec, Steps, Step, Shot, Ui, Info, Related } from '../parts.jsx'
import dlg from '../shots/month-pdf-dialog.webp'

export default function Article() {
  return <>
    <Lead>In the Month view, Export PDF writes your months as a PDF, one page for each, and asks where to save it.</Lead>
    <Sec title="Export the months">
      <Steps>
        <Step t="Switch to the Month view and click Export PDF."></Step>
        <Step t="Choose which months.">The window opens on All.</Step>
        <Step t="Click Export,">then choose where to save the file.</Step>
      </Steps>
      <Shot src={dlg} w={460} pins={[[25, 38], [48, 38], [77, 38]]}
        items={[
          <><b>All</b> · every month from the first phase to the last.</>,
          <><b>This month</b> · only the month on screen.</>,
          <><b>Range</b> · pick a first and last month in the two lists that appear.</>,
        ]} />
    </Sec>
    <Sec title="What a page looks like">
      <p>Each month is one landscape Letter page, in full color, with the header, the month and the date. On screen the grid
        lines are drawn lighter; the PDF keeps its black lines.</p>
      <Info title="One month?">If there is only one month to print, the window doesn’t ask.</Info>
    </Sec>
    <Related ids={['pdf', 'names', 'month']} />
  </>
}
