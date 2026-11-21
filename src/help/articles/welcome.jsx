import { Lead, Sec, Shot, Table, Info, Ui, Related } from '../parts.jsx'
import app from '../shots/app-waterfall.webp'

export default function Article() {
  return <>
    <Lead>SPTCal turns each phase’s start date and length into two calendars: the <b>Waterfall</b>, a week-by-week grid
      that matches the Excel file, and the <b>Month view</b>, a day-by-day calendar for crews. Here is where everything is.</Lead>
    <Sec title="The screen">
      <Shot src={app} caption="Harbor Lights, a made-up show, in the Waterfall view."
        pins={[[18.4, 3.5], [36, 3.5], [79, 3.5], [12, 10], [32.5, 11.3], [52, 11.3], [60, 11.3], [80, 11.3], [47, 52], [28.5, 97.5], [93, 97.5]]}
        items={[
          <><b>File menu</b> · the calendar you’re in, your recent calendars, <Ui>Load…</Ui> and <Ui>Changes since last save…</Ui></>,
          <><b>New, Save, Save As</b> · Save writes a small .sptcal file. After the first time, it saves in place.</>,
          <><b>Exports and resets</b> · for the view on screen.</>,
          <><b>Show, Phases, Settings</b> · fill these in and the calendar draws itself.</>,
          <><b>Waterfall / Month</b> · switch views.</>,
          <><b>Shift and Build Around</b> · move the whole plan, or build it around one date.</>,
          <><b>Text bar</b> · bold, italic, color and size for what you’ve picked.</>,
          <><b>Fill Gaps, Side Boxes, Header</b> · how the Waterfall fills its columns, boxes beside it, and its header.</>,
          <><b>The calendar</b> · double-click a note to write in it. Right-click any cell to see what it can do.</>,
          <><b>+ Scenario</b> · try another version of the plan in a new tab.</>,
          <><b>Zoom and Help</b> · zoom just the calendar. <b>?</b> opens Help.</>,
        ]} />
    </Sec>
    <Sec title="Two views of one plan">
      <Table head={['', 'Waterfall', 'Month view']} rows={[
        ['Shows', 'One row a week, years side by side', 'Every day, with episodes as bars'],
        ['Notes', 'A note cell for each week', 'Notes on their day, plus the Waterfall’s'],
        ['Exports', 'Excel and PDF', 'A PDF, one month per page'],
        ['Usually for', 'Studio planning and executives', 'The show’s production team and crew'],
      ]} />
      <Info title="Your calendar is a file on your computer">Save writes a small <b>.sptcal</b> file. Nothing you type is sent anywhere.</Info>
    </Sec>
    <Related ids={['first', 'views', 'move']} />
  </>
}
