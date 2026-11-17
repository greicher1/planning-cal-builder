// File menu ▸ "Changes since last save…" (audit 2026-11 AUD2-103, idea I.3; owner: "work on it now", 16 Nov 2026).
//
// A studio coordinator sends this week's calendar and has to say what moved. This window lists it in plain lines
// ("Production pushed 2 wks (now 9/28/26 – 2/10/27)", "Hiatus 10/19/26 – 10/23/26 added (1 wk)") and Copy puts them
// on the clipboard, one per line, ready for an email. Nothing else: a line under the title saying since when, the
// list, Copy and Done (owner rule: easy as Outlook/Excel, no clutter).
//
// The engine works out every word (changesSinceSave in app.js: Compare's own values and Pushed / Pulled wording, the
// baseline kept in memory at the last Save or Load) and pushes {state, since, lines} here. This only lays it out.
//
// withinPortal={false}, as every app Modal: rendered inside #react-root, before #print-root, so both print paths hide
// it. No input anywhere in it, so nothing mints an id that collectFieldValues() could sweep into a saved file.
import { useState, useLayoutEffect } from 'react'
import { Modal, Text, Button, Group, Stack } from '@mantine/core'
import { installChrome } from './bridge.js'
import { useOutsideCloseGuard } from './modalGuard.js'

// What the window says when there is no list to show.
const MESSAGES = {
  none: 'There is no saved version to compare with yet. Save the calendar, or load a saved one, and what you change after that is listed here.',
  newtab: 'This scenario was added after that, so there is no saved version of it to compare with.',
  failed: 'The saved version couldn’t be read, so there is nothing to compare with.',
}

const ICON_COPY = (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 5.5V3.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
  </svg>
)

export function ChangesDialog() {
  const [dlg, setDlg] = useState(null)   // {state, since, lines}, or null when closed
  const [copied, setCopied] = useState(false)

  useLayoutEffect(() => {
    installChrome({ changesDialog: (opts) => { setCopied(false); setDlg(opts) } })
  }, [])
  // A click outside closes it, except the second press of the double-click that opened it (modalGuard.js, AUD2-061).
  const outside = useOutsideCloseGuard(dlg, () => setDlg(null))

  if (!dlg) return null
  const lines = dlg.lines || []
  // One change per line, as shown: pasted into an email it reads as a list.
  const copy = () => {
    const text = lines.join('\n')
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => setCopied(true), () => {})
  }

  return (
    <Modal
      opened
      onClose={() => setDlg(null)}
      closeOnClickOutside={false}
      withinPortal={false}
      centered
      size={520}
      radius="lg"
      shadow="xl"
      title="Changes since last save"
      className="changes-dlg"
      styles={{ title: { fontWeight: 600 } }}
      overlayProps={{ backgroundOpacity: 0.35, onClick: outside }}
    >
      <Stack gap="md">
        {dlg.since && <Text size="sm" c="dimmed" className="changes-since">{dlg.since}</Text>}
        {dlg.state !== 'ok' ? (
          <Text size="sm" className="changes-msg">{MESSAGES[dlg.state] || MESSAGES.failed}</Text>
        ) : lines.length ? (
          <ul className="changes-list" style={{ margin: 0, paddingLeft: 20 }}>
            {lines.map((l, i) => (
              <li key={i} className="changes-line" style={{ margin: '0 0 6px' }}>
                <Text size="sm" component="span">{l}</Text>
              </li>
            ))}
          </ul>
        ) : (
          <Text size="sm" className="changes-msg">No changes since then.</Text>
        )}
        <Group justify="space-between" gap="sm">
          <Button variant="default" size="xs" leftSection={ICON_COPY} onClick={copy} disabled={!lines.length}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button size="xs" onClick={() => setDlg(null)} data-autofocus>Done</Button>
        </Group>
      </Stack>
    </Modal>
  )
}
