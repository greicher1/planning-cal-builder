import { Lead, Sec, Shot, Keys } from '../parts.jsx'
import phaseCard from '../shots/phase-card.webp'

export default function Article() {
  return <>
    <Lead>To move one phase a week without touching the others, use the ▲ and ▼ in its date box on the Phases tab.</Lead>
    <Sec>
      <Shot src={phaseCard} w={265} pins={[[78, 42]]} items={[<><b>▲</b> one week earlier, <b>▼</b> one week later.</>]} />
      <p>The gaps on either side change. The phase takes its own hiatus, its cell settings and any notes that stay with it (a new note does by default) with it;
        a note left on its week, holidays and all-phase hiatuses stay. A run of quick clicks is one undo. In the date box, <Keys k="Alt+Up" /> and{' '}
        <Keys k="Alt+Down" /> do the same. The arrows show while the Waterfall is on screen.</p>
    </Sec>
  </>
}
