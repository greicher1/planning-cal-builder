import { Lead, Sec, Shot, Table, Info, Tip, More, Ui, To, Related, ShowMe } from '../parts.jsx'
import menu from '../shots/hdr-menu.webp'

export default function Article() {
  return <>
    <Lead>The Waterfall’s header has nine lines (the Month view’s has four) and each has four modes. Pick a mode from the <Ui>Header</Ui> button above the
      calendar: it says which mode you’re in and opens the menu. <ShowMe at="#tb-hdr-mode-btn" /></Lead>
    <Sec title="The four modes">
      <Shot src={menu} w={202} pins={[[35.9, 32.5], [48.3, 46.6], [43.6, 69.4], [31.2, 83.8]]}
        items={[
          <><b>Auto</b> · fills every line from your inputs.</>,
          <><b>Template</b> · your own lines, with live data.</>,
          <><b>Manual</b> · plain text you type.</>,
          <><b>Off</b> · no header.</>,
        ]} />
      <Table head={['Mode', 'What it does']} rows={[
        ['Auto', 'Fills the lines from your title, production span, Principal Photography dates, episode count, Version and the Date Last Edited, and keeps them current. The lines aren’t editable.'],
        ['Template', <>Lines you write yourself, with live <b>{'{variables}'}</b> like {'{version}'} or {'{production.wrap}'} (listed below). Double-click a header line, or choose <Ui>Open the template editor…</Ui> in the menu, to edit them.</>],
        ['Manual', 'Plain text you type right in the header. Nothing updates itself, and braces print as typed.'],
        ['Off', 'No header in that view, and its space goes to the calendar. The PDF and Excel print none.'],
      ]} />
      <Info title="Each view has its own">The Month view’s header has its own mode, independent of the Waterfall’s. The button follows
        whichever view is showing.</Info>
    </Sec>
    <Sec title="Switching modes">
      <p>Template to Manual freezes today’s values and removes the variables. <b>Switching to Auto throws away the lines you
        wrote and their formatting</b>, with no warning; Undo is the only way back. Choosing Template afterwards starts again
        from the standard lines, and choosing Manual copies what Auto shows. Only <b>Off</b> keeps your lines: switch it back
        on and they return. Every switch is one undo step.</p>
    </Sec>
    <Sec title="Format a line">
      <p>Click a header line, then use the text style bar in the toolbar: size, bold, italic, color, highlight and
        alignment. It works in every mode. In the template editor, the <Ui>Insert</Ui> list adds a variable to a line.</p>
      <Tip>To reuse a header on other calendars, save it as a preset: <To id="presets" />.</Tip>
    </Sec>
    <Sec title="The date in the header">
      <p>The date in the Auto header is when the calendar was last changed, not today, so a printout says how current it is. It
        sits top left in the Waterfall and top right in the Month view. Looking, switching views and saving don’t change it. An
        edit does, and <Ui>Undo</Ui> brings the earlier date back. A calendar saved before this date existed shows the day its
        file was last saved. In Template mode, write it as <b>{'{lastEdited}'}</b>.</p>
    </Sec>
    <Sec title="Template variables">
      <p>In Template mode, a header line can hold <b>{'{variables}'}</b>: placeholders that fill in from your calendar and stay
        current. The template editor’s <Ui>Insert</Ui> list shows every one with its live value. Anything in [square brackets]
        disappears when the data inside is missing, so [{'{episodes}'} Episodes] shows nothing until you enter an episode count.</p>
      <More title="every variable">
        <Table head={['Variable', 'Shows']} rows={[
          ['{title}', 'Show title'],
          ['{season}', 'Season, as S2 or S2 & S3'],
          ['{titleSeason}', 'Title and season'],
          ['{version}', 'Version, as v3 (the v is added to a number)'],
          ['{scenario}', 'The scenario on screen (empty with only one)'],
          ['{episodes}', 'Episode count'],
          ['{shootDaysPerEp}', 'Shoot days per episode'],
          ['{shootDays}', 'Total shoot days'],
          ['{lastEdited}', 'Date last edited, as 9.8.26 (also :long, :slash and :iso)'],
          ['{today}', 'Today, as 9.8.26 (also :long, :slash and :iso)'],
          ['{date:2026-09-08}', 'A fixed date you type, which never updates (add :long or another format after it)'],
          ['{production.open}', 'The date a phase opens (for Production, the first shoot day)'],
          ['{production.close}', 'The date it closes: the last weekday (for Production, the wrap day; {production.wrap} says the same)'],
          ['{production.weeks}', 'Its length in weeks'],
          ['{production.name}', 'The phase’s name'],
          ['{production.summary}', 'Span and shooting schedule, like “8-Week Production Span / 8-Day Shooting Schedule”'],
          ['{production.dates}', 'Principal Photography and wrap dates'],
          ['{writersRoom.line}', 'Writer’s Room Opens: the date'],
        ]} />
        <p>Every phase has the four <b>.open</b>, <b>.close</b>, <b>.weeks</b> and <b>.name</b>, written with its key: <b>writersRoom</b>,{' '}
          <b>prePrep</b>, <b>prodPrep</b>, <b>production</b>, <b>post</b>, <b>localization</b>, or the key of a custom phase.</p>
      </More>
    </Sec>
    <Related ids={['presets', 'prefs']} />
  </>
}
