import { Lead, Sec, Steps, Step, Shot, Ui, Keys, Info, More, To, Related, ShowMe } from '../parts.jsx'
import dlg from '../shots/export-dialog.webp'

export default function Article() {
  return <>
    <Lead>Export PDF writes the waterfall as a PDF you can send, and Export to Excel makes a styled workbook that matches it.
      Both buttons are at the top of the window. The PDF’s window first asks how it should print, then where to save it.</Lead>
    <Sec title="Export a PDF">
      <Steps>
        <Step t="Click Export PDF">at the top of the window, beside Export to Excel, or press <Keys k="Mod+P" />. <ShowMe at="#export-wf-pdf-btn" view="sheet" /></Step>
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
        <Ui> Export to Excel</Ui> uses them too. Grid lines and the file name’s parts stay on this computer, and every
        export’s name follows them. See <To id="names" />.</Info>
      <More title="the Month view">The Month view’s Export PDF is a different, simpler window. See <To id="mvpdf" />.</More>
    </Sec>
    <Sec title="Export to Excel">
      <Steps>
        <Step t="Click Export to Excel">at the top of the window, beside Export PDF, or press <Keys k="Mod+Shift+E" />. <ShowMe at="#export-btn" view="sheet" /></Step>
        <Step t="Choose where to save it.">The file’s name follows the parts you picked. See <To id="names" />.</Step>
      </Steps>
      <p>The workbook has a column block for each year, colored phase cells, the Notes column, and a bold printed header
        with the title, date and production summary. Columns are sized to fit their content. In a narrow window (about
        1,120 px and under) the button shrinks to an icon, and Export PDF keeps its words.</p>
      <p>The sheet is scaled to print as large as possible on one page, centered, with the print area pinned to the
        calendar. It prints on the paper chosen in the Export PDF window (Letter until you change it), so File › Print › Save as
        PDF from Excel comes out the same for everyone, whatever their default printer. The orientation picks itself: two years
        or fewer print portrait, three or more landscape. The exception is when the other way would fit noticeably larger, or
        when you chose one in Export PDF.</p>
      <More title="if the export doesn’t start">Excel files are built with a library SPTCal downloads from the internet when
        it starts. If it hasn’t arrived, the export waits for it. If it can’t download it, a message says why, and pressing the
        button again retries. If it keeps failing, your network may be blocking cdn.jsdelivr.net, and IT can allow it.</More>
    </Sec>
    <Related ids={['names', 'mvpdf', 'save']} />
  </>
}
