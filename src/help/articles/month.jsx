import { Lead, Sec, Shot, Tip, More, Ui, To, Related } from '../parts.jsx'
import month from '../shots/app-month.webp'

export default function Article() {
  return <>
    <Lead>The Month view draws your plan as a wall calendar, one month at a time: every phase is a bar across its days,
      and every shoot day, holiday and note sits on its date.</Lead>
    <Sec title="Get around">
      <Shot src={month} pins={[[97.4, 16.5], [77.1, 13.75], [48.6, 72.2], [43.8, 77.6], [72.9, 59.7]]}
        items={[
          <><b>The month map</b> · every month at a glance, with each phase as a bar under its name. Click a month to go
            there, or a phase to go to the month it starts in. The dark chip is the month on screen, a dot marks today’s month, and a red mark is an all-phase hiatus.</>,
          <><b>‹ Month ›</b> · steps one month at a time. The month between the arrows is the one on screen.</>,
          <><b>Episode bars</b> · Production is split into its episodes (“Shoot 101”), laid across the shoot days.</>,
          <><b>Holidays and automatic notes</b> · written on their day.</>,
          <><b>Your own notes</b> · added right on the day.</>,
        ]} />
    </Sec>
    <Sec title="Production, holidays and notes">
      <p>Each episode’s bar carries a grey label beside its name, such as “Production Week 2”, so you can see how far
        into the shoot you are. Union holidays and automatic notes (like “Start Principal Photography”) appear on the
        day they happen. To add a note of your own, hover a day and click <Ui>+</Ui>. See <To id="mvnotes" />.</p>
    </Sec>
    <Sec title="Change dates from the calendar">
      <p>Drag the middle of a bar to move its dates, drag its end to change where it starts or ends (its other end stays put),
        or double-click it to open its card. A hiatus band drags by its grip, unless it is locked (untick Lock in place first). Click a day for a menu of what it can do:{' '}
        <To id="daymenu" />.</p>
      <Tip>Export PDF in this view writes one month per page, in color, with the header.</Tip>
      <More title="the light grid lines">On screen the Month view’s grid lines are drawn lighter. The PDF keeps its black lines.</More>
    </Sec>
    <Related ids={['views', 'mvnotes', 'mvsize']} />
  </>
}
