import { Lead, Sec, Ui, To, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>The few things that can go wrong, and what to do about each.</Lead>
    <Sec title="“Let this site edit the file?”">
      <p>This is the browser protecting your disk. Allow it. Until you do, that file can’t autosave or save in place.</p>
    </Sec>
    <Sec title="The file changed on disk">
      <p>If the file was saved somewhere else since you loaded it, Save asks before overwriting. Choose <Ui>Save a copy…</Ui> to
        keep both, <Ui>Load newer version</Ui> to open the file as it is now (your changes here are discarded), or
        <Ui>Overwrite</Ui>. Autosave pauses until you decide.</p>
    </Sec>
    <Sec title="Export to Excel says it couldn’t download its Excel library">
      <p>Excel files need a library that downloads from the internet. Press the button again to retry. If you’re offline,
        connect first. If it keeps failing, the network may be blocking cdn.jsdelivr.net, and IT can allow it.</p>
    </Sec>
    <Sec title="SPTCal needs the internet to start">
      <p>Connect, then open it again.</p>
    </Sec>
    <Sec title="Saving and loading need Chrome or Edge">
      <p>Elsewhere there is no Load, and each save downloads a new copy.</p>
    </Sec>
    <Sec title="Getting back unsaved work">
      <p>After a crash, the next time you open SPTCal it offers to recover your work. See <To id="autosave" />.</p>
    </Sec>
    <Sec title="A double-clicked file">
      <p>See <To id="install" /> for opening a .sptcal file by double-clicking it.</p>
    </Sec>
    <Related ids={['save', 'autosave', 'excel']} />
  </>
}
