import { Lead, Ui, More, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Click a day in the Month view, or right-click anywhere on it, for a short menu of what that day can do.</Lead>
    <p>You can add a one-day or one-week phase there, add a hiatus, start or end the phase under the pointer, or show that
      week in the Waterfall.</p>
    <p>On a shoot day the menu also offers <Ui>Full day</Ui> and <Ui>Off</Ui>. A day marked Off is not shot, so the shoot
      runs one day longer. On a weekend or a holiday during the shoot it offers <Ui>Work this day</Ui>, which adds a shoot
      day there, so the shoot ends a day sooner. Double-click a marked day to clear its mark.</p>
    <More title="half days">A half day is not marked on a day. Give an episode a day count ending in .5 (4.5 days, say) and the
      switch to the next episode falls halfway through that day.</More>
    <Related ids={['month']} />
  </>
}
