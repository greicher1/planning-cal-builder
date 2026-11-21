import { Lead, Sec, Table, Keys, Ui, Tip, Related } from '../parts.jsx'

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
      <p>Right-click shows a short menu of what that cell can do: start or end a phase that week, add a phase or a hiatus
        there, cut, copy, paste or clear a note, remove a hiatus, or see that week in the Month view.</p>
      <Tip>Only what the cell can actually do is listed.</Tip>
    </Sec>
    <Related ids={['wfnotes', 'swap', 'textbar']} />
  </>
}
