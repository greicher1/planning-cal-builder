# PWA-ONLY-PLAN.md — the hosted link runs the app only as an installed app

**Status: DECIDED and BUILT on branch `pwa-gate`; not merged, not deployed.** Written and ruled on
30 Sep 2026. The owner answered all nine decisions (§9, now recorded there), approved the wording
(§10), and chose the help line. §11 is what was built and what was proved.

---

## 0. The ask (owner, 30 Sep 2026)

> *"I only want users to use the app as the downloaded PWA. When they first open the github link,
> the chrome/edge page should only show a big download app button and not the rest of the app. When
> they already have the app downloaded, opening the link in a browser should have a large message
> that tells them to use the app rather than in the browser. […] The download button should be large
> and centered, so it is incredibly clear. […] you can make a system for edge but its honestly not
> very important as all users use chrome"*

In one line: **in an ordinary browser tab, the hosted link shows one full-screen page with one job
instead of the app. The app itself boots only inside the installed app window.**

---

## 1. This was tried once — read why it failed before changing anything

`ffadc6d` (23 Jul 2026) added a *"download gateway"*: on any non-`file://`, non-localhost origin a
head script hid the app and showed a **Download** button that saved a copy of the HTML file. It was
reverted nineteen minutes later (`edaf49b`). PROJECT-CONTEXT's bug history records why: **an installed
PWA loads the same hosted URL, so installed users were gated too.** Its fix "was started but never
finished".

This design differs in the one way that matters. ⛔ **It asks the WINDOW what it is before it asks the
URL anything.** An installed app window reports `display-mode: standalone`; that is checked first,
and it lets the app boot. Also gone: the download. The button **installs the PWA**, it does not save a file.

---

## 2. What exists today

- **Manifest:** an inline, percent-encoded `data:` URI in `src/index.html` — `name`/`short_name`
  `SPTCal`, `start_url` `.`, `scope` `.`, `display` `standalone`, two `any` icons, **no `id`**.
- **No service worker.** The boot clean-up in `initLegacyApp()` unregisters this app's old ones
  (SUPPLY-3). Removing the worker was deliberate — it served a stale app forever.
- **`#install-app-btn`** ("Install as app") at the top of the sidebar, revealed by a
  `beforeinstallprompt` listener attached at the **end** of `initLegacyApp()`.
- **`main.jsx`** renders the chrome, then calls `initLegacyApp()`. Nothing in `src/legacy/app.js` runs
  at import time — its only top-level statement is an `import`.
- **The update check** (`version.json`) runs only inside the booted app.
- **FIX-PLAN 4.9 (L-20)** — a one-line "SPTCal saves and loads in Chrome or Edge" notice on browsers
  without the File System Access API — is being built by the batch-4 session. The gate does **not**
  replace it: a shareable copy opened from `file://` in Safari or Firefox is never gated, and 4.9 is
  what that user sees. The gate's OTHER BROWSER screen reuses 4.9's wording so the two read as one.

---

## 3. What was measured (30 Sep 2026, Chrome 154.0.8037.92, macOS)

Scratch CDP probes against throwaway profiles, a local static server, and **one view-only load of the
live site**. Nothing was committed, and nothing touched a real profile.

| # | Question | Result | How |
|---|---|---|---|
| M1 | Does `beforeinstallprompt` fire with **no service worker**? | **Yes.** 22 ms after load (a probe page with this manifest), 285 ms (the built app), **860 ms on the live site**. Fresh profile, no clicks, no bypass flag, and Chrome reports no installability errors | CDP; `Page.getInstallabilityErrors` |
| M2 | Does the documented "one click + 30 s" engagement rule delay it? | **No** — it fired with zero interaction, headless and headful | same |
| M3 | Does today's sidebar button appear? | **Yes** — "Install as app" is visible on the live site now | same |
| M4 | What is the app's identity? | **`https://greicher1.github.io/planning-cal-builder/`** — the folder, because the data: manifest's `.` resolves against the page. The owner's real install points at the same URL | `Page.getAppId`; the installed app shim's `CrAppModeShortcutURL` |
| M5 | Can a browser **tab** tell the app is installed? | **Yes:** `navigator.getInstalledRelatedApps()` returns it once the manifest carries `related_applications: [{platform:"webapp", id:<that URL>}]` — **with the inline data: manifest** | CDP `PWA.install` into a throwaway profile |
| M6 | …for installs made from **today's** manifest (no `related_applications`)? | **Yes.** Installed from the old manifest, then served the new one: a fresh tab detects it. **No user has to reinstall** | same |
| M7 | Negative controls | A wrong `id` → `[]`. After uninstall → `[]` (nothing to go stale) | same |
| M8 | Is "no prompt fired" proof it's installed? | **No.** In headless the prompt still fired *after* install. Never infer install from silence | same |
| M9 | Is storage shared between the tab and the app? | Yes — a value written in one is read in the other | same |
| M10 | Can headless Chrome produce a real app window? | **No** — a launched app page reports `display-mode: browser`. The harness cannot see the standalone branch; the gate needs a localhost-only test override (§7) | same |
| M11 | Chrome's own install wording | ⋮ → **Cast, save, and share** → **Install SPTCal…** (beside **Install page as app…**); its in-tab offer is **Open in app** / **Stay in Chrome** | strings in Chrome 154's `locale.pak` |

⚠️ **M1 contradicts Chrome's own documentation.** developer.chrome.com (Dec 2023) says the prompt
*"still requires the presence of a fetch() handler"*. On 154 it does not. So **this plan needs no
service worker**, and that matters here. If a future Chrome brings the requirement back, the MENU
FALLBACK screen (§4.4) still gets people installed, because the menu path never needed one.

**Probe technique, for whoever builds the harness legs:**
- ⚠️ `PWA.install` / `PWA.uninstall` are **refused over `--remote-debugging-port`** ("wasn't found")
  and **work over `--remote-debugging-pipe`**.
- ⛔ **A test install must never use the name `SPTCal`.** A headful install writes an app shim into
  `~/Applications/Chrome Apps`, where the owner's real `SPTCal.app` lives.
  - The first install probe did use the real name, but headless, and headless wrote no shim. That was
    checked: the owner's shim was unchanged.
  - Every later probe was renamed `ProbeCal`.

**From documentation, not measured here:**
- Desktop Chrome **139+** opens links clicked into an installed app's scope *in the app* ("navigation
  capturing"), unless the user opted out.
- `getInstalledRelatedApps` needs desktop Chrome/Edge **140+**.
- The **Web Install API** (`navigator.install()`, `<install>`) ships on desktop in **Chrome 156**. Its
  intent to ship was approved on 30 Sep 2026, and 154 does not have it.

**Not measured, and owed by hand at build time (§7 step 6):**
- A real app window reports `standalone`.
- Whether the tab becomes the app window after `prompt()` → Install, or stays a tab.
- Whether "Open SPTCal" is captured into the app.
- Edge's menu wording.
- Safari and Firefox — they only ever see the "use Chrome" screen.

---

## 4. How it will work

### 4.1 One decision, before anything paints

A small **classic** inline `<script>` at the very top of `<head>` in `src/index.html`, before the
manifest link and before the module. It is synchronous, so it runs before `<body>` is parsed:

```
gated  = protocol is https  AND  hostname in GATE_HOSTS          (today: ['greicher1.github.io'])
appWin = display-mode is standalone | window-controls-overlay | minimal-ui | fullscreen
if (!gated || appWin)  -> return. Nothing else happens; the app boots exactly as it does today.
else                   -> <html data-app-gate>; capture beforeinstallprompt + appinstalled;
                          start getInstalledRelatedApps(); show the gate.
```

- ⛔ **`appWin` is tested first, and it fails OPEN.** Locking out an installed user is the one failure
  this project has already shipped once. Any window that looks like an app window gets the app —
  including `fullscreen`, so an installed app reloaded while fullscreen still boots. The price is
  that a browser tab in F11 fullscreen slips through. Accepted: the gate steers, it is not security
  (§8).
- **Never gated:**
  - `file://` — shareable copies, and legacy `.html` calendars (whose code never runs anyway).
  - `localhost` / `127.0.0.1` — dev, and **every harness leg**.
  - Any other host.
  - A future custom domain is one entry in `GATE_HOSTS`, plus the manifest id in §4.6.
- ⛔ **`beforeinstallprompt` must be captured HERE, in the head, not in the module.** It fired 22–860 ms
  after load (M1). The ~1 MB module can finish parsing later than that. The event fires once per
  load, so a late listener silently loses it. That is also a latent race in today's sidebar button,
  which listens at the end of `initLegacyApp()`.

### 4.2 The app never boots in a gated tab

- **CSS in the same `<head>`:** `html[data-app-gate] body > :not(#app-gate){display:none !important}`.
  The app's skeleton is never painted, so there is no flash of the app (the July gateway got this
  part right).
- **`main.jsx`: one early return.** If `<html>` carries `data-app-gate`, skip `root.render(…)` and
  `initLegacyApp()`. A gated tab therefore has none of these:
  - no engine and no React chrome;
  - no IndexedDB backup slot, no autosave, no update poll, no `beforeunload` guard;
  - no service-worker clean-up.

  Nothing in the frozen surface runs, and nothing in it is edited.
- **In the app window, the only difference is a hidden `<div id="app-gate" hidden>`**:
  - It is a direct child of `<body>`, so the print paths' `body.printing-* > *:not(#print-root)`
    already hides it.
  - It holds buttons and links only: **no `input` / `select` / `textarea`, and no `id` on any
    control**. That is UI-CONVENTIONS §10 gate 9, and `collectFieldValues()` sweeps every id'd field.
  - It rides along in shareable copies and does nothing there.
- **Isolated styling.** Every gate rule is scoped under `#app-gate`, so the global `legacy.css` and
  Mantine's baseline, which `main.jsx` still imports, cannot restyle it.
- **One icon source.** The gate shows the app icon. It must not become a *third* copy of the icon bytes
  (README: there are already two, and they drifted once). The build injects `APP_ICON` into the gate
  markup.

### 4.3 Which screen — a small state machine in the head script

```
Chromium desktop? ── no ──► phone or tablet? ── yes ──► PHONE
       │                            └──── no ─────────► OTHER BROWSER  ("open this in Chrome")
      yes
       ▼
   CHECKING  (icon only; normally well under a second)
       ├─ getInstalledRelatedApps() lists SPTCal ───────────────► ALREADY INSTALLED
       ├─ beforeinstallprompt fired, and the check said "no" ──► INSTALL
       └─ 2.5 s and neither ──► Chrome/Edge: MENU FALLBACK · any other Chromium: OTHER BROWSER

INSTALL ──click──► prompt() ──► CHROME'S BOX OPEN
    ├─ accepted ─► display-mode turns standalone ─► reload ─► the app boots (the tab became the app)
    │           └─ appinstalled, and still a tab ──► JUST INSTALLED
    └─ dismissed ─► CANCELLED  (button again; with no fresh prompt available it shows MENU FALLBACK's steps)
```

- **Installed beats installable.** INSTALL shows only after `getInstalledRelatedApps()` has answered
  "no" (M8). It answers in milliseconds, so the wait is invisible.
- **Reload on a `display-mode` change** covers Chrome turning the install tab into the new app window
  without reloading it. That window would otherwise go on showing the gate.
- **Chromium detection** uses `navigator.userAgentData`, which only Chromium exposes. `brands` chooses
  Chrome or Edge wording for the fallback steps, and nothing else depends on the brand. Brave and
  Opera simply get whichever screen their events lead to.

### 4.4 The screens — each has exactly one main action

| Screen | Main action | Shown when |
|---|---|---|
| INSTALL | **the big button** → Chrome's install box | first visit in Chrome/Edge |
| CHROME'S BOX OPEN | none — Chrome's box is the action | right after the click |
| CANCELLED | the big button again | the user cancelled Chrome's box |
| JUST INSTALLED | "Open SPTCal" (optional) | installed, and this tab stayed a tab |
| ALREADY INSTALLED | **"Open SPTCal"** | the app is installed and the link was opened in a tab — the owner's "large message" |
| MENU FALLBACK | numbered steps | Chrome offered no prompt: Incognito/Guest, a device policy, an old Chrome, a future Chrome change |
| OTHER BROWSER | "Copy link" | Safari, Firefox and the rest |
| PHONE | "Copy link" | a phone or tablet (D5) |

**INSTALL's layout — the owner's "large and centered":**
- The app icon (~96 px), the headline, then the button, centred both ways in the viewport.
- The button is **at least 360 × 88 px with a 26 px / 600 label**, clamped down on small windows.
- It is solid navy `#2C3E50` with a white label (10.9:1), and it takes focus on arrival, so Enter
  works.
- The only other text is one short line under it.

⚠️ **The solid fill departs from the app's primary-button style.** UI-CONVENTIONS §3b has primary
buttons wear the *light accent tint*. On a page whose only job is this one click, solid navy reads as
"press this" at a glance, so the plan recommends it — the owner's call (D8).

### 4.5 "Open SPTCal" from a tab

A web page cannot launch an app directly. The button is an ordinary link to the app's own URL with
`target="_blank" rel="noopener"`. On desktop Chrome 139+, a clicked link into an installed app's
scope **opens the app** ("navigation capturing"), unless the user once chose *Stay in Chrome* (M11).
Under the button the screen always says where the app lives (Dock / Start menu).

- ⚠️ Capture from a page that is itself in the app's scope is **unverified** (§7 step 6).
- **If capture doesn't work, the fallback is a `protocol_handlers` entry** (`web+sptcal:`). It is not
  in the plan by default: it adds a Chrome permission prompt on first use, and it reaches existing
  installs only after their next manifest update.

### 4.6 Manifest changes — additive only

- **Add** `"related_applications": [{"platform":"webapp","id":"https://greicher1.github.io/planning-cal-builder/"}]`.
  That is the whole detection mechanism (M5, M6). Do **not** set `prefer_related_applications` —
  `true` suppresses the prompt.
- **Recommended:** `"launch_handler": {"client_mode": "focus-existing"}`. With it, an "Open SPTCal"
  click or any captured link focuses the open window. Without it, Chrome may start a second copy of
  the engine on the same files: two autosaves, and the stamp-conflict dialog (D7).
- ⛔ **Do NOT add `id`, and do not touch `name`, `short_name`, `start_url`, `scope` or the icons.** The
  installed identity is the computed id in M4. The README records what a changed `name` risks: an
  install can show up as a new app.
- **Follow the 18 Sep rename's method for the percent-encoded edit:**
  1. Count-verify every token.
  2. Fetch and parse the manifest in the running app.
  3. Assert that `Page.getAppId` is unchanged.

### 4.7 Edge

It is the same code path. Edge fires the same events and has `getInstalledRelatedApps` from 140. Only
the MENU FALLBACK steps differ: expected "… → **Apps** → **Install SPTCal**", to be confirmed on a real
Edge window. Those steps are the only Edge-specific branch.

### 4.8 Wording rule

CLAUDE.md's Load rule is about calendar **files** ("Load…", "Could not load…"). "Open SPTCal" is about
the **app**, which is how people talk about apps, so it does not break that rule. Where a screen names
the browser, it says "Chrome" or "Edge" to match the one the user is in.

---

## 5. What does NOT change

- **The installed app.** Its boot path is byte-for-byte today's. The only differences are the manifest's
  additions and the hidden gate markup.
- **Saved calendars (§0 rule 3).**
  - `.sptcal` and `.html` files still load in the app.
  - Shareable copies and legacy `.html` files opened from `file://` are never gated.
  - The snapshot, `captureSnapshot()` and every `fields.byId` id are untouched.
- **The frozen surface (§0 rule 2).**
  - The gate never touches `#table-wrap`, `#print-root`, the writers or their CSS.
  - `main.jsx`'s early return sits before the chrome renders. It is not a change to any frozen symbol.
- **The harness.** Every existing leg runs on localhost, where the gate is off. The whole gate suite,
  unchanged, is the proof that app mode is unchanged.
- **No telemetry.** The gate sends nothing anywhere, and `getInstalledRelatedApps` is answered
  locally.
- **The rollback.**
  - The root `index.html` (v1.2.0) has no gate, and Pages "Deploy from a branch" still restores it
    instantly.
  - Reverting the gate's commit is the ordinary off switch.

---

## 6. Risks, and what handles each

| Risk | Handled by |
|---|---|
| **Installed users locked out** (the July failure) | `appWin` checked first; fail open; a hand check on a real install before AND after deploy; revert = off switch |
| Chrome stops offering the prompt (M1 regresses, or a policy) | MENU FALLBACK, whose menu path always works; `navigator.install()` as a later enhancement (Chrome 156) |
| Work computers that block app installs | MENU FALLBACK names it; the help line (D4) says who to ask |
| Incognito / Guest windows (apps can't be installed there) | MENU FALLBACK says so |
| Installed under a different Chrome profile | Installs are per profile; ALREADY INSTALLED and MENU FALLBACK both mention it |
| **Unsaved work in a browser tab when the gate ships** | That tab never reloads by itself: the update notice asks first, and `beforeunload` guards the reload. The crash backup is in IndexedDB on the same origin, and `offerBackupRecovery()` scans **every** page's slot, so the work is offered back **inside the app** |
| The prompt fires before a listener exists | Captured in the head script (§4.1) |
| A flash of the app before the gate | The attribute and CSS are in place before `<body>` parses |
| A stale "installed" answer after an uninstall | Nothing is stored; `getInstalledRelatedApps` is live (M7) |
| CSP (FIX-PLAN 4.1) blocks the new inline script | `check-build` computes inline-script hashes at build time (confirmed with the batch-4 session) |
| A custom domain later | `GATE_HOSTS` + the `related_applications` id. ⚠️ A new origin is a **new app**, so everyone reinstalls. That belongs to the custom-domain plan, but the gate at least makes it visible instead of silent |
| Safari "Add to Dock" / an iPad home-screen app gets through as an app window | Accepted (fail open). FIX-PLAN 4.9's notice tells them saving needs Chrome or Edge |
| A gated tab still downloads ExcelJS from the CDN | Harmless bandwidth; not worth a special case |

---

## 7. Build order — when approved, each step gated

1. **Manifest additions** (§4.6). Assert `Page.getAppId` is unchanged. `npm run check` gains two
   asserts: `related_applications` is present, and its `id` equals the Pages URL.
2. **Head script + gate markup + gate CSS** (§4.1–§4.4), with a **localhost-only** override. Production
   ignores both of these:
   - `?gate=install|box|cancelled|installed|already|menu|other|phone` forces a screen;
   - `?gate=live` runs the real resolver.
3. **`main.jsx` early return.**
4. **Retire `#install-app-btn`** (D6). In the gated world it could only ever appear in a browser tab,
   and the gate owns those.
5. **Harness.**
   - A **`pwagate`** leg (`run.sh`) forces each screen and asserts:
     - exactly that screen shows;
     - `.layout` and `header.app-header` are `display:none`;
     - the engine never booted — no phase rows, no `unsavedBackup:*` key written;
     - the button is centred within ±8 px and at least 360 × 88 px at 1600 × 1200;
     - no `[id]` on a control inside `#app-gate`;
     - every string equals the chosen copy.
   - A **`pwagatelogic`** leg stubs `getInstalledRelatedApps` and dispatches a synthetic
     `beforeinstallprompt` under `?gate=live`. It walks every edge of §4.3's machine, including the
     reload on a `display-mode` change and the 2.5 s timeout.
   - The full gate must stay green: that is the proof the app is unchanged.
6. **A headful check in a throwaway profile, under a renamed test app** (never `SPTCal` — §3). Check
   each of these:
   - installing via the big button;
   - whether the tab becomes the app or stays a tab;
   - the app window reports standalone and boots;
   - a tab then shows ALREADY INSTALLED;
   - "Open SPTCal" is captured into the app;
   - after uninstall, a tab shows INSTALL again;
   - Edge's menu wording.
7. **Docs, in the same breath:**
   - the README changelog;
   - HANDOFF;
   - PROJECT-CONTEXT's bug-history line about the July gateway (now superseded);
   - UI-CONVENTIONS (the gate screen's conventions);
   - a CLAUDE.md rule: *the hosted link boots the app only in an installed window; never gate `file://`
     or localhost*. **Every CLAUDE.md edit is shown to the owner before it is committed.**
8. **Cut a version** — the four steps in CLAUDE.md.
9. **Deploy only on the owner's approval**, then verify on the live URL:
   - on the owner's machine, a tab shows ALREADY INSTALLED **and the app still boots**;
   - a fresh profile shows INSTALL;
   - Safari shows OTHER BROWSER.

---

## 8. What this cannot do — said plainly

**It steers; it does not enforce.** The same site serves both the tab and the app. A determined person
can still get the app in a tab, for example by spoofing `display-mode` in DevTools or by opening a
shareable copy from `file://`. That is fine for the goal, which is keeping ordinary users out of the
browser version. Anything stronger needs a server, and this app deliberately has none (HANDOFF §3, *A
single-file client-side app cannot hold a secret*).

---

## 9. Decisions — ✅ ALL RULED by the owner, 30 Sep 2026

The owner's answers, verbatim: *"1. wording looks good. 2. Lets use install. 3. next release.
4. Contact Graham Reicher for help. 5. yes 6. yes 7. yes. 8. solid navy. 9. no."*

| # | Ruling |
|---|---|
| D1 | The recommended wording: voice **A** throughout, with ALREADY INSTALLED's headline in voice **C** ("Please use the SPTCal app, not the browser") |
| D2 | **Install** — the button says *Install SPTCal* |
| D3 | **The next release** — no heads-up banner first |
| D4 | The help line is the owner's own text: **"Contact Graham Reicher for help."** It shows at the foot of every screen except CHECKING (the half-second "One moment…") |
| D5 | **Yes** — phones and tablets get the PHONE screen |
| D6 | **Yes** — the sidebar's "Install as app" button is retired |
| D7 | **Yes** — `launch_handler: {client_mode: "focus-existing"}` |
| D8 | **Solid navy** |
| D9 | **No** bypass link |

The table below is the menu the owner chose from, kept for the reasoning.

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | The wording | one option per message, from §10 | voice **A** throughout; ALREADY INSTALLED takes **C**'s headline, which is the owner's own words |
| D2 | "Install" or "Download" on the button | Install SPTCal · Get the app · Download the app | **Install**. Chrome's box that follows says *Install*, and nothing lands in Downloads. The July gateway literally downloaded a file, so "download" has history here |
| D3 | Rollout | (a) the gate ships in the next release · (b) a heads-up release first: browser tabs get a banner with an Install button for N days | **(a)**. Most users already run the installed app (owner, 28 Aug) |
| D4 | A help line on the gate | none (strict) · *"Contact the person who sent you this link"* · *"Ask your IT team…"* | **"the person who sent you this link"** — no address needed in a public repo |
| D5 | Phones / tablets | PHONE screen ("open on your computer") · let Android install it | **PHONE screen** — the app is built for a desktop window |
| D6 | Today's sidebar "Install as app" button | retire · keep | **retire** |
| D7 | `launch_handler: focus-existing` | add · leave out | **add** |
| D8 | Button fill | solid navy · the app's light-tint primary | **solid navy** |
| D9 | An owner-only bypass (`?browser`, one page load, linked nowhere) | add · don't | **don't** — revert + deploy is the off switch, and a bypass link gets forwarded |

---

## 10. Wording options

✅ **Chosen (D1): column A everywhere, except ALREADY INSTALLED's headline from column C.** The help line
(D4) is the owner's own: *"Contact Graham Reicher for help."* The app's `src/index.html` holds the
live copy, and `tests/harness/t/pwagate.js` asserts it word for word.

Four voices, so a whole set can be picked at once. Any cell can also be swapped on its own.
**A · Plain** (recommended) · **B · Friendly** · **C · Firm** · **D · Minimal**. "Chrome" becomes "Edge"
in Edge. `—` means the element is left out.

### INSTALL — first visit (the big button)

| Element | A · Plain | B · Friendly | C · Firm | D · Minimal |
|---|---|---|---|---|
| Headline | Install SPTCal to get started | Let's get SPTCal on your computer | SPTCal runs as an installed app | SPTCal |
| Line | It opens in its own window, like any other app. | It only takes a few seconds, and then it's right there in your Dock or Start menu. | It doesn't run in a browser tab. Install it to build and save calendars. | — |
| **Button** | **Install SPTCal** | **Get the app** | **Install the app** | **Install** |
| Under the button | Chrome will ask you to confirm. Click Install. | Free, and it only takes a moment. | Required to use SPTCal. | — |
| Small link | Already installed? Open SPTCal from your Dock or Start menu. | Already have it? Just open it from your Dock or Start menu. | Already installed? Use the app, not this link. | Already installed? |

The owner's own word, if D2 goes that way: **Download SPTCal** · **Download the app**.

### CHROME'S BOX OPEN — after the click

| A | B | C | D |
|---|---|---|---|
| Click Install in the box Chrome just opened. | Almost there! Confirm in the box at the top of your window. | Confirm the install in Chrome to continue. | Waiting for Chrome… |

### CANCELLED — the user closed Chrome's box

| Element | A | B | C | D |
|---|---|---|---|---|
| Line | Install was cancelled. SPTCal only runs as an installed app. | No problem. Whenever you're ready, it's one click. | SPTCal can't be used without installing it. | Not installed. |
| Button | Install SPTCal | Get the app | Install the app | Try again |

### JUST INSTALLED — this tab stayed open

| Element | A | B | C | D |
|---|---|---|---|---|
| Headline | SPTCal is installed | You're all set! | Installed. Use the app from now on. | Done |
| Line | It's open in its own window. You can close this tab. | SPTCal just opened in its own window. You can close this tab — next time, open it from your Dock or Start menu. | From now on, open SPTCal from your Dock or Start menu, not this link. You can close this tab. | You can close this tab. |
| Button (optional) | Open SPTCal | Take me to the app | Open the app | Open |

### ALREADY INSTALLED — the link was opened in a browser tab (the "large message")

| Element | A | B | C | D |
|---|---|---|---|---|
| Headline | SPTCal is installed on this computer | You already have the SPTCal app | Please use the SPTCal app, not the browser | Open the SPTCal app |
| Line | Open it from your Dock (Mac) or Start menu (Windows). | Everything works the same there. Just open it from your Dock or Start menu. | SPTCal doesn't run in a browser tab. Use the installed app. | — |
| **Button** | **Open SPTCal** | **Take me to the app** | **Open the app** | **Open** |
| Hint | Or use Chrome's Open in app button in the address bar. | Tip: keep SPTCal in your Dock so it's always one click away. | Nothing happened? Find SPTCal in your Applications folder (Mac) or Start menu (Windows). | — |

### MENU FALLBACK — Chrome offered no install prompt

| Element | A | B | C | D |
|---|---|---|---|---|
| Headline | Install SPTCal from Chrome's menu | One more step to install SPTCal | Install SPTCal to continue | Install from the menu |
| Steps (Chrome — measured, M11) | 1. Click **⋮** at the top right of Chrome. 2. Choose **Cast, save, and share**, then **Install SPTCal…** 3. Click **Install**. | same | same | same |
| Steps (Edge — to confirm) | 1. Click **…** at the top right of Edge. 2. Choose **Apps**, then **Install SPTCal**. 3. Click **Install**. | same | same | same |
| Note: installed | Already installed? Open SPTCal from your Dock or Start menu. | Already have it? Just open it from your Dock or Start menu. | Already installed? Use the app, not this link. | Already installed? Open it. |
| Note: Incognito | In an Incognito or Guest window? Apps can't be installed there — open this link in a regular window. | Using Incognito or Guest? Switch to a regular window and try again. | Apps can't be installed from Incognito or Guest windows. | Not in Incognito. |
| Note: profiles | Installed it under another Chrome profile? Switch to that profile. | Installed it in a different Chrome profile? Switch to that one. | SPTCal installs per Chrome profile. | — |

### OTHER BROWSER — Safari, Firefox, others

| Element | A | B | C | D |
|---|---|---|---|---|
| Headline | Open this link in Google Chrome | SPTCal needs Google Chrome | This browser can't run SPTCal | Use Chrome |
| Line | SPTCal installs and runs in Google Chrome or Microsoft Edge. | It's a quick install in Chrome. Copy this link and open it there. | SPTCal saves and loads in Chrome or Edge. Open this link there to install it. *(FIX-PLAN 4.9's voice)* | — |
| Button | Copy link | Copy the link | Copy link | Copy |
| After copying | Link copied. Paste it into Chrome. | Copied! Now paste it into Chrome. | Copied. Open it in Chrome. | Copied |
| Secondary | Don't have Chrome? Get it free. | New to Chrome? It's a free download. | Chrome is required. Get it free. | Get Chrome |

### PHONE — a phone or tablet (only if D5 keeps this screen)

| Element | A | B | C | D |
|---|---|---|---|---|
| Headline | Open SPTCal on your computer | SPTCal is made for a bigger screen | SPTCal isn't available on phones or tablets | Use a computer |
| Line | Open this link in Chrome on your Mac or PC to install it. | Send yourself this link, then open it in Chrome on your computer. | Install it from Chrome on a Mac or PC. | — |
| Button | Copy link | Copy the link | Copy link | Copy |

### CHECKING — usually well under a second

| A | B | C | D |
|---|---|---|---|
| One moment… | Just a sec… | Checking for SPTCal… | *(icon only, no text)* |

### The browser tab's title

| Screen | A | B | C | D |
|---|---|---|---|---|
| Install screens | Install SPTCal | Get SPTCal | SPTCal: install required | SPTCal |
| Already installed | Open the SPTCal app | SPTCal is installed | SPTCal: use the app | SPTCal |

### Help line (only if D4 wants one)

| A | B | C | D |
|---|---|---|---|
| Trouble installing? Contact the person who sent you this link. | Stuck? Whoever shared this link can help. | Can't install on a work computer? Ask your IT team to allow Chrome apps. | *(none — strict)* |

### Heads-up banner (only if D3 chooses the two-step rollout)

Shown inside the app, in a browser tab only, for N days before the gate ships.

| A | B | C | D |
|---|---|---|---|
| From {date}, SPTCal opens only as an installed app. Install it now — it takes a few seconds. **[Install SPTCal]** | SPTCal is becoming an app! Install it now and you're ready for {date}. **[Get the app]** | Browser use of SPTCal ends {date}. Install the app to keep working. **[Install the app]** | SPTCal becomes an app on {date}. **[Install]** |

---

## 11. As built (30 Sep 2026, branch `pwa-gate`, rebased onto `80ebd56`)

**Files:**

| File | What changed |
|---|---|
| `src/index.html` | The gate `<script>` and `<style>` after `<title>`; `#app-gate` (nine screens, owner's wording) as the first element after `saved-state`; two manifest keys appended, with every existing byte of the encoding kept; `#install-app-btn` removed |
| `src/main.jsx` | `if (!document.documentElement.hasAttribute('data-app-gate')) { … render … initLegacyApp() }` |
| `src/legacy/app.js` | Only the old install-button listener block, now a comment saying why it's gone |
| `src/styles/legacy.css`, `src/chrome/bridge.js` | The retired button's rule and its unused bridge entry |
| `tools/check-build.mjs` | 14 → 25 checks, plus an allowlist for one outbound LINK (`www.google.com/chrome/`, `<a href>` only) |
| `tests/harness/t/pwagate.js`, `t/pwagatelogic.js`, `gate.sh` | Two new legs, first in the generic audit list |

**How the resolver ended up** (the plan's §4.3, with what building it changed):
- The gate writes its screen onto `<html data-app-gate="…">` and the CSS shows that screen. So the
  first paint is already the right screen for Safari, Firefox and phones, and no JS has to wait for
  `<body>`.
- Wiring (clicks, the icon, focus) runs when `readyState` leaves `loading`, which is BEFORE the
  deferred ~1 MB module runs. `DOMContentLoaded` would have waited for all of it.
- The icon is read out of the manifest (its 192 px entry is byte-identical to `APP_ICON`), so there
  is no third copy of the icon bytes.
- The 2.5 s fallback clock starts at `load`, not at head time. Most of the file is still arriving on a
  slow connection, and Chrome cannot offer an install before the page has loaded.
- A late prompt upgrades MENU FALLBACK to INSTALL; a click with no prompt pins MENU.
- `display-mode: fullscreen` counts as an app window at load (fail open). A CHANGE to fullscreen does
  not trigger the reload, because F11 on the gate is not an install.

**Proved:**
- `npm run check` 25/25.
- `pwagate` 13/13 and `pwagatelogic` 10/10. Three mutations turn them red:
  - the engine booting under the gate → 9/13 red;
  - a smaller button → 5/13 red;
  - installable ranked above installed → 2/10 red (L3, L7).
- Full gate **666/0** on `9577784`, then **686/0** after the rebase onto `80ebd56`. Both
  `=== GATE PASSED ===`.
- Gate 7 by hand: `fence` A/B against a build of the base commit. 511 computed-style entries, 235 of
  them in the waterfall, **0 differences**.
- In the pane:
  - every screen at 1440 × 900, and PHONE at 375 px;
  - the button is 360 × 88, horizontally centred to the pixel, 26 px / 600, navy, focused on arrival;
  - 0 console errors;
  - `?gate=live` walked checking → menu → install → box → cancelled → menu with a synthetic prompt.
- **Real headful Chrome 154**, throwaway profile, the build renamed `ProbeCal` with its id pointed
  at `localhost` (never the real name, §3):

  | Step | Result |
  |---|---|
  | First visit, a tab | **INSTALL**, with Chrome's REAL `beforeinstallprompt` captured by the head script |
  | A new tab after install | **ALREADY INSTALLED**, from the real `getInstalledRelatedApps()` |
  | **The installed app window** | **The app booted**: `display-mode: standalone`, no gate attribute, 6 phase rows, title "SPTCal", at the plain start_url where a tab gets the gate. The July failure mode, measured fixed |
  | The same plain URL in a tab | ALREADY INSTALLED (the localStorage hook works in real Chrome) |

**Not proved, and owed by hand:**
- **The tab turning into the app window after an install from the big button** (Chrome's reparent).
  It is covered only synthetically (L6: the display-mode change triggers the reload). CDP's
  `PWA.openCurrentPageInApp` hung and took the DevTools connection with it, and Chrome's native
  install box cannot be clicked from CDP.
- **Whether "Open SPTCal" is captured into the app.** The run died before that step.
- **Edge's menu wording.**
- These three are exactly what a person sees in the owner's post-deploy check (§7 step 9): uninstall
  or use a fresh profile, click the big button, confirm the app comes up, then open the link in a tab
  and press Open SPTCal.

**Traps found while building (each also written where it belongs):**
- ⚠️ **The Edit tool drops a trailing space at the end of `new_string`.** It turned
  `<link rel="manifest" href=` into `rel="manifest"href=`. Chrome still parses that, but
  `check-build`'s manifest check went red, which is how it was caught. Never end an edit string with
  whitespace that matters.
- ⚠️ **Flex drops the spaces around inline pairs** (`.ag-wait`): "the boxChromejust opened". Keep one
  inner span.
- ⚠️ **A DevTools install (`PWA.install`) leaves the app set to open in a BROWSER TAB**, so
  `PWA.launch` reused a tab. `PWA.changeAppUserSettings({displayMode:'standalone'})` is needed
  before a launch means an app window. It also fires no `appinstalled` in the tab.
- ⛔ **A crashed headful probe leaves its app shim in `~/Applications/Chrome Apps`.** Check it by its
  `CrAppModeShortcutURL`, and remove only a shim whose URL is the probe's own `localhost`. The
  owner's real `SPTCal.app` is beside it.

---

## Sources

- Chrome for Developers, *Revisiting Chrome's installability criteria* (Dec 2023) — the fetch-handler
  claim that M1 overturns: https://developer.chrome.com/blog/update-install-criteria
- web.dev, *What does it take to be installable?* (updated Sep 2024) — the engagement rule M2 found not
  applied: https://web.dev/articles/install-criteria
- Chrome for Developers, *Is your app installed? getInstalledRelatedApps()* — desktop support, 140+:
  https://developer.chrome.com/docs/capabilities/get-installed-related-apps
- Chrome for Developers, *Navigation management into installed PWAs* — capturing, 139+:
  https://developer.chrome.com/docs/capabilities/pwa-navigation-management
- Chrome for Developers, *Install web apps with the new HTML install element* (May 2026):
  https://developer.chrome.com/blog/install-element-ot
- blink-dev, *Intent to Ship: Web Install API* (Sep 2026; desktop, Chrome 156):
  http://www.mail-archive.com/blink-dev@chromium.org/msg17503.html
