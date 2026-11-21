import { Lead, Sec, Steps, Step, Ui, Keys, Info, More, To, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Save keeps your calendar in a small file that ends in .sptcal. Load brings it back exactly as you left it.</Lead>
    <Sec title="Save">
      <Steps>
        <Step t="Click Save,">or press <Keys k="Mod+S" />.</Step>
        <Step t="Choose where to put the file.">Only the first save asks.</Step>
      </Steps>
      <p>After that, every save goes straight back to the same file with no window. To open it later, use <Ui>Load…</Ui>
        in the File menu (<Keys k="Mod+O" />), or double-click the file. See <To id="install" />.</p>
    </Sec>
    <Sec title="Save As: try a variation">
      <p><Ui>Save As</Ui> (<Keys k="Mod+Shift+S" />) copies what you’re working on into a new file and switches you to it. The
        original stays as it was, so it’s a way to fork a version.</p>
      <Info title="Chrome or Edge">Saving in place and Load need Chrome or Edge. In other browsers each save downloads a new
        copy instead.</Info>
      <More title="a permission prompt">The browser may ask “Let this site edit the file?” once for a file you loaded.
        Allow it, or the file can’t save in place. See <To id="trouble" />.</More>
    </Sec>
    <Related ids={['filemenu', 'autosave', 'newreset']} />
  </>
}
