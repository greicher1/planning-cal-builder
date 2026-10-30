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
  holidays.app.js       the HOLIDAYS block EXACTLY as src/legacy/app.js carries it (per-region
                        source line, ONE-OFF / PROVISIONAL tags, the app's region order), so a
                        regeneration can be spliced in and diffed line for line -- FOLLOWED BY the
                        REGION_CAVEATS block (each region's warning, audit N-9, 30 Sep 2026) and the
                        REGION_NOTES block (the rest of each region's notes box, 29 Oct 2026). The three
                        are spliced as ONE span: from "  const HOLIDAYS = {" to REGION_NOTES' "  };"

Usage:  python3 gen_holidays.py [--years 2024 2031]

A rule may carry a third element, {"since": YEAR}: the day is only generated from that year on.
That is how a holiday an agreement ADDED is kept out of the years before it -- Juneteenth joined
the IATSE lists effective 1 Jan 2025, so 2024 must not carry it (audit M-7, 29 Sep 2026).
The same element may carry {"src": "IATSE 849"} and {"statutory": True}: the agreement a Canadian day comes
from when the owner's practical list does not have it (29 Oct 2026, CANADA-HOLIDAYS-PLAN.md §6). They are
written onto the row as `src:` / `statutory:`, and the app shows them as a tag in the Holidays list.
"""

import json, argparse, re
from datetime import date, timedelta

MON, TUE, WED, THU, FRI, SAT, SUN = range(7)

VERIFIED = "2026-09-11"          # date every source below was last read, unless a region says otherwise
# A region read on another day carries its own `verified` (France, 20 Oct 2026). Every older region uses
# VERIFIED, so its generated lines are byte-identical to what the app already carries.
# 2024-2031 (owner, 25 Sep 2026: "only go up to 2031"; audit M-7). The app shows a notice on the
# Production row when shoot days fall outside the years a region's list covers.
DEFAULT_YEARS = (2024, 2031)


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
#
# A region may also name days that are NEVER moved, whatever its policy (`no_observed`). IATSE 849
# moves a holiday on a day off to the next workday (Art. 16.7) EXCEPT Truth and Reconciliation Day
# in NB, PEI and NS, and Remembrance Day in NS, which Art. 16.1 says are not paid days off when they
# fall on one ("no substitution for Remembrance Day", 16.1(3)(a)). 29 Oct 2026.

SUBSTITUTED_IN_VIC = {"New Year's Day", "Australia Day", "Christmas Day", "Boxing Day"}


def apply_observance(policy, items, no_observed=frozenset()):
    """items: list of dicts with date/name. Returns list with (Observed) entries added."""
    out = []
    taken = {i["date"] for i in items}

    for it in sorted(items, key=lambda x: (x["date"], x["name"])):
        out.append(it)
        d, wd = it["date"], it["date"].weekday()
        if wd < SAT or policy == "none" or it["name"] in no_observed:
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
    # Effective 1 Jan 2025 (2024 IATSE MOA). ⛔ Not a 2024 holiday -- the {"since"} keeps it out.
    ("Juneteenth",                ("fixed", 6, 19), {"since": 2025}),
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

# ⭐ CANADA'S SOURCE OF TRUTH (owner, 29 Oct 2026; CANADA-HOLIDAYS-PLAN.md): a "practical production list" of
# union holidays per province, plus Truth and Reconciliation. Every province below reproduces it, except the days
# the crew agreement adds, which are TAGGED with the agreement that puts them there ({"src": ...}, plus
# "statutory" when provincial law makes the day a holiday too). The app shows the tag in the sidebar's Holidays
# list (plan §6). ⛔ Never put it in the NAME: a built-in holiday's id is holidaySlug(name, date), and saved
# calendars key each holiday's Enable / Waterfall / Month switches by that id.
SRC_849      = {"src": "IATSE 849"}
SRC_849_STAT = {"src": "IATSE 849", "statutory": True}
SRC_709      = {"src": "IATSE 709"}
SRC_709_STAT = {"src": "IATSE 709", "statutory": True}
TRUTH_AND_RECONCILIATION = ("National Day for Truth and Reconciliation", ("fixed", 9, 30))
IATSE_849 = "https://www.iatse849.com/images/documents/standardagreements/2026-2027_IATSE_Local_849_Standard_Agreement.pdf"

UK_COMMON = [
    ("New Year's Day",          ("fixed", 1, 1)),
    ("Good Friday",             ("easter", -2)),
    ("Early May Bank Holiday",  ("nth", 5, MON, 1)),
    ("Spring Bank Holiday",     ("nth", 5, MON, -1)),
    ("Christmas Day",           ("fixed", 12, 25)),
    ("Boxing Day",              ("fixed", 12, 26)),
]

# The nine holidays every German Land observes. Germany is federal: each Land legislates its
# own calendar on top of these, and the spread is wide -- Bavaria reaches 14, Berlin 10. There is
# NO substitute-day rule anywhere in Germany, so a holiday falling on a weekend is simply lost;
# that is why both DE regions below use observance="none".
DE_FEDERAL = [
    ("New Year's Day",                          ("fixed", 1, 1)),
    ("Good Friday (Karfreitag)",                ("easter", -2)),
    ("Easter Monday (Ostermontag)",             ("easter", 1)),
    ("Labour Day (Tag der Arbeit)",             ("fixed", 5, 1)),
    ("Ascension Day (Christi Himmelfahrt)",     ("easter", 39)),
    ("Whit Monday (Pfingstmontag)",             ("easter", 50)),
    ("German Unity Day (Tag der Deutschen Einheit)", ("fixed", 10, 3)),
    ("Christmas Day (1. Weihnachtstag)",        ("fixed", 12, 25)),
    ("Boxing Day (2. Weihnachtstag)",           ("fixed", 12, 26)),
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

    # Both agreements read 29 Oct 2026, fully executed copies on the AMPTP site:
    #   https://amptp.org/wp-content/themes/amptp/assets/pdf/IATSE/New%20York%20Agreements/Local%2052/2024%20Local%2052%20(NY)%20Studio%20Mechanics%20Majors%20Agreement%20FULLY%20EXECUTED.pdf
    #   https://amptp.org/wp-content/themes/amptp/assets/pdf/Teamsters/Local%20817%20%28Drivers%29/2025%20Local%20817%20%28Drivers%29%20Agreement%20-%20FULLY%20EXECUTED.pdf
    # Local 52 Part A § 11 (New York and/or New Jersey) and Local 817 Art. 11 list the SAME eleven days, Juneteenth
    # by name in both. ⚠️ Local 52 Part B § 37 (its crews in Connecticut, Delaware and Pennsylvania) is the Area
    # Standards list instead (Good Friday, no Veterans Day), so this list is New York's, not Local 52's everywhere.
    # The caveat this region carried until then ("Juneteenth ... inferred, not read from the Local 52 agreement") is
    # gone: § 11(a) names it, effective 1 Jan 2025.
    "US-NY": dict(
        label="New York — IATSE Local 52 · Teamsters Local 817",
        agreement="Local 52 Feature & Television Production Contract with Major Producers, Part A § 11 · "
                  "Local 817 Feature Film Agreement, Art. 11",
        term="Local 52 2024-10-01 → 2027-09-30 · Local 817 2025-11-01 → 2028-10-31",
        source="https://amptp.org/contracts/ (Local 52 2024 Majors Agreement; Local 817 Drivers 2025 Agreement)",
        verified="2026-10-29",
        observance="us_iatse",
        note="Same count as the national list, different days: Local 52 Part A (New York and New Jersey) and "
             "Teamsters Local 817 both carry Veterans Day and do NOT carry Good Friday. Juneteenth is named in "
             "both from 1 Jan 2025. MLK Day was added to Local 52 effective 1 Jan 2023.",
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
        rules=CA_COMMON + [
            ("National Patriots’ Day",              ("mon_on_before", 5, 24)),
            ("Fête nationale (St-Jean-Baptiste)",   ("fixed", 6, 24)),
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
        ],
    ),

    # ⛔ Alberta, Manitoba and Nova Scotia keep every holiday NAME they had as provincial-statute lists
    # (until 29 Oct 2026): "Alberta Family Day", "Nova Scotia Heritage Day" and the rest are holiday ids in
    # saved calendars. Only days are ADDED.
    "CA-AB": dict(
        label="Alberta",
        agreement="IATSE Local 212 Art. 14.1 · IATSE Local 210 Art. 14(a) · Teamsters 362 Art. 10.01",
        term="212: 2026-04-01 → 2027-03-31 · 210: 2025 edition · Teamsters 362: 2026-04-01 → 2029-03-31",
        source="https://www.iatse212.com/downloads/agreements/2026CollectiveAgreementFinal.pdf",
        verified="2026-10-29",
        observance="roll_fwd",
        note="212 (Calgary) and 210 (Edmonton) list the same twelve days, signed per production; neither "
             "states a weekend rule. Teamsters 362 (Alberta and NWT) lists the same days without the Civic "
             "Holiday. Until 29 Oct 2026 this was Alberta's Employment Standards list of nine.",
        rules=CA_COMMON + [
            ("Alberta Family Day",                  ("nth", 2, MON, 3)),
            ("Victoria Day",                        ("mon_on_before", 5, 24)),
            ("Heritage Day",                        ("nth", 8, MON, 1)),
            TRUTH_AND_RECONCILIATION,
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
            ("Remembrance Day",                     ("fixed", 11, 11)),
            ("Boxing Day",                          ("fixed", 12, 26)),
        ],
    ),

    "CA-MB": dict(
        label="Manitoba",
        agreement="IATSE Local 856 Collective Agreement, Art. 10.02",
        term="2026 edition from 2026-04-01, per production",
        source="https://iatse856.com/wp-content/uploads/2025/02/1.-04.08.2026-Collective-Agreement.pdf",
        verified="2026-10-29",
        observance="roll_fwd",
        note="Nine days are Statutory; the Civic Holiday, Remembrance Day and Boxing Day are 'Proclaimed "
             "Holidays (not Statutory Holidays)'. All twelve are counted, as the practical production list "
             "does. Until 29 Oct 2026 this was Manitoba's Employment Standards list of nine.",
        rules=CA_COMMON + [
            ("Louis Riel Day",                      ("nth", 2, MON, 3)),
            ("Victoria Day",                        ("mon_on_before", 5, 24)),
            ("Civic Holiday",                       ("nth", 8, MON, 1)),
            TRUTH_AND_RECONCILIATION,
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
            ("Remembrance Day",                     ("fixed", 11, 11)),
            ("Boxing Day",                          ("fixed", 12, 26)),
        ],
    ),

    "CA-NS": dict(
        label="Nova Scotia",
        agreement="IATSE Local 849 Standard Agreement, Art. 16.1(3)",
        term="Revised 2026-03-01; per production (Art. 1.1)",
        source=IATSE_849,
        verified="2026-10-29",
        observance="roll_fwd",
        no_observed={"National Day for Truth and Reconciliation", "Remembrance Day"},
        note="One agreement for NS, NB and PEI, with a list per province (Art. 2.4, 16.1). Until 29 Oct 2026 "
             "this was Nova Scotia's Labour Standards list of six.",
        rules=CA_COMMON + [
            ("Nova Scotia Heritage Day",            ("nth", 2, MON, 3), SRC_849_STAT),
            ("Victoria Day",                        ("mon_on_before", 5, 24)),
            ("Natal Day",                           ("nth", 8, MON, 1), SRC_849),
            TRUTH_AND_RECONCILIATION,
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
            ("Remembrance Day",                     ("fixed", 11, 11)),
            ("Boxing Day",                          ("fixed", 12, 26)),
        ],
    ),

    "CA-SK": dict(
        label="Saskatchewan",
        agreement="DGC–CMPA Standard Agreement, Saskatchewan Schedule SK4.02 · IATSE Local 295 Art. 10.01",
        term="DGC 2023-01-01 → 2025-12-31 · IATSE 295 posted text 2014–2016",
        source="https://web.archive.org/web/20230703052756/https://cmpa.ca/wp-content/uploads/2017/10/"
               "2023-2025-DGC-Schedule-6-Saskatchewan-District-Council-FULLY-EXECUTED.pdf",
        verified="2026-10-29",
        observance="roll_fwd",
        note="IATSE 295 lists the same days without Truth and Reconciliation; its posted text predates it. "
             "The DGC 2026–2028 schedule sits behind a human check on cmpa.ca and was not read.",
        rules=CA_COMMON + [
            ("Family Day",                          ("nth", 2, MON, 3)),
            ("Victoria Day",                        ("mon_on_before", 5, 24)),
            ("Saskatchewan Day",                    ("nth", 8, MON, 1)),
            TRUTH_AND_RECONCILIATION,
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
            ("Remembrance Day",                     ("fixed", 11, 11)),
            ("Boxing Day",                          ("fixed", 12, 26)),
        ],
    ),

    "CA-NB": dict(
        label="New Brunswick",
        agreement="IATSE Local 849 Standard Agreement, Art. 16.1(1)",
        term="Revised 2026-03-01; per production (Art. 1.1)",
        source=IATSE_849,
        verified="2026-10-29",
        observance="roll_fwd",
        no_observed={"National Day for Truth and Reconciliation"},
        note="One agreement for NS, NB and PEI, with a list per province (Art. 2.4, 16.1).",
        rules=CA_COMMON + [
            ("Family Day",                          ("nth", 2, MON, 3), SRC_849_STAT),
            ("Victoria Day",                        ("mon_on_before", 5, 24)),
            ("New Brunswick Day",                   ("nth", 8, MON, 1)),
            TRUTH_AND_RECONCILIATION,
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
            ("Remembrance Day",                     ("fixed", 11, 11), SRC_849_STAT),
            ("Boxing Day",                          ("fixed", 12, 26)),
        ],
    ),

    "CA-PE": dict(
        label="Prince Edward Island",
        agreement="IATSE Local 849 Standard Agreement, Art. 16.1(2)",
        term="Revised 2026-03-01; per production (Art. 1.1)",
        source=IATSE_849,
        verified="2026-10-29",
        observance="roll_fwd",
        no_observed={"National Day for Truth and Reconciliation"},
        note="One agreement for NS, NB and PEI, with a list per province (Art. 2.4, 16.1).",
        rules=CA_COMMON + [
            ("Islander Day",                        ("nth", 2, MON, 3)),
            ("Victoria Day",                        ("mon_on_before", 5, 24)),
            TRUTH_AND_RECONCILIATION,
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
            ("Remembrance Day",                     ("fixed", 11, 11), SRC_849_STAT),
            ("Boxing Day",                          ("fixed", 12, 26)),
        ],
    ),

    # Not CA_COMMON: Newfoundland's 1 July is Memorial Day AND Canada Day, one day, one entry.
    "CA-NL": dict(
        label="Newfoundland and Labrador",
        agreement="IATSE Local 709 Standard Agreement, Art. 16.1",
        term="March 2026; per production (Art. 1.1)",
        # The union's downloads page, so the notes box's link reads "iatse709.com"; the PDF it links to (read
        # 29 Oct 2026) is img1.wsimg.com/blobby/go/021014a1-c8a7-4e79-9454-4b3ae78bf44b/downloads/
        # 3088e0db-e421-44a6-b614-cf2729f7a029/IA%20Local%20709%20Standard%20with%20Rates%20MAR%202026%20(BLA.pdf
        source="https://iatse709.com/production-downloads (Standard with Rates, March 2026)",
        verified="2026-10-29",
        observance="roll_fwd",
        note="Regatta Day is St. John's civic holiday: the first Wednesday of August, unless the regatta committee "
             "moves it for weather (its notes-box warning was removed by the owner, 29 Oct 2026). "
             "Art. 16.1 also lists Easter Sunday, always a Sunday, so it is left out. A holiday on a day off "
             "moves to the next workday (Art. 16.8). The Labour Standards Act s.14 gives six; the province's "
             "other days (St. Patrick's, St. George's, Discovery, Orangemen's) are not in the agreement.",
        rules=[
            ("New Year's Day",                      ("fixed", 1, 1)),
            ("Good Friday",                         ("easter", -2)),
            ("Victoria Day",                        ("mon_on_before", 5, 24), SRC_709),
            ("Memorial Day / Canada Day",           ("fixed", 7, 1)),
            ("Regatta Day",                         ("nth", 8, WED, 1), SRC_709),
            ("Labour Day",                          ("nth", 9, MON, 1)),
            TRUTH_AND_RECONCILIATION,
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
            ("Remembrance Day",                     ("fixed", 11, 11), SRC_709_STAT),
            ("Christmas Day",                       ("fixed", 12, 25)),
            ("Boxing Day",                          ("fixed", 12, 26)),
        ],
    ),

    # The territories (owner, 29 Oct 2026, D3): each territory's STATUTORY list, because no crew agreement's
    # territorial terms were read. The practical production list gives them no days, so nothing is tagged.
    "CA-YT": dict(
        label="Yukon",
        agreement="Yukon Employment Standards Act (statutory list)",
        term="in force",
        source="https://yukon.ca/en/doing-business/employer-responsibilities/find-yukon-statutory-holiday",
        verified="2026-10-29",
        observance="roll_fwd",
        note="Crews come under the BC and Yukon film unions (IATSE 891 serves BC and Yukon); that "
             "agreement's Yukon holiday terms were not read. Not BC's list: no Family Day or BC Day.",
        rules=[
            ("New Year's Day",                      ("fixed", 1, 1)),
            ("Good Friday",                         ("easter", -2)),
            ("Victoria Day",                        ("mon_on_before", 5, 24)),
            ("National Indigenous Peoples Day",     ("fixed", 6, 21)),
            ("Canada Day",                          ("fixed", 7, 1)),
            ("Discovery Day",                       ("nth", 8, MON, 3)),
            ("Labour Day",                          ("nth", 9, MON, 1)),
            TRUTH_AND_RECONCILIATION,
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
            ("Remembrance Day",                     ("fixed", 11, 11)),
            ("Christmas Day",                       ("fixed", 12, 25)),
        ],
    ),

    "CA-NT": dict(
        label="Northwest Territories",
        agreement="NWT Employment Standards Act (statutory list)",
        term="in force",
        source="https://www.ece.gov.nt.ca/en/services/employment-standards/frequently-asked-questions",
        verified="2026-10-29",
        observance="roll_fwd",
        note="Teamsters 362's agreement covers Alberta and the NWT and adds Family Day and Boxing Day; no "
             "IATSE agreement for the NWT was read.",
        rules=[
            ("New Year's Day",                      ("fixed", 1, 1)),
            ("Good Friday",                         ("easter", -2)),
            ("Victoria Day",                        ("mon_on_before", 5, 24)),
            ("National Indigenous Peoples Day",     ("fixed", 6, 21)),
            ("Canada Day",                          ("fixed", 7, 1)),
            ("Civic Holiday",                       ("nth", 8, MON, 1)),
            ("Labour Day",                          ("nth", 9, MON, 1)),
            TRUTH_AND_RECONCILIATION,
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
            ("Remembrance Day",                     ("fixed", 11, 11)),
            ("Christmas Day",                       ("fixed", 12, 25)),
        ],
    ),

    "CA-NU": dict(
        label="Nunavut",
        agreement="Nunavut Labour Standards Act (statutory list) + Truth and Reconciliation",
        term="in force",
        source="https://nu-lsco.ca/faq-s?tmpl=component&faqid=11",
        verified="2026-10-29",
        observance="roll_fwd",
        note="Truth and Reconciliation is optional in Nunavut law and is added by the owner's rule. No crew "
             "agreement for Nunavut was found.",
        rules=[
            ("New Year's Day",                      ("fixed", 1, 1)),
            ("Good Friday",                         ("easter", -2)),
            ("Victoria Day",                        ("mon_on_before", 5, 24)),
            ("Canada Day",                          ("fixed", 7, 1)),
            ("Nunavut Day",                         ("fixed", 7, 9)),
            ("Civic Holiday",                       ("nth", 8, MON, 1)),
            ("Labour Day",                          ("nth", 9, MON, 1)),
            TRUTH_AND_RECONCILIATION,
            ("Thanksgiving",                        ("nth", 10, MON, 2)),
            ("Remembrance Day",                     ("fixed", 11, 11)),
            ("Christmas Day",                       ("fixed", 12, 25)),
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

    "UK-NI": dict(
        label="Northern Ireland",
        agreement="Pact/Bectu Scripted TV Agreement cl. 11 · Major Motion Picture Agreement cl. 5.6",
        term="Scripted TV from 2023-01-01 · MMP as amended 2021-04-05",
        source="https://www.gov.uk/bank-holidays",
        observance="roll_fwd",
        note="Same crew agreements as England & Wales, and it keeps every E&W bank holiday -- then "
             "adds two: St Patrick's Day and the Battle of the Boyne (Orangemen's Day). Ten bank "
             "holidays, the longest list of the four UK nations. GOV.UK publishes NI as its own "
             "division alongside england-and-wales and scotland, so this was always in the feed.",
        rules=UK_COMMON + [
            ("Easter Monday",          ("easter", 1)),
            ("St Patrick's Day",       ("fixed", 3, 17)),
            ("Battle of the Boyne",    ("fixed", 7, 12)),
            ("Summer Bank Holiday",    ("nth", 8, MON, -1)),
        ],
    ),

    # ---------------------------------------------------------------- GERMANY
    # ⚠️ PROVENANCE IS STATUTORY, NOT CONTRACTUAL. The two entries below are sourced from each
    # Land's holiday act, which was read. The relevant crew agreement is the TV FFS
    # (Tarifvertrag für Film- und Fernsehschaffende, ver.di / Produzentenallianz); its treatment
    # of public holidays was NOT verified here. Same shape as LT, which is also statute-based.
    "DE-BE": dict(
        label="Berlin",
        agreement="Statutory — Gesetz über die Sonn- und Feiertage (Berlin). Crew: TV FFS (ver.di / Produzentenallianz), holiday clause UNVERIFIED",
        term="n/a — statutory",
        source="https://www.berlin.de/sen/inneres/buerger-und-staat/verfassungs-und-verwaltungsrecht/artikel.1435639.php",
        observance="none",
        note="Ten days: the federal nine plus International Women's Day. Berlin does NOT observe "
             "Reformation Day.",
        rules=DE_FEDERAL + [
            ("International Women's Day (Internationaler Frauentag)", ("fixed", 3, 8)),
        ],
    ),
    "DE-BB": dict(
        label="Brandenburg",
        agreement="Statutory — Feiertagsgesetz (FTG) Brandenburg 2003. Crew: TV FFS (ver.di / Produzentenallianz), holiday clause UNVERIFIED",
        term="n/a — statutory",
        source="https://bravors.brandenburg.de/gesetze/ftg_2003/6",
        observance="none",
        # Not offered in the picker since 29 Oct 2026 (owner); kept so calendars saved on it keep this list.
        note="Differs from Berlin both ways: Reformation Day, and no Women's Day. "
             "Brandenburg is also one of the few Länder that make Easter Sunday and Whit Sunday "
             "statutory; both always fall on a Sunday, so they never move a shoot date here, but "
             "they are in the law and so they are in the list.",
        rules=DE_FEDERAL + [
            ("Easter Sunday (Ostersonntag)",     ("easter", 0)),
            ("Whit Sunday (Pfingstsonntag)",     ("easter", 49)),
            ("Reformation Day (Reformationstag)", ("fixed", 10, 31)),
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

    # -------------------------------------------------------------------- FRANCE
    # ✅ Owner, 20 Oct 2026 (LABELS-SETUP-PLAN.md item 8, by picker): "Film agreement's list", "France only",
    # then "France, 11 days" once shown the list and these sources. ONE region and one place; Alsace-Moselle's
    # two extra days are the caveat, not a second place.
    # ⚠️ PROVENANCE, stated as it is. Légifrance refused automated reads (HTTP 403, then a human check that
    # was not attempted). The film agreement was read in the official BOCC fascicule 2013/34 (NOR
    # ASET1350988M), the copy at `source`, and checked word for word against the producers' union SPI's
    # consolidation (June 2024, https://www.afar-fiction.com/IMG/pdf/ccn-production-cinema-consolidee-juin-24.pdf)
    # and fiche-paie.fr (October 2026, https://fiche-paie.fr/convention-collective/production-cinematographique-3097).
    # The Code du travail was read on code.travail.gouv.fr, the Labour Ministry's mirror of Légifrance.
    #   - Titre II art. 42 lists the eleven days (« soit actuellement »), and adds Good Friday and 26 December
    #     in Alsace-Moselle. Not worked: « rémunérés comme un jour de travail normal ». Worked: +100 %.
    #   - Titre I art. 17 refers to Code du travail L3133-1 and L3134-13, and: a holiday « tombant en même
    #     temps que le repos hebdomadaire ne donne pas lieu à indemnité particulière » -- no substitute day.
    #   - Whit Monday: Titre I art. 18 makes it the branch's solidarity day « sous réserve de dispositions
    #     spécifiques à chaque titre », and Titre II art. 43 replaces that for technicians with a pro-rata
    #     contribution, so for crew it stays a paid holiday. A READING of the text, not a sentence in it.
    #   - The extension arrêté of 31 Mar 2015 (NOR ETST1508472A) reserves nothing in arts. 17, 18, 42, 43.
    #   - The audiovisual agreement (IDCC 2642, art. VII.2, read on fiche-paie.fr only) differs: Whit Monday is
    #     the worked solidarity day there, and short contracts are paid only for a weekday holiday.
    #   - No one-off holidays 2024-2031: adding one needs a change to L3133-1 by law.
    "FR": dict(
        label="France",
        agreement="Convention collective nationale de la production cinématographique (IDCC 3097), Titre II art. 42",
        term="in force — 19 Jan 2012, extended 31 Mar 2015",
        source="https://focal.ch/prodvalue/working_conditions/docs/France/France_Convention-Collective-Cinema_20120119.pdf",
        verified="2026-10-20",
        observance="none",
        note="The film agreement's eleven paid holidays for crew (Titre II art. 42), which are the Code du "
             "travail's eleven (L3133-1). Only 1 May is a day off by law (L3133-4); the rest are days off by "
             "the agreement. A holiday on a weekend is lost (Titre I art. 17), so there are no (Observed) rows.",
        rules=[
            ("New Year's Day (Jour de l'an)",          ("fixed", 1, 1)),
            ("Easter Monday (Lundi de Pâques)",        ("easter", 1)),
            ("Labour Day (Fête du travail)",           ("fixed", 5, 1)),
            ("Victory in Europe Day (Victoire 1945)",  ("fixed", 5, 8)),
            ("Ascension Day (Ascension)",              ("easter", 39)),
            ("Whit Monday (Lundi de Pentecôte)",       ("easter", 50)),
            ("Bastille Day (Fête nationale)",          ("fixed", 7, 14)),
            ("Assumption Day (Assomption)",            ("fixed", 8, 15)),
            ("All Saints' Day (Toussaint)",            ("fixed", 11, 1)),
            ("Armistice Day (Armistice 1918)",         ("fixed", 11, 11)),
            ("Christmas Day (Noël)",                   ("fixed", 12, 25)),
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

    # ------------------------------------------------------------------------ MEXICO
    # Owner, 29 Oct 2026: "Can we add Mexico City", then "As "Mexico"". Mexico City adds no day of its own: labour law
    # is federal (CPEUM Art. 73 X), and the film industry is under exclusive federal labour authority (Art. 123 A XXXI).
    "MX": dict(
        label="Mexico",
        agreement="Ley Federal del Trabajo, Art. 74 (statutory list; fr. VII reformed DOF 30-09-2024)",
        term="in force",
        source="https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf",
        verified="2026-10-29",
        observance="none",
        note="Art. 74's seven days, plus the two kinds it names without a date: 1 October every six years, when a new "
             "President takes office (CPEUM Art. 83; 2030 is the only one in range), and federal election days, the first "
             "Sunday of June (LGIPE Art. 22; 2027 and 2030). A 2028 judicial election Sunday is left out: it is not clear "
             "it is an 'elección ordinaria' under fr. IX, and it is a Sunday. Art. 74 moves nothing, so a weekend "
             "holiday is lost; the legal week is six days (Art. 69), so a Saturday holiday is a real day off for a "
             "six-day crew. Working a holiday pays double on top of the day's pay (Art. 75). The film crew union's "
             "(STPC) agreement was not found: the registry shows only its writers' section contract (CC-553/1985-III). "
             "Broadcaster crews under the radio and TV contrato-ley (DOF 28-03-2024, Art. 121) also get Good Friday. "
             "Holy Thursday, 2 Nov, 12 Dec, 24 and 31 Dec are on government office calendars, not in the law.",
        rules=[
            ("New Year's Day",                ("fixed", 1, 1)),
            ("Constitution Day",              ("nth", 2, MON, 1)),
            ("Benito Juárez's Birthday",      ("nth", 3, MON, 3)),
            ("Labour Day",                    ("fixed", 5, 1)),
            ("Independence Day",              ("fixed", 9, 16)),
            ("Revolution Day",                ("nth", 11, MON, 3)),
            ("Christmas Day",                 ("fixed", 12, 25)),
        ],
        # Set by the Constitution and electoral law rather than by a yearly rule this generator has. Dated here.
        extras=[
            {"date": "2027-06-06", "name": "Federal Election Day", "oneoff": True},
            {"date": "2030-06-02", "name": "Federal Election Day", "oneoff": True},
            {"date": "2030-10-01", "name": "Presidential Inauguration", "oneoff": True},
        ],
    ),
}

# (Until 29 Oct 2026 Alberta, Manitoba and Nova Scotia were built here from provincial statute, as
# LEGACY_CA, "retained so existing saves resolve". They are full REGIONS now, on their crew agreements.)


# ------------------------------------------------------------- the notes box, per region
# ⭐ WHAT THE YELLOW BOX UNDER THE REGION PICKER SAYS (owner, 29 Oct 2026: "Add any and all notes to the yellowish
# notes box to be as transparent as possible per region", then reviewed and edited line by line the same day). Every
# region has the same labelled lines, in this order, a line left out where it does not apply:
#   warn      the one thing to watch (REGION_CAVEATS in the app; it replaced each region's old `caveat`)
#   source    where the list comes from, in plain words (the app adds a link to the region's `source` URL)
#   holidays  how many per year, and anything about that count
#   added     the days a crew agreement adds to the owner's practical list (Canada only; tagged in the list)
#   weekends  what happens to a holiday on a weekend
# "Last checked" is the region's `verified` date. ⛔ This is the ONE place this text is written: change it here and
# regenerate. Each box must read on its own, so a sibling region repeats a line rather than saying "same as".
WK_US = ("a Saturday holiday moves to the Friday before, a Sunday one to the Monday after. On a six-day week, "
         "a Saturday holiday stays on Saturday.")
WK_NEXT = "move to the next weekday."
WK_NEXT_TR = "move to the next weekday, except Truth and Reconciliation Day, which stays put."
WK_NEXT_TR_REM = "move to the next weekday, except Truth and Reconciliation Day and Remembrance Day, which stay put."
WK_NONE = "stay put."
UK_WARN = ("The producer can count bank holidays as paid leave, except on Band 4 productions. If your crew works "
           "them, switch them off.")
UK_SOURCE = "Pact/Bectu Scripted TV and Major Motion Picture agreements."

BOX = {
    "US-GEN": dict(source="IATSE Area Standards Agreement and the West Coast Studio Local Agreements, 2024–2027.",
                   holidays="11 per year. Juneteenth was added in 2025.", weekends=WK_US),
    "US-NY":  dict(source="IATSE Local 52 (2024–2027) and Teamsters Local 817 (2025–2028) agreements.",
                   holidays="11 per year. Same count as Area Standards, but Veterans Day instead of Good Friday.",
                   weekends=WK_US),
    "CA-BC":  dict(source="BCCFU Master Agreement (IATSE 891, Teamsters 155, ICG 669), 2025–2028.",
                   holidays="11 per year.", weekends=WK_NEXT),
    "CA-ON":  dict(source="DGC Ontario agreement and IATSE Local 873, 2026–2028.",
                   holidays="11 per year: Ontario law’s 9, plus the Civic Holiday and Truth and Reconciliation Day.",
                   weekends=WK_NEXT),
    "CA-QC":  dict(warn="Pick either Good Friday OR Easter Monday. Good Friday is enabled by default.",
                   source="AQTIS 514 agreement with the AQPM, 2024–2028.",
                   holidays="8 per year. Truth and Reconciliation Day and Remembrance Day are not holidays in Quebec.",
                   weekends=WK_NEXT),
    "CA-AB":  dict(source="IATSE Local 212 (Calgary, 2026–2027) and Local 210 (Edmonton, 2025) agreements.",
                   holidays="12 per year. The Teamsters 362 agreement doesn’t include Heritage Day.", weekends=WK_NEXT),
    "CA-MB":  dict(warn="The union calls the Civic Holiday, Remembrance Day and Boxing Day “proclaimed” holidays, not "
                        "statutory ones. They’re included; switch one off if your crew works it.",
                   source="IATSE Local 856 agreement, 2026.", holidays="12 per year.", weekends=WK_NEXT),
    "CA-SK":  dict(source="DGC Saskatchewan agreement (2023–2025) and the IATSE Local 295 agreement.",
                   holidays="12 per year.", weekends=WK_NEXT),
    "CA-NB":  dict(source="IATSE Local 849 agreement (March 2026), which covers New Brunswick, Nova Scotia and PEI.",
                   holidays="12 per year.", added="Family Day and Remembrance Day (tagged IATSE 849 in the list).",
                   weekends=WK_NEXT_TR),
    "CA-NS":  dict(source="IATSE Local 849 agreement (March 2026).", holidays="12 per year.",
                   added="Heritage Day and Natal Day (tagged IATSE 849).", weekends=WK_NEXT_TR_REM),
    "CA-PE":  dict(source="IATSE Local 849 agreement (March 2026).", holidays="11 per year.",
                   added="Remembrance Day (tagged IATSE 849).", weekends=WK_NEXT_TR),
    # No warning (owner, 29 Oct 2026: "remove the warning about regatta day"). Regatta Day is still generated as the
    # first Wednesday of August; the region's `note` keeps that the regatta committee can move it for weather.
    "CA-NL":  dict(source="IATSE Local 709 agreement (March 2026).",
                   holidays="11 per year. 1 July is both Memorial Day and Canada Day.",
                   added="Victoria Day, Regatta Day and Remembrance Day (tagged IATSE 709).", weekends=WK_NEXT),
    "CA-YT":  dict(warn="These are Yukon’s legal holidays. Crews usually work under the BC and Yukon film unions’ "
                        "agreement, which may add days, so check before locking dates.",
                   source="Yukon Employment Standards Act.", holidays="11 per year.", weekends=WK_NEXT),
    "CA-NT":  dict(warn="These are the NWT’s legal holidays. The Teamsters 362 agreement also gives Family Day and "
                        "Boxing Day, so check your crew’s agreement.",
                   source="NWT Employment Standards Act.", holidays="11 per year.", weekends=WK_NEXT),
    "CA-NU":  dict(warn="These are Nunavut’s legal holidays, plus Truth and Reconciliation Day. No crew agreement was "
                        "found, so check before locking dates.",
                   source="Nunavut Labour Standards Act.", holidays="11 per year.", weekends=WK_NEXT),
    "UK-EW":  dict(warn=UK_WARN, source=UK_SOURCE, holidays="8 per year (England and Wales bank holidays).",
                   weekends=WK_NEXT),
    "UK-SCT": dict(warn=UK_WARN, source=UK_SOURCE, holidays="9 per year (Scottish bank holidays).", weekends=WK_NEXT),
    "UK-NI":  dict(warn=UK_WARN, source=UK_SOURCE, holidays="10 per year (Northern Ireland bank holidays).",
                   weekends=WK_NEXT),
    "DE-BE":  dict(warn="These are Berlin’s legal holidays. The crew agreement’s holiday terms weren’t checked, so "
                        "confirm before locking dates.",
                   source="Berlin public holiday law.", holidays="10 per year.", weekends=WK_NONE),
    # Not offered in the picker since 29 Oct 2026; a calendar saved on it still shows this box.
    "DE-BB":  dict(warn="These are Brandenburg’s legal holidays. The crew agreement’s holiday terms weren’t checked, "
                        "so confirm before locking dates.",
                   source="Brandenburg public holiday law.",
                   holidays="12 per year, including Easter Sunday and Whit Sunday, which always fall on a Sunday.",
                   weekends=WK_NONE),
    "AU-VIC": dict(warn="Outside Melbourne, a council can swap Melbourne Cup Day for its own local holiday.",
                   source="Victoria’s Public Holidays Act and the Broadcasting award. The MEAA crew agreement is "
                          "members-only.",
                   holidays="13 per year. The AFL Grand Final Friday date is confirmed each year.",
                   weekends="only New Year’s Day, Australia Day, Christmas and Boxing Day move to the next weekday."),
    "FR":     dict(warn="In Alsace-Moselle, add Good Friday and 26 December. TV productions work Whit Monday.",
                   source="French film crew agreement (IDCC 3097).", holidays="11 per year.", weekends=WK_NONE),
    "LT":     dict(warn="The government moves working days around holidays every year, so check that year’s schedule.",
                   source="Lithuanian Labour Code.", holidays="16 per year.", weekends=WK_NONE),
    # The owner's own wording for the warning (29 Oct 2026).
    "MX":     dict(warn="These are Mexico’s legal holidays but please confirm before locking dates.",
                   source="Mexico’s Federal Labour Law (Ley Federal del Trabajo), Art. 74.",
                   holidays="7 per year, plus federal election days (first Sunday of June in 2027 and 2030) and the "
                            "presidential inauguration on 1 October 2030.",
                   weekends=WK_NONE),
}
BOX_FIELDS = ("warn", "source", "holidays", "added", "weekends")
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def checked_label(iso):
    y, m, d = iso.split("-")
    return f"{int(d)} {MONTHS[int(m) - 1]} {y}"


# ------------------------------------------------------------- place → region map
# The dropdown shows PLACES. The agreement is resolved behind it, never selected.

PLACES = [
    # Owner, 29 Oct 2026: the US is TWO places, because it has two lists. The thirteen city entries it had
    # (Atlanta ... San Francisco) all resolved to one of these two; src/legacy/app.js RETIRED_PLACES folds them in.
    ("U.S. Area Standards", "US-GEN", "West Coast Studio Locals in Los Angeles; elsewhere, the Area Standards local for the area", None),
    ("New York",       "US-NY",  "IATSE Local 52, plus 161, 764, 798, USA 829 on separate paper · Teamsters 817", None),
    ("Lithuania",      "LT",     "No crew collective agreement identified", None),
    ("France",         "FR",     "Film crew: production cinématographique (IDCC 3097)", None),
    ("London",         "UK-EW",  "Bectu / Pact", None),
    ("Melbourne",      "AU-VIC", "MEAA", None),
    ("Quebec",         "CA-QC",  "AQTIS 514 IATSE", None),
    ("Scotland",       "UK-SCT", "Bectu / Pact — same agreements as London", None),
    ("Belfast",        "UK-NI",  "Bectu / Pact — same agreements as London", None),
    ("Wales",          "UK-EW",  "Bectu / Pact — same agreements and same bank holidays as England", None),
    ("Berlin",         "DE-BE",  "ver.di / Produzentenallianz (TV FFS)", None),
    ("Ontario",        "CA-ON",  "IATSE Local 873 crew, DGC Ontario", None),
    # Canada by province only (owner, 29 Oct 2026): Montreal, Toronto and Vancouver were these three lists again.
    ("British Columbia", "CA-BC", "IATSE 891, Teamsters 155, ICG 669 (BCCFU)", None),
    ("Alberta",        "CA-AB",  "IATSE 212 (Calgary), IATSE 210 (Edmonton), Teamsters 362", None),
    ("Manitoba",       "CA-MB",  "IATSE 856", None),
    ("Nova Scotia",    "CA-NS",  "IATSE 849", None),
    ("Saskatchewan",   "CA-SK",  "IATSE 295 · DGC Saskatchewan", None),
    ("New Brunswick",  "CA-NB",  "IATSE 849", None),
    ("Prince Edward Island", "CA-PE", "IATSE 849", None),
    ("Newfoundland and Labrador", "CA-NL", "IATSE 709", None),
    ("Yukon",          "CA-YT",  "Statutory list · BC and Yukon film unions", None),
    ("Northwest Territories", "CA-NT", "Statutory list · Teamsters 362", None),
    ("Nunavut",        "CA-NU",  "Statutory list", None),
    ("Mexico",         "MX",     "Statutory list · STPC (film crew union), agreement not found", None),
]


# The order src/legacy/app.js lists its regions in (holidays.app.js follows it). The seven added on
# 29 Oct 2026 are appended after Nova Scotia, so every older region's lines keep their place.
APP_ORDER = ["US-GEN", "US-NY", "CA-BC", "CA-ON", "CA-QC", "CA-AB", "CA-MB", "CA-NS",
             "CA-SK", "CA-NB", "CA-PE", "CA-NL", "CA-YT", "CA-NT", "CA-NU",
             "UK-EW", "UK-SCT", "UK-NI", "DE-BE", "DE-BB", "AU-VIC", "LT", "FR", "MX"]


# ------------------------------------------------------------------------- build

def build_region(key, spec, y0, y1):
    items = []
    for year in range(y0, y1 + 1):
        resolved = {}
        for entry in spec["rules"]:
            name, rule = entry[0], entry[1]
            opts = entry[2] if len(entry) > 2 else {}
            since = opts.get("since")
            if since and year < since:
                continue
            d = resolve(rule, year, resolved)
            resolved[name] = d
            item = {"date": d, "name": name, "observed": False, "provisional": False}
            # The agreement tag (Canada, 29 Oct 2026): carried only where set, so every other region's
            # rows stay exactly as they were. Its "(Observed)" twin inherits it through {**it}.
            if opts.get("src"):
                item["src"] = opts["src"]
            if opts.get("statutory"):
                item["statutory"] = True
            items.append(item)
        for name, rule in spec.get("provisional", []):
            d = resolve(rule, year, resolved)
            items.append({"date": d, "name": name, "observed": False, "provisional": True})

    items = apply_observance(spec["observance"], items, frozenset(spec.get("no_observed", ())))

    for ex in spec.get("extras", []):
        y = int(ex["date"][:4])
        if y0 <= y <= y1:
            items.append({"date": date.fromisoformat(ex["date"]), "name": ex["name"],
                          "observed": False, "provisional": False, "oneoff": True})

    items.sort(key=lambda x: (x["date"], x["name"]))
    return [{**i, "date": i["date"].isoformat()} for i in items]


def row_extra(h):
    """The agreement tag on a holiday row, as app.js carries it: `, src:'IATSE 849', statutory:true`, or
    nothing at all, so an untagged row is byte-identical to what it was before tags existed."""
    out = ""
    if h.get("src"):
        out += ", src:'" + h["src"].replace("'", "\\'") + "'"
    if h.get("statutory"):
        out += ", statutory:true"
    return out


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
            "note": spec.get("note"), "caveat": BOX[key].get("warn"),
            "box": {f: BOX[key][f] for f in BOX_FIELDS if BOX[key].get(f)},
            "verified": spec.get("verified", VERIFIED),
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
            lines.append(f"    {{date:'{h['date']}', name:'{nm}'{row_extra(h)}}},{tag}")
        lines.append("  ],")
    lines.append("};")
    with open("holidays.data.js", "w") as f:
        f.write("\n".join(lines) + "\n")

    # The block as src/legacy/app.js carries it. Region ORDER is the app's (the three legacy
    # Canadian provinces sit after Quebec there), not this file's dict order, so a regeneration diffs
    # cleanly against the block it replaces.
    app_lines = ["  const HOLIDAYS = {"]
    for key in APP_ORDER:
        reg = out["regions"][key]
        app_lines.append(f"    // {reg['label']} -- {reg['agreement']}")
        app_lines.append(f"    // source: {reg['source']}  (verified {reg['verified']})")
        app_lines.append(f"    '{key}': [")
        for h in reg["holidays"]:
            nm = h["name"].replace("'", "\\'")
            tag = ("   // PROVISIONAL -- confirm against the published fixture each year" if h.get("provisional")
                   else ("   // ONE-OFF -- government-declared, no rule produces this" if h.get("oneoff") else ""))
            app_lines.append(f"      {{date:'{h['date']}', name:'{nm}'{row_extra(h)}}},{tag}")
        app_lines.append("    ],")
    app_lines.append("  };")
    # Each agreement's caveat -- what its holiday list cannot express -- right after HOLIDAYS (audit
    # N-9; owner ruling 30 Sep 2026, "all seven, from the generator"). The text is holidays.json's
    # "caveat", so it has one source. Regions without one are absent. JSON-quoted, because the texts
    # carry both kinds of apostrophe.
    app_lines += ["",
                  "  // ⛔ GENERATED with HOLIDAYS by tools/gen_holidays.py: the caveat each agreement carries --",
                  "  // what its holiday list cannot express (audit N-9). reflectRegionUI() shows it under the",
                  "  // location picker, after the place's own caveat. Change the text in the generator, never here.",
                  "  const REGION_CAVEATS = {"]
    for key in APP_ORDER:
        cav = out["regions"][key]["caveat"]
        if cav:
            app_lines.append(f"    '{key}': {json.dumps(cav, ensure_ascii=False)},")
    app_lines.append("  };")
    # The rest of each region's notes box (owner, 29 Oct 2026): the labelled lines after the warning, in order, plus
    # the source link and the date it was last checked. JSON-quoted like the caveats. Every region has one.
    app_lines += ["",
                  "  // ⛔ GENERATED with HOLIDAYS by tools/gen_holidays.py (its BOX table): the rest of each region's notes",
                  "  // box under the location picker -- source, holidays, added, weekends, the source link and the date it",
                  "  // was last checked. reflectRegionUI() draws it after the warning. Change the text in the generator.",
                  "  const REGION_NOTES = {"]
    for key in APP_ORDER:
        reg = out["regions"][key]
        note = {f: reg["box"][f] for f in ("source", "holidays", "added", "weekends") if reg["box"].get(f)}
        # The link is the region's source URL alone: a `source` may carry a note after it (New York's does).
        url = re.match(r"https?://\S+", reg["source"])
        assert url, f"{key}'s source has no URL to link"
        note["url"] = url.group(0)
        note["checked"] = checked_label(reg["verified"])
        app_lines.append(f"    '{key}': {json.dumps(note, ensure_ascii=False)},")
    app_lines.append("  };")
    assert sorted(APP_ORDER) == sorted(out["regions"]), "APP_ORDER must name every region exactly once"
    assert sorted(BOX) == sorted(out["regions"]), "BOX must give every region its notes"
    for key, b in BOX.items():
        missing = [f for f in ("source", "holidays", "weekends") if not b.get(f)]
        assert not missing, f"{key}'s notes box lacks {missing}"
    with open("holidays.app.js", "w", encoding="utf-8") as f:
        f.write("\n".join(app_lines) + "\n")

    for key, reg in out["regions"].items():
        per_year = len([h for h in reg["holidays"] if h["date"].startswith(str(y0)) and not h.get("observed")])
        print(f"{key:8s} {per_year:3d} days/yr  {len(reg['holidays']):4d} rows  {reg['label']}")
    print(f"\nwrote holidays.json + holidays.data.js + holidays.app.js  ({y0}-{y1})")


if __name__ == "__main__":
    main()
