import { Lead, Sec, Shot, Ui, To, Related } from '../parts.jsx'
import pic from '../shots/compare.webp'

export default function Article() {
  return <>
    <Lead>Compare scenarios puts up to twelve of your scenarios side by side, so you can see exactly what each one
      changes.</Lead>
    <Sec title="Read the table">
      <p>Open it with <Ui>Compare</Ui> beside the scenario tabs, or <Ui>Compare scenarios…</Ui> in a tab’s menu. With three or more
        scenarios, chips at the top pick which ones to show. Any value that differs from the scenario on screen is bold, with how far it moved
        underneath, like “Pushed 2 wks”.</p>
      <Shot src={pic} w={560} pins={[[72.4, 12.3], [74.3, 46], [13.5, 89.3], [29.4, 89.3], [46.5, 89.3]]}
        items={[
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
