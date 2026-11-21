import { Lead, Keys, Ui, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Where two phases run side by side, you can trade which one sits on the left.</Lead>
    <p>Click a cell of the phase you want to move and press <Keys k="Alt+Left" /> or <Keys k="Alt+Right" />. After a{' '}
      <Keys k="Mod+click" /> or a drag across several cells, a small teal circle also appears on the boundary beside them, to
      click or drag across. To move a phase’s whole run, hover it and click <Ui>Swap Column</Ui> at the top of the run. It
      shows only on a phase that has something to swap with.</p>
    <p>Only the column changes: dates, lengths and labels stay the same, and Excel and the PDF follow. It is one step for
      Undo. <Ui>Reset Columns</Ui> puts the automatic layout back.</p>
    <Related ids={['read', 'keys']} />
  </>
}
