// The app's own confirm/alert dialogs — UI-CONVENTIONS §4's "one feedback system", replacing the
// browser-chrome `confirm()` / `alert()` popups (owner's ask, rounds 3–4, 29 Aug 2026).
//
// HOW THE ENGINE CALLS IT. The engine's handlers await `chrome.dialog({kind, message, ...})`,
// which resolves true (confirmed / acknowledged) or false (cancelled). The bridge DEFAULT for
// `dialog` falls back to the native `window.confirm` / `window.alert` — deliberately, so a chrome
// that fails to mount degrades to the old dialogs instead of silently auto-answering destructive
// confirms. See bridge.js.
//
// withinPortal={false} is load-bearing: Mantine's default portal appends to the END of <body>,
// AFTER #print-root — and #print-root must stay the last body child (MANTINE-SEAM §3.1). Rendered
// inline, the modal lives inside #react-root (before #print-root), where both print paths'
// `body.printing-* > *:not(#print-root)` selectors already hide it.
//
// A dialog closed by ANOTHER dialog opening resolves undefined (see the dialog() below).
//
// Escape and outside-click both CANCEL a confirm — for a destructive decision, every ambiguous
// dismissal must be the safe answer. For an alert they acknowledge. An outside click within
// DOUBLE_CLICK_MS of opening is ignored: it is the second press of the double-click that raised
// the dialog (modalGuard.js, audit AUD2-061).
//
// kind:'choice' (29 Sep 2026, audit M-6): { message, choices:[{value, label, danger?}] } resolves the
// chosen `value`, or null for Cancel / Escape / outside-click -- again the safe answer, since the one
// caller (a file changed on disk) writes nothing on null.
import { useState, useLayoutEffect, useCallback, useRef } from 'react'
import { Modal, Button, Text, Group } from '@mantine/core'
import { installChrome } from './bridge.js'
import { useOutsideCloseGuard } from './modalGuard.js'

export function Dialogs() {
  const [dlg, setDlg] = useState(null) // { kind, title, message, confirmLabel, cancelLabel, danger }
  const resolveRef = useRef(null)

  useLayoutEffect(() => {
    installChrome({
      dialog: (opts) =>
        new Promise((resolve) => {
          // A second dialog while one is open closes the first rather than stacking — the engine
          // never intentionally opens two at once. It answers it UNDEFINED, not false (the 14 Nov
          // 2026 review of audit item 3.7): falsy, so every `if(!(await uiConfirm(...)))` still
          // reads it as the safe Cancel, but a caller that must tell "the user said No" from "the
          // question was swept away" can. The crash-recovery question counts a No toward stopping
          // asking (AUD2-056), and a question nobody answered must not count. A choice already
          // resolves null for Cancel; a superseded one resolves undefined too, equally falsy.
          if (resolveRef.current) resolveRef.current(undefined)
          resolveRef.current = resolve
          setDlg({ kind: 'confirm', ...opts })
        }),
    })
  }, [])

  const finish = useCallback((answer) => {
    const r = resolveRef.current
    resolveRef.current = null
    setDlg(null)
    if (r) r(answer)
  }, [])
  // The safe answer on a click outside, as Escape gives, except the second press of the double-click whose first
  // click raised this question (modalGuard.js, AUD2-061): "New" double-clicked on an edited calendar asks and STAYS.
  const outside = useOutsideCloseGuard(dlg, () => finish(dlg && dlg.kind === 'choice' ? null : !(dlg && dlg.kind === 'confirm')))

  if (!dlg) return null

  const isConfirm = dlg.kind === 'confirm'
  const isChoice = dlg.kind === 'choice'
  return (
    <Modal
      opened
      onClose={() => finish(isChoice ? null : !isConfirm)}
      closeOnClickOutside={false}
      withinPortal={false}
      centered
      /* A choice carries up to four buttons; at the default width the last one wrapped onto a line
         of its own (seen in the pane, 29 Sep 2026). */
      size={isChoice ? 'lg' : undefined}
      radius="lg"
      shadow="xl"
      title={dlg.title || (isConfirm ? 'Are you sure?' : 'Notice')}
      styles={{ title: { fontWeight: 600 } }}
      overlayProps={{ backgroundOpacity: 0.35, onClick: outside }}
    >
      {/* pre-line: the engine's existing messages carry \n\n paragraph breaks and • lists. */}
      <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
        {dlg.message}
      </Text>
      {isChoice ? (
        <Group justify="flex-end" mt="lg" gap="sm">
          <Button variant="default" size="xs" onClick={() => finish(null)} data-autofocus>
            {dlg.cancelLabel || 'Cancel'}
          </Button>
          {(dlg.choices || []).map((c) => (
            <Button key={c.value} variant={c.danger ? 'filled' : 'light'} color={c.danger ? 'danger' : undefined}
                    size="xs" onClick={() => finish(c.value)}>
              {c.label}
            </Button>
          ))}
        </Group>
      ) : (
      <Group justify="flex-end" mt="lg" gap="sm">
        {isConfirm && (
          <Button variant="default" size="xs" onClick={() => finish(false)} data-autofocus>
            {dlg.cancelLabel || 'Cancel'}
          </Button>
        )}
        <Button
          variant="filled"
          color={dlg.danger ? 'danger' : undefined}
          size="xs"
          onClick={() => finish(true)}
          data-autofocus={!isConfirm || undefined}
        >
          {dlg.confirmLabel || (isConfirm ? 'Continue' : 'OK')}
        </Button>
      </Group>
      )}
    </Modal>
  )
}
