import { Lead, Path, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Choose month first or day first for every date in the waterfall.</Lead>
    <p>In <Path>Settings › Preferences › Waterfall</Path>, <b>Dates</b> offers MM/DD/YYYY, MM/DD/YY (the usual 1/6/25),
      DD/MM/YYYY and DD/MM/YY. It changes the Date column on screen, in Excel and in the PDF, and it is saved with the calendar.</p>
    <p>With DD/MM, every other date follows the same order: notes, holidays, the header, and dates you type or paste.</p>
    <Related ids={['read']} />
  </>
}
