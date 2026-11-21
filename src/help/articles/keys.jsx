import { Lead, Sec, Table, Keys, Ui, Shot, Tip, Related } from '../parts.jsx'
import menu from '../shots/wf-context.webp'

export default function Article() {
  return <>
    <Lead>Select cells in the waterfall with the mouse, then move, stretch, copy or clear them from the keyboard.</Lead>
    <Sec title="Select">
      <Table head={['Do this', 'To get']} rows={[
        ['Click a cell', 'That cell'],
        ['Drag across cells', 'A run of cells'],
        [<>Shift-click</>, 'Everything from the first cell to this one'],
        [<Keys k="Mod+click" />, 'Add or remove one cell'],
        [<Keys k="Esc" />, 'Clear the selection'],
      ]} />
    </Sec>
    <Sec title="Move and clear">
      <p>The arrow keys move the highlight one cell at a time, and Shift with an arrow stretches it.{' '}
        <Keys k="Tab" /> and <Keys k="Shift+Tab" /> move right and left. An empty Notes cell is a stop, so you can arrow to a
        week and start typing.</p>
      <p><Keys k="Delete" /> empties the highlighted notes and leaves dates, phases and hiatus bands alone.</p>
    </Sec>
    <Sec title="Right-click a cell">
      <p>Right-click shows a short menu of what that cell can do. On a phase’s week:</p>
      <Shot src={menu} w={333} pins={[[79.5, 32.1], [80, 45.4], [78.6, 58.7], [56.2, 71.9], [66.7, 88.7]]}
        items={[
          <><b>Start Prod Prep this week</b> · moves the phase here. Its length stays.</>,
          <><b>End Prod Prep this week</b> · keeps its start and changes its length.</>,
          <><b>Add 1-week phase here</b> · a phase of your own, this week.</>,
          <><b>Add hiatus ▸</b> · for every phase, or just one.</>,
          <><b>Show this week in the month view</b></>,
        ]} />
      <p>On a Notes cell the menu cuts, copies, pastes or clears the note, and on a hiatus band it can remove the hiatus.</p>
      <Tip>Only what the cell can actually do is listed.</Tip>
    </Sec>
    <Related ids={['wfnotes', 'swap', 'textbar']} />
  </>
}
