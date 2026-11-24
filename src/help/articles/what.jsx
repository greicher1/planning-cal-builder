import { Lead, Sec, Table, Info, To, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>SPTCal is a planning calendar for TV production. You say when each phase of a show starts and how long it runs, and
      it works out every date and draws it as a calendar you can read, change and send.</Lead>
    <Sec title="What it does">
      <p>Enter the phases of your show (Writer’s Room, Pre-Prep, Prod Prep, Production, Post, Localization, or phases of your
        own), each with a start and a length. SPTCal places them, counts Production in shooting days around weekends, your
        region’s union holidays and any hiatus, and tells you when you wrap. Change one date and everything that depends on
        it moves.</p>
      <Table head={['You get', 'What it is']} rows={[
        ['The Waterfall', 'A week-by-week grid, one color per phase, that matches the Excel file. The big picture.'],
        ['The Month view', 'A wall calendar: every day, each episode as a bar, with holidays and notes. The detail, for daily planning and crew.'],
        ['Excel and PDF', 'A workbook and PDFs you can send to people who don’t use SPTCal.'],
      ]} />
    </Sec>
    <Sec title="What it is good at">
      <p>Changing the plan. <To id="move">Shift and Build Around</To> move whole plans in one step, a <To id="hiatus">hiatus</To>{' '}
        pauses the show without losing a week of any phase, and <To id="scen">scenarios</To> let you try “what if the shoot
        starts later?” beside the original and compare the two.</p>
      <p>It plans at the level of phases, episodes and shoot days. It doesn’t schedule scenes, crew or budgets.</p>
    </Sec>
    <Sec title="Where your calendar lives">
      <Info title="A file on your computer">SPTCal is an app you install from Chrome or Edge, and you sign in with a code sent to
        your email. Your calendar is a small <b>.sptcal</b> file on your computer, and nothing you type is sent anywhere. See{' '}
        <To id="install" />.</Info>
    </Sec>
    <Sec title="Where to go next">
      <p><To id="welcome" /> shows where everything is on the screen, <To id="first" /> takes you from an empty calendar to one
        you can send, and <To id="views" /> says which view to use when.</p>
    </Sec>
    <Related ids={['welcome', 'first', 'views']} />
  </>
}
