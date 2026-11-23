import { Lead, Sec, Steps, Step, Ui, Keys, Tip, More, To, Related, ShowMe } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Export to Excel makes a styled workbook that matches the waterfall, ready to print or send on.</Lead>
    <Sec title="Make the workbook">
      <Steps>
        <Step t="Click Export to Excel">at the top of the window, beside Export PDF, or press <Keys k="Mod+Shift+E" />. <ShowMe at="#export-btn" view="sheet" /></Step>
        <Step t="Choose where to save it.">The file’s name follows the parts you picked. See <To id="names" />.</Step>
      </Steps>
      <p>The workbook has a column block for each year, colored phase cells, the Notes column, and a bold printed header
        with the title, date and production summary. Columns are sized to fit their content. In a narrow window (about
        1,120 px and under) the button shrinks to an icon, and Export PDF keeps its words.</p>
    </Sec>
    <Sec title="Printing from Excel">
      <p>The sheet is scaled to print as large as possible on one page, centered, with the print area pinned to the
        calendar. It prints on the paper chosen in <To id="pdf">Export PDF</To> (Letter until you change it), so
        File › Print › Save as PDF from Excel comes out the same for everyone, whatever their default printer.</p>
      <p>The orientation picks itself: two years or fewer print portrait, three or more landscape. The exception is when the
        other way would fit noticeably larger, or when you chose one in Export PDF.</p>
      <More title="if the export doesn’t start">Excel files are built with a library SPTCal downloads from the internet when
        it starts. If it hasn’t arrived, the export waits for it. If it can’t download it, a message says why, and
        pressing the button again retries. See <To id="trouble" />.</More>
    </Sec>
    <Related ids={['pdf', 'names', 'trouble']} />
  </>
}
