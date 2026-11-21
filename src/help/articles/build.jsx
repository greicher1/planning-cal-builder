import { Lead, Sec, Steps, Step, Shot, Info, More, Ui, ShowMe, Related } from '../parts.jsx'
import buildAround from '../shots/build-around.webp'

export default function Article() {
  return <>
    <Lead>Build Around answers “if the shoot starts June 22, when does the writers’ room open?” Pin one phase to a date,
      and the ticked phases are built end to end around it from their lengths.</Lead>
    <Sec title="Build around a date">
      <Steps>
        <Step t={<>Click <Ui>Build Around</Ui>.</>}><ShowMe at="#pop-solve-btn" /></Step>
        <Step t="Click the phase to pin.">Its row gets a pin.</Step>
        <Step t={<>Choose <Ui>starts on</Ui>, or <Ui>ends by</Ui> for its last workday, and pick the date.</>} />
        <Step t="Check the list.">Each row shows its new date and Pushed, Pulled or No change.</Step>
        <Step t={<>Press <Ui>Build</Ui>.</>}>Nothing changes until you do.</Step>
      </Steps>
      <Shot src={buildAround} w={440} pins={[[36, 46.7], [42, 29.7], [73, 29.7], [5, 64.8], [50, 78], [30, 91.2]]}
        items={[
          <><b>The pinned phase</b></>,
          <><b>Lengths</b> · type a new one. It’s saved when you press Build.</>,
          <><b>The preview</b> for each phase</>,
          <><b>Left unticked</b>, and why</>,
          <><b>Pin to a date</b></>,
          <><b>Build</b></>,
        ]} />
    </Sec>
    <Sec title="Which phases are built">
      <p>What’s ticked is what’s built, on both sides of the pin. To build only one side, untick the phases on the other.
        An unticked phase keeps its dates, and the others are built past it.</p>
      <p>A phase that runs alongside the one it would be built against, like a Writer’s Room that overlaps Pre-Prep, starts
        unticked: building it in line would pull the two apart. The line under the list names it. Tick it if you want it in line.</p>
      <Info title="Build Around fills empty dates">It can date a phase that had no date yet, from its length. Shift never does.</Info>
    </Sec>
    <Sec title="Lengths">
      <p>Type a new length right in the list; it’s saved with the dates when you press Build. Production’s length comes
        from Show info and can’t be changed here.</p>
      <More title="building backwards through Production">The shoot has no week count: it runs day by day around weekends,
        hiatus days and union holidays. So Build Around searches for the latest start that still finishes in time, and its
        answer always matches the calendar. A phase that straddles a locked hiatus starts earlier rather than losing weeks.</More>
    </Sec>
    <Related ids={['move', 'shift', 'cards']} />
  </>
}
