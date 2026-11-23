import { Lead, Sec, Shot, Ui, Path, Table, Info, To, Related } from '../parts.jsx'
import wf from '../shots/wf-prefs.webp'
import mv from '../shots/mv-prefs.webp'

export default function Article() {
  return <>
    <Lead>Preferences holds the settings for each view. Some are saved with the calendar and travel with the file. A few
      stay on this computer.</Lead>
    <Sec title="Waterfall">
      <p><Path>Settings › Preferences › Waterfall</Path></p>
      <Shot src={wf} w={265} pins={[[56.2, 34.7], [21.3, 55.8]]}
        items={[
          <><b>Single Column Mode</b> · see <To id="singlecol" />. Saved with the calendar.</>,
          <><b>Dates</b> · MM/DD or DD/MM. See <To id="datefmt" />. Saved with the calendar.</>,
        ]} />
    </Sec>
    <Sec title="Month view">
      <p><Path>Settings › Preferences › Month view</Path></p>
      <p><b>Label Production by</b> picks what Production’s bars are called in the Month view: the week (“Production Week 3”),
        the episode (“Shoot 101”) or the block. The other names can show as grey text beside it, each with its own switch.</p>
      <Shot src={mv} w={265} pins={[[54.3, 16.3], [37, 37.5], [18.5, 55.1], [65.3, 64.2], [20.8, 74.7], [36.6, 85.9]]}
        items={[
          <><b>Label Production by</b> · Week, Episode or Block. Saved.</>,
          <><b>Add Production Week Label in Month View</b> · the grey “Production Week 2” beside each bar’s name, on screen and in the month PDF. Block and episode labels get switches like it when the bars can carry them. Kept on this computer.</>,
          <><b>Pause prep on days marked Off</b> · saved.</>,
          <><b>Number Production Days</b> · saved.</>,
          <><b>Size</b> · Standard, Large or Extra Large. Saved.</>,
          <><b>Paste notes…</b> · see <To id="bulk" />.</>,
        ]} />
    </Sec>
    <Sec title="Saved, or kept here">
      <Table head={['Saved with the calendar', 'Kept on this computer']} rows={[
        ['Dates format, Single Column Mode, month Size, Number Production Days, Label Production by, Pause prep on days marked Off', 'Ripple Hiatus Periods, the Production Week, Block and Episode labels in the Month view, and (set in the Export PDF window) grid lines and the file name’s parts'],
      ]} />
      <Info title="Also here">The same tab has cards for Automatic notes (see <To id="auto" />) and Hiatus (see <To id="ripple" />).</Info>
    </Sec>
    <Related ids={['regiontab', 'datefmt', 'ripple']} />
  </>
}
