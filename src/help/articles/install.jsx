import { Lead, Sec, Ui, Keys } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>SPTCal is an app you install from Chrome or Edge. It needs the internet to start, and you sign in with a code
      sent to your email.</Lead>
    <Sec>
      <p><b>Open a calendar file</b> by double-clicking it. The first time, Chrome asks whether to open it in SPTCal: turn on
        <i> Remember my choice</i>. On Windows, right-click the file once and choose <Ui>Open with</Ui> › SPTCal, and Always.</p>
      <p>If SPTCal is already open, the calendar opens in that window, and you’re asked first when you have unsaved changes.
        You can also use <Ui>Load…</Ui> in the File menu (<Keys k="Mod+O" />).</p>
      <p>The first time you save a file you double-clicked, Chrome may ask permission to change it. Until you allow it,
        that file can’t autosave.</p>
    </Sec>
  </>
}
