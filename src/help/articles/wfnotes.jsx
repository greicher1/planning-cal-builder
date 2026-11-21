import { Lead, Sec, Steps, Step, Shot, Table, Tip, Info, More, Keys, Related } from '../parts.jsx'
import editor from '../shots/note-editor.webp'

export default function Article() {
  return <>
    <Lead>Every week has a Notes cell. Automatic notes and holidays fill in by themselves. Anything you type sits beside
      them and prints in Excel and the PDF just as you see it.</Lead>
    <Sec title="Write a note">
      <Steps>
        <Step t="Double-click a Notes cell,">or click it and start typing.</Step>
        <Step t="Type."><Keys k="Shift+Enter" /> starts a new line.</Step>
        <Step t="Pick a Day to date it.">“Table read” becomes “Table read 8/12/26”. The date is what puts it on that day in
          the Month view. Typing the date at the end does the same: 8/12, 8-12 or 8-12-26 all work.</Step>
        <Step t="Pick a color,">then press <Keys k="Enter" /> or click away.</Step>
      </Steps>
      <Shot src={editor} w={320} pins={[[65, 17.2], [84, 27], [20, 38.4], [34, 46], [24, 61], [53, 81.2], [69, 90.3]]}
        items={[
          <><b>Delete Note</b> · deletes what you typed. Automatic notes and holidays stay.</>,
          <><b>The note</b> · type over it to replace it.</>,
          <><b>Day</b> · stamps the date on the last line you typed.</>,
          <><b>Stays with</b> · keep the note with a phase instead of this week.</>,
          <><b>Color</b> · the text turns black or white to stay readable.</>,
          <><b>Show in month view</b></>,
          <><b>Save</b> · or press Enter or Tab, or click away.</>,
        ]} />
    </Sec>
    <Sec title="Keys">
      <Table head={['Key', 'Does']} rows={[
        [<Keys k="Enter" />, 'Saves the note'],
        [<Keys k="Esc" />, 'Closes the editor and keeps what you typed'],
        [<Keys k="Delete" />, 'Empties the highlighted notes. Dates, phases and bands stay.'],
        [<><Keys k="Mod+C" /> <Keys k="Mod+X" /> <Keys k="Mod+V" /></>, 'Copy, cut and paste notes, with their color and style. A note pastes into Excel or an email as plain text.'],
        [<><Keys k="Up" /><Keys k="Down" /><Keys k="Left" /><Keys k="Right" /></>, <>Move the highlight. Add <Keys k="Shift" /> to stretch it.</>],
      ]} />
    </Sec>
    <Sec title="Good to know">
      <Tip title="Keep a note with its phase">Set <b>Stays with</b> to “Production wk 2” and the note moves whenever
        Production does.</Tip>
      <Info title="Waterfall notes show in the Month view too">Notes you add in the Month view stay in the Month view.</Info>
      <More title="moving a note">Highlight it, then drag it to another week. If that week already has a note, you’re
        asked before it’s replaced. Holidays and automatic notes keep their own day.</More>
    </Sec>
    <Related ids={['auto', 'linked', 'mvnotes']} />
  </>
}
