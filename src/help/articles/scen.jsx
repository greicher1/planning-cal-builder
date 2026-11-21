import { Lead, Sec, Steps, Step, Shot, Tip, More, Ui, To, Related, ShowMe } from '../parts.jsx'
import tabs from '../shots/scenario-tabs.webp'
import plan from '../shots/scenario-waterfall.webp'

export default function Article() {
  return <>
    <Lead>A scenario is another version of your calendar to try, like a sheet in Excel. Each one is a tab at the bottom
      left, so you can test “what if the shoot starts later?” without losing the original.</Lead>
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
          <><b>Compare</b> · see them side by side. See <To id="compare" />.</>,
        ]} />
    </Sec>
    <Sec title="The tab’s menu">
      <p>Right-click a tab for <Ui>Rename…</Ui>, <Ui>Duplicate</Ui>, <Ui>Compare scenarios…</Ui>,{' '}
        <Ui>Save this scenario as its own file…</Ui>, <Ui>Keep only this scenario…</Ui> and <Ui>Delete scenario…</Ui>.</p>
      <p>Each tab shows its Version. When you duplicate a scenario, SPTCal offers the next version number, one click to take it.</p>
      <Tip>Every scenario is saved in the one .sptcal file, and each keeps its own Undo.</Tip>
      <More title="exporting">Exports take the scenario on screen only. To send one scenario by itself, use{' '}
        <Ui>Save this scenario as its own file…</Ui>.</More>
    </Sec>
    <Related ids={['compare', 'save']} />
  </>
}
