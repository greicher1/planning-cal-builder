import { Lead, Ui, To } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Choose whether Production is built from episodes or from blocks, and change how many shooting days each one gets.</Lead>
    <p><Ui>Schedule by</Ui> in Show info is <Ui>Episodes</Ui> or <Ui>Blocks</Ui>. With Episodes, the list under Production builds
      itself: “Episode 101”, “Episode 102” and so on, and each bar in the Month view reads “Shoot 101”. To give one episode a
      different length, change its day count in that list. A half day works too: give an episode 4.5 days.</p>
    <p>Lowering <Ui>Number of Episodes</Ui> removes episodes from the end. With Blocks, Production is Number of Blocks times
      Shooting Days per Block, and Number of Episodes is optional. Which episodes sit in which block is only a label: drag an
      episode to another block and no date moves. See <To id="production" /> for how the days become dates.</p>
  </>
}
