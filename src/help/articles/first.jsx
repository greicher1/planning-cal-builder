import { Lead, Sec, Shot, Info, Ui, Keys, To, Related } from '../parts.jsx'
import showInfo from '../shots/show-info.webp'
import phaseCard from '../shots/phase-card.webp'

export default function Article() {
  return <>
    <Lead>Four steps take you from an empty calendar to one you can send.</Lead>
    <Sec title="1. Tell it about the show">
      <p>On the <Ui>Show</Ui> tab, type the title, pick a season, and fill in the number of episodes and the shooting days
        per episode. Production’s length comes from these: 10 episodes of 8 days is 80 shoot days.</p>
      <Shot src={showInfo} w={265} pins={[[88, 13.8], [80, 24.2], [88, 45], [51, 55.4], [80, 78]]}
        items={[
          <><b>Title</b> · prints in the header and names your files.</>,
          <><b>Season</b> · episodes number from it: season 3 gives 301, 302…</>,
          <><b>Number of Episodes</b></>,
          <><b>Shooting Days per Episode</b> · every episode gets this many. Change one episode’s count on the Phases tab.</>,
          <><b>Production Region</b> · where you shoot. The shoot skips that region’s union holidays.</>,
        ]} />
      <Info title="Production waits for these">Until the season, the number of episodes and the shooting days are filled in,
        Production can’t be scheduled, and its card says what’s missing.</Info>
    </Sec>
    <Sec title="2. Date each phase">
      <p>On the <Ui>Phases</Ui> tab, give each phase a start date and a length. A date snaps to the Monday of its week, and
        the calendar draws itself as you type. Production needs only a start: its length comes from step 1.</p>
      <Shot src={phaseCard} w={265} pins={[[53, 10], [24, 31], [80, 42], [44, 56], [57, 80], [80, 90]]}
        items={[
          <><b>Name and color</b> · click either to change it.</>,
          <><b>Starts</b> · its first week. Switch it to <b>Ends</b> to set the last week instead.</>,
          <><b>▲ ▼</b> · move just this phase a week earlier or later.</>,
          <><b>Length</b> · in weeks, or switch to dates.</>,
          <><b>Start after Writer’s Rm</b> · starts it the week after the phase before.</>,
          <><b>Hiatus</b> · pause just this phase.</>,
        ]} />
    </Sec>
    <Sec title="3. Look at it both ways">
      <p><Ui>Waterfall</Ui> and <Ui>Month</Ui> above the calendar switch views. See <To id="views" />.</p>
    </Sec>
    <Sec title="4. Save and send">
      <p><Keys k="Mod+S" /> saves a small .sptcal file. The first save asks where to put it; after that it saves in place,
        and autosaves every 10 minutes. <Ui>Export to Excel</Ui> and <Ui>Export PDF</Ui> make the files you send.</p>
    </Sec>
    <Related ids={['showinfo', 'cards', 'pdf']} />
  </>
}
