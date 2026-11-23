import { Lead, Sec, Table, Info, Ui, To, Keys, Timeline, Related } from '../parts.jsx'

// The timeline: five phases a week apart, then the same plan after each tool. [first week, length] per state.
const ROWS = [
  { label: 'Writer’s Rm', bars: [{ ph: 'writersRoom', text: 'Writer’s Rm', at: [[1, 4], [3, 4], [4, 4]] }] },
  { label: 'Pre-Prep', bars: [{ ph: 'prePrep', text: 'Pre-Prep', at: [[6, 2], [8, 2], [8, 2]] }] },
  { label: 'Prod Prep', bars: [{ ph: 'prodPrep', text: 'Prod Prep', at: [[9, 2], [11, 2], [10, 2]] }] },
  { label: 'Production', bars: [{ ph: 'production', text: 'Production', at: [[12, 4], [14, 4], [12, 4]], pinIn: 2 }] },
  { label: 'Post', bars: [{ ph: 'post', text: 'Post', at: [[17, 3], [19, 3], [16, 3]] }] },
]

export default function Article() {
  return <>
    <Lead>Two tools sit above the calendar. <b>Shift</b> moves the plan and keeps the gaps between phases. <b>Build
      Around</b> pins one phase to a date and builds the others end to end around it.</Lead>
    <Sec title="Which one do I need?">
      <Timeline weeks={22} states={['Before', 'Shift › 2 wks later', 'Build Around › pin Production']} rows={ROWS}
        captions={[
          'Your plan, with a week’s gap between phases.',
          <><b>Shift</b>: every phase moves together, and every gap is kept.</>,
          <><b>Build Around</b>: Production keeps its date. The rest are built end to end around it, so the gaps close.</>,
        ]} />
      <Table head={['', 'Shift', 'Build Around']} rows={[
        ['You know', 'How far it moves (“2 weeks later”)', 'One date (“the shoot starts 6/22”)'],
        ['Gaps', 'Kept', 'Closed'],
        ['Empty dates', 'Stay empty', 'Filled in from each phase’s length'],
      ]} />
      <p>The steps for each are in <To id="shift" /> and <To id="build" />. <Keys k="Mod+Z" /> takes back a whole move.</p>
    </Sec>
    <Sec title="Just one phase?">
      <p>In the Waterfall, use the <b>▲</b> and <b>▼</b> in a phase’s date box on the Phases tab (or <Keys k="Alt+Up" /> and{' '}
        <Keys k="Alt+Down" /> in that box) to move it a week earlier or later without touching the others. The gaps on either
        side change. The phase takes its own hiatus, its cell settings and any notes that stay with it (a new note does by
        default) with it; a note left on its week, holidays and all-phase hiatuses stay. A run of quick clicks is one undo. The
        arrows show while the Waterfall is on screen.</p>
      <p>In the Month view, drag the middle of a phase’s bar to move its dates: a copy follows the pointer while the calendar
        underneath shows where it will land. Drag a bar’s end instead to change where it starts or ends (the other end stays
        put). Double-click a bar to open its phase’s card on the Phases tab.</p>
    </Sec>
    <Sec title="What never moves">
      <Info title="These stay on their dates"><b>Union holidays</b>, <b>notes with a date in them</b>, and hiatuses with
        <b> Lock in place</b> on. Because holidays stay put, the wrap can move a day more or less than the rest. See <To id="stays" />.</Info>
    </Sec>
    <Related ids={['shift', 'build', 'stays']} />
  </>
}
