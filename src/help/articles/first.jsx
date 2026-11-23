import { Lead, Sec, Shot, Info, Ui, Keys, To, Related } from '../parts.jsx'
import showInfo from '../shots/show-info.webp'

export default function Article() {
  return <>
    <Lead>Four steps take you from an empty calendar to one you can send.</Lead>
    <Sec title="1. Tell it about the show">
      <p>On the <Ui>Show</Ui> tab, type the title, pick a season, and fill in the number of episodes and the shooting days
        per episode. Production’s length comes from these: 8 episodes of 12 days is 96 shoot days.</p>
      <Shot src={showInfo} w={265} pins={[[88, 13.8], [80, 24.2], [88, 45], [51, 55.4], [80, 78]]}
        items={[
          <><b>Title</b> · prints in the header and names your files.</>,
          <><b>Season</b> · episodes number from it: season 1 gives 101, 102…</>,
          <><b>Number of Episodes</b></>,
          <><b>Shooting Days per Episode</b> · every episode gets this many. Change one episode’s count on the Phases tab.</>,
          <><b>Production Region</b> · where you shoot. The shoot skips that region’s union holidays. A new calendar starts on None.</>,
        ]} />
      <Info title="Production waits for these">Until the season, the number of episodes and the shooting days are filled in,
        Production can’t be scheduled, and its card says what’s missing. (In Blocks mode it waits for the season, the number
        of blocks and the days per block.) A new calendar also starts with <b>no Production Region</b>, so pick one or no
        union holiday is skipped.</Info>
    </Sec>
    <Sec title="2. Date each phase">
      <p>On the <Ui>Phases</Ui> tab, give each phase a start date and a length. In a phase counted in weeks, a start date snaps to the Monday of its week, and
        the calendar draws itself as you type. A new calendar comes with four two-week winter breaks already on the Hiatus
        card; change or remove them there. Production needs only a start: its length comes from step 1.</p>
      <p>The card’s controls (Starts or Ends, Weeks or Dates, start after, hiatus, the ▲ ▼ arrows) are in <To id="cards" />.</p>
    </Sec>
    <Sec title="3. Look at it both ways">
      <p><Ui>Waterfall</Ui> and <Ui>Month</Ui> above the calendar switch views. See <To id="views" />.</p>
    </Sec>
    <Sec title="4. Save and send">
      <p><Keys k="Mod+S" /> saves a small .sptcal file. The first save asks where to put it; after that it saves in place,
        and autosaves every 10 minutes <b>into that same file</b> (to try something out, Save As or add a + Scenario first: see <To id="save" />). <Ui>Export to Excel</Ui> and <Ui>Export PDF</Ui> make the files you send.</p>
    </Sec>
    <Related ids={['showinfo', 'cards', 'pdf']} />
  </>
}
