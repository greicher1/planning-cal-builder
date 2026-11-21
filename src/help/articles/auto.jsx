import { Lead, Sec, Shot, More, Ui, Path, ShowMe, Related } from '../parts.jsx'
import autoNotes from '../shots/auto-notes.webp'

export default function Article() {
  return <>
    <Lead>SPTCal writes the milestones for you, like “Writer’s Room Opens 1/4/27” and “Start Principal Photography
      6/14/27”, and keeps their dates right as the plan moves.</Lead>
    <Sec title="Choose which ones, and where">
      <p><Path>Settings › Preferences › Automatic notes</Path> has a box for each phase’s start and end, once for the
        Waterfall and once for the Month view, so a note can show in one view or both. <ShowMe at=".autonote-list" tab="settings" sw="Preferences" /></p>
      <Shot src={autoNotes} w={265} pins={[[60, 14.8], [83, 14.8], [43.8, 64]]}
        items={[
          <><b>Waterfall</b> · start and end notes in the Waterfall and Excel.</>,
          <><b>Month</b> · in the Month view and its PDF.</>,
          <><b>Each phase</b>, your own phases included: “Writer’s Room Opens 1/4/27”.</>,
        ]} />
      <p>Writer’s Room Opens and Production’s start and wrap are on to begin with. A new calendar also starts with Post’s
        end on, which reads “Final Delivery”.</p>
    </Sec>
    <Sec title="Reword one">
      <p>Open it (double-click its cell in the Waterfall, or double-click it in the Month view), change the words and keep
        the date. It stays automatic: it keeps its own day and moves with the schedule, under its new name everywhere it shows.</p>
    </Sec>
    <Sec title="Hide one">
      <p>Its editor has <Ui>Hide Auto-Note</Ui>, which takes it out of the view you’re in. The other view keeps it. In the
        Waterfall, pressing Delete on it does the same. To bring one back, tick its box again in Settings.</p>
      <More title="your own words in the same cell">When a week’s cell holds an automatic note and your own text, the
        automatic line still follows the schedule: its date changes, and it comes and goes with the calendar. Your lines
        stay as you typed them.</More>
    </Sec>
    <Related ids={['wfnotes', 'mvnotes', 'holnotes']} />
  </>
}
