import { Lead, Shot, Ui, To, Related, ShowMe } from '../parts.jsx'
import pic from '../shots/file-menu.webp'

export default function Article() {
  return <>
    <Lead>The File menu is the calendar’s name at the top left, Untitled until you save it. Click it for Load…, Changes
      since last save…, and your recent calendars. <ShowMe at=".file-menu-btn" /></Lead>
    <Shot src={pic} w={308} pins={[[27, 32.5], [62.3, 48.3], [84.4, 64.3]]}
      items={[
        <><b>Load…</b> · opens a .sptcal file, or an older .html calendar.</>,
        <><b>Changes since last save…</b> · see <To id="changes" />.</>,
        <><b>Search</b> · finds a calendar you’ve saved or loaded, by name.</>,
      ]} />
    <p>Under the search box are the calendars you’ve saved or loaded. Click one to switch to it. Right-click one for{' '}
      <Ui>Show in folder…</Ui>, which opens the Open window in the folder that holds it. The <b>×</b> on a calendar removes
      only its shortcut from the list, never the file. <Ui>Esc</Ui> closes the menu.</p>
    <p>On an empty start, before there is anything to preview, the same recent calendars show under the calendar.</p>
    <Related ids={['save', 'changes']} />
  </>
}
