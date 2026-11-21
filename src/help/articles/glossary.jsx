import { Lead, Sec, To } from '../parts.jsx'

const TERMS = [
  ['a.o.', <>“As of”: the date the calendar was last edited, in an export’s file name. <To id="names" /></>],
  ['Automatic note', <>A milestone note SPTCal writes and keeps dated, like “Start Principal Photography 6/29/26”. <To id="auto" /></>],
  ['Block', <>A run of shooting days, for shows that shoot in blocks rather than one episode at a time. <To id="episodes" /></>],
  ['Build Around', <>Pins one phase to a date and builds the others end to end around it. <To id="build" /></>],
  ['Episodic prep', <>A prep bar before each episode’s shoot, in the Month view. <To id="prep" /></>],
  ['Hiatus', <>A pause. An all-phase hiatus stops everything; a phase’s own hiatus pauses just that phase. Either way the phase still gets its full length. <To id="hiatus" /></>],
  ['Lock in place', <>An all-phase hiatus that keeps its dates when the plan moves. On to begin with.</>],
  ['Observed', <>The weekday off for a holiday that falls on a weekend.</>],
  ['Phase', <>A block of the schedule: Writer’s Room, Pre-Prep, Prod Prep, Production, Post, Localization, or your own. <To id="cards" /></>],
  ['Production Region', <>Where you shoot. It decides which union holidays the shoot skips. <To id="region" /></>],
  ['Ripple', <>Ripple Hiatus Periods: changing a hiatus moves the phases after it by the same weeks. <To id="ripple" /></>],
  ['Scenario', <>Another version of the plan, in its own tab, saved in the same file. <To id="scen" /></>],
  ['Shift', <>Moves phases by weeks or to a date and keeps the gaps between them. <To id="shift" /></>],
  ['Shoot day', <>A day Production shoots. Weekends, holidays and hiatus days aren’t shoot days.</>],
  ['Simultaneous Post', <>Post weeks that run during the shoot. <To id="simpost" /></>],
  ['.sptcal', <>A saved calendar: a small file of your entries. <To id="save" /></>],
  ['Tandem day', <>“8 + 1” is eight shoot days plus one tandem day, when a second crew shoots part of one episode while the first unit moves on to the next. Also called a double-up. <To id="tandem" /></>],
  ['Waterfall', <>The week-by-week calendar that matches the Excel export. <To id="views" /></>],
  ['WRO', <>Writer’s Room Opens: its date, in an export’s file name.</>],
]

export default function Article() {
  return <>
    <Lead>The words SPTCal uses, in a line each.</Lead>
    <Sec>
      <dl className="hp-gloss">
        {TERMS.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
      </dl>
    </Sec>
  </>
}
