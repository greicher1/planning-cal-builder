# THREAT-MODEL.md: what a hostile input or page could do, and what stops it

Written 30 Sep 2026 for FIX-PLAN §7 ("What an XSS payload could do with live file grants: moot once
H-1 lands. Record it in the threat model"). There was no threat model for the app itself until now;
`SPTCAL-ENCRYPTION.md` §0 covers only the separate question of encrypting `.sptcal` files. Symbols,
never line numbers; the audit's evidence is in `AUDIT-REPORT.md`.

## What there is to protect

| Asset | Where it lives | Who can reach it |
|---|---|---|
| The calendars themselves | `.sptcal` / `.html` files on the user's disk | only the user, and the app through a file handle the user granted |
| Live file grants | `FileSystemFileHandle`s in IndexedDB (`spt-planning-cal` / `handles`, the Recents list) | any script running on the app's ORIGIN; a granted handle writes with no further prompt for the rest of the session |
| Unsaved work | the crash backup, one slot per page (`unsavedBackup:<id>`, same store) | any script on the origin |
| Preferences | `localStorage` (`sptcal.prefs`) | any script on the origin |

The origin is `https://greicher1.github.io`, which **every** Pages site of that account shares
(audit SUPPLY-3, owner ruling R7). A shareable copy opened from `file://` has its own opaque origin.

## The attack the audit found, and why it is closed

**Stored XSS through a crafted file (audit H-1).** Values read from a calendar file or a `.spthdr`
preset (a colour, an id, a day count) reached HTML sinks in the frozen renderers unescaped, so a file
carrying `#FF0000;"><img src=x onerror=…>` ran script as it rendered. Because the payload is ordinary
state it rode into every re-save, autosave, shareable copy, undo step and crash backup: one poisoned
file spread as people passed it on.

**What such a script could have done with live file grants** (the suspected item, reasoned from the
API, never executed): write, silently, to any calendar file the user had opened or saved **this
session**, because a granted `FileSystemFileHandle` needs no second prompt. It could also have read
the Recents handles and the crash backups in IndexedDB, rewritten the open calendar and let autosave
carry it to disk, and read other Pages apps' storage on the shared origin. It could not reach a file
the user had never granted, nor prompt for new access without a user gesture.

**Why it is moot now: two independent layers.**
1. **The boundary validator (v1.3.0, H-1).** `sanitizeSnapshot()` runs first in
   `applyStateSnapshot()`, which every path uses (Load, legacy `.html`, shareable copies, undo/redo,
   crash recovery, boot restore), and the same rules guard the `.spthdr` reader. Colours must be
   `#rrggbb`, ids `[\w-]+`, sizes finite and in range, dates ISO, lines strings; anything else falls
   back to the default. The values it rejects could never come from the UI, so no honest file
   changes. Typed text was always escaped correctly. The `hostile` leg runs every promoted hostile
   fixture through both load paths and a preset import, and requires zero markers fired.
2. **The Content-Security-Policy (v1.4.1, L-4).** Even if a new sink were ever reached, an injected
   script cannot run. `script-src` allows only the hashes of the app's own inline scripts and the one
   pinned ExcelJS URL (itself integrity-checked), so no inline handler, `javascript:` URL, `eval` or
   injected `<script>` executes. `tests/harness/cspproof.mjs` proves zero violations across the app's
   paths, and a positive control proves an injected script is refused.

## What remains, and where it is handled

| Residual | Why it is not closed here | Handled by |
|---|---|---|
| **The shared `github.io` origin.** Another repo's page on `greicher1.github.io` could read this app's IndexedDB (Recents handles, crash backups) and `localStorage`. | Origins are the browser's boundary; no code in this app can separate two sites that share one. | `CUSTOM-DOMAIN-PLAN.md` (R7): an origin of the app's own. Until then, anything else published on that origin can read this storage; whether anything is was never checked (AUDIT-REPORT, "not verified"). The boot clean-up no longer unregisters other repos' service workers (4.2). |
| **A compromised CDN** serving different ExcelJS bytes. | The app loads one third-party script. | Subresource Integrity, fail-closed: a different file is refused, and Export reports ExcelJS as not loaded. `defer` keeps a hung CDN from blocking boot (4.1). |
| **Clickjacking** (framing the hosted app). | `frame-ancestors` cannot be set from a `<meta>`, and Pages sets no headers. | Documented, no change (audit N-6, FIX-PLAN §0 defaults). |
| **Shareable copies keep the code they were exported with**, including any bug fixed since. | A copy is a snapshot of the app by design. | Only the snapshot JSON is ever read back from a file; a copy's code never runs inside the current app. `.sptcal` (data only) is the default save. |
| **A malicious browser extension, or someone at the unlocked machine.** | Outside what any web page can defend. | Out of scope. |
| **Confidentiality of a file once shared.** | Files are plain JSON. | `SPTCAL-ENCRYPTION.md`: designed, not built; owner decision D1 is parked. |
