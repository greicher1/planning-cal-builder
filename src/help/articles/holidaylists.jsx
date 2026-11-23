import { Lead, Ui, Path, To, Related } from '../parts.jsx'

export default function Article() {
  return <>
    <Lead>SPTCal skips the union holidays for your region when it counts shoot days. Always check the list against your own
      agreement.</Lead>
    <p><b>United States</b> has two lists of eleven IATSE holidays. <Ui>U.S. Area Standards</Ui> covers everywhere but New York:
      Los Angeles, Atlanta and Albuquerque are the same. <Ui>New York</Ui> (Local 52) swaps Good Friday for Veterans Day.
      Columbus Day is on neither.</p>
    <p><b>Canada</b> is chosen by province or territory.</p>
    <p><b>Elsewhere</b> there are lists for Mexico, the United Kingdom, Germany, Australia, France and Lithuania.</p>
    <p>Whether a holiday on a weekend also gets an <i>(Observed)</i> weekday, the day that actually costs a shoot day, depends on
      the region. The United States, Canada and the United Kingdom move it to a weekday (a few Canadian days, such as Truth and
      Reconciliation Day in Nova Scotia, New Brunswick and Prince Edward Island, stay on the weekend), while Germany, France,
      Lithuania and Mexico leave it where it falls (Australia’s Victoria list moves only New Year’s Day, Australia Day,
      Christmas and Boxing Day). The box under the region in <Path>Settings › Region</Path> says which rule
      your list follows.</p>
    <p>Pick your region in <To id="region" />, and choose what to enable in <To id="regiontab" />.</p>
    <Related ids={['region', 'regiontab']} />
  </>
}
