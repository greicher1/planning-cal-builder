// WHAT'S NEW: the list the What's New window shows once after an update (src/chrome/WhatsNewDialog.jsx).
//
// Owner, 19 Nov 2026: *"When a new update launches lets add a quick dialogue that explains what new features/updates
// were added. But only for things the user would actually care about - small UI changes, tiny bug fixes (not major
// ones), and anything behind the scenes, don't tell the user. For real substantial changes, give a list of the changes
// just like a real app would"*.
//
// ⛔ HOW TO ADD AN ENTRY (with the release that ships it, in the same commit as the README changelog):
//   - NEWEST FIRST. One entry per release that has something worth telling; a release with nothing worth telling adds
//     NOTHING, and then no window appears (the blue update bar still does).
//   - IN: a new feature, a change to how something works or what it prints, a fix for a bug users actually hit.
//     OUT: small look and label changes, small fixes, anything behind the scenes (tests, docs, speed, the build).
//   - Written for a user, in the app's own words: a short title, one or two plain sentences. No ids, no code names, no
//     plan names, no owner quotes, and nothing confidential (this file ships inside the app).
//   - `id` is unique and sorts by time ('YYYY-MM-DD', with '-2', '-3' for a second release on one day). It is what a
//     machine remembers as seen (localStorage 'sptcal.whatsNew'), so never change an id once it has shipped.
export const WHATS_NEW = [
  {
    id: '2026-11-19',
    date: '19 Nov 2026',
    items: [
      {
        title: 'Scenario tabs show their version',
        text: 'Each scenario tab shows its Version. When you duplicate a scenario, SPTCal offers the next version number, one click to take it.',
      },
      {
        title: 'Tandem days in Show info',
        text: 'Set tandem days right beside the shooting days per episode or block.',
      },
      {
        title: 'Build backwards with Finish before',
        text: 'An empty phase card before a dated phase now offers Finish before, so you can start from one date and fill in the phases leading up to it.',
      },
      {
        title: 'Zoom just the calendar',
        text: 'Pinch, Ctrl-scroll and ⌘+ / ⌘− now zoom the waterfall and month view, and leave the rest of the app as it is.',
      },
      {
        title: '“Final Delivery” on Post’s last day',
        text: 'The automatic note at the end of Post now reads “Final Delivery” with its date.',
      },
    ],
  },
]
