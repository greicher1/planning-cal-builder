import { Lead, Sec, Shot, Table, Info, Ui, To, Related } from '../parts.jsx'
import app from '../shots/app-waterfall.webp'

export default function Article() {
  return <>
    <Lead>SPTCal turns each phase’s start date and length into two calendars: the <b>Waterfall</b>, a week-by-week grid
      that matches the Excel file, and the <b>Month view</b>, a day-by-day calendar for crews. Here is where everything is. New
      to SPTCal? Start with <To id="what" />.</Lead>
    <Sec title="The screen">
      <Shot src={app} caption="Harbor Lights, a made-up show, in the Waterfall view."
        pins={[[20.8, 3.5], [47.9, 3.5], [59, 3.5], [19.8, 10], [27.4, 13.75], [46.4, 13.75], [68.4, 13.75], [80.6, 13.75], [47, 52], [28.8, 97.5], [80.9, 97.5]]}
        items={[
          <><b>The calendar’s name</b> · this chip is the File menu (it says Untitled until you save): <Ui>Load…</Ui>, <Ui>Changes since last save…</Ui> and your recent calendars.</>,
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
      <Info title="Narrow window?">Some buttons shrink to icons (New, Save As, Export to Excel, Reset Columns and Reset Bar Order), and the page
        tools fold into a ⋯ button. Everything is still there.</Info>
      <Info title="Your calendar is a file on your computer">Save writes a small <b>.sptcal</b> file. Nothing you type is sent anywhere.</Info>
    </Sec>
    <Related ids={['first', 'views', 'move']} />
  </>
}
