import { Lead, Sec, Shot, More, Info, Ui, Path, To, ShowMe, Related } from '../parts.jsx'
import autoNotes from '../shots/auto-notes.webp'
import editor from '../shots/mv-holiday-editor.webp'

export default function Article() {
  return <>
    <Lead>SPTCal writes the milestones for you, like “Writer’s Room Opens 1/4/27” and “Start Principal Photography
      6/14/27”, and every union holiday inside a phase, and keeps their dates right as the plan moves.</Lead>
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
    <Sec title="Holidays in the notes">
      <p>Every union holiday that falls inside a phase is written into the notes with its date. You choose which ones show in
        each view, and you can rename them and color them. <Path>Settings › Region</Path> lists the holidays for your Production
        Region, with two boxes on each that choose where its note is written. To begin with, none show in the Waterfall and
        all show in the Month view. Showing or hiding a holiday’s note never moves a date: to stop a holiday costing a shoot day,
        see <To id="region" />.</p>
      <Shot src={editor} w={302} pins={[[62.2, 20.3], [80, 31], [24, 58.6], [65.2, 86]]}
        items={[
          <><b>Hide Holiday</b> · takes it out of this view only.</>,
          <><b>Its name</b></>,
          <><b>Color</b> · in the Month view.</>,
          <><b>Save</b></>,
        ]} />
      <p><b>Rename or color:</b> double-click a holiday in the Month view, or its line in a Waterfall note, or click its name in
        the list in <Path>Settings › Region</Path>. A new name shows everywhere the holiday does, in both views and every
        export. Its color is for the Month view.</p>
      <Info title="Hide one, and bring it back"><Ui>Hide Holiday</Ui> takes it out of the view you’re in at once. The other view
        keeps its own setting, and the day is still a holiday. In the Waterfall, pressing Delete on a holiday’s line does the
        same. To bring one back, tick its box again in Settings › Region, or right-click its day in the Month view.</Info>
    </Sec>
    <Related ids={['wfnotes', 'mvnotes', 'region']} />
  </>
}
