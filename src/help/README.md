# Help (src/help/)

SPTCal's Help window. Chrome only: nothing here is frozen, nothing reaches a saved calendar, and nothing changes the
calendar, Excel or either PDF. **A Help change needs `npm run check` and the `help` leg, never the full gate.**

| File | What it is |
|---|---|
| `toc.js` | The sections and the articles in each, in order. The one list. Titles live here. |
| `articles/<id>.jsx` | One article's words. Read and edit only the file you need. |
| `parts.jsx` | The building blocks below. |
| `shots/*.webp` | Screenshots, made by `node tools/help-shots.mjs` (never by hand). |
| `HelpWindow.jsx`, `help.css`, `showme.js` | The window. Rarely touched. |

## Change an article

Edit `articles/<id>.jsx`. To add one: write the file, then add `{ id, title, view }` to its section in `toc.js` (an
entry with no file shows its `outline` as "being written"). Never rename a shipped id.

## Writing rules (owner's picks, 21 Nov 2026: style B, "picture first, details folded")

- Open with a `<Lead>` of one or two sentences: what it is and when you'd use it.
- Steps for anything with an order, one action each. The app's own button names, in `<Ui>`.
- Edge cases go in `<More>`. A brief article is a lead and a few lines.
- Plain words, "you", US spelling, "Pushed 2 wks" / "Pulled 1 day". Never engine words (stint, slot, lane).
- Keys through `<Keys k="Mod+Z" />`: it shows ⌘ on a Mac and Ctrl on Windows.
- Nothing confidential: the pictures and examples are the made-up show "Harbor Lights".

## Building blocks

```jsx
import { Lead, Sec, Steps, Step, Tip, Info, Careful, Ui, Keys, Path, More, Table, To, Related, ShowMe, Shot, Timeline } from '../parts.jsx'
import pic from '../shots/shift-panel.webp'

export default function Article() {
  return <>
    <Lead>One or two sentences.</Lead>
    <Sec title="A heading (it appears in On this page)">
      <Steps><Step t="Click Shift ▾.">The box opens.</Step></Steps>
      <Shot src={pic} w={381} pins={[[13, 27], [50, 68]]} items={[<><b>All phases</b> · …</>, <>…</>]} />
      <Tip>…</Tip> <Info title="…">…</Info> <Careful>…</Careful>
      <Path>Settings › Preferences › Hiatus</Path> <Keys k="Mod+Shift+Z" /> <To id="build" /> <ShowMe at="#pop-shift-btn" />
      <Table head={['', 'Shift', 'Build Around']} rows={[['Gaps', 'Kept', 'Closed']]} />
      <More title="why …">…</More>
    </Sec>
    <Related ids={['shift', 'build']} />
  </>
}
```

- `Shot`: `w` is the width it is drawn at in CSS px (half the picture's pixel width, since shots are taken at 2x);
  leave it out for a whole-window shot. Pins are `[left %, top %]` of the picture; `items` explain them in order.
- `ShowMe at=` must be a selector the app keeps (an id where there is one; the first match ON SCREEN is rung). `view="month"` /
  `tab="phases"` go there first, and with `tab="settings"` `sw="Region"` picks the Settings window's tab. The `help` leg presses every one.
- `Timeline`: see `articles/move.jsx`.

## Checking a change

`node tools/check-help-jsx.mjs` (a second: parses articles, checks ids, pictures, links and every ⓘ `help="…"`), `npm run
check`, and the one leg: `cd tests/harness && HARNESS_PAGE=/dist/index.html HARNESS_STATE=help-demo ./run.sh help 400`
(about 2 minutes; it opens every article and presses every Show me). Never the full gate. A leg that needs an article's text
opens Help first and reads `.hp-art` (`textContent`, so folded "More detail" counts).

## Pictures

`npm run build && node tools/help-shots.mjs [names…]` retakes them from `tests/fixtures/help-demo.sptcal`. A new
picture is a new entry in that script's `SHOTS` list. After retaking, check the dots still sit on their controls.
