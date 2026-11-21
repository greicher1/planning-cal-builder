import { Lead, Sec, Steps, Step, Shot, Ui, Path, Info, More, To, Related, ShowMe } from '../parts.jsx'
import pic from '../shots/region-card.webp'

export default function Article() {
  return <>
    <Lead>Pick where you shoot, and Production skips that region’s union holidays, running a day longer for each one it skips.</Lead>
    <Sec title="Pick your region">
      <p>Choose <Ui>Production Region</Ui> in Show info: U.S. Area Standards, New York, each Canadian province, and more. The
        same choice is in <Path>Settings › Region</Path>, with the holiday list and notes about where the region’s list comes from. <ShowMe at="#union-place" tab="show" /></p>
      <Shot src={pic} w={265} pins={[[75.5, 19.9], [84.9, 54.3], [87.9, 74.1]]}
        items={[
          <><b>Production Region</b></>,
          <><b>Source</b> · the agreement the list follows.</>,
          <><b>Weekend holidays</b> · how a holiday on a Saturday or Sunday is moved.</>,
        ]} />
    </Sec>
    <Sec title="What a holiday does">
      <p>If a holiday lands on a day that would have been a shoot day, that day is skipped and the shoot runs a day longer.
        Holidays never change any other phase’s dates. A holiday on a weekend also adds an <b>(Observed)</b> weekday, and that
        is the day that costs a shoot day.</p>
      <p>In <Path>Settings › Region</Path>, untick a holiday’s <Ui>Enable</Ui> box to stop it costing a shoot day. You can also add your own
        one-day holidays there. <Ui>Reset holidays</Ui> puts the list back.</p>
    </Sec>
    <Sec title="Changing the region">
      <Info>Once you have edited notes, changing Region asks first. A new region skips different days, so a note you wrote
        beside a shoot day could end up beside the wrong one. <Ui>Continue</Ui> switches; <Ui>Cancel</Ui> keeps your region.</Info>
      <More title="the lists themselves">Every region’s list is in <To id="holidaylists" />. Where holidays are written in the
        notes is separate: see <To id="holnotes" />.</More>
    </Sec>
    <Related ids={['production', 'holnotes', 'holidaylists']} />
  </>
}
