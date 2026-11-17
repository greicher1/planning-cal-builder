// A window opened by a double-click stays open (audit AUD2-061, 14 Nov 2026).
//
// Many people double-click every button. On a button that opens one of the app's windows (Export PDF, Compare, the
// "New calendar" question), the FIRST click opens it, and the SECOND press lands on the Mantine Modal's overlay,
// which is now where the button was: Modal's click-outside closed the window inside the same gesture. Export PDF
// then made no PDF and said nothing; Compare flickered. A re-click guard on the button cannot help, because the
// second press never reaches the button. Outlook and Excel absorb that second click, and so does this.
//
// So every app Modal turns Mantine's own click-outside OFF and closes on an overlay click itself, except within
// DOUBLE_CLICK_MS of opening, the longest gap that still counts as one double-click (Windows' and macOS's default
// double-click time). A click outside after that closes it exactly as before; Escape, Cancel and the close button
// never pass through here and are unchanged.
//
// Usage, in a component that renders <Modal> while `openKey` is truthy (a new value per opening restarts the clock):
//   const outside = useOutsideCloseGuard(dlg, () => finish(null))
//   <Modal closeOnClickOutside={false} overlayProps={{ backgroundOpacity: 0.35, onClick: outside }} ...>
// Call it before any early return (it is a hook).
import { useLayoutEffect, useRef } from 'react'

export const DOUBLE_CLICK_MS = 500

export function useOutsideCloseGuard(openKey, onClose) {
  const openedAt = useRef(0)
  const close = useRef(onClose)
  close.current = onClose
  // From the moment the window is on screen (commit), not from the click that asked for it: the PDF dialog first
  // waits for the engine to measure every paper, so the window can appear well after the first click.
  useLayoutEffect(() => { if (openKey) openedAt.current = performance.now() }, [openKey])
  return () => {
    if (performance.now() - openedAt.current < DOUBLE_CLICK_MS) return
    close.current()
  }
}
