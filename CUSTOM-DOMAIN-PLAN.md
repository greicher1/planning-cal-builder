# CUSTOM-DOMAIN-PLAN.md: moving SPTCal to an origin of its own

**A plan only. Nothing here is built.** Owner ruling R7 (FIX-PLAN §0, 25 Sep 2026): "scope the
service-worker cleanup now; plan a custom domain as a later, separate step." The scoping shipped in
v1.4.1 (4.2). This is the plan for the rest. Written 30 Sep 2026.

## Why

The app is served from `https://greicher1.github.io/planning-cal-builder/`. Its ORIGIN is
`https://greicher1.github.io`, which every Pages site of the account shares. Browser storage is per
origin, so any other page published there can read this app's IndexedDB (the Recents file handles,
the crash backups) and `localStorage` (preferences, header presets), and register service workers
over it (audit SUPPLY-3; `THREAT-MODEL.md`). No code inside the app can separate two sites that
share an origin. A domain of its own (for example `sptcal.<your-domain>`) gives it one.

## What cannot follow the move

The move is **one-way and loses per-origin state, once, for every user.** Nothing on the new origin
can read the old one's storage.

| Lost on the move | Consequence | Mitigation |
|---|---|---|
| **Recent files** (IndexedDB `FileSystemFileHandle`s) | the Recents list starts empty | none needed: the files themselves are untouched on disk. Each is re-opened once with Load…, and is then recent again on the new origin |
| **Crash backups** (unsaved work) | a backup left on the old origin is never offered again | the notice (below) asks users to save their work to a file before the date |
| **Preferences** (`localStorage` `sptcal.prefs`) | grid lines, month-view options and the **header preset library** reset to defaults | presets export and import as `.spthdr` today; the notice asks users to export any they want to keep |
| **The installed app** | its identity is bound to the old origin's manifest; it will open the old address, which redirects, and it will not recognise itself | users install again from the new address (the install gate offers it); the old app is removed by hand |

## The two ways to do it

| | A. This repo's Pages gets the custom domain | B. The new domain is served from a new site, and the old one stays up for a while |
|---|---|---|
| How | Settings ▸ Pages ▸ Custom domain on this repo | a second Pages site (or repo) carries the custom domain; this repo keeps serving `github.io` |
| The old address | GitHub **redirects it at once**, so no page runs there again | keeps working through a transition window, showing the moved notice |
| Users' chance to save work and export presets | only BEFORE the switch, from a notice shipped a release ahead | during the window as well |
| Cost | one settings change | two deploy targets for the window, then retire the old one |

**Recommendation: A, with the notice shipped one release ahead.** B is kinder but doubles the deploy
path this project guards so carefully ("a push IS a deploy"), and everything B's window protects
(unsaved work and presets) can be saved in advance if users are told.

## Steps (A)

1. **Owner decisions** (below).
2. **A release with the notice** (a dismissible strip in the chrome, like the update strip, NOT a
   blocking dialog). Wording to be approved, for example: "SPTCal moves to `<new address>` on
   `<date>`. Your saved calendar files aren't affected. Before then, save any unsaved work to a file,
   and export any header presets you want to keep as `.spthdr` files. Your Recent Files list will
   start empty at the new address."
3. **DNS**, after the notice has been live long enough:
   - verify the domain for the account (GitHub ▸ Settings ▸ Pages ▸ Verified domains), which guards
     against a takeover of the name;
   - add a `CNAME` record for the subdomain, pointing at `greicher1.github.io`;
   - set the custom domain in this repo's Pages settings, wait for the certificate, then tick
     **Enforce HTTPS**. With Actions-based Pages the domain lives in the settings; no `CNAME` file is
     needed in `dist/`.
4. **The same release as the switch:**
   - add the new host to the install gate's `GATE_HOSTS`, and change the manifest's
     `related_applications` id to the new URL (PWA-ONLY-PLAN.md §4.6: otherwise no installed user is
     recognised on the new origin);
   - update the README, and PROJECT-CONTEXT's live URL and its §11 deploy check.
   - Nothing else hard-codes the host: the update check fetches `version.json` relatively, and the
     CSP's `connect-src 'self'` follows the origin.
5. **Verify on production:** the old address redirects; a fresh profile on the new address shows the
   install gate; an installed app from the new address boots; Load and Save work (they need the File
   System Access API's per-origin grants afresh, which is expected).

## Owner decisions owed

1. The domain name, and who holds its DNS.
2. A or B (recommended: A).
3. How long the notice runs before the switch, and its wording.
4. Whether the switch release ships with other changes, or alone. Alone is recommended, so any
   problem is clearly the move.
