import { Lead, Sec, Shot, Ui, Path, Table, Info, To, Related, ShowMe } from '../parts.jsx'
import wf from '../shots/wf-prefs.webp'
import mv from '../shots/mv-prefs.webp'

export default function Article() {
  return <>
    <Lead>Preferences holds the settings for each view. Some are saved with the calendar and travel with the file. A few
      stay on this computer.</Lead>
    <Sec title="Waterfall">
      <p><Path>Settings › Preferences › Waterfall</Path> <ShowMe at=".prefs-card:has(#one-col-btn)" view="sheet" tab="settings" sw="Preferences" /></p>
      <Shot src={wf} w={265} pins={[[56.2, 34.7], [21.3, 55.8]]}
        items={[
          <><b>Single Column Mode</b> · runs the whole calendar down one continuous column. Saved with the calendar.</>,
          <><b>Dates</b> · MM/DD or DD/MM. Saved with the calendar.</>,
        ]} />
      <p><b>Single Column Mode:</b> instead of a separate block of columns for every calendar year, the waterfall becomes one
        block, from the first working week to the last. Every phase keeps one column for its whole run, and its cells stay one
        column wide. It suits a show that is easier to follow as one long list, or a plan that crosses New Year and would
        otherwise split into two blocks. Excel and the PDF follow it. Turn it off to go back to a block for each year.</p>
      <p><b>Dates</b> offers MM/DD/YYYY, MM/DD/YY (the usual 1/6/25), DD/MM/YYYY and DD/MM/YY. It changes the Date column on
        screen, in Excel and in the PDF. With DD/MM, every other date follows the same order: notes, holidays, the header, and
        dates you type or paste.</p>
    </Sec>
    <Sec title="Month view">
      <p><Path>Settings › Preferences › Month view</Path></p>
      <Shot src={mv} w={265} pins={[[54.3, 16.3], [37, 37.5], [18.5, 55.1], [65.3, 64.2], [20.8, 74.7], [36.6, 85.9]]}
        items={[
          <><b>Label Production by</b> · Week, Episode or Block. Saved.</>,
          <><b>Add Production Week Label in Month View</b> · the grey “Production Week 2” beside each bar’s name, on screen and in the month PDF. Block and episode labels get switches like it when the bars can carry them. Kept on this computer.</>,
          <><b>Pause prep on days marked Off</b> · saved.</>,
          <><b>Number Production Days</b> · saved.</>,
          <><b>Size</b> · Standard, Large or Extra Large. Saved.</>,
          <><b>Paste notes…</b> · see <To id="mvnotes" />.</>,
        ]} />
      <p><b>Label Production by</b> picks what Production’s bars are called in the Month view: the week (“Production Week 3”),
        the episode (“Shoot 101”) or the block. The other names can show as grey text beside it, each with its own switch, and
        only the ones the bars can carry are shown. <b>Size</b> is Standard, Large or Extra Large, for the phase bars, hiatus
        bands and notes together. <b>Number Production Days</b> writes “Day 1”, “Day 2” and so on on every shoot day. All of
        them show in the month PDF.</p>
    </Sec>
    <Sec title="Saved, or kept here">
      <Table head={['Saved with the calendar', 'Kept on this computer']} rows={[
        ['Dates format, Single Column Mode, month Size, Number Production Days, Label Production by, Pause prep on days marked Off', 'Ripple Hiatus Periods, the Production Week, Block and Episode labels in the Month view, and (set in the Export PDF window) grid lines and the file name’s parts'],
      ]} />
      <Info title="Also here">The same tab has cards for Automatic notes (see <To id="auto" />) and Hiatus (see <To id="ripple" />).</Info>
    </Sec>
    <Related ids={['region', 'ripple', 'auto']} />
  </>
}
