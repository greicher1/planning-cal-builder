import { Lead, Sec, Steps, Step, Shot, Ui, Path, Tip, To, Related } from '../parts.jsx'
import list from '../shots/holiday-list.webp'

export default function Article() {
  return <>
    <Lead>The Region tab picks where you shoot and lists that region’s holidays. Here you decide which ones cost a shoot
      day and where each one shows up as a note.</Lead>
    <Sec title="Region and its notes">
      <p><Path>Settings › Region</Path> opens with the Production Region, the same choice as in Show info. Under it, a box
        gives the region’s source and its holidays. Changing the region asks first when you have edited notes or hiatuses.
        See <To id="region" />.</p>
    </Sec>
    <Sec title="The holiday list">
      <Shot src={list} w={265} pins={[[48, 15], [67.5, 15], [84.5, 15]]}
        items={[
          <><b>Enable</b> · untick it to work that day, so it stops costing a shoot day.</>,
          <><b>W’fall Note</b> · write it in the Waterfall and Excel.</>,
          <><b>Month Note</b> · write it in the Month view and its PDF.</>,
        ]} />
      <Steps>
        <Step t="Add your own:">type a name and pick a date under <i>Add your own holiday</i>, then click <Ui>Add</Ui>. It is a single day.</Step>
        <Step t="Start over:">click <Ui>Reset holidays</Ui>.</Step>
      </Steps>
      <Tip>The two note boxes only choose where a note shows. They never move a date. See <To id="holnotes" />.</Tip>
    </Sec>
    <Related ids={['region', 'holnotes', 'holidaylists']} />
  </>
}
