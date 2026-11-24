import { Lead, Sec, Shot, Ui, Info, To, Related, ShowMe } from '../parts.jsx'
import pic from '../shots/show-info.webp'

export default function Article() {
  return <>
    <Lead>Show info is the first card on the Show tab. It names the calendar and holds the facts the header and Production are built from. <ShowMe at="#show-title" tab="show" /></Lead>
    <Sec title="What each box does">
      <Shot src={pic} w={265} pins={[[88, 13.8], [80, 24.2], [88, 67.6], [88, 91.9]]}
        items={[
          <><b>Title</b> · prints in the header and starts every file name you save or export.</>,
          <><b>Season</b> · tick one season or several. With two ticked the header reads “S1 &amp; S2”, and episodes number from the first.</>,
          <><b>Version</b> · type a number. The header adds the v for you, so 3 shows as v3.</>,
          <><b>Location</b> · free text, shown when you compare scenarios. It never changes a date.</>,
        ]} />
      <p>Production waits for three things: <Ui>Season</Ui>, <Ui>Number of Episodes</Ui> and <Ui>Shooting Days per Episode</Ui>{' '}
        (<Ui>Number of Blocks</Ui> and <Ui>Shooting Days per Block</Ui> in Blocks mode, where the episode count is optional).
        Until they are filled in, Production’s card says what is still missing.</p>
    </Sec>
    <Sec title="Season, version and your file names">
      <p>An export’s file name carries the title, the season and the version, so each revision has its own name, like
        “Harbor Lights S1 Planning Calendar v1”. The Export PDF window’s File name list picks which parts are used.</p>
      <Info title="Region is not Location">The <Ui>Production Region</Ui> box tells SPTCal which union holidays Production skips
        (see <To id="region" />), and a new calendar starts with none, so pick one. Location is only a label for the town.</Info>
    </Sec>
    <Related ids={['episodes', 'production', 'region']} />
  </>
}
