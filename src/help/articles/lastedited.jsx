import { Lead, Ui, To, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>The date in the Auto header is when the calendar was last changed, not today, so a printout says how current it is.</Lead>
    <p>It sits top left in the Waterfall and top right in the Month view. Looking, switching views and saving don’t change
      it. An edit does, and <Ui>Undo</Ui> brings the earlier date back. A calendar saved before this date existed shows
      the day its file was last saved.</p>
    <p>In Template mode, write it as <b>{'{lastEdited}'}</b>. See <To id="tokens" />.</p>
    <Related ids={['hdrmodes', 'tokens']} />
  </>
}
