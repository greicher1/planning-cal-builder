import { Lead, Sec, Table, Tip, Ui, To, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>In Template mode, a header line can hold <b>{'{variables}'}</b>: placeholders that fill in from your calendar and
      stay current. This is every one you can use.</Lead>
    <Sec title="Show">
      <Table head={['Variable', 'Shows']} rows={[
        ['{title}', 'Show title'],
        ['{season}', 'Season, as S2 or S2 & S3'],
        ['{titleSeason}', 'Title and season'],
        ['{version}', 'Version, as typed'],
        ['{scenario}', 'The scenario on screen (empty with only one)'],
        ['{episodes}', 'Episode count'],
        ['{shootDaysPerEp}', 'Shoot days per episode'],
        ['{shootDays}', 'Total shoot days'],
      ]} />
    </Sec>
    <Sec title="Dates">
      <Table head={['Variable', 'Shows']} rows={[
        ['{lastEdited}', 'Date last edited, as 9.8.26'],
        ['{lastEdited:long}', 'Date last edited, as September 8, 2026'],
        ['{lastEdited:slash}', 'Date last edited, as 9/8/26'],
        ['{lastEdited:iso}', 'Date last edited, as 2026-09-08'],
        ['{today}', 'Today, as 9.8.26 (also :long, :slash and :iso)'],
        ['{date:2026-09-08}', 'A fixed date you type, which never updates (add :long or another format after it)'],
      ]} />
    </Sec>
    <Sec title="Each phase">
      <p>Every phase has four, written with its key: <b>writersRoom</b>, <b>prePrep</b>, <b>prodPrep</b>, <b>production</b>,{' '}
        <b>post</b>, <b>localization</b>, or the key of a custom phase. The <Ui>Insert ▾</Ui> list shows them under each phase’s
        current name.</p>
      <Table head={['Variable', 'Shows']} rows={[
        ['{production.open}', 'The date the phase opens (for Production, the first shoot day)'],
        ['{production.close}', 'The date it closes: the last weekday (for Production, the wrap day; {production.wrap} says the same)'],
        ['{production.weeks}', 'Its length in weeks'],
        ['{production.name}', 'The phase’s name'],
      ]} />
    </Sec>
    <Sec title="Whole lines">
      <Table head={['Variable', 'Shows']} rows={[
        ['{production.summary}', 'Span and shooting schedule, like “8-Week Production Span / 8-Day Shooting Schedule”'],
        ['{production.dates}', 'Principal Photography and wrap dates'],
        ['{writersRoom.line}', 'Writer’s Room Opens: the date'],
      ]} />
      <Tip title="Square brackets hide a line">Anything in [square brackets] disappears when the data inside is missing. So{' '}
        [{'{episodes}'} Episodes] shows nothing until you enter an episode count. Click into a line to see its variables.</Tip>
      <p>New to templates? Start with <To id="hdrmodes" />.</p>
    </Sec>
    <Related ids={['hdrmodes', 'presets']} />
  </>
}
