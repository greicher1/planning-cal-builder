import { Lead, Sec, Steps, Step, Ui, Keys, Info, More, To, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Save keeps your calendar in a small file that ends in .sptcal. Load brings it back exactly as you left it.</Lead>
    <Sec title="Save">
      <Steps>
        <Step t="Click Save,">or press <Keys k="Mod+S" />.</Step>
        <Step t="Choose where to put the file.">Only the first save asks.</Step>
      </Steps>
      <p>After that, every save goes straight back to the same file with no window. To open it later, click the calendar’s name at the top left (it
        is the File menu, though it doesn’t say so) and choose <Ui>Load…</Ui> (<Keys k="Mod+O" />), or double-click the file. See{' '}
        <To id="install" />. Once a file is linked, autosave rewrites it every 10 minutes: see <To id="autosave" />.</p>
    </Sec>
    <Sec title="Save As: try a variation">
      <p><Ui>Save As</Ui> (<Keys k="Mod+Shift+S" />) copies what you’re working on into a new file and switches you to it. The
        original stays as it was, so it’s a way to fork a version.</p>
      <p><b>Save As or a scenario?</b> Save As makes a separate file, for a version you will send or keep. A <Ui>+ Scenario</Ui>{' '}
        is another tab in the same file, for alternatives you want to compare side by side. See <To id="scen" />.</p>
      <Info title="Chrome or Edge">Saving in place and Load need Chrome or Edge. In other browsers each save downloads a new
        copy instead.</Info>
      <More title="a permission prompt">The browser may ask “Let this site edit the file?” once for a file you loaded.
        Allow it, or the file can’t save in place. See <To id="trouble" />.</More>
    </Sec>
    <Sec title="Sending it, and next season">
      <p>A .sptcal opens only in SPTCal, which needs a sign-in, so send an Excel or PDF export to anyone who doesn’t use it.
        To start the next season, Save As, change <Ui>Season</Ui> in Show info (the episodes renumber, 201, 202…) and move the
        dates with Shift.</p>
    </Sec>
    <Related ids={['filemenu', 'autosave', 'newreset']} />
  </>
}
