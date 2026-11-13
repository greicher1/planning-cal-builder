# Running the legs on Windows

**What this is.** A way to run this harness's legs in headless Chrome on Windows, where `run.sh` cannot go: it needs
zsh, `pkill`, `/tmp` and the macOS Chrome path, and judges in zsh. Studio coordinators use Chrome on Windows, and
there is no Windows machine here. The only route to one is GitHub's hosted Windows runners.

Nothing here changes the gate. `gate.sh` and `run.sh` stay the acceptance gate on macOS, and these files sit beside
them:

| File | Does |
|---|---|
| `xleg.mjs` | Runs ONE leg on any OS with Node 22 or later and no dependencies. It starts `srv.js`, launches Chrome with `run.sh`'s flags and a profile in `os.tmpdir()`, drives the page over CDP on the **real** clock, and writes `<name>.json` plus the exported files, split out as `parse.js` does. It also writes `<name>.xleg.json`, which records how the leg ran: Chrome's version and user agent, and the page's platform, device scale, scrollbar width and fonts. A hang hits a hard deadline, writes an `EX` result and exits 0. |
| `xgate.mjs` | Runs every line of `win-legs.txt` through `xleg.mjs` and writes `summary.json`. It also has `--summarize` and `--compare a b`. |
| `win-legs.txt` | The list: `leg \| fixture \| query \| seconds \| window \| scale \| tz \| page`, with fixture, query and budget taken from `gate.sh`. |
| `t/win-*.js` | New legs for the questions only Windows can answer (see below). |
| `.github/workflows/windows-legs.yml` | The CI job. |

## Run it locally

```
node tests/harness/xgate.mjs --out /some/dir --cap 600          # the whole list (about 330 legs)
node tests/harness/xgate.mjs --out /some/dir --only '^win-'     # just the Windows legs
node tests/harness/xleg.mjs --leg win-cols --state layout-r13 --scale 1.25 --out /some/dir --shot /some/dir/cols.png
```

Chrome is found in this order: the `CHROME` environment variable, then the platform default. That is
`C:\Program Files\Google\Chrome\Application\chrome.exe` (or the x86 or `%LOCALAPPDATA%` folder) on Windows, the
`/Applications` app on macOS, and `google-chrome` or `chromium` on Linux.

`HARNESS_PORT` (or `--port`) pins the server port. Otherwise a free port is used. `--from N --to M`, `--missing` and
`--max N` let one output folder be filled in chunks, and every run rewrites `summary.json` over the whole list.
`dist/index.html` must be built first (`npm run build`).

## What the workflow does

`windows-legs.yml` runs only on a push to the branch `windows-test` and by hand (`workflow_dispatch`). It never runs on
main or on a pull request, and it holds no secrets.

It runs the list in five parts (`win`, the Windows-only legs, then `a` to `d`), each on `windows-latest` and on `macos-latest` as a like-for-like control: ten jobs. Each job uploads its own artifact, `legs-<os>-<part>`; put one OS's five folders into one folder and run `xgate.mjs --summarize --out <folder>` to get that OS's summary. Each job does this:

1. Sets `git config --global core.autocrlf false` before checkout, so the tree is byte for byte the committed one.
2. Checks out and sets up Node 22, with actions pinned to the SHAs `deploy.yml` uses. Then it runs `npm ci`,
   `npm run build` and `npm run check`. The check is allowed to fail, so the legs still run.
3. Prints the SHA-256 and SHA-1 of `dist/index.html`. The reference macOS build (v1.13.0 + 40 commits, 2089aa5) is SHA-1
   `0f0caf0d7be068cc21e7449e3399720d34a2345c` (`shasum`) and SHA-256 `298b7e92...52a17ce`. A different hash on
   Windows means the build itself differs, so read that before any leg.
4. Runs `xgate.mjs --cap 600` and uploads `xgate-out/` as the artifact `legs-<os>`, kept 3 days. It holds only the
   synthetic test calendars.

## The Windows legs (`t/win-*.js`)

Each leg judges only what must hold on every OS, and reports the rest in a `measured` object. On macOS each one passes.

- **`win-env`** reports the environment. That covers `navigator.platform` and `userAgentData.platform`, the device
  scale and the classic scrollbar width (expect 15 to 17 px on Windows and 0 on macOS headless), `document.fonts`, and
  the modifier names the UI copy shows. Under xleg it also reads the Undo and Redo tooltips with a trusted hover.
- **`win-cols`** runs at scale 1, 1.25 and 1.5, on the reference calendar and on `layout-r13`. It judges zero
  horizontally clipped cells (the gate's measure) and, on the reference calendar, the macOS column keys. It reports
  every column width, each cell's slack (box minus drawn text) and the drawn width of three known strings.
- **`win-layout`** runs at 1366x768 @1, 1536x864 @1.25 and 1280x720 @1.5. It judges these:
  - no horizontal page scroll in either view;
  - the waterfall ending at `.preview-panel`'s bottom (0 to 1 px);
  - seven equal month columns.

  It reports where Build Around's Build button lands and how many month bars are truncated. Headless Chrome
  takes `--window-size` in CSS px, so the scale changes only `devicePixelRatio`.
- **`win-text`** checks CRLF clipboard text pasted into Notes, CRLF typed into the note editor (a trusted
  `Input.insertText`), and the saved `.sptcal`. None may hold a carriage return. It also checks the file names
  proposed for titles with `: / ? < > " | *`, for `CON`, and for a trailing dot or tab: none may hold a character
  Windows forbids. A 420-character title's length is reported only.
- **`win-keys`** presses trusted keys with the platform's command key, which is Ctrl on Windows and Cmd on macOS:
  Z, Shift+Z, N (on unsaved work), S and Shift+S. It judges each against what macOS does. It reports Ctrl+Y, command
  key + P, and a trusted Ctrl+click on two waterfall cells. On Windows that should give two, then three, selection
  boxes and no menu; on a Mac the app reads Ctrl+click as a right-click.

**The trusted-input hook.** A leg sets `window.__XREQ = {id, steps}` and waits for `window.__XACK === id`. xleg polls
every 100 ms and performs the steps with CDP `Input.dispatchKeyEvent`, `insertText` and `dispatchMouseEvent`. The
step shapes are in `xleg.mjs`'s header. Under `run.sh`, `window.__XLEG` is undefined: `win-keys` then reports that it
needs xleg, and the other legs skip only the trusted parts.

**Limits.** CDP input goes straight to the page, so these legs cannot show whether Chrome's own shortcuts (Ctrl+N
New Window, Ctrl+P print, Alt+Left Back) would win over the page in a real window. The native Save and Load dialogs,
an installed app window, contrast themes and Controlled Folder Access are out of reach too. Those stay manual.

## Left out of the list, and why

| Left out | Why |
|---|---|
| `conflict`, `loadfail` | Both wait out the app's 10-minute autosave on run.sh's virtual clock (budgets 2400 and 1500 virtual seconds). On the real clock each one only times out. They stay in the list as comments. |
| `pilllabel` (8 fixtures) | Over 200 s each on the real clock (budget 1500 virtual s). Eight runs alone would take most of an hour. |
| `colreuse` with no fixture | It times out at its shareable-copy step on the real clock ("the shareable copy (200 polls, 20 s real)"). Not diagnosed. The `colreuse` fixture run is listed. |
| The node CDP drivers: `printpaper`, `pilldrag`, `phaseedge`, `mvorder`, `mvordersp`, `hiatusdrag`, `hiatusripple`, `cspproof`, `wfkeysreal`, and the provers | They are not `t/<leg>.js` legs. They have their own drivers, which use `/tmp`, `pkill` and the macOS Chrome path. |
| The PDF judges: `pdfcmp.py`, `pdfseams.py` with its Swift Quartz renderer, `monthcmp.py`, `monthab.py`, `monthbase.py`, `pdfmark.py`, and the Excel diff against baselines | They need macOS tools (swiftc, Quartz) or poppler. The legs that feed them ARE listed; their PDFs and workbooks are hashed in `summary.json` for comparison. |
| `HARNESS_PRINT_PDF` (Chrome printing the page) | `monthprint` and `monthwriter` run, but Chrome's own print-to-PDF of the page is not taken, so gate 10's sheet count is not checked here. |
| `layout=legacy` on the root `index.html` | Not left out: `base` runs on the build with `layout=legacy`, as gate.sh runs it. |

**The macOS reference.** When this branch was cut, a local macOS run of the list had reached 90 of the 330 legs:
67 PASS, 0 FAIL, 23 REPORTED (347 of 347 judged cases). The rest had not run yet. Several REPORTED legs are judged
by `gate.sh`'s own scripts, so xgate only records them. The workflow's `macos-latest` job runs the whole list on the
same commit and is the control to compare the Windows job against. A leg that fails in BOTH jobs is a real-clock
limit of this runner, not a Windows finding.

**Time.** Each leg runs one after another on the real clock. Each part's timeout is 150 minutes. If it is reached, the
`Summarize whatever ran` step still rebuilds `summary.json` from the legs that finished, and the artifact is uploaded.

## Comparing a Windows run with macOS

Download the artifact, then:

```
node tests/harness/xgate.mjs --compare <mac-dir>/summary.json <windows-dir>/summary.json
```

For every leg this prints any change in status or in the passed/total count, the cases newly failing or no longer
failing, every exported file whose SHA-256 differs, and every difference in a win-* leg's `measured` values. For
REPORTED legs (no judged cases, which gate.sh judges with its own scripts) it diffs the two result JSONs field by
field, skipping keys that name times or dates.

Expect some differences that are not defects:

- An export that prints today's date hashes differently on another day.
- `measured.scrollbar` and `inner` differ by OS.

What is a finding:

- A case that passes on macOS and fails on Windows.
- A column width or a clipped-cell count that differs.
- A `win-*` judgement that fails.

The workflow's `macos-latest` job gives a macOS run of the same commit to compare against, in the same workflow run.
