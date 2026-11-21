import { Lead, Sec, Shot, Ui, To, Related } from '../parts.jsx'
import pic from '../shots/compare.webp'

export default function Article() {
  return <>
    <Lead>Compare scenarios puts up to twelve of your scenarios side by side, so you can see exactly what each one
      changes.</Lead>
    <Sec title="Read the table">
      <p>Open it with <Ui>Compare</Ui> beside the scenario tabs, or <Ui>Compare scenarios…</Ui> in a tab’s menu. Pick the
        scenarios with the chips at the top. Any value that differs from the scenario on screen is bold, with how far it moved
        underneath, like “Pushed 2 wks”.</p>
      <Shot src={pic} w={560} pins={[[3, 12.3], [77, 12.3], [47, 21], [4.5, 93.6], [20, 93.6], [33.5, 93.6]]}
        items={[
          <><b>Chips</b> · tick the scenarios to compare.</>,
          <><b>Only differences</b> · hides the rows that are the same everywhere.</>,
          <><b>A changed value</b> · bold, with how far it moved.</>,
          <><b>Export to Excel</b></>,
          <><b>Export PDF</b></>,
          <><b>Copy table</b> · paste it into an email.</>,
        ]} />
      <p>The three buttons take the table as it is shown, so turn on Only differences first if you want only those rows.
        More on scenarios: <To id="scen" />.</p>
    </Sec>
    <Related ids={['scen']} />
  </>
}
