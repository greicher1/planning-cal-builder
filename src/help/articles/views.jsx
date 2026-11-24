import { Lead, Sec, Shot, Table, Tip, Ui, To, Related, ShowMe } from '../parts.jsx'
import month from '../shots/app-month.webp'

export default function Article() {
  return <>
    <Lead>One plan, two calendars. <Ui>Waterfall</Ui> and <Ui>Month</Ui> above the calendar switch between them, and each
      keeps its own header, notes and resets. <ShowMe at="#view-toggle" /></Lead>
    <Sec title="What each one is">
      <Table head={['', 'Waterfall', 'Month view']} rows={[
        ['Looks like', 'Excel: one row a week, a block of columns per year', 'A wall calendar: one month at a time, every day'],
        ['Production', 'One phase, week by week', 'Each episode as its own bar (“Shoot 101”)'],
        ['Notes', 'A note cell for each week', 'Notes on their day'],
        ['Exports', 'Export to Excel and Export PDF', 'Export PDF, one month per page'],
        ['Best for', 'The big picture, several shows, executives', 'The detail: daily planning and crew'],
      ]} />
      <Shot src={month} caption="The same show in the Month view." pins={[[97.4, 16.5], [48.6, 72.2], [72.9, 59.7]]}
        items={[
          <><b>The month map</b> · every month at a glance. Click one to go there.</>,
          <><b>Episode bars</b> · Production split into its episodes.</>,
          <><b>A day’s notes</b> · added right on the day.</>,
        ]} />
    </Sec>
    <Sec title="Which notes show where">
      <p>Notes you write in the Waterfall show in the Month view too, on the day their date names (with no date, on the phase’s first day that week for a note that
        stays with a phase, otherwise on the week’s Monday). Notes you add in the Month view stay there, unless you switch on <b>Show in waterfall</b> in their
        editor. Holidays and automatic notes can show in one view or both: see <To id="auto" />.</p>
      <Tip title="Only use the Month view?">Switch on <b>I only use the Month view</b> at the bottom of this sidebar to hide
        the articles about the Waterfall.</Tip>
    </Sec>
    <Related ids={['wfnotes', 'mvnotes', 'welcome']} />
  </>
}
