import { Lead, Sec, Path, ShowMe } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Paste notes… adds many Month view notes at once from a list.</Lead>
    <Sec>
      <p>It’s in <Path>Settings › Preferences › Month view</Path>, while the Month view is on screen. <ShowMe at="#paste-notes-btn" view="month" tab="settings" sw="Preferences" /></p>
      <p>Write one note per line: the date, the text and, if you like, a color, such as <b>7/6/27, Location scout, pale
        blue</b>. A color is a swatch’s name or a #RRGGBB code. Columns copied from a spreadsheet work too.</p>
    </Sec>
  </>
}
