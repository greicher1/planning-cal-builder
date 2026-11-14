// The recent calendars on an empty start (audit 2026-11, AUD2-030; default: shown in the empty preview, no reopening of
// the last file by itself, no intake screen). Portalled into the static `.start-recents` host that sits right AFTER
// #table-wrap in main.preview-panel (src/index.html) -- beside the grid, never inside it.
//
// Output only, like the file menu: the engine decides WHEN the list shows (reflectStartRecents() sets the host's
// `hidden` itself, in the same task as the render) and pushes the rows through the bridge. The input half needs no
// bridge: every row carries `data-id` and Load… carries `data-action="open"`, which the file menu's ONE delegated click
// handler in the engine matches on (`.start-recents` is in its closest() test), so a click here takes exactly the path
// a click in the File menu takes, unsaved-work question included.
//
// ⛔ No id on anything, and no input: collectFieldValues() sweeps input/select/textarea[id] into every saved file.
// buildSavedHtml() empties the host in a shareable copy: these are the SENDER's file names.
import { useState, useLayoutEffect, useCallback } from 'react'
import { Button, Text, UnstyledButton } from '@mantine/core'
import { installChrome } from './bridge.js'
import { IconFolder, IconCalendarPlain } from './icons.jsx'

export function StartRecents() {
  const [state, setState] = useState({ items: [] })
  const merge = useCallback((patch) => setState((s) => ({ ...s, ...patch })), [])
  // useLayoutEffect, as Header.jsx: the bridge must be installed before the engine's first push.
  useLayoutEffect(() => { installChrome({ startRecents: merge }) }, [merge])

  return (
    <div className="sr-card">
      {state.items.length > 0 && (
        <>
          <Text className="sr-head" size="xs" fw={600} c="var(--text-faint)">Recent calendars</Text>
          <div className="sr-list">
            {state.items.map((f) => (
              <UnstyledButton key={f.id} className="start-recent-item sr-row" data-id={f.id} title={f.name}>
                <IconCalendarPlain className="sr-ic" />
                <span className="sr-name">{f.name}</span>
              </UnstyledButton>
            ))}
          </div>
        </>
      )}
      {/* "Load…", per the terminology rule; data-action="open" is the engine contract, as in the File menu. */}
      <Button size="xs" radius="md" variant="default" className="start-recent-item sr-load" data-action="open"
              leftSection={<IconFolder className="btn-ic" />}>
        Load…
      </Button>
    </div>
  )
}
