import { Lead, Sec, Steps, Step, Shot, Info, Keys, Related } from '../parts.jsx'
import editor from '../shots/mv-note-editor.webp'

export default function Article() {
  return <>
    <Lead>The Month view has its own notes, pinned to a day. They print in the month PDF, and stay out of the Waterfall
      and Excel unless you say otherwise.</Lead>
    <Sec title="Add a note">
      <Steps>
        <Step t="Hover a day and click a +.">Each free line has its own +, so the note goes on the line you click.</Step>
        <Step t="Type, pick a color,">then press <Keys k="Enter" />.</Step>
      </Steps>
      <p>If a day needs more room, the wider + on the bottom edge of the day adds a line to the whole week.</p>
      <Shot src={editor} w={316} pins={[[64, 18], [84, 31.5], [35.1, 47], [24, 60.1], [48.4, 82.4], [66.8, 92.7]]}
        items={[
          <><b>Delete Note</b></>,
          <><b>The note</b></>,
          <><b>Stays with</b> · this day, or a phase. On a shoot day it can stay with that shoot day.</>,
          <><b>Color</b></>,
          <><b>Show in waterfall</b> · adds it to its week in the Waterfall and Excel, as “Tech scout Ep 101 6/8/27”.</>,
          <><b>Save</b></>,
        ]} />
    </Sec>
    <Sec title="Move a note">
      <p>Drag a note up or down among the day’s notes, between two phases, or above or below the bars. Drag it sideways or
        to another week to move it to that day; a date in it that names its old day changes to the new one.</p>
      <p>A click picks a note and a double-click opens it. A picked note takes <Keys k="Delete" /> and <Keys k="Mod+C" />{' '}
        <Keys k="Mod+X" /> <Keys k="Mod+V" />; a paste goes on the day you clicked last.</p>
    </Sec>
    <Sec title="Notes from the Waterfall">
      <Info title="One note, two places">A Waterfall note shows here on the day its date names, or on its week’s Monday when
        it has none. Editing it here edits the Waterfall’s note too. Holidays and automatic notes always keep their own day.</Info>
    </Sec>
    <Related ids={['wfnotes', 'linked', 'bulk']} />
  </>
}
