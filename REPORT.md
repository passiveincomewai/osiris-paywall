# Page-pattern rollout — REPORT

Branch: `feature/page-pattern-rollout` · Worktree: `~/workspace/worldeye-page-pattern`
Base: `b72da29` (country-pages branch tip, on production `e7c0285`). **Not pushed, not deployed.**

Commits:
- `feacee3` — Directory explorer foundation: scopes, explore + route-cameras APIs, shared feed card
- `6df3d0b` — Region + theme hubs (Asia, Europe, airport, beach, live-webcams)
- `3c8d551` — City family (new /city-webcams hub, [city] explorers + route finder, world-city recompute)
- `7cc49a5` — Traffic family + sitemap
- `1a430e3` — Fix missing imports in the extracted feed card (caught by the fresh tsc gate)
- (this report's commit)

## What the country-page treatment turned out to be, as reusable pieces

1. **A defined scope over the served catalogue** (`src/lib/explore-scopes.ts`, pure + unit-tested;
   `src/lib/explore-data.ts`, server-side loading). A scope is a rule over the per-country records
   (`src/data/countries/*.json`, indexed by `camera-countries.json`) — never a hand list. Pages and
   the API resolve the same key to the same records, so a count quoted on a page is the number of
   feeds its explorer actually serves.
2. **`/api/cctv/explore`** — batched browsing (offset/limit/area/q) for any registry scope or a
   country+city/theme param scope, sliced with the same semantics as the country endpoint.
   Unknown scope/country = real 404.
3. **The shared feed card** (`src/components/camera-feed-card.tsx`) — extracted from
   `CountryCameraExplorer` (which now imports it): real live media, LIVE badge earned on load,
   page-wide video budget, honest unavailable state, full-screen viewer, and a **View on globe**
   button on every card (the `/?camera=<id>` mechanism from the base branch).
4. **`DirectoryExplorer`** — the generalized explorer (registry or param scope, group headers by
   city or country, area chips, server-side search, load-more, `?area=` deep links).
   **`DirectorySearch`** — the generalized top-of-page search: filter mode (drives the page's
   explorer) or link mode (navigates, for the city hubs). Options are always the scope's real
   areas with real counts; the no-match state says so plainly.
5. **`/api/cctv/route-cameras` + `RouteCameraFinder`** — start + destination (geosearch
   autocomplete via the globe's `/api/geosearch`, routing via `/api/directions`), cameras within
   a 1.5 km corridor of the route using `lib/route-cameras`, ordered along the route, rendered
   as feed cards with "x km along" captions. Free on directory pages (the globe's own strip is
   Pro-gated; the directory version is deliberately not). Renders at most 60 cards and quotes
   the full count.

## Scope yields (computed from the catalogue; independently re-verified 2026-10-22)

Catalogue: **76,575 records, 109 countries** (index counts match chunk lengths exactly).
Asia **17,588** (25 countries) · Europe **12,057** (46) · Traffic worldwide **52,327**
(US 34,687 · Canada 2,838 · Spain 1,969 · Sweden 1,518 · Norway 698 · Germany 326 · Japan 230 ·
South Korea 191) · Coast/beach **1,246** · Airport **804**.

Traffic rule (documented on the pages and in code): a camera is "traffic" when its **name**
matches the country pages' own traffic pattern **or** its **source** is a road authority
(DOTs, 511 services, DGT, Trafikverket, Vegvesen, DriveBC, ASFINAG, Fintraffic, bayerninfo, … —
enumerated from the catalogue's distinct sources). The source half is necessary: Scandinavian
networks name cameras by place, not road, so a name-only rule gives Sweden 10 and Norway 0.
Airport rule: name identifies an airport/airfield/runway. Coast rule: the country pages' coast
name pattern.

## Per-page checklist

| Page | Before | What it got | Data source |
| --- | --- | --- | --- |
| `/asia-webcams` | Static copy quoting a stale snapshot (5,858 total, Taiwan-first ranking, "28 countries") | All figures computed (17,588 · 25 countries · Japan largest at 10,472); city search at top; live explorer grouped by country; FAQ/intro numbers parameterized | Camera index + `asia` scope (COUNTRY_REGION grouping) |
| `/europe-live-cameras` | Read the retired Oct-11 `camera-directory.json` (35 countries, stale counts) | Switched to the camera index (12,057 · 46 countries); highlights/FAQ figures computed; every table row links to its country page; city search + explorer | Camera index + `europe` scope |
| `/airport-webcams` | Editorial sections + map-only samples; no feed cards | Live explorer over the defined airport set (804) with the set's rule stated on the page; city search; top-cities table counted from the set | `airport` scope |
| `/beach-webcams` | Editorial category cards linking out; no feed cards on the page | Live explorer over the defined coastal set (1,246) with the rule stated and its real count quoted; area search | `beach` (coast) scope |
| `/live-webcams` | Read the retired snapshot (its H1 count disagreed with its own title) | Camera-index data throughout (owner headline 74,229 kept verbatim); full-directory live explorer; global city search; stale "35 European countries" / "105 countries" fixed (46 / 109) | Camera index + `all` scope |
| `/city-webcams` | **Did not exist** (bare hub missing; only `[city]` children) | NEW hub: all 55 city pages (9 editorial + 46 generated) in one searchable index — 12,862 cameras, 12 countries; link-mode search; FAQ; cross-links | `city-pages.json` + the editorial counts the [city] pages state |
| `/city-webcams/[city]` (55 pages) | Featured sample grid + editorial/generated copy; samples were text links | Samples with ids now render the shared **View on globe** button (via the SampleGrid upgrade); pages whose city has ≥25 cameras under its exact name in the served records (**53 of 55**) also gain the full live explorer (search within city) + the route finder prefilled to the city centroid | Country chunks via the explore API; gate computed per page at build |
| `/world-city-webcams` | Top-25 table from the retired snapshot ("Georgia 4,330") | Top-25 areas recomputed from the served records (Georgia 4,284); link-mode city search; all country cells link to country pages; cross-link to the new city hub | All catalogue records, aggregated by their own city values |
| `/live-traffic-cameras` | US-editorial page on the retired snapshot ("23,059"); no feed cards | US traffic total computed (34,687); top areas from the same set; **worldwide traffic explorer** (52,327, grouped by country); global traffic search; **route finder**; by-country link grid | `traffic` + `traffic-us` scopes |
| `/us-traffic-cameras` | **Did not exist** (only `[state]` children) | NEW hub: US traffic explorer + area search + route finder + links to the 7 state pages | `traffic-us` scope |
| `/us-traffic-cameras/[state]` (7 pages) | Sample grids with text links | Inherit the SampleGrid upgrade: samples with ids render the View on globe button | (unchanged data) |
| `/japan-traffic-cameras` | **No camera cards at all** — editorial only, "10,700+" headline | Area search + live explorer of Japan's traffic set (230) with a lead line stating plainly that Japan's full index (10,472) is mostly MLIT river cameras and linking to it | `traffic-japan` scope |
| `/canada-traffic-cameras` | No camera cards; "3,000+" headline | Search + explorer (2,838 of Canada's index are road feeds; lead line gives both counts) | `traffic-canada` scope |
| `/spain-traffic-cameras` | No camera cards; "2,100+" | Search + explorer (1,969) | `traffic-spain` scope |
| `/south-korea-traffic-cameras` | No camera cards; "1,600+" (the full index) | Search + explorer (191 road feeds; lead line distinguishes the two numbers) | `traffic-south-korea` scope |
| `/sweden-traffic-cameras` | No camera cards; "1,600+" | Search + explorer (1,518 of 1,569) | `traffic-sweden` scope |
| `/norway-traffic-cameras` | No camera cards; "740+" | Search + explorer (698 of 746) | `traffic-norway` scope |
| `/germany-traffic-cameras` | No camera cards; "340+" | Search + explorer (326 of 343) | `traffic-germany` scope |

Sitemap: `/city-webcams` and `/us-traffic-cameras` added to `SEO_PAGES` in `src/app/sitemap.ts`.

## Entity-page decisions (honesty rule)

- **Airports — no per-airport pages.** The catalogue carries no airport entity: an airport exists
  only as free text inside a camera's name/city. Building airport entities would mean inventing
  an inventory. Instead `/airport-webcams` groups the defined set by country/city and searches by
  name (airport names live in the titles). Same conclusion as the Oct 18 decision, re-verified
  against the current data model. **Beaches — same**: no beach entity inventory; grouping +
  search on the hub.
- **Asia/Europe — no duplicated country pages.** The region pages group their explorers by
  country and link to the existing country pages (Europe's table now links all 46).
- **Cities — real pages already exist** (55), so the work was treatment, not creation: explorer +
  route finder where the records back them. **Sydney** (chunk records under its exact name: 1)
  and **Washington, DC** (0 — its page is assembled from Maryland CHART feeds listed under
  Maryland localities) keep their featured grids; the reason is documented in the [city] page
  code and here.

## Route-tool placement

`/live-traffic-cameras` and `/us-traffic-cameras` (no prefill), and every `/city-webcams/[city]`
page that carries the explorer (destination prefilled to the city's camera centroid).

## Pre-existing discrepancies found (flagged, not silently "fixed")

- **State pages quote assembled-catalogue counts** (Georgia 4,330, Utah 2,082) while the served
  country chunks count Georgia 4,284 / Utah 2,084. The state pages' copy was left as-is; the new
  US hub quotes the explorer's computed numbers and notes the two can differ slightly.
- **Traffic country pages' headline strings** ("3,000+", "1,600+", …) describe each country's
  *full index approximately* (Japan's comment documents a 10,757 union incl. an Oct 2026 harvest;
  the served chunk holds 10,472). Editorial copy left as-is; each page's new explorer section
  states the exact traffic count and the exact index count side by side.
- **Headline 74,229 vs catalogue 76,575 records** on `/live-webcams`: the headline is the owner's
  published served-camera figure and was kept verbatim; per-country counts are the index's own
  (the same numbers the country pages already quote).
- **`/world-city-webcams` linked a non-existent page**: its editorial chip list included
  Fort Worth, but `/city-webcams/fort-worth` has no curated or generated entry (it 404s).
  The chip was removed; the link list now matches the pages that exist.
- Sweden's editorial "1,600+" overstates its index (1,569) — left as the page's own copy,
  flagged here.

## Merge note — ski overlap

The sibling ski build (`feature/ski-resort-pages`) is creating a similar route-cameras tool in
parallel. This branch's version is the generic one (`RouteCameraFinder` +
`/api/cctv/route-cameras`, corridor math from `lib/route-cameras`). At merge time, reconcile the
two into one component/endpoint rather than shipping both; nothing in this branch depends on the
ski work.

## Gates

- `npx tsc --noEmit` — **clean** (after fixing two missing imports in the extracted feed card,
  commit `1a430e3`).
- Full vitest — **baseline-exact**: 297 files / 3,046 tests, **3,021 passed, only the 2 known
  baseline failures** (`src/lib/oi/context.test.ts`, `src/app/api/cctv/route.test.ts`). All new
  tests pass (explore-scopes 13, plus country-cameras 26, route-cameras 11, country-slices 8).
  (An earlier unattributable run summary showed a phantom third failure from a test file that
  does not exist in this tree — suites were running concurrently across worktrees at the time;
  the attributable re-run logged in this worktree is the result quoted here.)
- Production build — **environment-blocked, not code-blocked.** Evidence: the first attempt ran
  266 s — past config load and the Google Fonts fetch (fonts.googleapis times out for curl but
  answers Node fetch, which is what Next uses) and into Turbopack compilation with no module or
  compile error — before dying on a Turbopack cache write: `failed to write …/cache/turbopack/
  …/00000001.sst: Operation not permitted`. Every later attempt (Turbopack and `--webpack`,
  fresh `.next` each time) fails within seconds at the same early build-bootstrap write with
  `EPERM: operation not permitted, write`. The same EPERM intermittently hits npm writing its
  own log, strace writing its trace file, and git writing `index.lock`, while plain shell/Node
  writes to the same directories succeed in the same minutes — and sibling worktrees' builds
  failed all day (two VM restarts; overlay FS with metacopy). The build gate should be re-run
  when the box settles; nothing in the failures points at this branch's code, and tsc + the full
  suite are green.
