import { Lead, Sec, Shot, Table, Info, Tip, More, Ui, To, Related } from '../parts.jsx'
import menu from '../shots/hdr-menu.webp'

export default function Article() {
  return <>
    <Lead>The calendar’s header has nine lines and four modes. Pick a mode from the <Ui>Header</Ui> button above the
      calendar: it says which mode you’re in and opens the menu.</Lead>
    <Sec title="The four modes">
      <Shot src={menu} w={202} pins={[[9, 32.5], [9, 47], [9, 70], [9, 84]]}
        items={[
          <><b>Auto</b> · fills every line from your inputs.</>,
          <><b>Template</b> · your own lines, with live data.</>,
          <><b>Manual</b> · plain text you type.</>,
          <><b>Off</b> · no header.</>,
        ]} />
      <Table head={['Mode', 'What it does']} rows={[
        ['Auto', 'Fills the lines from your title, production span, Principal Photography dates, episode count, Version and the Date Last Edited, and keeps them current. The lines aren’t editable.'],
        ['Template', <>Lines you write yourself, with live <To id="tokens">{'{variables}'}</To> like {'{version}'} or {'{production.wrap}'}. Click into a line to see its variables; click away to see the result.</>],
        ['Manual', 'Plain text. Nothing updates itself, and braces print as typed.'],
        ['Off', 'No header in that view, and its space goes to the calendar. The PDF and Excel print none.'],
      ]} />
      <Info title="Each view has its own">The Month view’s header has its own mode, independent of the Waterfall’s. The button follows
        whichever view is showing.</Info>
    </Sec>
    <Sec title="Switching modes">
      <p>Template to Manual freezes today’s values and removes the variables. Switching to Auto discards your lines.
        Choosing Template or Manual again brings your lines back. Every switch is one undo, so <Ui>Undo</Ui> takes it back.</p>
    </Sec>
    <Sec title="Format a line">
      <p>A formatting bar sits above the header for size, bold, italic, color, highlight and alignment. Its <Ui>Insert ▾</Ui>
        lists every variable you can use in a Template.</p>
      <Tip>To reuse a header on other calendars, save it as a preset: <To id="presets" />.</Tip>
      <More title="the date in Auto">Auto’s date is when the calendar was last edited, not today. See <To id="lastedited" />.</More>
    </Sec>
    <Related ids={['tokens', 'presets', 'lastedited']} />
  </>
}
