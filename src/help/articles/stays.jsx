import { Lead, Sec, Table, Tip, To, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Shift, Build Around, the ▲ ▼ arrows and Ripple Hiatus Periods move phases. A few things stay on their dates,
      because they belong to the calendar, not to the plan.</Lead>
    <Sec title="What stays">
      <Table rows={[
        ['Union holidays', 'They’re real dates. A shoot moved into a holiday week needs one more day, so the wrap can move a day more or less than the rest.'],
        ['Notes with a date in them', '“Table read Ep 101 6/9/27” is about that day, so it stays on it.'],
        ['Locked hiatuses', 'An all-phase hiatus starts locked: a winter break belongs to its dates. Untick Lock in place on its card to let it travel with the plan.'],
      ]} />
      <Tip>The tools always say where the wrap actually landed.</Tip>
    </Sec>
    <Sec title="What travels with a phase">
      <p>Its own hiatus, its hiatus labels and colors, and Production’s Off and worked days, which follow the shoot day they
        were set on. Notes that stay with the phase (the default for a new note: see <To id="linked" />) follow it through every
        mover. A note left on its calendar week stays on that week, except that Shift also carries the week notes inside the
        weeks of the phases you ticked.</p>
    </Sec>
    <Related ids={['move', 'ripple', 'hiatus']} />
  </>
}
