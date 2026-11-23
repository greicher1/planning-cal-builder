import { Lead, Shot, Ui, More, Related } from '../parts.jsx'
import pic from '../shots/month-day-menu.webp'

export default function Article() {
  return <>
    <Lead>Click a day in the Month view, or right-click anywhere on it, for a short menu of what that day can do.</Lead>
    <Shot src={pic} w={344} pins={[[75.6, 25.1], [57, 48.2], [44.3, 72.6], [68.3, 87.1]]}
      items={[
        <><b>Add 1-day or 1-week phase here</b> · a new phase of your own, starting this day.</>,
        <><b>Add hiatus ▸</b> · for every phase, or just one running that day.</>,
        <><b>Full day / Off</b> · on a shoot day. A day marked Off is not shot, so the shoot runs a day longer.</>,
        <><b>Show this week in the waterfall</b></>,
      ]} />
    <p>On a phase’s bar the menu can also start or end that phase on the day you clicked. On a holiday it has a Holiday section
      (<Ui>Enabled</Ui>, <Ui>Show in month view</Ui>, <Ui>Show in waterfall</Ui>), and inside a hiatus it offers <Ui>Remove hiatus…</Ui>.</p>
    <p>On a shoot day the menu also offers <Ui>Full day</Ui> and <Ui>Off</Ui>. A day marked Off is not shot, so the shoot
      runs one day longer. On a weekend or a holiday during the shoot it offers <Ui>Work this day</Ui>, which adds a shoot
      day there, so the shoot ends a day sooner. Double-click a marked day to clear its mark.</p>
    <More title="half days">A half day is not marked on a day. Give an episode a day count ending in .5 (4.5 days, say) and the
      switch to the next episode falls halfway through that day.</More>
    <Related ids={['month']} />
  </>
}
