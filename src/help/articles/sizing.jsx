import { Lead, Sec, Steps, Step, Tip, Ui, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>Drag to make a column wider or a row taller. The text inside resizes itself to fit, and what you set is what prints.</Lead>
    <Sec title="Drag a boundary">
      <Steps>
        <Step t="Hover a column’s edge, or the bottom edge of a row in the Date column." />
        <Step t="Drag.">A narrowed column shrinks its labels. A row’s height sets how many lines a note may use before it is cut off.</Step>
        <Step t="Double-click the boundary for automatic.">The column fits its widest entry again, and the row goes back to the default height.</Step>
      </Steps>
    </Sec>
    <Sec title="Rows line up on their own">
      <p>Every row starts at the same default height. While you drag one, it snaps to the default and to any height
        you have already set elsewhere, and the handle turns green when it locks on. Rows end up matching instead of a
        pixel apart.</p>
      <Tip>Widths and heights are shared with Excel and the PDF, so what you size on screen is what prints.</Tip>
    </Sec>
    <Related ids={['headings', 'read', 'textbar']} />
  </>
}
