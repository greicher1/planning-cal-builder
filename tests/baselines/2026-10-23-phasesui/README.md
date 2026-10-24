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

**How it was made.** First from `5ce6129` (the plan's last commit, no redesign code). ⚠️ **Re-cut 24 Oct 2026** after
`origin/main` was merged into the branch (`55d3840`): that brought the scenario key-facts work, whose new saved field
`show-location` joins every fixture's `fields.byId` (gate 5's re-cut, owner-approved). So the "before" became
`origin/main`'s tip, `91a5d24`: the same code without the redesign. Checked when re-cutting: the new records differ from
the `5ce6129` ones ONLY by that `show-location` key, in all 46 fixtures. Each cut was a build in a scratch worktree,
then:

    HARNESS_PAGE=/tests/harness/phasesui-before-build.html HARNESS_STATE=hidewf HARNESS_QUERY=record=1 ./run.sh phasesui 1500

and the leg's `records` written here. The leg's record mode reads only ids, Save and Load, so it runs on either build.

**Re-cut it only if a fixture is added to the leg's list, or the save format changes on purpose** -- and then from a
build that has not changed the phase cards' markup since, so it stays a "before".
