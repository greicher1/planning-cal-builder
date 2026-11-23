import { Lead, Shot, Ui, To, ShowMe } from '../parts.jsx'
import card from '../shots/tandem-card.webp'
import month from '../shots/tandem-month.webp'

export default function Article() {
  return <>
    <Lead>A tandem day is an extra day, after an episode’s shoot days, when a second crew shoots it while the first crew starts the next.</Lead>
    <Shot src={month} pins={[[52.1, 7.3], [14.1, 84.2]]}
      caption="Harbor Lights, 12 + 1: each episode’s tandem day rides at the end of its line."
      items={[
        <><b>Tandem 101</b> · the day after Shoot 101’s last day, the same day Shoot 102 starts.</>,
        <><b>Tandem 102</b> · beside Shoot 103’s first day.</>,
      ]} />
    <p>“12 + 1” means twelve shoot days plus one tandem day, <b>not a 13-day shoot</b>: Production stays at 12 days an episode,
      and the tandem day is a bar beside them. Tandem days show only in the Month view and its PDF, and the Tandem card on the
      Phases tab appears while the Month view is on. Set the default in <Ui>Tandem Days</Ui>, beside Shooting Days per
      Episode in Show info, or on the <Ui>Tandem</Ui> card on the Phases tab. <ShowMe at=".si-tandem-in" tab="show" /> (You may also hear these called double-ups.)</p>
    <Shot src={card} w={265} pins={[[54, 20.1], [26.4, 39.6], [67.7, 39.6]]}
      items={[
        <><b>Default tandem days</b> · for every episode.</>,
        <><b>Its own name</b> · the pill reads “Tandem 101” unless you rename it.</>,
        <><b>Its own count</b> · blank uses the default, 0 means none. The last episode has none unless you give it one.</>,
      ]} />
    <p>In the Month view you can drag a tandem day onto another episode’s days or after wrap. Right-click one to rename it,
      put it back or remove it. Tandem days never change Production’s days, and they are not in the Waterfall or Excel.
      See <To id="production" />.</p>
  </>
}
