import { Lead, Sec, Steps, Step, Shot, Ui, Info, More, To, Related } from '../parts.jsx'
import pic from '../shots/production-card.webp'

export default function Article() {
  return <>
    <Lead>Production is the one phase counted in shooting days, not weeks. SPTCal lays the days out one by one and tells you when you wrap.</Lead>
    <Sec title="Days, not weeks">
      <Shot src={pic} w={265} pins={[[83, 19.7], [64, 33.5], [90.5, 41.9], [60, 45.6]]}
        items={[
          <><b>Wraps</b> · the last shoot day.</>,
          <><b>Total Shooting Days</b> · shown, not typed. It is the sum of the episodes below.</>,
          <><b>Shooting Order</b> · drag an episode to shoot it earlier or later.</>,
          <><b>Days</b> · change one episode’s day count and the total follows.</>,
        ]} />
      <p>Each day is scheduled in turn, skipping weekends, hiatus days and your region’s union holidays, until every shoot day
        is placed. So a holiday or a hiatus pushes the wrap out. The card says how many shoot days the holidays cost.</p>
    </Sec>
    <Sec title="Off days and working a weekend">
      <p>In the Month view, click a day (or right-click it) to open its menu.</p>
      <Steps>
        <Step t="On a shoot day, choose Off.">The day is not shot, and the shoot runs one day longer.</Step>
        <Step t="On a weekend or holiday, choose Work this day.">It becomes a shoot day, and the shoot ends a day sooner.</Step>
        <Step t="To clear a mark, double-click the day.">It goes back to how it was.</Step>
      </Steps>
      <Info>The Waterfall and Excel follow these marks, since they use the same dates.</Info>
      <More title="Production won’t schedule">Production waits for Season, Number of Episodes and Shooting Days. See <To id="showinfo" />.</More>
    </Sec>
    <Related ids={['episodes', 'region', 'prep']} />
  </>
}
