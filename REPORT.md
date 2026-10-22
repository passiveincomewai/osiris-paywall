# US state filters — diagnosis & fix

Branch `fix/us-state-filters`, based on `e7c0285` (production master). Not deployed, not pushed.

## The bug

"Some of the state filters aren't working for United States — it says
there's 0 cameras on some."

## Root cause (with evidence)

**Camera records have no state field.** Every record in the served US
catalogue (`src/data/countries/united-states.json`, 41,355 records —
verified against the archived production payload
`~/workspace/worldeye-camera-expansion/payload-best.json`, 41,819 unique
US records) carries only these location keys: `country`, `city`,
`lat`, `lng`. The `city` value is inconsistent: state DOT feeds file
their cameras under the **state name** (Georgia 4,284 records with
city="Georgia", Utah 2,084, Nevada 651, Indiana 579, Louisiana 330,
North Carolina 188), while the rest file under **real cities/counties**
(Houston 1,174, Dallas 843, Orange County 585, …).

So any state-keyed lookup — the mechanism every area filter on the site
uses — silently returns **0** for every state whose cameras are filed
under city names. Measured against the live API (2026-10-22):

| State query | Old result | Real cameras located in the state |
|---|---|---|
| Texas (`city=Texas`) | **0** | 4,390 |
| Florida (`city=Florida`) | **0** | 4,935 |
| California | **0** | 3,879 |
| Arizona | **0** | 664 |
| New York | **0** | 1,337 |
| Washington | **0** | 1,447 |
| Georgia (`city=Georgia`) | 4,284 ✓ | 4,288 |
| Utah (`city=Utah`) | 2,084 ✓ | 2,135 |

Text search was no better (it matches name/city substrings only):
Texas 15, Florida 36, California 43, Arizona 31.

The US traffic/state surfaces in this tree compounded it:

- `/us-traffic-cameras/[state]` existed for **7 states only** — every
  other state 404'd, despite all 50 states + DC having cameras.
- Those 7 pages, the `/live-traffic-cameras` table, and its metadata
  all read the stale 2026-10-11 snapshot `camera-directory.json`
  (US total "23,059" vs 41,355 actually served). Its "State / Region"
  table mixed states with metros (Houston, Dallas, Orange County,
  Fort Worth, Phoenix) and didn't link anywhere.
- Stale page counts vs reality (point-in-polygon over the served data,
  Census boundaries): Florida **1,435 claimed vs 4,935 real (3.4×)**,
  Texas 2,492 vs 4,390, Georgia 4,330 vs 4,288, Utah 2,082 vs 2,135,
  Indiana 703 vs 572, Nevada 652 vs 771, Arizona 434 vs 664.
  Editorial premises had rotted with the counts: Florida's page claimed
  three counties held *all* its cameras (eight county networks do);
  Arizona's claimed every feed sits in the Phoenix metro (Tucson 53,
  Flagstaff 17, Nogales 15 say otherwise).

Every state has cameras — the smallest index is Rhode Island with 1 —
so no state should ever have reported 0.

## The fix

State identity is now derived from the data's own coordinates — the
only key that exists for every record:

- `src/data/us-state-boundaries.json` (new) — simplified US Census
  state boundaries for all 50 states + DC (outer rings, 71 KB),
  vendored as a data asset.
- `src/lib/us-states.ts` (new) — `stateForPoint(lat, lng)`: ray-casting
  point-in-polygon, plus a nearest-state fallback for shoreline records
  the simplified boundaries clip. The 0.95° threshold sits in a natural
  gap in the data: shoreline/island records (Key West, Middleton
  Island) land ≤ 0.92° from their state; offshore NOAA buoys start at
  1.0° and stay honestly unassigned (43 records, incl. one corrupt
  coordinate — disclosed on the hub page).
- `tools/build-us-states.mjs` (new) — generator in the repo's
  established style: runs the same derivation over
  `src/data/countries/united-states.json` and writes
  `src/data/us-states.json` (new): per-state count, top areas, real
  sample cameras. Reconciliation: 41,312 assigned + 43 unassigned =
  41,355 source records; all 51 jurisdictions ≥ 1.
- `src/app/us-traffic-cameras/[state]/page.tsx` — all 51 states now
  generate pages (`generateStaticParams` reads the generated index).
  The 7 hand-written editorial configs keep their prose with corrected
  figures/premises, but counts, stats, coverage areas and samples are
  merged from the measured index at render — the page can no longer
  drift from the catalogue. The other 44 states get honest
  data-derived pages (count, top areas, real sample cameras, FAQs
  computed from the same data). "Updated" date now comes from the
  state index, not the stale directory.
- `src/app/live-traffic-cameras/page.tsx` — no longer reads
  `camera-directory.json`. Headline total is the served US catalogue
  (41,355); the table now lists **all 51 states ranked by measured
  count, each linking to its state page**, with a methodology note
  (counts measured from camera coordinates; 43 unattributed feeds
  disclosed). Leader line, FAQs and JSON-LD derive from the same
  index.
- `src/app/sitemap.ts` — state URLs are now derived from
  `src/data/us-states.json` (the Wave-8 pattern used for city pages);
  the 7 hardcoded entries in Waves 4/6 were removed to avoid
  duplicates.
- `src/lib/us-states.test.ts` (new) — 25 tests: 19 anchor cities
  (incl. Key West and Rodanthe fallback cases, Portland OR vs ME,
  Kansas City MO), offshore nulls, and index integrity (reconciliation
  against the served catalogue, every state > 0, the previously-broken
  states pinned at their real magnitudes).

Per-state counts, broken key → fixed (served catalogue):
Florida 0 → **4,935** · Texas 0 → **4,390** · Georgia 4,284 → 4,288 ·
California 0 → **3,879** · Utah 2,084 → 2,135 · Virginia 0 → 1,451 ·
Washington 0 → 1,447 · Pennsylvania 0 → 1,348 · New York 0 → 1,337 ·
Minnesota 0 → 1,282 · Oregon 0 → 1,189 · Colorado 0 → 1,149 · Alaska
0 → 1,142 · North Carolina 188 → 1,039 · Michigan 0 → 803 · Nevada
651 → 771 · South Carolina 0 → 750 · Arizona 0 → 664 · Illinois 0 →
606 · Indiana 579 → 572 · … down to Rhode Island 0 → 1. Full table in
`src/data/us-states.json`.

Out of scope and untouched: country pages/explorer (a sibling branch
owns them), billing, the globe. The shared `/api/cctv/country` filter
still keys on `city` — with states now derivable via
`src/lib/us-states.ts`, the country explorer can adopt state filtering
on top of this lib later without another data change.

## Gates

- `npx tsc --noEmit` — clean.
- Full vitest: **2 files failed | 293 passed | 2 skipped (297);
  3,033 tests passed, 2 failed** — the only failing files are the two
  known baselines (`src/lib/oi/context.test.ts`,
  `src/app/api/cctv/route.test.ts`). New `us-states.test.ts`: 25/25.
- `npx next build` — succeeds; `/us-traffic-cameras/[state]` generates
  **51 pages (+44)**; rendered HTML spot-checked (Texas 4,390, Florida
  4,935, Minnesota 1,282, Arizona 664 with corrected Tucson copy,
  Rhode Island's single camera, hub lists 51 state links and the
  41,355 total).

Note: sibling agents' suites/builds were running on the box
concurrently despite serialization, which stretched wall-clock times
(vitest ~14 min, build ~12 min) but did not affect results.
