import { Lead, Sec, Steps, Step, Shot, Ui, Keys, Info, More, To, Related, ShowMe } from '../parts.jsx'
import dlg from '../shots/export-dialog.webp'

export default function Article() {
  return <>
    <Lead>Export PDF writes the waterfall as a PDF you can send. A window first asks how it should print, then where to
      save it.</Lead>
    <Sec title="Export a PDF">
      <Steps>
        <Step t="Click Export PDF">in the toolbar above the calendar, or press <Keys k="Mod+P" />. <ShowMe at="#export-wf-pdf-btn" view="sheet" /></Step>
        <Step t="Choose the paper and orientation.">The best fit is marked Recommended.</Step>
        <Step t="Pick grid lines and check the file name.">Type your own name, or tick the parts you want.</Step>
        <Step t="Click Export,">then choose where to save it.</Step>
      </Steps>
      <Shot src={dlg} pins={[[18, 11.8], [21.4, 23.9], [21, 37], [21, 45.5]]}
        items={[
          <><b>Paper</b> · Letter, Legal or Tabloid. A bigger sheet prints a long or wide calendar larger.</>,
          <><b>Orientation</b> · the line under it says how large each one prints the calendar, such as 85% of full size.</>,
          <><b>Grid lines</b> · None, Solid or Dashed.</>,
          <><b>File name</b> · type in the box to name this one PDF yourself. Or tick the parts in the list under it and drag a part by its handle to move it.</>,
        ]} />
    </Sec>
    <Sec title="What is remembered">
      <Info title="Some choices travel with the calendar">The paper and orientation are saved with the calendar, and
        <Ui>Export to Excel</Ui> uses them too. Grid lines and the file name’s parts stay on this computer, and every
        export’s name follows them. See <To id="names" />.</Info>
      <More title="the Month view">The Month view’s Export PDF is a different, simpler window. See <To id="mvpdf" />.</More>
    </Sec>
    <Related ids={['excel', 'names', 'mvpdf']} />
  </>
}
