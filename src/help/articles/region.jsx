import { Lead, Sec, Steps, Step, Shot, Ui, Path, Info, Tip, To, Related, ShowMe } from '../parts.jsx'
import pic from '../shots/region-card.webp'
import list from '../shots/holiday-list.webp'

export default function Article() {
  return <>
    <Lead>Pick where you shoot, and Production skips that region’s union holidays, running a day longer for each one it skips.
      <b> A new calendar starts on None, so no holiday is skipped until you pick a region.</b></Lead>
    <Sec title="Pick your region">
      <p>Choose <Ui>Production Region</Ui> in Show info: U.S. Area Standards, New York, each Canadian province, Mexico, the
        United Kingdom, Germany, Australia, France, Lithuania. The
        same choice is in <Path>Settings › Region</Path>, with the holiday list and notes about where the region’s list comes from. <ShowMe at=".region-mirror" tab="show" /></p>
      <Shot src={pic} w={265} pins={[[75.5, 19.9], [84.9, 54.3], [87.9, 74.1]]}
        items={[
          <><b>Production Region</b></>,
          <><b>Source</b> · the agreement the list follows.</>,
          <><b>Weekend holidays</b> · how a holiday on a Saturday or Sunday is moved.</>,
        ]} />
    </Sec>
    <Sec title="What a holiday does">
      <p>If a holiday lands on a day that would have been a shoot day, that day is skipped and the shoot runs a day longer.
        A phase counted in weeks or set by dates doesn’t care about holidays, but Production, a phase you count in days, and
        episode prep all skip them. A holiday on a weekend also adds an <b>(Observed)</b> weekday, and that is the day that
        costs a shoot day. The United States, Canada and the United Kingdom move it to a weekday (a few Canadian days, such as
        Truth and Reconciliation Day in Nova Scotia, New Brunswick and Prince Edward Island, stay on the weekend), while Germany,
        France, Lithuania and Mexico leave it where it falls (Australia’s Victoria list moves only New Year’s Day, Australia
        Day, Christmas and Boxing Day). The box under the region in <Path>Settings › Region</Path> says which rule your list
        follows, and where it comes from.</p>
      <p>The two U.S. lists are IATSE’s eleven holidays: <Ui>U.S. Area Standards</Ui> covers everywhere but New York (Los
        Angeles, Atlanta and Albuquerque are the same), and <Ui>New York</Ui> (Local 52) swaps Good Friday for Veterans Day.
        Columbus Day is on neither. Always check a list against your own agreement.</p>
    </Sec>
    <Sec title="The holiday list">
      <p><Path>Settings › Region</Path> opens with the Production Region, the same choice as in Show info, and lists that
        region’s holidays. Here you decide which ones cost a shoot day and where each one shows up as a note.</p>
      <Shot src={list} w={265} pins={[[48, 13.9], [67.5, 13.9], [84.5, 13.9]]}
        items={[
          <><b>Enable</b> · untick it to work that day, so it stops costing a shoot day.</>,
          <><b>W’fall Note</b> · write it in the Waterfall and Excel.</>,
          <><b>Month Note</b> · write it in the Month view and its PDF.</>,
        ]} />
      <p>A holiday gets an Enable box when it can move a date (inside Production, a phase you count in days, or episode prep),
        and any you have switched off keep theirs so you can switch them back. The red <i>Costs a shoot day</i> tag marks the
        weekday holidays the shoot would otherwise have worked. Click a holiday’s name to rename it: Enter saves, and the new
        name shows everywhere the holiday does. Esc puts it back.</p>
      <Steps>
        <Step t="Add your own:">type a name and pick a date under <i>Add your own holiday</i>, then click <Ui>Add</Ui>. It is a single day.</Step>
        <Step t="Start over:">click <Ui>Reset holidays</Ui>.</Step>
      </Steps>
      <Tip>The two note boxes only choose where a note shows. They never move a date. See <To id="auto" />.</Tip>
    </Sec>
    <Sec title="Changing the region">
      <Info>Once you have edited notes, changing Region asks first. A new region skips different days, so a note you wrote
        beside a shoot day could end up beside the wrong one. <Ui>Continue</Ui> switches; <Ui>Cancel</Ui> keeps your region.</Info>
    </Sec>
    <Related ids={['production', 'auto', 'prefs']} />
  </>
}
