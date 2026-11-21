import { Lead, Sec, Table, Keys, More } from '../parts.jsx'
import { KEYS_MAC } from '../../chrome/keys.js'

export default function Article() {
  return <>
    <Lead>Each file key does exactly what its button does, including asking first when it would replace unsaved work.
      Keys show as they are on this computer.</Lead>
    <Sec title="Files and exports">
      <Table head={['Key', 'Does']} rows={[
        KEYS_MAC ? [<Keys k="Mod+N" />, 'New'] : ['New', 'New has no key here, because the browser keeps it for a new window: use the New button at the top.'],
        [<Keys k="Mod+O" />, 'Load…'],
        [<Keys k="Mod+S" />, 'Save'],
        [<Keys k="Mod+Shift+S" />, 'Save As'],
        [<Keys k="Mod+Shift+E" />, 'Export: Excel in the Waterfall, the PDF in the Month view'],
        [<Keys k="Mod+P" />, 'The PDF of the view on screen'],
        [<><Keys k="Mod+Z" /> </>, 'Undo, for any change, even a whole Shift'],
        [<><Keys k="Mod+Shift+Z" /> or <Keys k="Mod+Y" /></>, 'Redo'],
        [<Keys k="Esc" />, 'Closes the File menu, a window or a panel'],
      ]} />
    </Sec>
    <Sec title="Notes">
      <Table head={['Key', 'Does']} rows={[
        [<Keys k="Enter" />, 'Saves the note you’re writing. In the Waterfall, on a highlighted cell, opens it.'],
        [<><Keys k="Shift+Enter" /> or <Keys k="Alt+Enter" /></>, 'A new line in a note'],
        [<Keys k="Delete" />, 'Empties the highlighted notes'],
        [<><Keys k="Mod+C" /> <Keys k="Mod+X" /> <Keys k="Mod+V" /></>, 'Copy, cut and paste notes'],
      ]} />
    </Sec>
    <Sec title="In the Waterfall">
      <Table head={['Key', 'Does']} rows={[
        [<><Keys k="Up" /><Keys k="Down" /><Keys k="Left" /><Keys k="Right" /></>, 'Move the highlight a cell at a time'],
        [<><Keys k="Shift+Up" /> …</>, 'Stretch the highlight'],
        [<><Keys k="Tab" /> <Keys k="Shift+Tab" /></>, 'Move right and left'],
        [<><Keys k="Alt+Left" /> <Keys k="Alt+Right" /></>, 'Swap a phase’s column with its neighbor’s'],
        [<><Keys k="Alt+Up" /> <Keys k="Alt+Down" /></>, 'In a phase’s date box: move that phase a week'],
      ]} />
    </Sec>
    {KEYS_MAC && <More title="why they’re not in the Mac menu bar">SPTCal runs inside Chrome or Edge, and the browser
      builds that menu itself. Its File menu still shows ⌘N beside New Window, but in SPTCal that key starts a new
      calendar. To open a second window, choose New Window from the menu.</More>}
  </>
}
