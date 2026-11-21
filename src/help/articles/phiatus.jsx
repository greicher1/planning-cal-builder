import { Lead, Sec, Steps, Step, Ui, Info, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>A phase can have a break of its own. Use it when one phase pauses but the rest of the production carries on.</Lead>
    <Sec title="Pause one phase">
      <Steps>
        <Step t="Open the Phases tab.">Find the phase, such as Writer’s Rm.</Step>
        <Step t={<>Turn on its <Ui>Hiatus</Ui> toggle.</>} />
        <Step t="Pick the Monday it starts and the number of weeks." />
      </Steps>
      <p>Like the all-phase hiatus, it pauses the phase without eating into it: the phase still delivers its full length.
        The pause stays in that phase’s own column in the waterfall and never widens into the others.</p>
    </Sec>
    <Sec title="Name it and color it">
      <p>Under the toggle are a name box and a color box. They label and color every week of the pause, in both views and
        every export. Double-click the band in the waterfall to go straight to them.</p>
      <Info title="It travels with its phase">When the phase moves, its break moves with it. With Ripple Hiatus Periods on,
        the phases that start after the break move too.</Info>
    </Sec>
    <Related ids={['hiatus', 'ripple']} />
  </>
}
