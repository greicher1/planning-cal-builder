import { Lead, Sec, Steps, Step, Shot, Table, Info, More, Ui, Keys, ShowMe, Timeline, Related } from '../parts.jsx'
import shiftPanel from '../shots/shift-panel.webp'
import buildAround from '../shots/build-around.webp'

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
    </Sec>
    <Sec title="Shift the plan">
      <Steps>
        <Step t={<>Click <Ui>Shift ▾</Ui>.</>}>To move everything one week, use <Ui>← 1 wk</Ui> or <Ui>1 wk →</Ui> instead. <ShowMe at="#shift-group" /></Step>
        <Step t="Untick any phase that should stay.">Or click a phase and press <Ui>Prior to …</Ui> or <Ui>After …</Ui>.</Step>
        <Step t="Say how far.">Type weeks and press <Ui>Earlier</Ui> or <Ui>Later</Ui>, or choose <Ui>To a date</Ui>.</Step>
      </Steps>
      <Shot src={shiftPanel} w={381} pins={[[7, 27], [7, 38.3], [44, 49.5], [50, 68.5], [50, 81], [61, 89]]}
        items={[
          <><b>All phases</b> · every phase starts ticked, so the whole plan moves.</>,
          <><b>A phase’s box</b> · untick it to leave that phase where it is.</>,
          <><b>Click a row</b> to choose it. The buttons below name it.</>,
          <><b>Prior to / After</b> · tick the chosen phase and everything before or after it.</>,
          <><b>By weeks / To a date</b></>,
          <><b>Earlier / Later</b> · nothing moves until you press one.</>,
        ]} />
    </Sec>
    <Sec title="Build around one date">
      <Steps>
        <Step t={<>Click <Ui>Build Around</Ui>.</>}><ShowMe at="#pop-solve-btn" /></Step>
        <Step t="Click the phase to pin.">Choose <Ui>starts on</Ui> or <Ui>ends by</Ui>, and pick the date.</Step>
        <Step t="Check the list.">Each row shows its new date and how far it moves.</Step>
        <Step t={<>Press <Ui>Build</Ui>.</>} />
      </Steps>
      <Shot src={buildAround} w={440} pins={[[36, 46.7], [40.5, 29.7], [77.3, 29.7], [4.5, 64.8], [50, 78], [30, 91.2]]}
        items={[
          <><b>The pinned phase</b> lands on your date.</>,
          <><b>Lengths</b> · type a new one right here.</>,
          <><b>The preview</b> · Pushed, Pulled or No change.</>,
          <>A phase that runs alongside its neighbor starts unticked. Tick it to build it in line.</>,
          <><b>Pin to a date</b> · starts on, or ends by its last workday.</>,
          <><b>Build</b> · nothing changes until you press it.</>,
        ]} />
    </Sec>
    <Sec title="What never moves">
      <Info title="These stay on their dates"><b>Union holidays</b>, <b>notes with a date in them</b>, and hiatuses with
        <b> Lock in place</b> on. Because holidays stay put, the wrap can move a day more or less than the rest.</Info>
      <More title="move just one phase">Use the ▲ ▼ in a phase’s date box on the Phases tab, or <Keys k="Alt+Up" /> and{' '}
        <Keys k="Alt+Down" /> in that box. It moves one week at a time and takes its own hiatus with it.</More>
      <p>Changed your mind? <Keys k="Mod+Z" /> takes back the whole move.</p>
    </Sec>
    <Related ids={['shift', 'build', 'stays']} />
  </>
}
