import { Lead, Sec, Steps, Step, Shot, Careful, Ui, Keys, Info, More, To, Related, ShowMe } from '../parts.jsx'
import pic from '../shots/file-menu.webp'

export default function Article() {
  return <>
    <Lead>Save keeps your calendar in a small file that ends in .sptcal. Load brings it back exactly as you left it. Once a
      calendar has a file, autosave keeps that file up to date.</Lead>
    <Careful title="Autosave writes into your real file">Once a calendar is linked to a file, SPTCal rewrites that file every
      10 minutes whenever there are unsaved changes, with no window. The status reads “Saved 3:12 PM” whether you clicked Save
      or the timer did, and no copy of the earlier contents is kept. To try something out without changing the original, use{' '}
      <Ui>Save As</Ui> first, or add a <Ui>+ Scenario</Ui>.</Careful>
    <Sec title="Save">
      <Steps>
        <Step t="Click Save,">or press <Keys k="Mod+S" />.</Step>
        <Step t="Choose where to put the file.">Only the first save asks.</Step>
      </Steps>
      <p>After that, every save goes straight back to the same file with no window. The indicator after <Ui>Save As</Ui> says{' '}
        <i>Unsaved changes</i> or the time of your last save. A calendar with no file yet can’t autosave, because a browser won’t
        create a file without you choosing where it goes, so it says so and waits for you to click Save.</p>
    </Sec>
    <Sec title="Load, and the File menu">
      <p>To open a calendar later, click its name at the top left. That chip is the File menu, Untitled until you save, though
        it doesn’t say “File”. <ShowMe at=".file-menu-btn" /> You can also double-click a .sptcal file: see <To id="install" />.</p>
      <Shot src={pic} w={308} pins={[[27, 32.5], [62.3, 48.3], [84.4, 64.3]]}
        items={[
          <><b>Load…</b> · opens a .sptcal file, or an older .html calendar (<Keys k="Mod+O" />).</>,
          <><b>Changes since last save…</b> · see <To id="changes" />.</>,
          <><b>Search</b> · finds a calendar you’ve saved or loaded, by name.</>,
        ]} />
      <p>Under the search box are the calendars you’ve saved or loaded. Click one to switch to it. Right-click one for{' '}
        <Ui>Show in folder…</Ui>, which opens a file window in the folder that holds it (picking a file there loads it). The <b>×</b>{' '}
        on a calendar removes only its shortcut from the list, never the file. <Keys k="Esc" /> closes the menu. On an empty
        start, before there is anything to preview, the same recent calendars show under the calendar.</p>
    </Sec>
    <Sec title="Save As: try a variation">
      <p><Ui>Save As</Ui> (<Keys k="Mod+Shift+S" />) copies what you’re working on into a new file and switches you to it. The
        original stays as it was, so it’s a way to fork a version.</p>
      <p><b>Save As or a scenario?</b> Save As makes a separate file, for a version you will send or keep. A <Ui>+ Scenario</Ui>{' '}
        is another tab in the same file, for alternatives you want to compare side by side. See <To id="scen" />.</p>
      <Info title="Chrome or Edge">Saving in place and Load need Chrome or Edge. In other browsers each save downloads a new
        copy instead.</Info>
      <More title="a permission prompt">The browser may ask “Let this site edit the file?” once for a file you loaded. It is the
        browser protecting your disk: allow it, or the file can’t autosave or save in place.</More>
    </Sec>
    <Sec title="If something goes wrong">
      <p>Every edit also keeps a rolling backup of the unsaved work in this browser, for a calendar with a file or without one; a
        save clears it. After a crash, the next time you open the app it offers the work back. If you cancel that question, the
        backup waits under <b>Unsaved work</b>{' '}at the bottom of the File menu, where you can recover it or discard it (discarding
        is permanent). The backup never leaves this computer, and clearing your browsing data removes it. The saved file is the
        real copy.</p>
      <p>If the file was saved somewhere else since you loaded it, Save asks before overwriting, and autosave pauses until you
        decide.</p>
    </Sec>
    <Sec title="Sending it, and next season">
      <p>A .sptcal opens only in SPTCal, which needs a sign-in, so send an Excel or PDF export to anyone who doesn’t use it.
        To start the next season, Save As, change <Ui>Season</Ui> in Show info (the episodes renumber, 201, 202…) and move the
        dates with Shift.</p>
    </Sec>
    <Related ids={['changes', 'newreset', 'install']} />
  </>
}
