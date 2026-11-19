# CLOUDFLARE-ACCESS-PLAN.md: SPTCal behind a sign-in, on an address of its own

**A plan. Nothing in the SPTCal repo is built yet.** Written 18 Nov 2026, after a test that passed
(§2). It replaces [`CUSTOM-DOMAIN-PLAN.md`](CUSTOM-DOMAIN-PLAN.md) (30 Sep 2026) as the plan for
moving the app's address: that plan's table of what cannot follow a move (§5 here) still holds, but
its recommended route (a custom domain on this repo's GitHub Pages) does not, because GitHub Pages
cannot put a sign-in in front of a site.

## 1. What the owner asked for, and what is settled

The owner (18 Nov 2026): make the repo private and put some kind of password in front of getting
the app. Their manager suggested a "one-time key". Settled in that conversation:

- **Cloudflare Access with emailed one-time codes.** A user opens the address, types their work
  email, and gets a 6-digit code by email. That is the "one-time key". Each person is let in or
  removed on their own, and there is no shared password.
- **Hosting moves from GitHub Pages to Cloudflare Pages.** It has to: a sign-in in front of a
  GitHub Pages site leaves the `github.io` address open to anyone who goes to it directly.
- **The code stays in this repo on the owner's personal GitHub, made private.** A personal account
  can have private repos for free. Moving it to the work GitHub account is optional, can happen at
  any time, and users would not notice, because the app's address belongs to Cloudflare, not GitHub.
- **The owner sets it up without IT.** Emailed codes need nothing from IT. Signing in with the work
  account's single sign-on can be added later as a second option on the same address, with no
  reinstall, but only IT can connect it.
- **Rejected:** GitHub access tokens (they unlock file downloads, not a website, so users would get a
  downloaded file with no install and no updates, and a token reads the whole repo); a password baked
  into the page (one password for everyone, no way to remove one person, and it fights the CSP and
  the install gate); GitHub Enterprise's private Pages (every user needs a GitHub seat).

## 2. The test (18 Nov 2026): passed

A private test repo published a test-only build of v1.17.0 to a Cloudflare Pages project, behind
Access with emailed codes. The test build differed from v1.17.0 only in the install gate's
`GATE_HOSTS` and the manifest's `related_applications` id, both pointed at the test address.

| What | Result |
|---|---|
| The code email arrives; sign-in works | ✅ |
| The main address, a preview address and `/index.html` all go to the sign-in first | ✅ (302 to the Access login, checked with curl) |
| The install screen in a browser tab; installing; reopening the installed app | ✅ the owner, and a coworker on **both Mac and Windows** as a first-time user |
| Save, Load, Excel and the PDFs inside the installed app | ✅ |
| The update strip ("Version X is available") behind the sign-in | ✅ (a pretend 1.17.1 in `version.json`) |
| An admin REVOKING a session while the app is open | ⚠️ works, not smoothly: a reload showed "This page isn't working"; a relaunch showed Access's "token is expired" page; one more reload reached the sign-in |
| A sign-in running out naturally | ⏳ **not yet tested** (§6, D9) |

## 3. How it works

```
user ──> https://<address>/  ──Cloudflare Access──>  not signed in: sign-in page (email, code)
                                                      signed in:     the Pages project (index.html, version.json)
GitHub Actions (private repo) ──wrangler pages deploy dist──> the Pages project
```

- The installed app still loads from the site on every launch (no service worker, by design), so a
  user always gets the newest version, and gets the sign-in page first only when their sign-in has
  run out.
- Calendars never go to Cloudflare. They stay as files on users' computers, as now. Cloudflare holds
  only the allowed email addresses and a log of sign-ins.
- A `pages.dev` project (or a domain of its own) is an ORIGIN of its own. That also closes the
  shared-origin exposure `CUSTOM-DOMAIN-PLAN.md` was written for: today every Pages site on the
  account shares `greicher1.github.io`'s storage.

## 4. Steps

### Phase A: Cloudflare, for real (the owner, guided) — ✅ DONE 18 Nov 2026

As built: the Pages project `sptcal` (created from the test repo, holding only a "not here yet"
placeholder), locked by an Access application covering `sptcal.pages.dev` and `*.sptcal.pages.dev`;
team domain `sptcal.cloudflareaccess.com`; the "Allow Members" policy plus `SPTCal users` (the
owner's list of emails); a backup Super Administrator invited. The deploy key `sptcal deploy`
(Pages Edit only, **expires 18 Nov 2028 (set by the owner): renew it before then, or deploys stop**) and the
Account ID are this repo's Actions secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`, set
19 Nov 2026 UTC. Checked with curl: the address, `/index.html` and a preview address all answer 302
to `sptcal.cloudflareaccess.com`. The key itself is first used, and so first proven, by Phase B's
deploy.
1. A Pages project for the real address (D1). The deploy creates it on its first run.
2. A deploy key: a custom API token with ONE permission, Account › Cloudflare Pages › Edit, on the
   owner's account only, no IP filter. Stored with `gh secret set` as `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID` in THIS repo; the token never passes through a Claude session.
   ⚠️ The test showed the easy mistake: the Account ID is the 32-character code in the dashboard's
   address bar, never the token pasted twice.
3. Zero Trust: the team name (D2), Free plan.
4. The Access application. ⛔ Two public hostnames, both required: the address itself AND
   `*.<project>.pages.dev`, because every deploy also gets a preview address that is public unless
   covered. With a custom domain, the `pages.dev` address must be covered too. Policy per D4,
   session length per D5, login method One-time PIN.
5. Check with curl from outside that every one of them answers 302 to the Access login.

### Phase B: the code (Claude, on a branch, then the full gate) — ✅ BUILT 18 Nov 2026 as v1.21.0

As built, on branch `cloudflare-access` (cut from `origin/main` at v1.20.1): steps 6-12 as written, with three
choices made in the building. (1) The moved strip in the installed app is `#update-notice` itself, retold on the old
host (no new strip joins the one-at-a-time machinery), and the update check does not run there. (2) The moved screen is
a tenth gate screen, `moved`, with its own title; `?gate=moved` shows it on localhost and
`localStorage sptcal.movedTest = '1'` shows the strip. (3) Export App With Data's card is gone, but a HIDDEN
`#share-copy-btn` is rendered on localhost only, because about thirty legs plus `cspproof` / `excelretry` build a
shareable copy through it to prove that copies already sent still open cleanly. A signed-out update check is not tested
by a leg (no harness page can produce Cloudflare's redirect); its code is three lines.
6. **Deploy workflow.** A Cloudflare deploy job beside the GitHub Pages one, publishing the same
   checked `dist/` and `version.json` with wrangler (pinned by SHA like every other action here).
   The emergency `release` rollback input publishes to Cloudflare too. Both deploy jobs run during
   the switch-over window (§4 Phase D), then the GitHub Pages job is removed.
7. **The install gate and the app's identity.** `GATE_HOSTS` gains the new host (the old one stays
   for the window). The manifest's `related_applications` id becomes the new address's. ⛔ It cannot
   list both: an install of the OLD app would then count as "already installed" on the new address,
   and the gate would send a new user to open the old app.
8. **The moved notices, on the OLD host only** (the build tells by `location.hostname`):
   - in the installed app window: a strip like the update strip, "SPTCal has moved to <address>.
     Save any unsaved work and export any header presets you want to keep, then install it from
     there." with a button that opens the new address in Chrome;
   - in a browser tab: a "moved" screen in the install gate, with the link, instead of Install.
   Wording is the owner's (D6). Tried on localhost by the owner before it is finished.
9. **The update check when signed out.** Today a signed-out check is a failed fetch (Access answers
   with a cross-origin redirect), counted as a failure, and three of them stop the checks for that
   session. Fetch with `redirect: 'manual'`, treat an `opaqueredirect` answer as "signed out, try
   later" rather than a failure, and keep checking. The update strip's own Reload is already a real
   navigation, which can complete a sign-in (its code comment already expects a sign-in gate).
10. **The CSP should need no change** (the sign-in is a top-level navigation, and `version.json` stays
    same-origin), but `tests/harness/cspproof.mjs` must say so.
11. **Checks and legs.** `tools/check-build.mjs`'s `PAGES_URL` and its `GATE_HOSTS` /
    `related_applications` assertions follow the new address. New legs for the moved strip and the
    moved screen; `pwagate` / `pwagatelogic` for the gate on both hosts.
12. **Docs, in the same change.** CLAUDE.md's "The hosted link boots the app only in the installed
    app window" section (the installed identity, `related_applications`, "never gate localhost /
    file://"), the deploy note, README's changelog, PROJECT-CONTEXT's live URL and §11 deploy check,
    HANDOFF. Mark `CUSTOM-DOMAIN-PLAN.md` superseded.
13. **The full gate**, then cut the next minor version (v1.21.0 as of 18 Nov 2026; v1.18.0 was taken by other work the same day). Ship the move ALONE, with no other changes, so any problem
    is clearly the move (`CUSTOM-DOMAIN-PLAN.md`'s advice, still right).

### Phase C: prove it on the real address before anyone is told
14. Push to `main` only on the owner's per-action approval (CLAUDE.md). It deploys to both.
15. On the new address, on Mac and on Windows: sign-in, the install screen, install, reopen, Save /
    Load / Excel / both PDFs, the update strip, a natural expiry (§6).
16. On the old address: the moved strip in an installed app, the moved screen in a tab.

### Phase D: the switch-over window (D6, suggested two weeks)
17. The owner tells users. Everyone installs from the new address once; their saved files are
    unaffected.
18. Both sites stay up. The repo is still public during the window, so `releases/` and the code are
    still downloadable from GitHub. Keep the window short.

### Phase E: close the old address
19. Remove the GitHub Pages deploy job, and the old host from `GATE_HOSTS`.
20. Switch GitHub Pages off and **make the repo private**. On a free personal account a private repo
    cannot serve Pages, so this is what takes the old address down.
21. *(Optional)* A "SPTCal has moved" page at the old address: rename this repo, then create a tiny
    PUBLIC repo under the old name `planning-cal-builder` holding only that page, published with
    GitHub Pages. ⚠️ Git remotes that use the old name must be updated after the rename.
22. Clean up the test: delete the test repo, the test Pages project, its Access application and its
    deploy key.

## 5. What does not carry over to the new address

Unchanged from `CUSTOM-DOMAIN-PLAN.md`: browser storage is per origin, so each user loses, once, the
**Recent files list** (files themselves are untouched; Load each once), **unsaved-work backups**
(save to a file first), **preferences** (grid lines, month-view options) and the **header preset
library** (export as `.spthdr` first). The installed app is a NEW app; the old one is removed by
hand. The moved strip (step 8) says the two that matter.

## 6. Risks and limits

- **Natural expiry is untested.** Revoking needed a relaunch and a reload. If a sign-in that simply
  runs out behaves the same, that is a support cost for every user every session length. Test it
  (D9) before Phase B is finished; if it is rough, a longer session (a month) makes it rare, and the
  moved/sign-in wording can tell users "reload once".
- **Code emails in spam or quarantine.** Arrived fine in the test; one company's filter can change.
  If it starts happening, IT can allow the sender, or add single sign-on.
- **A first code can go missing.** On the real address (18 Nov 2026) the owner's first code never came and "Send
  again" worked. Put a line on the Access login page's footer and in the announcement: "No code within a minute?
  Check junk, then press Send again."
- **The sign-in guards the address, not copies.** Anyone let in can still Export shareable copy…
  (a full working app in one file) and pass it on, as anyone can with a saved file (D7).
- **Free plan: 50 users.** Beyond that it is paid per user per month.
- **The account's owner.** If the Cloudflare account is in one person's name and they leave, nobody
  can change who gets in (D3).
- **Actions minutes.** A private repo on a free account has a monthly allowance (about 2,000
  minutes). Deploys are a few minutes; the Windows runners count double.
- **Revoking someone right away** is Zero Trust › Access › Applications › Revoke existing tokens, or
  Users › Revoke session. Their app then needs a relaunch and a reload before it signs in again.

## 7. Owner decisions (answered 18 Nov 2026, owner's pickers)

| | Decision | Owner's answer |
|---|---|---|
| D1 | The address. ⚠️ Changing it later is another move and another reinstall for everyone | **`sptcal.pages.dev`** (free; the name answered nothing on 18 Nov, so it looked unclaimed) |
| D2 | The team name on the sign-in page (the test has Cloudflare's random one) | **`sptcal`** (sign-in at `sptcal.cloudflareaccess.com`) |
| D3 | Who owns the Cloudflare account | **The owner's work email, plus a backup person** added as an admin |
| D4 | Who is allowed in | **Only emails the owner lists.** No company-domain rule: every person is added by hand, and removed by hand when they leave |
| D5 | How long a sign-in lasts | **A month** |
| D6 | The switch-over window | **Two weeks.** The moved strip's wording is still to be approved, on localhost |
| D7 | Export shareable copy… | **Remove it** (§7a) |
| D8 | Single sign-on through IT | **Later, if ever.** Emailed codes only |
| D9 | The natural-expiry test's result (session set to 15 minutes, wait it out, reopen) | ⏳ owed before Phase B finishes |

### 7a. What removing Export shareable copy… touches (D7)

The owner's reason: a shareable copy is a full working app in one file, so it gets around the
sign-in. Removing the MENU ITEM is simple. Two other paths also write that same full copy, through
`buildSavedHtml()`, and need a ruling each before Phase B is finished:

- **Saving over a legacy `.html` calendar.** A file handle that points at an old `.html` calendar is
  written back as `.html` (`handleIsLegacyHtml`), which is a full app copy. **Ruled (owner's picker,
  18 Nov 2026): Save asks once, "This is an old-style file. Save as .sptcal?", and opens the save
  picker.** The old `.html` file is left as it is. ⛔ CLAUDE.md: no file is converted silently.
- **The download fallback where the File System Access API is missing.** On the hosted address only
  the installed Chrome/Edge app runs (the gate turns every other browser away), so this path is hard
  to reach there. **Ruled (owner's picker, 18 Nov 2026): it downloads a `.sptcal` file instead.**

- **Autosave over a legacy `.html` calendar** writes `.html` too (the same `handleIsLegacyHtml` test
  in the autosave path). Autosave cannot ask (the save picker needs a user gesture), so it should
  pause and say so in the status line, the way `autosaveNeedsFile` already does, until the user
  answers Save's question.

So after Phase B nothing in the app writes a working copy of itself. Its callers today are the
Export shareable copy… item, Save and Save As to a legacy handle, autosave to a legacy handle, and
the download fallback (`grep -n "buildSavedHtml(" src/legacy/app.js`). `buildSavedHtml()` itself
may stay as code; nothing a user can press, and no autosave, calls it.

Unchanged by D7, and must stay so: every shareable copy and legacy `.html` already sent keeps
OPENING (§"Every saved calendar must keep opening, forever"), both as a file run from `file://` and
through Load. Copies already in circulation cannot be recalled.
