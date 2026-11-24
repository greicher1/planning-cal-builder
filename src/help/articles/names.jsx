import { Lead, Sec, Steps, Step, Ui, Table, Tip, To, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Every export is named from the calendar itself, so each revision gets its own name and nothing is overwritten by
      accident.</Lead>
    <Sec title="What a name looks like">
      <p><b>Show Title S1 Planning Calendar v3 WRO 1.5.26 - a.o. 11.12.26.xlsx</b></p>
      <Table head={['Part', 'Means']} rows={[
        ['Show Title', 'The title in Show info'],
        ['S1', 'The season'],
        ['Planning Calendar', 'What the file is'],
        ['v3', 'The version in Show info'],
        ['WRO 1.5.26', 'The day the Writer’s Room opens'],
        ['a.o. 11.12.26', 'The date the calendar was last edited'],
      ]} />
      <p>The scenario’s name is left out unless you tick it. The Month PDF says <i>Month Calendar</i> where this says
        Planning Calendar, and Compare says <i>Scenario Comparison</i>. A saved .sptcal file is the title and the date.</p>
    </Sec>
    <Sec title="Change the parts and their order">
      <Steps>
        <Step t="Open Export PDF in the Waterfall view.">The File name list is in that window.</Step>
        <Step t="Tick the parts you want,">and drag a part by its handle to move it.</Step>
        <Step t="Click Export.">Only Export keeps the choice. Cancel leaves the list as it was.</Step>
      </Steps>
      <p>Every export’s name follows the list: Excel, both PDFs and Compare. To name just one PDF yourself, type in the box
        above the list instead.</p>
      <Tip>The parts stay on this computer, not in the calendar file. See <To id="pdf" />.</Tip>
      <p>The list is only in the Waterfall’s Export PDF window, and it names every export. So if you only use the Month view
        or only export to Excel, switch to the Waterfall, open Export PDF and click Export once to set the parts (that writes
        a PDF).</p>
    </Sec>
    <Related ids={['pdf', 'showinfo', 'hdrmodes']} />
  </>
}
