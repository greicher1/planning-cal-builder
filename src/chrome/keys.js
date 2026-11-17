// keys.js -- the names of the keys the app tells people to press, for the computer they are on.
//
// WHY (November 2026 audit, WIN-3; owner, "work on it now", 16 Nov 2026). The app's words were written on a Mac:
// the Undo and Redo hover hints read "Undo (⌘Z)" and "Redo (⌘⇧Z)" in Windows Chrome too, the Ripple Hiatus hint and
// every shortcut in Help said ⌘, and Help covered Windows with one line ("On Windows, use Ctrl where these say ⌘").
// Most of the studio side is on Windows. The keys themselves always worked there (the handlers take Ctrl): only the
// WORDS were the Mac's. Now every place that names a platform key asks keyLabel() here, so Windows and Linux read
// Ctrl+Z / Ctrl+Shift+Z / Ctrl-click, and a Mac keeps ⌘Z / ⇧⌘Z / ⌘-click exactly as before.
//
// THE PLATFORM IS READ ONCE, when this module is evaluated (before the engine boots or React renders), into KEYS_MAC.
// Words are drawn once, so they must not change under someone mid-session, and one read means the hover hints, Help
// and the engine's own messages can never disagree. ⚠️ BEHAVIOUR is different: the shortcut handlers ask
// platformIsMac() on EACH press (isPlatformCommandKey, isMacCtrlClick), so a harness leg can stand in for another
// platform without a reload (filekeys K9, firstrun K4, mvmenu). Both read the platform through readPlatform() below,
// so there is one test of "is this a Mac", not three copies of the regular expression.
// ⚠️ A leg that fakes the platform for the WORDS must do it before this module runs: a leg's own script is injected
// at </body>, ahead of the app's deferred module, so its top level is early enough (oskeys does exactly that).
//
// THE FORMS, one rule per platform, so no string carries its own:
//   Mac:      Apple's glyphs in Apple's order (⌃⌥⇧⌘), then the key: ⌘Z, ⇧⌘Z, ⌘V. A named key takes a hyphen: ⌘-Enter.
//             A click: ⌘-click.
//   Others:   words joined with +, the platform key first: Ctrl+Z, Ctrl+Shift+Z, Ctrl+Enter. A click: Ctrl-click.
// Keys that are the same everywhere (Shift+Enter, Alt+Left, Esc, Delete) are written plainly where they appear and do
// not come through here: there is nothing to translate.
//
// SPEC: 'Mod+Shift+Z', 'Mod+V', 'Mod+Enter', 'Mod+click'. Mod is the platform's command key (⌘ / Ctrl). Ctrl, Alt
// and Shift are those keys on every platform.

// The platform as the browser reports it. userAgentData first (Chromium's, and the one that is not frozen), then the
// old navigator.platform. Never throws: a page with neither is not a Mac.
function readPlatform() {
  try {
    const n = navigator
    return (n.userAgentData && n.userAgentData.platform) || n.platform || ''
  } catch (e) { return '' }
}

// Read on each call: for the shortcut HANDLERS (see above).
export function platformIsMac() { return /^mac/i.test(readPlatform()) }

// Read ONCE: for the WORDS.
export const KEYS_MAC = platformIsMac()

const MAC_GLYPH = { Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Mod: '⌘' }   // ⌃ ⌥ ⇧ ⌘
const MAC_ORDER = ['Ctrl', 'Alt', 'Shift', 'Mod']                                    // Apple's own order
const PC_WORD = { Mod: 'Ctrl', Ctrl: 'Ctrl', Alt: 'Alt', Shift: 'Shift' }
const PC_ORDER = ['Mod', 'Ctrl', 'Alt', 'Shift']
const ARROWS = { Left: '←', Right: '→', Up: '↑', Down: '↓' }

// 'Mod+Shift+Z' -> '⇧⌘Z' on a Mac, 'Ctrl+Shift+Z' elsewhere. `mac` is for a leg's own checks only.
export function keyLabel(spec, mac = KEYS_MAC) {
  const parts = String(spec).split('+')
  const key = parts.pop()
  const mods = new Set(parts)
  const k = ARROWS[key] || key
  if (mac) {
    const g = MAC_ORDER.filter((m) => mods.has(m)).map((m) => MAC_GLYPH[m]).join('')
    return g + (k.length > 1 ? '-' : '') + k
  }
  const w = PC_ORDER.filter((m) => mods.has(m)).map((m) => PC_WORD[m])
  // Ctrl and Mod are the same key here: name it once.
  const words = w.filter((x, i) => w.indexOf(x) === i)
  return key === 'click' ? words.join('+') + '-click' : words.concat(k).join('+')
}

// Static copy that names keys (Help, in src/index.html) is written with the Mac's words, as it always was, and marks
// each platform key with its spec, `data-keys="Mod+S"`. A sentence that is true on one platform only carries
// `data-os="mac"` or `data-os="other"`. This writes the words and shows the sentences for this computer.
// ⚠️ It writes from the SPEC, never from the text it finds, and it sets `hidden` both ways: a shareable copy is a
// clone of this document, so one exported on Windows reaches a Mac with Windows words in it, and must come back as
// the Mac's when that copy boots.
export function localizeKeys(root, mac = KEYS_MAC) {
  if (!root || !root.querySelectorAll) return
  root.querySelectorAll('[data-keys]').forEach((el) => { el.textContent = keyLabel(el.getAttribute('data-keys'), mac) })
  root.querySelectorAll('[data-os]').forEach((el) => { el.hidden = (el.getAttribute('data-os') === 'mac') !== mac })
}
