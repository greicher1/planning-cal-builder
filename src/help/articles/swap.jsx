import { Lead, Keys, Ui, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Where two phases run side by side, you can trade which one sits on the left.</Lead>
    <ol className="hp-steps">
      <li><b>Pick the weeks to move.</b> <span>Click a cell, or <Keys k="Mod+click" /> or drag across several. For a phase’s
        whole run, hover the phase and click <Ui>Swap Column</Ui> at the top of the run: it only picks the run, and it only
        shows on a phase that has a neighbor to swap with.</span></li>
      <li><b>Swap.</b> <span>Press <Keys k="Alt+Left" /> or <Keys k="Alt+Right" />, or click or drag the small teal circle on
        the boundary beside your pick.</span></li>
    </ol>
    <p>A swap moves just the weeks you picked. Pick every week of a phase to move the whole phase; pick only some and the
      phase can end up in two columns (the circle turns amber).</p>
    <p>Only the column changes: dates, lengths and labels stay the same, and Excel and the PDF follow. It is one step for
      Undo. <Ui>Reset Columns</Ui> puts the automatic layout back.</p>
    <Related ids={['read', 'keys']} />
  </>
}
