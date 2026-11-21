import { Lead, Sec, Shot, Ui, Info, To, Related } from '../parts.jsx'
import pic from '../shots/show-info.webp'

export default function Article() {
  return <>
    <Lead>Show info is the first card on the Show tab. It names the calendar and holds the facts the header and Production are built from.</Lead>
    <Sec title="What each box does">
      <Shot src={pic} w={265} pins={[[19, 10], [25, 20.3], [25, 61.8], [28, 84.5]]}
        items={[
          <><b>Title</b> · prints in the header and starts every file name you save or export.</>,
          <><b>Season</b> · tick one season or several. With two ticked the header reads “S3 &amp; S4”, and episodes number from the first.</>,
          <><b>Version</b> · type a number. The header adds the v for you, so 3 shows as v3.</>,
          <><b>Location</b> · free text, shown when you compare scenarios. It never changes a date.</>,
        ]} />
      <p>Production waits for three things: <Ui>Season</Ui>, <Ui>Number of Episodes</Ui> and <Ui>Shooting Days per Episode</Ui>.
        Until they are filled in, Production’s card says what is still missing.</p>
    </Sec>
    <Sec title="Season, version and your file names">
      <p>An export’s file name carries the title, the season and the version, so each revision has its own name, like
        “Harbor Lights S3 Planning Calendar v3”. The Export PDF window’s File name list picks which parts are used.</p>
      <Info title="Region is not Location">The <Ui>Production Region</Ui> box is where your holidays come from (see <To id="region" />).
        Location is only a label for the town.</Info>
    </Sec>
    <Related ids={['episodes', 'production', 'region']} />
  </>
}
