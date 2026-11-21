// showme.js -- Help's "Show me": close Help, go where the control is, and draw a pulsing ring around it.
//
// The ring is a body-level box over the control, never inside it: nothing in the calendar (#table-wrap) or the print
// paths is touched, and it is gone after a few seconds or at the next press anywhere.
let closeHelp = () => {}
export function setHelpCloser(fn) { closeHelp = fn }

const wait = ms => new Promise(r => setTimeout(r, ms))
const visible = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }

export async function showMe({ at, view, tab }) {
  closeHelp()
  await wait(220)   // the window's own closing
  if (view === 'sheet' && !document.querySelector('#table-wrap table')) { document.getElementById('view-sheet-btn')?.click(); await wait(400) }
  if (view === 'month' && !document.querySelector('#table-wrap .month-view')) { document.getElementById('view-month-btn')?.click(); await wait(400) }
  if (tab === 'settings') { const b = document.querySelector('.side-settings-btn'); if (b && !b.classList.contains('active')) b.click(); await wait(250) }
  else if (tab) { document.querySelector(`.side-tab-btn[data-tab="${tab}"]`)?.click(); await wait(250) }
  const el = document.querySelector(at)
  if (!visible(el)) return false
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  await wait(120)
  ring(el)
  return true
}

function ring(el) {
  document.querySelectorAll('.help-ring').forEach(r => r.remove())
  const r = el.getBoundingClientRect()
  const box = document.createElement('div')
  box.className = 'help-ring'
  box.setAttribute('aria-hidden', 'true')
  Object.assign(box.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' })
  document.body.appendChild(box)
  const end = () => { box.remove(); document.removeEventListener('pointerdown', end, true) }
  document.addEventListener('pointerdown', end, true)
  setTimeout(end, 3600)
}
