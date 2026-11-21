import { Lead, Ui, ShowMe } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>To show only part of the calendar in the Waterfall, set a Calendar range on the Show tab.</Lead>
    <p>Set the first week, the last week, or both. The Waterfall shows only those weeks, and so do Excel and the PDF. Leave a
      date blank to keep the usual start or end. The Month view always shows the whole calendar, whatever the range says.
      The setting is called <Ui>Calendar range</Ui>, under Show info. <ShowMe at="#cal-range-start" view="sheet" tab="show" /></p>
  </>
}
