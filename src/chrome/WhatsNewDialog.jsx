// What's New (owner, 19 Nov 2026): after an update, a short window lists what changed that a user would care about.
//
// The list is src/whats-new.js (its header says what goes in and what stays out). This window:
//   - shows ONCE per machine per entry: localStorage 'sptcal.whatsNew' holds the newest entry id this machine has seen,
//     and every entry newer than that is shown (newest first, at most four), then the key moves to the newest;
//   - shows NOTHING when no entry is newer: a release with nothing worth telling gets the blue update bar alone;
//   - stays quiet for someone who has never used SPTCal on this machine (no key, no 'sptcal.prefs'), so a first launch
//     is not greeted with a list of changes to an app they have not seen. ⚠️ With no key it shows only the NEWEST entry,
//     and only when the bar's Reload was pressed ('sptcal.updating', set by the engine) or 'sptcal.prefs' exists: that
//     is the first release carrying this window, when no machine has a key yet;
//   - comes FIRST at launch (owner, 19 Nov 2026: *"the what's new dialogue should come before the "recover unsaved
//     work" dialogue"*): the launch's list is decided once, while the chrome first renders (before the engine boots),
//     and the engine's recovery question awaits chrome.whatsNewDone(), which settles when this window closes (at once
//     when there is nothing to show). It still waits for the app to be drawn and for any OTHER window to close;
//   - runs only in the deployed app (https). Not on file:// (a shareable copy), and not on localhost, where every
//     harness leg runs, unless asked: ?whatsnew=1 shows the newest entry and writes nothing; ?whatsnew=live runs the
//     real rule with the real key.
// Clicking the version under the SPTCal name (Header.jsx) opens it again with the latest entries (chrome.whatsNew).
//
// withinPortal={false}, as every app Modal: rendered inside #react-root, before #print-root, so both print paths hide
// it. No input anywhere in it, so nothing mints an id that collectFieldValues() could sweep into a saved file.
import { useState, useLayoutEffect, useEffect } from 'react'
import { Modal, Text, Button, Group, Stack } from '@mantine/core'
import { installChrome } from './bridge.js'
import { useOutsideCloseGuard } from './modalGuard.js'
import { WHATS_NEW } from '../whats-new.js'

const SEEN_KEY = 'sptcal.whatsNew'
const UPDATING_KEY = 'sptcal.updating'
const MAX_ENTRIES = 4

// localStorage throws outright in some contexts (a private window, site data off): every touch is guarded, and a
// machine where it fails simply never sees the window, which is the quiet failure this wants.
function store(fn) { try { return fn(window.localStorage) } catch (_) { return null } }

// Which entries this launch should show, recording them as seen. Called once per launch.
function pendingEntries() {
  const newest = WHATS_NEW.length ? WHATS_NEW[0].id : null
  const updating = store(s => s.getItem(UPDATING_KEY)) === '1'
  store(s => s.removeItem(UPDATING_KEY))
  if (!newest) return []
  let seen = store(s => s.getItem(SEEN_KEY))
  if (seen == null) {
    const usedBefore = updating || store(s => s.getItem('sptcal.prefs')) != null
    seen = usedBefore ? (WHATS_NEW[1] ? WHATS_NEW[1].id : '') : newest
  }
  store(s => s.setItem(SEEN_KEY, newest))
  return WHATS_NEW.filter(e => e.id > seen).slice(0, MAX_ENTRIES)
}

// This launch's list, decided ONCE (it moves the seen key), the first time anything asks: the component's first
// render, or the engine through whatsNewDone(), whichever comes first. `launchDone` settles when that list has been
// shown and closed, or will never be shown.
let launchList = null
let releaseLaunch = () => {}
const launchDone = new Promise(resolve => { releaseLaunch = resolve })
function getLaunchList() {
  if (launchList === null) {
    const mode = launchMode()
    launchList = !mode ? [] : mode === 'preview' ? WHATS_NEW.slice(0, 1) : pendingEntries()
    if (!launchList.length) releaseLaunch()
  }
  return launchList
}

function launchMode() {
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    const q = new URLSearchParams(location.search).get('whatsnew')
    return q === '1' ? 'preview' : q === 'live' ? 'live' : null
  }
  return location.protocol === 'https:' ? 'live' : null
}

// Up, and nothing else in front: the engine has drawn the phase cards, and no Mantine window, the Guide, or a print
// is open.
function readyToShow() {
  return !!document.getElementById('start-production')
    && !document.querySelector('.mantine-Modal-root')
    && !document.querySelector('#help-overlay.open')
    && !document.body.classList.contains('printing-calendar')
}

export function WhatsNewDialog() {
  const [entries, setEntries] = useState(null)   // the entries on screen, or null when closed
  const [isLaunch, setIsLaunch] = useState(false)   // the launch's own showing, whose close lets the engine go on

  useLayoutEffect(() => {
    installChrome({
      whatsNew: () => { setIsLaunch(false); setEntries(WHATS_NEW.slice(0, MAX_ENTRIES)) },
      whatsNewDone: () => { getLaunchList(); return launchDone },
    })
  }, [])

  useEffect(() => {
    const list = getLaunchList()
    if (!list.length) return
    let tries = 0, timer = 0
    const attempt = () => {
      if (readyToShow()) { setIsLaunch(true); setEntries(list); return }
      if (++tries < 300) timer = setTimeout(attempt, 250)
      else releaseLaunch()   // a minute and a quarter with no chance to show: never hold the recovery question longer
    }
    timer = setTimeout(attempt, 600)   // let the first render settle first
    return () => clearTimeout(timer)
  }, [])

  const close = () => { setEntries(null); if (isLaunch) { setIsLaunch(false); releaseLaunch() } }
  // A click outside closes it, except the second press of the double-click that opened it (modalGuard.js, AUD2-061).
  const outside = useOutsideCloseGuard(entries, close)

  if (!entries || !entries.length) return null
  return (
    <Modal
      opened
      onClose={close}
      closeOnClickOutside={false}
      withinPortal={false}
      centered
      size={460}
      radius="lg"
      shadow="xl"
      title="What’s new in SPTCal"
      className="whatsnew-dlg"
      styles={{ title: { fontWeight: 600, fontSize: 17 } }}
      overlayProps={{ backgroundOpacity: 0.35, onClick: outside }}
    >
      <Stack gap="md">
        {entries.map(e => (
          <div key={e.id} className="whatsnew-entry">
            <Text size="xs" c="dimmed" className="whatsnew-date" style={{ marginBottom: 8 }}>{e.version ? 'Version ' + e.version + ' · ' + e.date : e.date}</Text>
            <ul className="whatsnew-list">
              {e.items.map((it, i) => (
                <li key={i} className="whatsnew-item">
                  <Text size="sm" fw={600} className="whatsnew-title">{it.title}</Text>
                  <Text size="sm" c="dimmed" className="whatsnew-text">{it.text}</Text>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <Group justify="flex-end">
          <Button size="xs" onClick={close} data-autofocus>Got it</Button>
        </Group>
      </Stack>
    </Modal>
  )
}
