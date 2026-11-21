import { Lead, Sec, Steps, Step, Shot, Timeline, Info, Ui, Path, More, Related } from '../parts.jsx'
import card from '../shots/hiatus-card.webp'

const ROWS = [
  { label: 'Production', bars: [
    { ph: 'production', text: 'Production', at: [[1, 6], [1, 4]] },
    { ph: 'production', text: 'Production', at: [[7, 0], [7, 2]] },
  ] },
  { label: 'Hiatus', bars: [{ hiatus: true, text: 'Hiatus', at: [[5, 0], [5, 2]] }] },
]

export default function Article() {
  return <>
    <Lead>A hiatus pauses the whole production for a few weeks, such as a winter break. Every phase that runs
      through it stops, then picks up again and still delivers its full length.</Lead>
    <Sec title="Add a hiatus">
      <Steps>
        <Step t="Open the Phases tab.">Find the <Ui>All-phase hiatus</Ui> card.</Step>
        <Step t={<>Click <Ui>+ Add hiatus period</Ui>.</>}>The new card opens, ready to fill in.</Step>
        <Step t="Set Starts and Weeks.">The start is a Monday. Weeks is how long the break lasts.</Step>
      </Steps>
      <Timeline weeks={12} states={['Without a hiatus', 'With a 2-week hiatus']} rows={ROWS}
        captions={['Production runs six weeks straight through.',
          'The hiatus pauses it for weeks 5 and 6. Production resumes after and still gets all six weeks.']} />
      <p>A hiatus shows as a full-width <b>Hiatus</b> band across the waterfall. You can add as many as you need.
        Double-click a band to jump to its card.</p>
    </Sec>
    <Sec title="Name it and color it">
      <Shot src={card} w={265} pins={[[66, 15.5], [20, 27.5], [86, 27.5], [40, 42]]}
        items={[
          <><b>Name</b> · type one at the top of the card to label the band. Click the color box beside it to color the band.</>,
          <><b>Starts</b></>,
          <><b>Weeks</b></>,
          <><b>Lock in place</b> · on to begin with.</>,
        ]} />
      <p>The name and color show in both views and in every export, and the color follows the hiatus if its dates change.
        Click the arrow on a card to fold it to one line (its dates and length) or open it.</p>
    </Sec>
    <Sec title="Lock in place">
      <p>A locked hiatus keeps its dates when you move the plan with Shift or Build Around. Turn <Ui>Lock in place</Ui> off
        if the break should travel with the plan.</p>
      <More title="phases and other phases’ breaks">Each phase can also have its own break that pauses only that phase.
        See <b>A hiatus for one phase</b>. To have other phases follow when you change a hiatus, see <b>Ripple
        Hiatus Periods</b>, which lives in <Path>Settings › Preferences › Hiatus</Path>.</More>
    </Sec>
    <Related ids={['phiatus', 'ripple', 'move']} />
  </>
}
