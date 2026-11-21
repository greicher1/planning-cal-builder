import { Lead, Sec, Shot, Ui, Path, More, To, Related } from '../parts.jsx'
import pic from '../shots/prep-card.webp'

export default function Article() {
  return <>
    <Lead>Episodic Prep gives every episode, or block, its own prep bar in the Month view, ending the day before its first shoot day.</Lead>
    <Sec title="Set the prep days">
      <p>Find the <Ui>Episodic Prep</Ui> card on the Phases tab. Type a number in <Ui>Default prep</Ui> and every episode gets that
        many days. Type a number beside one episode to give it its own; leave it blank to use the default, or put 0 for none.</p>
      <Shot src={pic} w={265} pins={[[36.5, 22.7], [60, 44.5]]}
        items={[<><b>Default prep</b> · days for every episode.</>, <><b>Per episode</b> · its own number.</>]} />
      <p>Prep counts working days: Monday to Friday, skipping union holidays and hiatus days. The bars show in the Month view
        and its PDF, never in the Waterfall or Excel.</p>
    </Sec>
    <Sec title="Off days">
      <p>Normally prep carries on through a shoot day marked Off. To pause prep on those days, tick
        <Ui> Pause prep on days marked Off</Ui> in <Path>Settings › Preferences › Month view</Path>.</p>
      <More title="more on Off days">How days get marked Off is in <To id="production" />.</More>
    </Sec>
    <Related ids={['production', 'episodes', 'tandem']} />
  </>
}
