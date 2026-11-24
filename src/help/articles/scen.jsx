import { Lead, Sec, Steps, Step, Shot, Tip, More, Ui, To, Related, ShowMe } from '../parts.jsx'
import tabs from '../shots/scenario-tabs.webp'
import plan from '../shots/scenario-waterfall.webp'
import compare from '../shots/compare.webp'

export default function Article() {
  return <>
    <Lead>A scenario is another version of your calendar to try, like a sheet in Excel. Each one is a tab at the bottom
      left, so you can test “what if the shoot starts later?” without losing the original. Compare puts them side by side.</Lead>
    <Shot src={plan} caption="“Shoot +2 wks”, a second scenario of Harbor Lights: the shoot starts two weeks later, and its tab sits beside the original’s." />
    <Sec title="Make and use scenarios">
      <Steps>
        <Step t={<>Click <Ui>+ Scenario</Ui>.</>}>The calendar on screen is copied into a new tab. <ShowMe at=".sc-strip" /></Step>
        <Step t="Click a tab to switch to it.">Whatever you change affects only that scenario.</Step>
        <Step t="Double-click a tab to rename it, or drag it to reorder.">Right-click it, or click the ▾ on the tab on screen, for more.</Step>
      </Steps>
      <Shot src={tabs} w={886} pins={[[6.8, 58.8], [22.3, 58.8], [39.8, 58.8], [53.6, 58.8]]}
        items={[
          <><b>A tab</b> · click to switch. Each shows its Version.</>,
          <><b>The tab on screen</b> · the ▾ opens its menu.</>,
          <><b>+ Duplicate</b> · copies the scenario on screen.</>,
          <><b>Compare</b> · see them side by side (below).</>,
        ]} />
    </Sec>
    <Sec title="The tab’s menu">
      <p>Right-click a tab for <Ui>Rename…</Ui>, <Ui>Duplicate</Ui>, <Ui>Compare scenarios…</Ui>,{' '}
        <Ui>Save this scenario as its own file…</Ui>, <Ui>Keep only this scenario…</Ui> and <Ui>Delete scenario…</Ui>.</p>
      <p>Each tab shows its Version. When you duplicate a scenario, SPTCal offers the next version number, one click to take it.</p>
      <Tip>Every scenario is saved in the one .sptcal file, and each keeps its own Undo. To keep a version as its own file
        instead, use Save As: see <To id="save" />.</Tip>
      <More title="exporting">Exports take the scenario on screen only. To send one scenario by itself, use{' '}
        <Ui>Save this scenario as its own file…</Ui>.</More>
    </Sec>
    <Sec title="Compare scenarios">
      <p>Compare puts up to twelve of your scenarios side by side, so you can see exactly what each one changes. Open it with{' '}
        <Ui>Compare</Ui> beside the scenario tabs, or <Ui>Compare scenarios…</Ui> in a tab’s menu. With three or more
        scenarios, chips at the top pick which ones to show. Any value that differs from the scenario on screen is bold, with
        how far it moved underneath, like “Pushed 2 wks”.</p>
      <Shot src={compare} w={560} pins={[[72.4, 12.3], [74.3, 46], [13.5, 89.3], [29.4, 89.3], [46.5, 89.3]]}
        items={[
          <><b>Only differences</b> · hides the rows that are the same everywhere.</>,
          <><b>A changed value</b> · bold, with how far it moved.</>,
          <><b>Export to Excel</b></>,
          <><b>Export PDF</b></>,
          <><b>Copy table</b> · paste it into an email.</>,
        ]} />
      <p>The three buttons take the table as it is shown, so turn on Only differences first if you want only those rows.</p>
    </Sec>
    <Related ids={['save', 'move']} />
  </>
}
