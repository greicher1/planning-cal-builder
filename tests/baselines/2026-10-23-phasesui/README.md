# Baseline — 23 Oct 2026, the Phases tab before the A + D blend

**What this is.** The before-side of the `phasesui` leg (PHASES-TAB-PLAN.md §3.5). The redesign restyled the
engine's own phase-card markup (`buildPhaseRows`, `buildPrepRow`, `addCustomPhaseRow`, `phaseHiatusBlockHtml`,
`byUnitHtml`, `addHiatusRow`), and those cards' ids ARE the save format: `fields.byId` is built in document order.
So the redesign had to keep every id'd control, in the same order, with the same saved values.

`before.json` holds, for each of 46 fixtures (the leg's `FIXTURES` list), what the build BEFORE the redesign
showed and saved after loading it through the real Load path:

- `controls` -- the Phases card's id'd controls in document order (`id:tag:type`);
- `byId` -- the saved `fields.byId`, keys in order, with values;
- `hiatuses` -- the saved all-phase hiatus rows.

**How it was made.** `HEAD` at `5ce6129` (the plan's last commit, no redesign code) built in a scratch worktree,
then:

    HARNESS_PAGE=/tests/harness/phasesui-before-build.html HARNESS_STATE=hidewf HARNESS_QUERY=record=1 ./run.sh phasesui 1500

and the leg's `records` written here. The leg's record mode reads only ids, Save and Load, so it runs on either build.

**Re-cut it only if a fixture is added to the leg's list, or the save format changes on purpose** -- and then from a
build that has not changed the phase cards' markup since, so it stays a "before".
