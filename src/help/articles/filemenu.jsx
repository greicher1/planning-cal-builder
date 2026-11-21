import { Lead, Ui, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>The File menu is the calendar’s name at the top left, Untitled until you save it. It holds Load…, Changes since
      last save…, and your recent calendars.</Lead>
    <p>It also holds <Ui>New</Ui> (a button beside it). Under those are the calendars you’ve saved or loaded. Click one to switch to it, or
      type in the search box to find one. Right-click one for <Ui>Show in folder…</Ui>. The <b>×</b> on a
      calendar removes only its shortcut from the list, never the file. <Ui>Esc</Ui> closes the menu.</p>
    <p>On an empty start, before there is anything to preview, the same recent calendars show under the calendar.</p>
    <Related ids={['save', 'changes']} />
  </>
}
