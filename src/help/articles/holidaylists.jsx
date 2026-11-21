import { Lead, Ui, To, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>SPTCal skips the union holidays for your region when it counts shoot days. Always check the list against your own
      agreement.</Lead>
    <p><b>United States</b> has two lists of eleven IATSE holidays. <Ui>U.S. Area Standards</Ui> covers everywhere but New York:
      Los Angeles, Atlanta and Albuquerque are the same. <Ui>New York</Ui> (Local 52) swaps Good Friday for Veterans Day.
      Columbus Day is on neither.</p>
    <p><b>Canada</b> is chosen by province or territory. A holiday that falls on a weekend also gets an
      <i> (Observed)</i> weekday, the day that actually costs a shoot day.</p>
    <p>Pick your region in <To id="region" />, and choose what to enable in <To id="regiontab" />.</p>
    <Related ids={['region', 'regiontab']} />
  </>
}
