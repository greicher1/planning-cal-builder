import { Lead, Ui, To, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>SPTCal saves a calendar that has a file by itself, and keeps a backup of one that doesn’t, so a crash costs you
      little.</Lead>
    <p>The indicator after <Ui>Save As</Ui> says <i>Unsaved changes</i> or the time of your last save. Once a calendar is
      linked to a file, it autosaves every 10 minutes, with no window.</p>
    <p>A calendar with no file yet can’t autosave, because a browser won’t create a file without you choosing where it
      goes. Its work is kept as a rolling backup in this browser, and offered back the next time you open the app.</p>
    <p>The backup never leaves this computer, and clearing your browsing data removes it. The saved file is the real copy.
      If saving is paused or a prompt appears, see <To id="trouble" />.</p>
    <Related ids={['save', 'trouble']} />
  </>
}
