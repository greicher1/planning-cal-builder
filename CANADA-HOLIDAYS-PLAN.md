# Canadian holiday lists: plan

🔨 **BUILT, 29 Oct 2026, on branch `canada-holidays`** (worktree `.claude/worktrees/canada-holidays`), owner: *"Build it
now"*. All four rulings (§4) were made by the owner the same day: *"Yes, all four"*, every one as recommended. The
owner then asked for the days that differ from the practical list to be flagged in the app (§6). Everything below is
built as written; §7 records what the build added or decided.

## 7. As built

- **Generator.** `apply_observance(policy, items, no_observed)` takes a per-region set of names that are never moved
  (§3 step 1). Rules carry `{"src": …, "statutory": True}` in the same third element as `since`. `row_extra()` writes
  them onto a row only where set, so every untagged row is byte-identical. `LEGACY_CA` is gone; Alberta, Manitoba and
  Nova Scotia are full `REGIONS`.
- **The holiday-data version.** `HOLIDAY_LISTS_VERSION = 2`, and `HOLIDAY_LISTS_CHANGED = {CA-AB, CA-MB, CA-NS: 2}`,
  are declared just above `HOLIDAYS`.
  - `captureSnapshot()` writes `holidayLists` only on a calendar in a changed region.
  - `applyStateSnapshot()` reads it into `restoredHolidayLists` (absent = 1), right after `migrateRegionSnapshot()`.
  - `sanitizeSnapshot()` drops a value that is not a whole number from 1 to 1000.
  - `maybeShowHolidayNotice()` now chooses between the September strip (`HOLIDAY_FIX_NOTE`, `holidayFixNoticeSeen`)
    and this one (`HOLIDAY_FIX_NOTE_2`, `holidayFixNoticeSeen2`); their regions never overlap.
- **The tag** is `.hv-tag.hv-src` (blue, `legacy.css`), beside the "custom" tag in `renderHolidayVisList()`. It is
  carried through `fullHolidayList()` and `computeSchedule()`'s `phaseHolidays`.
- **Places.** Sidebar.jsx lists the Canada group's provinces and territories alphabetically, after the three cities.
- **Plain names (owner, 29 Oct 2026: *"lets remove the "province wide text""*).** Every province and territory reads
  just its name, e.g. "Alberta", not "Alberta — province-wide".
  - Labels are not save format; the values are unchanged.
  - `placeShortLabel()` gave the plain name already, so the scenario band and Compare are unchanged.
  - Checked: `npm run check` 40/40; `caholidays`, `regionmirror`, `regioncaveat` and `scenariofacts` all green.
- **No cities (owner, 29 Oct 2026: *"Yes, drop them"*).** Montreal, Toronto and Vancouver resolved to exactly Quebec's,
  Ontario's and BC's lists, holiday names included, so they were the same holidays twice.
  - `RETIRED_PLACES` gains `ca-montreal`, `ca-toronto` and `ca-vancouver`. `RETIRED_PLACE_TO` sends each to its own
    province; every US entry still goes to `us-general`.
  - The city name moves into a blank Location, the US cities' rule, so the scenario band and Compare still say
    "Toronto". A typed Location wins.
  - Each province's `locals` now carries the unions its city's did (UDA / ACTRA, NABET 700-M, the BCCFU members and
    UBCP/ACTRA), so nothing shown is lost.
  - ⛔ Save format: a re-saved city calendar writes its province's value and a `show-location`. No key is added, and an
    older build opens it fine.
  - Tests: `caholidays` gains R1 (all three cities, and a typed Location), so it now runs 11 cases.
    - `regioncaveat` drops A2 and A4 (the cities).
    - `scenarios` sets `ca-ontario` (its tab is still NAMED Toronto; Compare's Location row reads "Ontario").
    - `tests/fixtures/scenarios-3.sptcal` keeps `ca-toronto`: it is a real file, and loading it now exercises the fold.
- ⚠️ **Not changed, noticed:** the strip stays up when another calendar is loaded after it. `maybeShowHolidayNotice()`
  never hides it, and only its × does. That is the September strip's existing behaviour, left as it was.
- **Test:** `tests/harness/t/caholidays.js` (C0–C4, N1–N4, E0), in `gate.sh` after `retiredplaces`.
- **Gate:** full gate 3,415 PASS / 0 FAIL on the build (31 minutes, solo).
- **The notes box (owner, 29 Oct 2026, four reviewed drafts).** The generator's `BOX` table writes every region's
  warning (`REGION_CAVEATS`) and its labelled notes (`REGION_NOTES`: source, holidays, added, weekends, link, last
  checked). `reflectRegionUI()` draws them. `regioncaveat` was rewritten for it.
- **No Regatta Day warning** (owner, same day). Newfoundland's box has no warning line; the day itself is unchanged.

## 1. What the owner asked for

The owner compared a "practical production list" of Canadian union holidays against the app, the statutory lists on
canada-holidays.ca, and the crew agreements. They then ruled (29 Oct 2026):

- *"this list is a good source of truth"*, with **Truth & Reconciliation added**;
- *"plan to update and add those 5"*: the five non-optional (statutory) days the list leaves out. They are Family Day and
  Remembrance Day in New Brunswick, Heritage Day in Nova Scotia, and Remembrance Day in PEI and Newfoundland;
- and they asked for a recommendation on Newfoundland, Yukon, the Northwest Territories and Nunavut (§4, D1 and D3).

Quebec keeps no Truth & Reconciliation (the default, §5). It is neither a Quebec statutory holiday nor in the list.

## 2. The target lists (days per year, before any "(Observed)" day)

| Region | Place value | Today | Target | Added | Agreement that backs it |
|---|---|---|---|---|---|
| `CA-BC` | `ca-bc`, `ca-vancouver` | 11 | 11 | none | BCCFU Master Agreement Art. 7 (unchanged) |
| `CA-ON` | `ca-ontario`, `ca-toronto` | 11 | 11 | none | DGC–CMPA Ontario ON4.02 (unchanged) |
| `CA-QC` | `ca-quebec`, `ca-montreal` | 8 | 8 | none | AQTIS 514 (unchanged) |
| `CA-AB` | `ca-alberta` | 9 | **12** | Heritage Day (1st Mon Aug), Truth & Reconciliation, Boxing Day | IATSE 212 Art. 14.1 (2026–27), IATSE 210 Art. 14(a) (2025–26): the same 12 |
| `CA-MB` | `ca-manitoba` | 9 | **12** | Civic Holiday / Terry Fox Day (1st Mon Aug), Remembrance Day, Boxing Day | IATSE 856 Art. 10.02 (2026): 9 statutory + these 3 as "Proclaimed" |
| `CA-NS` | `ca-nova-scotia` | 6 | **12** | Victoria Day, Natal Day (1st Mon Aug, D2), Truth & Reconciliation, Thanksgiving, Remembrance Day, Boxing Day | IATSE 849 Art. 16.1(3) (rev. 1 Mar 2026) |
| `CA-SK` | **new** `ca-saskatchewan` | — | **12** | New Year's, Family Day, Good Friday, Victoria Day, Canada Day, Saskatchewan Day (1st Mon Aug), Labour Day, Truth & Reconciliation, Thanksgiving, Remembrance Day, Christmas, Boxing Day | DGC–CMPA Saskatchewan SK4.02 (2023–25) exactly. IATSE 295 Art. 10.01 is the same minus Truth & Reconciliation (its posted text is 2014–16) |
| `CA-NB` | **new** `ca-new-brunswick` | — | **12** | New Year's, Family Day, Good Friday, Victoria Day, Canada Day, New Brunswick Day (1st Mon Aug), Labour Day, Truth & Reconciliation, Thanksgiving, Remembrance Day, Christmas, Boxing Day | IATSE 849 Art. 16.1(1) exactly |
| `CA-PE` | **new** `ca-pei` | — | **11** | New Year's, Islander Day (3rd Mon Feb), Good Friday, Victoria Day, Canada Day, Labour Day, Truth & Reconciliation, Thanksgiving, Remembrance Day, Christmas, Boxing Day | IATSE 849 Art. 16.1(2) exactly |
| `CA-NL` | **new** `ca-newfoundland` | — | **11** (D1) | New Year's, Good Friday, Victoria Day, Memorial Day / Canada Day (1 Jul), Regatta Day, Labour Day, Truth & Reconciliation, Thanksgiving, Remembrance Day, Christmas, Boxing Day | IATSE 709 Art. 16.1 (Mar 2026). Its Easter Sunday is always a Sunday, so it is left out |
| `CA-YT` | **new** `ca-yukon` | — | **11** | New Year's, Good Friday, Victoria Day, National Indigenous Peoples Day (21 Jun), Canada Day, Discovery Day (3rd Mon Aug), Labour Day, Truth & Reconciliation, Thanksgiving, Remembrance Day, Christmas | Yukon statute (D3). No crew agreement read |
| `CA-NT` | **new** `ca-nwt` | — | **11** | as Yukon, but Civic Holiday (1st Mon Aug) in place of Discovery Day | NWT statute (D3) |
| `CA-NU` | **new** `ca-nunavut` | — | **11** | New Year's, Good Friday, Victoria Day, Canada Day, Nunavut Day (9 Jul), Civic Holiday (1st Mon Aug), Labour Day, Truth & Reconciliation, Thanksgiving, Remembrance Day, Christmas | Nunavut statute + Truth & Reconciliation, which is optional there (D3) |

New rules the generator needs, all expressible today:
- first Monday of August: `("nth", 8, MON, 1)`;
- Islander Day: `("nth", 2, MON, 3)`;
- Yukon's Discovery Day: `("nth", 8, MON, 3)`;
- Regatta Day: `("nth", 8, WED, 1)`;
- 21 Jun, 9 Jul and 30 Sep are `fixed`.

Newfoundland's Memorial Day is 1 July, the same day as Canada Day. It is ONE entry, named "Memorial Day / Canada Day", not two.

**Where the sources were read.** Every clause above was read in the agreement's own PDF on 29 Oct 2026, from the unions'
own sites:
- iatse212.com, iatse210.com, iatse856.com, iatse849.com;
- IATSE 709's downloads page, and the IATSE 295 members page;
- Teamsters 362: teamsters362.com;
- the DGC 2023–25 Prairie schedules: Wayback captures of cmpa.ca.

The URLs go into the generator, one per region, as `source`. ⚠️ cmpa.ca now puts a Cloudflare human check in front of
every PDF, so the DGC **2026–28** schedules were NOT read. That includes the Maritimes schedule (MT4.02).

## 3. The build

1. **Generator (`tools/gen_holidays.py`).**
   - Move `CA-AB`, `CA-MB` and `CA-NS` out of `LEGACY_CA` into `REGIONS`. Each gets its own `agreement`, `term`,
     `source`, `verified="2026-10-29"` and `caveat`.
   - Add the seven new regions, and append them to `APP_ORDER` after `CA-NS`.
   - Add a per-region set of days that get **no "(Observed)" day**, shaped like `SUBSTITUTED_IN_VIC`. IATSE 849
     moves a holiday on a day off to the next workday (Art. 16.7), which is `roll_fwd`, except:
     - Truth & Reconciliation in NB, PEI and NS;
     - Remembrance Day in NS ("no substitution", Art. 16.1(3)(a)).

     This follows the agreement's own words (§5).
   - Update the generator's own `PLACES` list too, for `holidays.json`.
   - Regenerate, then run `validate_holidays.py`. Its diff must show only the days in §2. Then splice
     `holidays.app.js` into `src/legacy/app.js`, from `const HOLIDAYS = {` through `REGION_CAVEATS`' `};`.
2. **Caveats (`REGION_CAVEATS`, generated).** One short line each:
   - **MB:** 856 calls three of its days "Proclaimed". They are counted here; switch one off if the production works it.
   - **SK:** 295's posted text predates Truth & Reconciliation.
   - **NL:** the regatta committee can move Regatta Day a day or more for weather.
   - **YT / NT / NU:** "statutory list; confirm the crew agreement".
     - The NT caveat also names Teamsters 362's extra Family Day and Boxing Day.
     - The YT caveat names the BC and Yukon council's agreement.
3. **Places (`PLACES` in `src/legacy/app.js`, and the options in `src/chrome/Sidebar.jsx`'s Canada group).**
   - ⛔ The values are save format: **append** the seven, and never rename one.
   - Labels follow the existing "— province-wide" shape, so `placeShortLabel()` gives "Saskatchewan", "Yukon" and so on.
     Check that "Northwest Territories" and "Prince Edward Island" read well shortened.
   - Replace the `locals` line on Alberta, Manitoba and Nova Scotia ("Provincial employment standards") with the
     agreements:
     - Alberta: IATSE 212 / 210, Teamsters 362;
     - Manitoba: IATSE 856;
     - Nova Scotia: IATSE 849.
4. **Calendars already saved on Alberta, Manitoba or Nova Scotia (D4).**
   - Reopened, they gain these days, so a shoot that crosses one wraps later.
   - The existing "holiday list was corrected" strip (`maybeShowHolidayNotice`) cannot see this. It fires only for files
     from before 14 Sep 2026 (`restoredFileIsPreHolidayFix`, set by `migrateRegionSnapshot`).
   - D4 is ruled yes, so:
     - Stamp a new PERMANENT snapshot key on every save, e.g. `holidayLists: 2`, plus `sanitizeSnapshot()` and the
       CLAUDE.md state table.
     - A file without it on one of the three places raises the strip, with a `HOLIDAY_FIX_NOTE` line per region.
     - Use a NEW preference key, so someone who dismissed September's strip still sees this one.
     - Nothing about the calendar itself changes; only which days the shoot skips.
5. **Proof.**
   - `npm run check`.
   - The `holidays2031` and `regionmirror` legs.
   - A new leg: each new place lists its count per year, and Production skips a sample day in each, e.g.:
     - NB Remembrance Day, Wed 11 Nov 2026;
     - NS Victoria Day, Mon 18 May 2026;
     - NL Regatta Day, Wed 5 Aug 2026;
     - Nunavut Day, Thu 9 Jul 2026.
   - If D4: a leg that loads an Alberta `.sptcal` without the stamp and sees the strip once.
   - A **full gate**, because a snapshot key touches the save path.
   - The baselines are US calendars (`v1.0.0-saved.html` is `US-GEN`), so no baseline should move.
6. **Docs, in the same breath.**
   - PROJECT-CONTEXT's Canada table and source list. Its line "Nova Scotia is the outlier … no primary source" is now
     wrong.
   - The README changelog and HANDOFF.
   - The CLAUDE.md conventions line that names the per-province differences.
   - The feature tracker card `canada-union-holidays-check`.
   - ⚠️ The expert-review workbook of 8 Oct 2026 will be out of date for Canada.

## 4. Rulings — ALL RULED, 29 Oct 2026 (owner: *"Yes, all four"*, each as recommended)

- **D1 Newfoundland.** ✅ *Ruled:* IATSE 709's list, 11 days. That is the owner's list plus Truth & Reconciliation
  and Remembrance Day, and also **Victoria Day and Regatta Day**.
  - It is the only crew agreement in the province.
  - Regatta Day is generated as the first Wednesday of August, with the weather caveat.
  - The alternative is the owner's list plus the two, 9 days.
- **D2 Nova Scotia's Natal Day** (1st Mon Aug). It is in IATSE 849 for Nova Scotia but not in the owner's list or the
  statute. ✅ *Ruled:* add it, for the same reason as D1.
- **D3 The territories.** ✅ *Ruled:* add all three, each with its **statutory** list, Nunavut's plus Truth &
  Reconciliation, and a caveat to confirm the crew agreement.
  - Yukon's crews come under the BC and Yukon council (IATSE 891 serves BC and Yukon), whose Yukon terms were not read.
    The statute is the floor that applies whatever the agreement adds.
  - Copying BC's list instead would add Family Day and BC Day, which are not Yukon holidays, and miss National
    Indigenous Peoples Day and Discovery Day.
  - The alternative is to leave the territories out. A production there would then have to pick "None" and add every
    day by hand.
- **D4 The strip for calendars already saved** on Alberta, Manitoba or Nova Scotia. ✅ *Ruled:* yes. It follows the
  14 Sep precedent ("a UPM who planned around 1 September must not discover the change by noticing it").

## 5. Defaults taken unless the owner says otherwise

- Quebec gets no Truth & Reconciliation.
- Alberta's August day is named **"Heritage Day"**, the province's own name; the owner's list says "Civic/Heritage Day".
  Manitoba's is **"Civic Holiday"**, as IATSE 856 words it.
- IATSE 849's no-make-up-day rule is followed (§3 step 1).
- Alberta, Manitoba and Saskatchewan keep `roll_fwd`. Their IATSE agreements state no weekend rule.

## 6. Flag the days that are not on the practical list (owner, 29 Oct 2026)

Owner: *"Please flag in the app when specific holidays are according to IATSE 849 (basically flag when they differ from
the screenshot source of truth)"*.

**The source of truth is the practical list plus Truth & Reconciliation**, the owner's own rule (§1). A day gets a flag
when it is in the app's list but not in that.

**Flagged:** eight rules, all in the four Atlantic provinces. Every one of them is there because a crew agreement lists
it, and four are also statutory.

| Region | Day | Tag | Also statutory? |
|---|---|---|---|
| `CA-NB` | Family Day | IATSE 849 | yes |
| `CA-NB` | Remembrance Day | IATSE 849 | yes |
| `CA-NS` | Nova Scotia Heritage Day | IATSE 849 | yes |
| `CA-NS` | Natal Day | IATSE 849 | no (D2) |
| `CA-PE` | Remembrance Day | IATSE 849 | yes |
| `CA-NL` | Remembrance Day | IATSE 709 | yes |
| `CA-NL` | Victoria Day | IATSE 709 | no (D1) |
| `CA-NL` | Regatta Day | IATSE 709 | no (D1) |

**Not flagged:**
- **Truth & Reconciliation**, anywhere: the owner added it to the source of truth.
- **BC, Ontario, Quebec, Alberta, Manitoba and Saskatchewan:** each target list equals the practical list plus Truth &
  Reconciliation exactly. Quebec has no Truth & Reconciliation, as §5 says.
- **The territories:** the practical list gives them no days, so every day would be flagged. Their caveat already says
  the whole list is statutory (§3 step 2).

**The build:**
1. **Generator.** A rule's optional third element, today `{"since": YEAR}`, gains `"src"`, e.g.
   `("Natal Day", ("nth", 8, MON, 1), {"src": "IATSE 849"})`, plus `"statutory": True` on the four that are.
   - `build_region` carries both onto each generated row, and the "(Observed)" copy inherits them through `{**it}`.
   - `holidays.app.js` writes `src:'IATSE 849'` (and `statutory:true`) on those rows only, so every other line stays
     byte-identical.
   - `validate_holidays.py` reads only `date` and `name`, so it needs no change. Confirm that once.
2. **App.**
   - `fullHolidayList()` and `computeSchedule()`'s `phaseHolidays` push each carry `src` and `statutory` through. Both
     are outside the frozen list.
   - `renderHolidayVisList()` adds a tag after the name, beside the existing "custom" one: `<span class="hv-tag hv-src">`
     reading **IATSE 849**.
   - Its title reads: "Not on the practical production list. The IATSE 849 crew agreement lists it." For a statutory
     day it adds: "It is a statutory holiday here too."
3. **Where it shows:** the Holidays list in the sidebar only.
   - ⛔ Never in the holiday's NAME. A built-in holiday's id is `holidaySlug(name, date)`, and saved calendars key each
     holiday's Enable / Waterfall / Month switches by that id. A renamed day silently loses those settings in every
     saved calendar. For the same reason, Nova Scotia's existing "Nova Scotia Heritage Day" and Alberta's "Alberta
     Family Day" keep their names.
   - Not in the grid, the month view or the exports, which are frozen.
4. **Proof.** The new leg in §3 step 5 also checks two things:
   - the tag, with its title, is on exactly the eight rules above and their "(Observed)" twins;
   - a BC or Alberta calendar shows no tag.
