import { Lead, Sec, Careful, Ui, To, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>SPTCal saves a calendar that has a file by itself, and keeps a backup of every unsaved one, so a crash costs you
      little.</Lead>
    <Careful title="Autosave writes into your real file">Once a calendar is linked to a file, SPTCal rewrites that file every
      10 minutes whenever there are unsaved changes, with no window. The status reads “Saved 3:12 PM” whether you clicked Save
      or the timer did, and no copy of the earlier contents is kept. To try something out without changing the original, use <Ui>Save As</Ui> first, or add a
      <Ui> + Scenario</Ui>. See <To id="save" />.</Careful>
    <Sec title="What the status says">
      <p>The indicator after <Ui>Save As</Ui> says <i>Unsaved changes</i> or the time of your last save. A calendar with no file
        yet can’t autosave, because a browser won’t create a file without you choosing where it goes, so it says so and waits
        for you to click Save.</p>
    </Sec>
    <Sec title="The backup in this browser">
      <p>Every edit also keeps a rolling backup of the unsaved work in this browser, for a calendar with a file or without one;
        a save clears it. After a crash, the
        next time you open the app it offers the work back. If you cancel that question, the backup waits under <b>Unsaved work</b>{' '}
        in the File menu, where you can recover it or discard it (discarding is permanent).</p>
      <p>The backup never leaves this computer, and clearing your browsing data removes it. The saved file is the real copy.
        If saving is paused or a prompt appears, see <To id="trouble" />.</p>
    </Sec>
    <Related ids={['save', 'trouble']} />
  </>
}
