import { Lead, Sec, Shot, Path, Info, Related } from '../parts.jsx'
import pic from '../shots/wf-prefs.webp'

export default function Article() {
  return <>
    <Lead>Single Column Mode runs the whole calendar down one continuous column, so a long show reads top to bottom
      with no break at each new year.</Lead>
    <Sec title="Turn it on">
      <Shot src={pic} w={265} pins={[[56, 34.5]]}
        items={[<><b>Single Column Mode</b> · in <Path>Settings › Preferences › Waterfall</Path>.</>]} />
      <p>Instead of a separate block of columns for every calendar year, the waterfall becomes one block, from the first
        working week to the last. Every phase keeps one column for its whole run, and its cells stay one column wide.</p>
    </Sec>
    <Sec title="When to use it">
      <p>It suits a show that is easier to follow as one long list, or a plan that crosses New Year and would otherwise
        split into two blocks. Turn it off to go back to a block for each year.</p>
      <Info title="Saved with the calendar">The setting is saved in the calendar file, and Excel and the PDF follow it.</Info>
    </Sec>
    <Related ids={['read', 'swap']} />
  </>
}
