#!/usr/bin/env python3
"""
Union / statutory holiday generator for planning-cal-builder.

Dates are COMPUTED FROM RULES, never hand-typed. To change a holiday, change its
rule here and regenerate -- do not edit generated dates.

Every region carries its primary source and the date that source was last read.
Anything that cannot be derived from a rule (one-off bank holidays, provisional
dates, government-declared days) lives in `extras` or is flagged `provisional`.

Output:
  holidays.json         full dataset with provenance
  holidays.data.js      drop-in HOLIDAYS / REGIONS / PLACES for src/legacy/app.js

Usage:  python3 gen_holidays.py [--years 2026 2030]
"""

import json, argparse
from datetime import date, timedelta

MON, TUE, WED, THU, FRI, SAT, SUN = range(7)

VERIFIED = "2026-09-11"          # date every source below was last read
DEFAULT_YEARS = (2026, 2030)


# ---------------------------------------------------------------- date helpers

def easter(year):
    """Anonymous Gregorian computus. Returns Easter Sunday."""
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    g = (8 * b + 13) // 25
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l = (2 * e + 2 * i - h - k + 32) % 7
    m = (a + 11 * h + 19 * l) // 433
    month = (h + l - 7 * m + 90) // 25
    day = (h + l - 7 * m + 33 * month + 19) % 32
    return date(year, month, day)


def nth_weekday(year, month, weekday, n):
    """n = 1..5 for nth occurrence, -1 for last."""
    if n > 0:
        d = date(year, month, 1)
        d += timedelta(days=(weekday - d.weekday()) % 7)
        return d + timedelta(weeks=n - 1)
    nxt = date(year + (month == 12), (month % 12) + 1, 1)
    d = nxt - timedelta(days=1)
    return d - timedelta(days=(d.weekday() - weekday) % 7)


def monday_on_or_before(year, month, day):
    d = date(year, month, day)
    return d - timedelta(days=(d.weekday() - MON) % 7)


def resolve(rule, year, resolved):
    kind = rule[0]
    if kind == "fixed":
        return date(year, rule[1], rule[2])
    if kind == "nth":
        return nth_weekday(year, rule[1], rule[2], rule[3])
    if kind == "easter":
        return easter(year) + timedelta(days=rule[1])
    if kind == "mon_on_before":
        return monday_on_or_before(year, rule[1], rule[2])
    if kind == "offset":
        return resolved[rule[1]] + timedelta(days=rule[2])
    raise ValueError(f"unknown rule {kind}")


# ---------------------------------------------------------- observance policies
#
# us_iatse  -- verbatim from IATSE Area Standards Agreement Article 7:
#              "If any of the above-named holidays falls on a Sunday, the following
#               Monday shall be considered the holiday and if any ... falls on a
#               Saturday, the preceding Friday shall be considered the holiday,
#               except that during six (6) day workweeks, Saturday holidays will
#               be recognized on Saturday."
#              (The six-day-workweek carve-out is a production-level choice, not a
#               calendar rule, so it is left to the per-holiday toggle in the app.)
#
# roll_fwd  -- Canada / UK: move to the next weekday not already claimed by another
#              holiday. This is what makes Sat-Christmas + Sun-Boxing resolve to
#              Mon + Tue instead of colliding on the Monday.
#
# au_vic    -- Victoria substitutes only New Year's Day, Australia Day, Christmas
#              and Boxing Day. ANZAC Day and the Easter weekend are NOT substituted.
#
# none      -- Lithuania: the Labour Code names days and does not transfer them.
#              The Government separately moves WORKING days around holidays by
#              annual resolution; that is not derivable and must be checked per year.

SUBSTITUTED_IN_VIC = {"New Year's Day", "Australia Day", "Christmas Day", "Boxing Day"}


def apply_observance(policy, items):
    """items: list of dicts with date/name. Returns list with (Observed) entries added."""
    out = []
    taken = {i["date"] for i in items}

    for it in sorted(items, key=lambda x: (x["date"], x["name"])):
        out.append(it)
        d, wd = it["date"], it["date"].weekday()
        if wd < SAT or policy == "none":
            continue
        if policy == "au_vic" and it["name"] not in SUBSTITUTED_IN_VIC:
            continue

        if policy == "us_iatse":
            obs = d - timedelta(days=1) if wd == SAT else d + timedelta(days=1)
        else:  # roll_fwd / au_vic
            obs = d + timedelta(days=1)
            while obs.weekday() >= SAT or obs in taken:
                obs += timedelta(days=1)

        if obs in taken:
            continue
        taken.add(obs)
        out.append({**it, "date": obs, "name": f"{it['name']} (Observed)", "observed": True})

    return sorted(out, key=lambda x: (x["date"], x["name"]))


# ------------------------------------------------------------------- rule sets

US_IATSE_CORE = [
    ("New Year's Day",            ("fixed", 1, 1)),
    ("Martin Luther King Jr. Day", ("nth", 1, MON, 3)),
    ("Presidents' Day",           ("nth", 2, MON, 3)),
    ("Memorial Day",              ("nth", 5, MON, -1)),
    ("Juneteenth",                ("fixed", 6, 19)),
    ("Independence Day",          ("fixed", 7, 4)),
    ("Labor Day",                 ("nth", 9, MON, 1)),
    ("Thanksgiving",              ("nth", 11, THU, 4)),
    ("Day After Thanksgiving",    ("offset", "Thanksgiving", 1)),
    ("Christmas Day",             ("fixed", 12, 25)),
]

CA_COMMON = [
    ("New Year's Day", ("fixed", 1, 1)),
    ("Good Friday",    ("easter", -2)),
    ("Canada Day",     ("fixed", 7, 1)),
    ("Labour Day",     ("nth", 9, MON, 1)),
    ("Christmas Day",  ("fixed", 12, 25)),
]

UK_COMMON = [
    ("New Year's Day",          ("fixed", 1, 1)),
    ("Good Friday",             ("easter", -2)),
    ("Early May Bank Holiday",  ("nth", 5, MON, 1)),
    ("Spring Bank Holiday",     ("nth", 5, MON, -1)),
    ("Christmas Day",           ("fixed", 12, 25)),
    ("Boxing Day",              ("fixed", 12, 26)),
]

REGIONS = {

    # ---------------------------------------------------------------- UNITED STATES
    "US-GEN": dict(
        label="United States — IATSE general",
        agreement="IATSE Area Standards Agreement (Art. 7) · West Coast Studio Local Agreements (¶ 9(e)(4))",
        term="2024-08-01 → 2027-07-31",
        source="https://www.asa.iatse.net/",
        observance="us_iatse",
        note="ASA Article 7 and the West Coast Studio Local Agreements carry the same eleven days, "
             "so Los Angeles and every Area Standards market share one list. Juneteenth was added "
             "effective 1 Jan 2025 by the 2024 MOA, which also moved unworked-holiday pay 4% → 4.583%.",
        rules=US_IATSE_CORE + [("Good Friday", ("easter", -2))],
    ),

    "US-NY": dict(
        label="New York — IATSE Local 52",
        agreement="Local 52 Feature & Television Production Contract with Major Producers, Part A § 11",
        term="2024-10-01 → 2027-09-30",
        source="https://amptp.org/contracts/",
        observance="us_iatse",
        note="Same count as the national list, different days: Local 52 carries Veterans Day and "
             "does NOT carry Good Friday. MLK Day was added effective 1 Jan 2023.",
        caveat="Juneteenth's presence in Local 52 is inferred from the industry-wide pattern, not "
               "read from the Local 52 agreement. Included because under-counting costs a wrap date; "
               "confirm with the local before locking.",
        rules=US_IATSE_CORE + [("Veterans Day", ("fixed", 11, 11))],
    ),

    # ----------------------------------------------------------------------- CANADA
    "CA-BC": dict(
        label="British Columbia",
        agreement="BCCFU Master Agreement, Article Seven (§§ 7.01–7.05) → BC Employment Standards Act",
        term="2025-04-01 → 2028-03-31",
        source="https://cmpa.ca/wp-content/uploads/2025/08/2025-BCCFU-Master-Agreement.pdf",
        observance="roll_fwd",
        note="Producer side is AMPTP and CMPA-BC jointly. DGC BC is NOT a party — directors sit "
             "under their own agreement (Article 18) with its own holiday clause.",
        rules=CA_COMMON + [
            ("Family Day",                          ("nth", 2, MON, 3)),
            ("Victoria Day",                        ("mon_on_before", 5, 24)),
            ("B.C. Day",                            ("nth", 8, MON, 1)),
            ("National Day for Truth and Reconciliation", ("fixed", 9, 30)),
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
            ("Remembrance Day",                     ("fixed", 11, 11)),
        ],
    ),

    "CA-ON": dict(
        label="Ontario",
        agreement="DGC/CMPA Standard Agreement, Ontario Schedule Art. ON4.02 · IATSE Local 873",
        term="2026-01-01 → 2028-12-31",
        source="https://cmpa.ca/wp-content/uploads/2026/05/DGC-CMPA-Standard-Agreement-2026-2028-ONTARIO-Final-website.pdf",
        observance="roll_fwd",
        note="ON4.02 enumerates eleven days — two more than the Ontario ESA's nine, adding the "
             "August Civic Holiday and Truth & Reconciliation. Local 873 treats 30 Sept as a "
             "'Proclaimed Holiday' with an auto-upgrade clause if Ontario legislates it. Both are "
             "carried here: over-reserving a day is recoverable, under-reserving a wrap date is not.",
        caveat="ON4.02 ends in a catch-all — 'any other Day declared a holiday by the federal, "
               "provincial, or municipal (local) government'. That floats and cannot be generated. "
               "Use a custom holiday when one is declared.",
        rules=CA_COMMON + [
            ("Family Day",                          ("nth", 2, MON, 3)),
            ("Victoria Day",                        ("mon_on_before", 5, 24)),
            ("Civic Holiday",                       ("nth", 8, MON, 1)),
            ("National Day for Truth and Reconciliation", ("fixed", 9, 30)),
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
            ("Boxing Day",                          ("fixed", 12, 26)),
        ],
    ),

    "CA-QC": dict(
        label="Quebec",
        agreement="AQTIS 514 AIEST–AQPM Productions américaines Art. 11 → Télévision Art. 13.1 → CNESST",
        term="2024-08-11 → 2028-08-12",
        source="https://www.aqpm.ca/relations-de-travail/television/aqtis-514-aiest/",
        observance="roll_fwd",
        note="AMPTP is not a party to anything in Quebec — the US-service agreement is AQTIS 514 "
             "with AQPM. Neither 30 September nor Remembrance Day is a Quebec statutory holiday.",
        caveat="Quebec gives the employer a choice of Good Friday OR Easter Monday — one day, not "
               "two. Good Friday is listed; switch it manually if the production observes Easter Monday.",
        rules=CA_COMMON + [
            ("National Patriots’ Day",              ("mon_on_before", 5, 24)),
            ("Fête nationale (St-Jean-Baptiste)",   ("fixed", 6, 24)),
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
        ],
    ),

    # ------------------------------------------------------------- UNITED KINGDOM
    "UK-EW": dict(
        label="England & Wales",
        agreement="Pact/Bectu Scripted TV Agreement cl. 11 · Major Motion Picture Agreement cl. 5.6",
        term="Scripted TV from 2023-01-01 · MMP as amended 2021-04-05",
        source="https://www.gov.uk/bank-holidays",
        observance="roll_fwd",
        note="A bank holiday worked pays 2T under both agreements. Statute does not protect bank "
             "holidays — GOV.UK is explicit that an employer may count them inside the 5.6-week "
             "entitlement — so the agreement clause is what makes them non-shoot days.",
        caveat="Scripted TV cl. 11.4 lets the Producer nominate bank holidays as paid leave, EXCEPT "
               "on Band 4 productions. Counted as non-shoot here; switch off per production if yours works them.",
        rules=UK_COMMON + [
            ("Easter Monday",         ("easter", 1)),
            ("Summer Bank Holiday",   ("nth", 8, MON, -1)),
        ],
    ),

    "UK-SCT": dict(
        label="Scotland",
        agreement="Pact/Bectu Scripted TV Agreement cl. 11 · Major Motion Picture Agreement cl. 5.6",
        term="Scripted TV from 2023-01-01 · MMP as amended 2021-04-05",
        source="https://www.gov.uk/bank-holidays",
        observance="roll_fwd",
        note="Same crew agreements as England & Wales — only the bank holiday list differs, in four "
             "places: Scotland adds 2 January and St Andrew's Day, has NO Easter Monday, and takes "
             "its summer holiday in early August rather than late.",
        rules=UK_COMMON + [
            ("2nd January",           ("fixed", 1, 2)),
            ("Summer Bank Holiday",   ("nth", 8, MON, 1)),
            ("St Andrew's Day",       ("fixed", 11, 30)),
        ],
        extras=[
            # One-off, declared by government. No rule produces this.
            {"date": "2026-06-15", "name": "World Cup Bank Holiday", "oneoff": True},
        ],
    ),

    # -------------------------------------------------------------------- AUSTRALIA
    "AU-VIC": dict(
        label="Victoria (Melbourne)",
        agreement="MEAA Motion Picture Production Agreement → Broadcasting, Recorded Entertainment "
                  "and Cinemas Award 2020 [MA000091] → Public Holidays Act 1993 (Vic)",
        term="MPPA rates from 2026-07-01",
        source="https://business.vic.gov.au/business-information/public-holidays",
        observance="au_vic",
        note="The MPPA itself is member-gated (MEAA downloads return 401), so the defensible "
             "planning anchor is the Victorian statutory list plus the modern award floor. The NES "
             "gives every employee the right to be absent on a public holiday.",
        caveat="Melbourne Cup Day applies statewide only where a non-metro council has not arranged "
               "an alternate local holiday — a regional unit may be off on a different day.",
        rules=[
            ("New Year's Day",     ("fixed", 1, 1)),
            ("Australia Day",      ("fixed", 1, 26)),
            ("Labour Day",         ("nth", 3, MON, 2)),
            ("Good Friday",        ("easter", -2)),
            ("Easter Saturday",    ("easter", -1)),
            ("Easter Sunday",      ("easter", 0)),
            ("Easter Monday",      ("easter", 1)),
            ("ANZAC Day",          ("fixed", 4, 25)),
            ("King's Birthday",    ("nth", 6, MON, 2)),
            ("Melbourne Cup Day",  ("nth", 11, TUE, 1)),
            ("Christmas Day",      ("fixed", 12, 25)),
            ("Boxing Day",         ("fixed", 12, 26)),
        ],
        provisional=[
            # Business Victoria publishes this as "Subject to AFL schedule" and fills the date in
            # only when the fixture drops. Last Friday in September is the convention, not the rule.
            ("AFL Grand Final Friday", ("nth", 9, FRI, -1)),
        ],
    ),

    # -------------------------------------------------------------------- LITHUANIA
    "LT": dict(
        label="Lithuania",
        agreement="Lietuvos Respublikos darbo kodeksas (Labour Code) Art. 123 — 'Švenčių dienos'",
        term="in force",
        source="https://e-seimas.lrs.lt/portal/legalAct/lt/TAD/10c6bfd07bd511e6a0f68fd135e6f40c",
        observance="none",
        note="No crew collective agreement was identified in Lithuania. The incentive requires a "
             "Lithuanian production company to employ the crew, and at least 51% must be LT/EEA "
             "citizens, so Lithuanian labour law governs — an incoming production's home agreement "
             "does not follow it in. Note Christmas Eve IS a holiday here, unlike the US and Canada.",
        caveat="Lithuania does not transfer a holiday that falls on a weekend. Separately, the "
               "Government moves WORKING days around holidays by annual resolution — that is not "
               "derivable and must be checked each year.",
        rules=[
            ("New Year's Day",                        ("fixed", 1, 1)),
            ("Day of Restoration of the State",       ("fixed", 2, 16)),
            ("Day of Restoration of Independence",    ("fixed", 3, 11)),
            ("Easter Sunday",                         ("easter", 0)),
            ("Easter Monday",                         ("easter", 1)),
            ("International Workers' Day",            ("fixed", 5, 1)),
            ("Mother's Day",                          ("nth", 5, SUN, 1)),
            ("Father's Day",                          ("nth", 6, SUN, 1)),
            ("St John's Day (Rasos / Joninės)",       ("fixed", 6, 24)),
            ("Statehood Day",                         ("fixed", 7, 6)),
            ("Assumption Day (Žolinė)",               ("fixed", 8, 15)),
            ("All Saints' Day",                       ("fixed", 11, 1)),
            ("All Souls' Day",                        ("fixed", 11, 2)),
            ("Christmas Eve (Kūčios)",                ("fixed", 12, 24)),
            ("Christmas Day",                         ("fixed", 12, 25)),
            ("Second Day of Christmas",               ("fixed", 12, 26)),
        ],
    ),
}

# Regions the app already ships that are outside the twenty, kept so existing saves
# keep resolving. Sources as per the app's own PROJECT-CONTEXT.md.
LEGACY_CA = {
    "CA-AB": ("Alberta", "https://www.alberta.ca/general-holidays-pay", [
        ("Alberta Family Day", ("nth", 2, MON, 3)), ("Victoria Day", ("mon_on_before", 5, 24)),
        ("Thanksgiving", ("nth", 10, MON, 2)), ("Remembrance Day", ("fixed", 11, 11))]),
    "CA-MB": ("Manitoba", "https://www.gov.mb.ca/labour/standards/", [
        ("Louis Riel Day", ("nth", 2, MON, 3)), ("Victoria Day", ("mon_on_before", 5, 24)),
        ("National Day for Truth and Reconciliation", ("fixed", 9, 30)), ("Thanksgiving", ("nth", 10, MON, 2))]),
    "CA-NS": ("Nova Scotia", "https://novascotia.ca/lae/employmentrights/holidaychart.asp", [
        ("Nova Scotia Heritage Day", ("nth", 2, MON, 3))]),
}
for key, (label, src, extra) in LEGACY_CA.items():
    REGIONS[key] = dict(label=label, agreement="Provincial employment standards",
                        term="in force", source=src, observance="roll_fwd",
                        note="Outside the twenty planning markets; retained so existing saves resolve.",
                        rules=CA_COMMON + extra)


# ------------------------------------------------------------- place → region map
# The dropdown shows PLACES. The agreement is resolved behind it, never selected.

PLACES = [
    ("Atlanta",        "US-GEN", "IATSE Local 479 — Georgia excl. Savannah, Alabama excl. Mobile", None),
    ("Chicago",        "US-GEN", "IATSE Local 476",
     "PROXY: the Area Standards Agreement expressly excludes Illinois and Local 476 from its scope. "
     "Local 476 does not publish its agreement. The ASA list is used as a planning placeholder — confirm before locking dates."),
    ("Florida",        "US-GEN", "IATSE Local 477 — entire state", None),
    ("Lithuania",      "LT",     "No crew collective agreement identified", None),
    ("London",         "UK-EW",  "Bectu / Pact", None),
    ("Los Angeles",    "US-GEN", "Craft by craft — Locals 44, 80, 600, 695, 700, 705, 706, 728, 729, 800, 871, 884, 892", None),
    ("Maryland",       "US-GEN", "IATSE Local 487 — Mid-Atlantic, incl. DC and Virginia", None),
    ("Melbourne",      "AU-VIC", "MEAA", None),
    ("Miami",          "US-GEN", "IATSE Local 477 — same as all Florida", None),
    ("Montreal",       "CA-QC",  "AQTIS 514 IATSE", None),
    ("New Mexico",     "US-GEN", "IATSE Local 480", None),
    ("New Orleans",    "US-GEN", "IATSE Local 478 — Louisiana, S. Mississippi, Mobile AL",
     "Mardi Gras is NOT in ASA Article 7, and the agreement has no mechanism for adding a regional "
     "holiday. If your show observes it, add it as a custom holiday."),
    ("New York",       "US-NY",  "IATSE Local 52, plus 161, 764, 798, USA 829 on separate paper", None),
    ("Oahu",           "US-GEN", "IATSE Local 665 — State of Hawaii",
     "Prince Kūhiō Day, King Kamehameha Day and Statehood Day are NOT in ASA Article 7. Add as "
     "custom holidays if the production observes them."),
    ("Pittsburgh",     "US-GEN", "IATSE Local 489", None),
    ("Puerto Rico",    "US-GEN", "IATSE Local 494 — PR and USVI",
     "Puerto Rico's statutory calendar differs materially from the federal one and none of those "
     "days are in ASA Article 7. The widest statute-to-agreement gap of any US market here."),
    ("San Francisco",  "US-GEN", "IATSE Local 16 — Stage Employees, not Studio Mechanics",
     "PROXY: the Area Standards Agreement expressly excludes Local 16's jurisdiction. Northern "
     "California sits outside both national agreements. The ASA list is a placeholder — confirm before locking dates."),
    ("Scotland",       "UK-SCT", "Bectu / Pact — same agreements as London", None),
    ("Toronto",        "CA-ON",  "IATSE Local 873 crew, DGC Ontario", None),
    ("Vancouver BC",   "CA-BC",  "IATSE 891, Teamsters 155, ICG 669 (BCCFU)", None),
]


# ------------------------------------------------------------------------- build

def build_region(key, spec, y0, y1):
    items = []
    for year in range(y0, y1 + 1):
        resolved = {}
        for name, rule in spec["rules"]:
            d = resolve(rule, year, resolved)
            resolved[name] = d
            items.append({"date": d, "name": name, "observed": False, "provisional": False})
        for name, rule in spec.get("provisional", []):
            d = resolve(rule, year, resolved)
            items.append({"date": d, "name": name, "observed": False, "provisional": True})

    items = apply_observance(spec["observance"], items)

    for ex in spec.get("extras", []):
        y = int(ex["date"][:4])
        if y0 <= y <= y1:
            items.append({"date": date.fromisoformat(ex["date"]), "name": ex["name"],
                          "observed": False, "provisional": False, "oneoff": True})

    items.sort(key=lambda x: (x["date"], x["name"]))
    return [{**i, "date": i["date"].isoformat()} for i in items]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--years", nargs=2, type=int, default=DEFAULT_YEARS)
    args = ap.parse_args()
    y0, y1 = args.years

    out = {"meta": {"generated_from": "rules, not transcription",
                    "sources_verified": VERIFIED,
                    "years": [y0, y1],
                    "generator": "gen_holidays.py"},
           "places": [{"place": p, "region": r, "locals": l, "caveat": c} for p, r, l, c in PLACES],
           "regions": {}}

    for key, spec in REGIONS.items():
        out["regions"][key] = {
            "label": spec["label"], "agreement": spec["agreement"], "term": spec["term"],
            "source": spec["source"], "observance": spec["observance"],
            "note": spec.get("note"), "caveat": spec.get("caveat"),
            "verified": VERIFIED,
            "holidays": build_region(key, spec, y0, y1),
        }

    with open("holidays.json", "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    # app-compatible {date, name} shape for src/legacy/app.js
    lines = ["// GENERATED by gen_holidays.py -- do not edit dates by hand.",
             f"// Sources verified {VERIFIED}. Regenerate instead of patching.", "",
             "const HOLIDAYS = {"]
    for key, reg in out["regions"].items():
        lines.append(f"  // {reg['label']} -- {reg['agreement']}")
        lines.append(f"  '{key}': [")
        for h in reg["holidays"]:
            tag = "  // provisional" if h.get("provisional") else ("  // one-off" if h.get("oneoff") else "")
            nm = h["name"].replace("'", "\\'")
            lines.append(f"    {{date:'{h['date']}', name:'{nm}'}},{tag}")
        lines.append("  ],")
    lines.append("};")
    with open("holidays.data.js", "w") as f:
        f.write("\n".join(lines) + "\n")

    for key, reg in out["regions"].items():
        per_year = len([h for h in reg["holidays"] if h["date"].startswith(str(y0)) and not h.get("observed")])
        print(f"{key:8s} {per_year:3d} days/yr  {len(reg['holidays']):4d} rows  {reg['label']}")
    print(f"\nwrote holidays.json + holidays.data.js  ({y0}-{y1})")


if __name__ == "__main__":
    main()
