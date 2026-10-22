# Breaking-events pages — earthquakes, hurricanes, tornadoes

Branch `feature/breaking-events` off production `e7c0285`, worktree
`~/workspace/worldeye-events`. Not pushed, not deployed.

## What the owner asked

A page for recent large earthquakes that updates the moment the map
gets the event, plus the same for hurricanes and tornadoes separately —
so people searching for a breaking event land on WorldEye.

## Route inventory

| Route | Kind | Notes |
|---|---|---|
| `/earthquake-tracker` | existing, upgraded in place | live significant-quakes list added under the hero |
| `/earthquake-tracker/[id]` | new, dynamic (`revalidate 300`) | one USGS event per page, by USGS event id |
| `/hurricane-tracker` | existing, upgraded in place | live active-storms list added under the hero |
| `/hurricane-tracker/[stormId]` | new, dynamic (`revalidate 300`) | one active NHC storm per page |
| `/tornado-tracker` | new | live NWS alert board + SPC reports (last 3 days) |
| `/tornado-tracker/report/[id]` | new, dynamic (`revalidate 3600`) | one SPC report per page, id embeds its SPC day |
| `/api/tornadoes` | new API | `{ alerts, reports, sources, timestamp }`, degrades to empty lists |
| `/news-sitemap.xml` | extended | blog entries unchanged; fresh event entries appended |
| `/sitemap.xml` | touched | `/tornado-tracker` added beside `/earthquake-tracker` |

## The /earthquake-tracker decision

**Upgraded in place — no new hub.** /earthquake-tracker is the
established, indexed SEO page (in the main sitemap, cross-linked from
the other trackers). Building the live product at a second URL
(/earthquakes) would split ranking signals between two pages chasing
the same searches. The static SEO content is untouched; the live list
sits directly under the hero, and per-event pages hang beneath the same
path (`/earthquake-tracker/<usgs id>`). The hurricane tracker got the
identical treatment for the identical reason.

## Earthquakes

- **Source**: USGS, via the same summary feed the globe uses
  (`2.5_day.geojson`, M2.5+/24h) — the hub list polls `/api/earthquakes`
  client-side every **60 s** (the API's own `s-maxage` is 60) and
  filters to **M4.5+ worldwide** (`SIGNIFICANT_MAGNITUDE` in
  `src/lib/events/earthquakes.ts`). Page copy states source + cadence.
- **Per-event pages**: USGS FDSN event service (`eventid` query) — the
  same USGS catalog, so ids stay valid after aging out of the 24-hour
  summary. Shows magnitude, verbatim USGS place, depth, UTC time, local
  epicenter time **only when USGS published a `tz` offset**, coordinates,
  tsunami flag, felt-report count, CDI/MMI, PAGER alert, significance,
  status — each field omitted when the feed doesn't carry it. USGS
  attribution + link to the USGS event page.
- **Globe link**: the globe's own entity deep link `/?quake=<usgs id>`
  (`src/lib/share/links.ts`, `quakeShareId`) — flies to the event.
- **Titles**: `M4.8 Earthquake near <verbatim USGS place> — <date>`,
  the phrasing people search; honest WebPage + BreadcrumbList JSON-LD.

## Hurricanes

- **Source**: NOAA NHC through `/api/hurricanes` (CurrentStorms.json +
  NHC MapServer: forecast points, cone, track, past track; server cache
  10 min). The hub list polls it every **5 min** and says so.
- **Refactor (behavior-preserving)**: the fetch pipeline moved from
  `src/app/api/hurricanes/route.ts` into `src/lib/events/hurricanes-data.ts`
  (`cachedSource` key `nhc-hurricanes`, same TTL, same trimming) so the
  server-rendered storm pages read the *same in-process cache* instead
  of a second fetch of NHC. The route's response shape is byte-for-byte
  the contract it always had (`{ features, storms, count, source }`).
- **Per-storm pages**: name, classification label, position, sustained
  winds (kt + mph), pressure, movement (16-point compass + speed),
  NHC last update, and the forecast-points table (valid label, forecast
  hour, max winds, gusts, pressure, category). Category shows NHC's own
  analysis-point number when the GIS feed carries it; otherwise it is
  derived from sustained winds by the standard Saffir–Simpson
  thresholds **and labeled "from sustained winds"**. Cone/track presence
  is stated only when the feed actually returned them. NHC attribution
  + official-warnings-first safety copy.
- **Recently dissipated storms**: not available — CurrentStorms.json and
  the MapServer only carry active storms. A storm page 404s once NHC
  stops tracking it rather than freezing stale numbers.
- **Globe link**: `/?storm=<nhc id>`.

## Tornadoes

- **Live alerts (list only, no per-warning pages — they are ephemeral)**:
  NWS active alerts from `api.weather.gov` — the same endpoint the
  globe's weather layer already consumes in `/api/weather`. That route
  normalizes alerts into map pins (alert messages only; drops updates,
  instructions, parameters), so the tornado pipeline reads the endpoint
  with alert-list semantics: `status=actual&message_type=alert,update`,
  pagination followed, **superseded versions dropped** (an update's
  `references` name the message it replaces — tested), filtered to
  Tornado Warning / Watch / Emergency. Cards show headline, areas,
  sender, expiry, tornado-detection + damage-threat + hail/gust
  parameters, and the NWS's full text and safety instructions verbatim,
  with a link to the official alert. Server cache 3 min (same cadence
  as `/api/weather`); the board polls `/api/tornadoes` every **2 min**
  and says so.
- **Reported tornadoes**: SPC daily filtered storm reports
  (`<YYMMDD>_rpts_torn.csv`), verified live from this box: columns
  `Time,F_Scale,Location,County,State,Lat,Lon,Comments`; comments are
  the line remainder (they contain commas); **times are UTC** (verified
  against a report whose narrative states its local time). Fetches the
  last 3 SPC days via `cachedSource` (30 min). Stable ids are derived
  deterministically from the row (`tornadoReportId`: day-time-position
  + a short hash of the place fields), and a report page re-reads its
  row from its own day's file. Copy labels everything **preliminary /
  reported**; the `F_Scale` value is shown verbatim ("UNK" renders as
  "no rating in the report"); nothing on any surface calls a report
  confirmed — confirmation/EF ratings are explained as later NWS survey
  products. SPC's narrative is quoted verbatim, attributed, with a link
  to the day's source CSV.

## News sitemap (fast discovery)

`src/lib/events/news.ts` builds `<url>` blocks in the exact wave-2
format (same publication block) for: quakes M4.5+ with event time inside
Google's 48-hour window, all currently active storms (dated by NHC's
last update), and SPC reports inside 48 hours (`tornadoReportEpochMs`).
`/news-sitemap.xml` appends them after the unchanged blog entries; the
route's revalidation drops 3600 → 600 s. Every source is
`Promise.allSettled`-isolated: an outage yields a blog-only sitemap.

## Globe reuse vs new

- Reused: `/api/earthquakes` (unchanged), `/api/hurricanes` (response
  unchanged; fetcher relocated to a lib), `/?quake=` / `/?storm=`
  share deep links, `/?layers=weather` for tornado surfaces, the
  tracker pages' design system (`docs-root`, JsonLd, RelatedLinks,
  SiteFooter), `cachedSource`.
- New: `src/lib/events/{earthquakes,hurricanes,hurricanes-data,tornadoes,news}.ts`,
  `src/app/api/tornadoes/route.ts`, three client boards in
  `src/components/events/`, four page routes, cross-links from the
  earthquake / hurricane / weather trackers to the tornado tracker.

## Tests

29 new tests, all passing: USGS parse/threshold(`M4.5` boundary,
inclusive)/dedupe-by-newest-revision/sort/headline/local-time-from-`tz`;
storm grouping by name, analysis-category preference vs derived,
Saffir–Simpson thresholds, classification labels, compass, kt→mph;
SPC CSV parse (comma-bearing comments, unrated rows stay unrated, id
stability), NWS event filter, supersede-dedupe, warnings-before-watches
sort, report epoch math.

## Gates

- `npx tsc --noEmit` — **clean** (exit 0).
- Full vitest suite — **3,034 passed / 2 failed / 26 skipped**, and the
  only test failures are the two known baselines
  (`src/lib/oi/context.test.ts`, `src/app/api/cctv/route.test.ts`).
  One extra *file-level* failure appeared in that run:
  `src/app/admin/admin-graph.test.ts` died in a vitest-worker
  transform timeout (75 s, all tests skipped) under extreme box
  contention — re-run in isolation it passes **3/3**.
- Production build — **NOT PASSED, environmental.** Seven attempts.
  Every failure is at the same stage: Turbopack's `next/font/google`
  fetch for the four fonts in the **pre-existing root layout**
  (`Failed to fetch Audiowide/Fraunces/JetBrains Mono/Public Sans from
  Google Fonts` / the resolver variant) — files this branch does not
  touch. During the attempts the sandbox lost egress to *all* external
  hosts for long stretches (fonts.googleapis.com, fonts.gstatic.com,
  earthquake.usgs.gov, api.weather.gov and google.com all timing out at
  8–10 s per probe); one attempt was also OOM-killed during a sibling
  build pile-up. No compile error in any new or changed file appeared
  in any attempt. **Before merging, re-run `npm run build` in this
  worktree once egress is healthy** — expect exit 0 with
  `/earthquake-tracker/[id]`, `/hurricane-tracker/[stormId]`,
  `/tornado-tracker`, `/tornado-tracker/report/[id]`,
  `/api/tornadoes` in the route table.

## Honesty notes

- No invented events, fields or timestamps: every rendered number
  traces to USGS / NHC / NWS / SPC payload fields, each omitted when
  absent (felt/CDI/MMI/tz, gusts, categories, ratings).
- Freshness copy matches implementation: quakes "refreshes every
  minute" (60 s poll on a 60 s-cached API), storms "checks every
  5 minutes" (NHC itself is 10-min cached upstream — the storm page
  also tells users NHC advisories follow NHC's own schedule), tornado
  board "checks every 2 minutes" (NWS cache 3 min, SPC 30 min — the
  FAQ states both).
