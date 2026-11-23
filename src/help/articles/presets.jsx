import { Lead, Sec, Steps, Step, Shot, Path, Ui, To, Related, ShowMe } from '../parts.jsx'
import pic from '../shots/presets.webp'

export default function Article() {
  return <>
    <Lead>A header preset saves your whole header under a name, so you can put it on any calendar in one click.</Lead>
    <Sec title="Save and apply">
      <Shot src={pic} w={265} pins={[[79.2, 29.7], [27.4, 43.9], [87.7, 63.2], [75.5, 83.4]]}
        items={[
          <><b>Edit header template…</b> · opens the template editor for the view on screen.</>,
          <><b>Presets</b> · choose one and press <Ui>Apply</Ui>.</>,
          <><b>Save current header as preset…</b> · only offered in Template mode.</>,
          <><b>Import preset file…</b> · adds a preset from a file.</>,
        ]} />
      <Steps>
        <Step t={<>Set the header to <Ui>Template</Ui> and write it the way you want.</>}>See <To id="hdrmodes" />.</Step>
        <Step t={<>Open <Path>Settings › Presets</Path> and press <Ui>Save current header as preset…</Ui>.</>}>Name it. <ShowMe at=".hdr-preset-save-open" tab="settings" sw="Presets" /></Step>
        <Step t="On any other calendar, pick the preset and press Apply." />
      </Steps>
      <p>A preset holds the Waterfall’s header (nine lines) and the Month view’s (four) with their formatting; a header that was
        Manual when you saved is left out. Applying one sets every header it holds, whichever view is showing. It stores the variables, not the values they show today, which is why saving is
        offered only when a header is in Template mode.</p>
      <p><b>Default</b>, the first entry, is the standard header, not “back to Auto”: it switches both views to Template with
        the standard lines and clears your own lines and formatting (one undo step).</p>
    </Sec>
    <Sec title="Move a preset to another computer">
      <p>Presets stay on this computer and are never part of a saved calendar. Sending someone a .sptcal sends the header
        it is wearing, but not your library. To share one, press <Ui>Export…</Ui> beside it in the list (your own presets are listed under the
        buttons) to make a .spthdr file, and <Ui>Import preset file…</Ui> on the other computer.</p>
    </Sec>
    <Related ids={['hdrmodes']} />
  </>
}
