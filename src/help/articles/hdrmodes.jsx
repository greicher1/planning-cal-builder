import { Lead, Sec, Shot, Table, Info, Tip, More, Ui, To, Related, ShowMe } from '../parts.jsx'
import menu from '../shots/hdr-menu.webp'

export default function Article() {
  return <>
    <Lead>The calendar’s header has nine lines and four modes. Pick a mode from the <Ui>Header</Ui> button above the
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
        ['Template', <>Lines you write yourself, with live <To id="tokens">{'{variables}'}</To> like {'{version}'} or {'{production.wrap}'}. Double-click a header line, or choose <Ui>Open the template editor…</Ui> in the menu, to edit them.</>],
        ['Manual', 'Plain text you type right in the header. Nothing updates itself, and braces print as typed.'],
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
      <p>Click a header line, then use the text style bar in the toolbar: size, bold, italic, color, highlight and
        alignment. It works in every mode. In the template editor, the <Ui>Insert</Ui> list adds a variable to a line.</p>
      <Tip>To reuse a header on other calendars, save it as a preset: <To id="presets" />.</Tip>
      <More title="the date in Auto">Auto’s date is when the calendar was last edited, not today. See <To id="lastedited" />.</More>
    </Sec>
    <Related ids={['tokens', 'presets', 'lastedited']} />
  </>
}
