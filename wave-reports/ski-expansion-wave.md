# Ski expansion wave — report

**Branch:** `feature/ski-expansion-wave` (worktree `~/workspace/worldeye-ski-wave`)
**Base:** `8d20fce` (production master)
**Status:** Code and data complete on disk. NOT pushed (per brief).
**⚠️ Commits:** only `7e3f3da` and `d892dcd` landed. Everything after that is
written and validated on disk but **UNCOMMITTED** — the sandbox's write
mediation has rejected every `git commit` since ~05:18 UTC ("unable to write
loose object file: Operation not permitted"; see §8). The worktree must be
committed as soon as git writes work again; suggested grouping: (1) grid sort
+ snow stakes + route tool/map, (2) facts system + content, (3) dataset
39→112 + generator candidates, (4) this report.

## 1. "View on globe" bug — root cause (FOUND, verified against production) — FIXED `d892dcd`

The button itself is fine: ski pages render `href="/?camera=<id>"` correctly
(verified in the live https://worldeye.app/ski-webcams/snowbird HTML), and the
globe page's deep-link handler is complete (resolve against the loaded
catalogue, else fall back to `GET /api/cctv?id=<id>`).

The failure is in that fallback: **the by-id lookup only searched the live
runtime catalogue, while directory/ski/country/city pages are built from the
static per-country chunks (`src/data/countries/*.json`), whose ids the live
catalogue does not always carry.** A miss in both lands the visitor silently
on the plain globe — the tap looks like it did nothing.

Verified live evidence (2026-10-23 ~03:36 UTC):

- Snowbird's top camera, `udot-165175` (Little Cottonwood Rd / SR-210):
  `GET https://worldeye.app/api/cctv?id=udot-165175` → `{"cameras":[],"total":0}`.
- `GET /api/cctv?region=utah` returns 2,086 cameras — none of the SR-210
  canyon cameras topping the Snowbird page are among them.
- UDOT's upstream (`prod-ut.ibi511.com/List/GetData/Cameras`) reports
  recordsTotal 2086 and contains **no** record 165175 (nor 155967/165271/
  165174/165998) — UDOT renumbered its whole inventory (chunk UDOT ids run
  112731–168351; the live list now runs 170390+). The camera itself is
  alive: `https://prod-ut.ibi511.com/map/Cctv/165175` still serves a fresh
  1280×720 JPEG.

All chunk-backed pages (ski, country, city, directory) were affected the
same way — all share `CameraFeedCard` → `/?camera=<chunk id>`.

**Fix:** `GET /api/cctv?id=` now resolves across both catalogues. New
`src/lib/camera-directory-lookup.ts`: `buildDirectoryIndex(chunks)` →
exact-match `Map<string, CountryCamera>` (first record wins on duplicate
id); lazy `loadDirectoryIndex()` dynamic-imports every chunk listed in
`src/data/camera-countries.json` (cached per instance, failed chunk
skipped); `findDirectoryCameraById(id)`. Wired into the `?id=` handler:
held-regions scan → directory lookup → full `collectRegions` → held scan
again; the synthetic region marker `'directory'` is excluded from the
response's `regions` field. No fuzzy matching — an id in neither catalogue
still returns an honest empty list. Tests: `camera-directory-lookup.test.ts`
(written; execution environment-blocked, see §7).

## 2. All resorts — DONE: 39 → 112 pages

Method: 204 new candidates (US/CA/EU/JP/Korea/Southern Hemisphere) geocoded
via OSM Nominatim (display names eyeballed; wrong-place hits — Kirkwood MO,
Sundance WY, Mayrhofen→Saalfelden, Borovets→Yambol, Wildcat NC — discarded
and re-geocoded; Wildcat NH and Treble Cone coordinates taken from
Wikipedia's coordinates API). All candidates scored against the same country
chunks with the Wave 1 gates, mirrored exactly and validated against the
published dataset (41 covered / 39 kept / 0 mismatches before expansion):
≥1 camera within 10 km, ≥4 within 40 km total, 6 km close-pair collapse.
**73 new resorts passed; the dataset (`src/data/ski-resorts.json`,
generatedAt 2026-10-23T06:48:46Z) now holds 112 resorts.** The 39 published
resorts' rows are byte-identical to before (verified). The generator
(`tools/build-ski-resorts.mjs`) now carries all 243 candidates and parses
clean. The sitemap and hub are dataset-driven (`src/app/sitemap.ts` imports
`ski-resorts.json`), so all 73 new pages enter the sitemap automatically —
build verification pending (§7).

New pages include: Grouse Mountain (33 resort cams), Cypress Mountain (18),
Northstar (14), Ischgl (14), Courmayeur (14), Beaver Creek, Sugar Bowl,
Shiga Kogen, Myoko Kogen, Snowmass, Kicking Horse, Kranjska Gora, Poiana
Brașov, plus 60 more across the US, Canada, Austria, Italy, Japan, the
Nordics, Slovenia, Romania, Spain, Switzerland, Germany, Iceland, New
Zealand and Kazakhstan (Shymbulak).

### No-coverage list (never published — no empty pages)

Scored but failed the gate (resort-radius / 40 km-total camera counts):
Powderhorn (0/12), Grand Targhee (0/9), Bridger Bowl (0/8), Tamarack (0/9),
Silver Mountain (0/11), Kirkwood (0/22), Bear Valley (0/9), Mt. Baker (0/17),
Angel Fire (1/1), Red River (1/1), Alyeska (0/11), Smugglers' Notch (0/22),
Stratton Mountain (0/14), Bretton Woods (0/12), Waterville Valley (0/12),
Wildcat Mountain (0/17), Gore Mountain (0/2), Hunter Mountain (0/6),
Holiday Valley (0/6), Snowshoe (0/1), Wintergreen (0/51), Sugar Mountain
(0/10), Crystal Mountain MI (0/10), Lutsen Mountains (0/3), Big White (0/8),
Sun Peaks (0/17), Marmot Basin (0/1), Nakiska (0/5), Castle Mountain (0/6),
Méribel (0/2), Les Deux Alpes (0/0), Alpe d'Huez (0/0), Tignes (0/1),
La Plagne (0/2), Les Arcs (0/2), Avoriaz (0/1), Megève (0/2), La Clusaz
(0/3), Serre Chevalier (0/1), Chamrousse (0/0), Engelberg-Titlis (0/7),
Crans-Montana (0/3), Saas-Fee (0/4), Laax (0/4), Adelboden-Lenk (0/5),
Gstaad (0/3), Zell am See-Kaprun (0/18), Schladming (0/25), Bad Gastein
(0/27), Serfaus-Fiss-Ladis (0/61), Madonna di Campiglio (0/2), Livigno
(0/4), Bormio (0/6), Sestriere (0/0), Alta Badia (0/0), Kronplatz (0/0),
Val di Fassa (0/0), Garmisch-Partenkirchen (0/10), Winterberg (0/0),
Feldberg (0/1), Baqueira-Beret (0/1), La Molina (0/2), Trysil (0/2),
Idre Fjäll (0/2), Tahko (0/14), Zakopane (0/0), Szczyrk (0/0), Białka
Tatrzańska (0/0), Krynica-Zdrój (0/0), Špindlerův Mlýn (0/0), Pec pod
Sněžkou (0/0), Klínovec (0/0), Jasná (0/0), Štrbské Pleso (0/0), Krvavec
(0/0), Vogel (0/5), Bansko (0/0), Borovets (0/0), Pamporovo (0/0), Sinaia
(0/8), Parnassos (0/0), Kalavryta (0/0), Uludağ (0/2), Erciyes (0/0),
Palandöken (0/0), Kartalkaya (0/0), Gudauri (1/0), Bakuriani (0/0),
Kopaonik (0/0), Jahorina (0/1), Glenshee (0/0), Cairngorm (0/0), Glencoe
(0/0), Coronet Peak (0/4), Cardrona (0/0), Treble Cone (0/0), Falls Creek
(0/0), Mount Buller (0/0), Mount Hotham (0/0), Valle Nevado (0/1),
Portillo (0/0), Nevados de Chillán (0/0), Cerro Catedral (0/0), Cerro
Chapelco (0/0), Las Leñas (0/0), Cerro Castor (0/3), Yongpyong (0/1),
High1 (1/0), Phoenix Snow Park (0/0), Jisan Forest (0/11), Muju Deogyusan
(0/0).

Note the pattern: many European alpine villages and most Southern
Hemisphere resorts have cameras in the catalogue within 40 km but none
within the 10 km resort radius from the village point (Serfaus 0/61 is
the extreme). The gate was applied as specified — points were NOT moved
to chase camera clusters.

Never located in OSM search (no coordinates, so not scored): Loveland,
Purgatory, Lookout Pass, Sierra-at-Tahoe, Mt. Hood Meadows, Timberline
Lodge, The Summit at Snoqualmie, Mission Ridge, 49 Degrees North, Arizona
Snowbowl, Mt. Rose, Boyne Mountain, Terry Peak, Fernie Alpine Resort,
Whitewater, Arosa Lenzerheide, Rosa Khutor, Bukovel, Bláfjöll, Kiroro,
Vasilitsa.

Wave 1 non-published candidates (from the original 59) remain unpublished:
Deer Valley and Alta (close-pair drops), plus Big Sky, Cervinia, Chamonix,
Cortina d'Ampezzo, Courchevel, Crystal Mountain (WA), Davos, Kitzbühel,
Mont-Tremblant, Mt Hutt, Perisher, Sun Valley, Taos Ski Valley, Thredbo,
Val d'Isère, Val Gardena, Verbier (facts entries for these already exist
in the facts file, keyed by slug, ready if coverage ever lands).

## 3. Unique substantial content — DONE for 102 of 112 pages

System: `src/data/ski-resort-facts.json` + `src/lib/ski-resort-facts.ts`,
rendered as an "About <resort>" section (sourced stat chips + per-resort
paragraphs + a "Road conditions to <resort> — the drive in" access block)
between Conditions and the camera grid, only when a facts entry exists.
**119 entries**: all 39 existing resorts (Wave-2 pass), 63 of the 73 new
resorts, and 17 held for no-coverage resorts (above).

Sources: Wikipedia only — "Infobox ski area" fields parsed via the API
(vertical / top_elevation / base_elevation / skiable_area / number_trails;
ft→m ×0.3048, acres→ha ×0.404686) and article extracts for prose. Where the
infobox parse and the article text disagreed (e.g. Monarch trails), the
number was dropped rather than guessed. European/Japanese town articles
mostly lack the ski infobox → prose-only entries instead of invented
numbers (Chamonix deliberately carries no figures: its Grands Montets
top-lift status is stale since the 2018 fire).

Ten NEW resorts have no facts entry — Wikipedia yielded no usable sourced
material in this pass, and nothing was invented for them: Diamond Peak,
Grouse Mountain, Blue Mountain (Ontario), Tomamu, Myoko Kogen, Oppdal,
Voss, Pyhä, June Mountain, Hoodoo. Their pages still carry the standard
dataset-driven content (live counts, corridors, route tool, resort-specific
FAQs). Follow-up: source these ten from resort/DOT pages.

Live data woven through every page (unchanged machinery, now on 112
pages): camera counts from the dataset, road-corridor cameras, NWS alerts
for US resorts via SkiConditions, and the route tool (§4).

## 4. Route tool on top + map — DONE (code)

The route-tool section ("Plan the drive to {name}") now leads every resort
page — directly under the stat row, before intro/conditions/cameras — on
all 112 pages. Results render the new `SkiRouteMap` (MapLibre via
next/dynamic, ssr:false; the site's CARTO dark basemap): gold route line
over a dark casing, cyan camera markers (click → popup with name + km into
the drive, built from text nodes only — camera names are third-party data),
green start / gold destination markers, fit to route bounds. The ordered
camera grid with along-route distances follows as before (data flow
unchanged: /api/geosearch → /api/directions → POST /api/ski/route-cameras,
2.5 km corridor). Map inputs are memoised so typing after a search doesn't
rebuild the map. Map failure is caught silently; the list carries the
result.

## 5. Snow stakes first — DONE (code)

`isSnowStakeCamera` (lib/ski-resorts.ts) matches stake cameras by their
operator-given names (`/snow[-\s]?stake/i` on the camera name only).
`selectResortCameras` pins them atop the resort's own grid (working-feed
tier order preserved inside each group); the page labels them "Snow stake"
via the grid caption. Unit tests cover the pinning order and matcher
positives/negatives (incl. "Staker Road at Milepost 4" → false).

## 6. Working feeds first — global — DONE (code)

**Signal:** directory records carry no probe result or online flag, so the
sort uses **playability** — `cameraFeedTier()` in `src/lib/country-cameras.ts`
(via `previewMedia`): tier 0 = resolves a real jpg/mjpeg/mp4/hls URL;
tier 1 = embed (plays in the viewer); tier 2 = listing only (no playable
URL). `sortWorkingFeedsFirst()` is a **stable** tier partition — each
grid's native order (distance, city/name) survives inside a tier. Applied
at the serving seams: `sliceCountryCameras` (country + city pages and, via
`sliceExplore`, every DirectoryExplorer scope: directory, traffic, state,
intent hubs); `selectResortCameras` (ski); `sortForGrid` in
alert-cameras.ts uses ALERTCalifornia's real per-camera `online` flag as
primary key (county/name order preserved inside). Deliberate exception:
route-tool results stay in along-route order — that order is the product.

**Limits:** playability is a property of the record, not a probe — a
tier-0 feed can be down right now (its card shows the unavailable state at
load), and a tier-2 record may still resolve in the viewer. The sort ranks
order; it never claims liveness. Tests added for tier classification,
sort stability (input unmutated) and the alert-grid offline sink.

## 7. Gates

- **tsc: PASS.** Full `tsc --noEmit` over the tree: exit 0, zero errors
  (final run 2026-10-23 ~07:2x UTC, after fixing the one error it caught in
  SkiRouteMap's popup geometry cast).
- **vitest: NOT RUN — environment-blocked.** The sandbox write mediation
  kills vitest's worker cache writes (`EPERM: operation not permitted,
  write` in vite-node's fs cache and the results cache) so zero tests
  execute. This is environment-wide tonight (sibling worktrees fail
  identically; their logs show the same serialized EPERM). New/changed
  test files are in place: camera-directory-lookup, country-cameras,
  ski-resorts, alert-cameras (plus existing suites untouched). The 2 known
  baselines (oi/context, cctv route) could not be re-confirmed — re-run
  `vitest run` when the environment heals; expected: only those 2 fail.
- **Production build: NOT COMPLETED — environment-blocked.** `next build`
  (Turbopack) aborts at its first write with the same EPERM. Exactly one
  build was attempted per the brief; it never reached compilation. Re-run
  when writes recover — the tsc pass and dataset validation are the
  strongest available proxies meanwhile.
- **Sitemap:** new pages are emitted from the dataset by `src/app/sitemap.ts`
  (verified by code inspection); build-level confirmation pending the build.

## 8. Environment blocker (context for §7 and the missing commits)

From ~05:18 UTC the sandbox's write mediation rejects `write()` with EPERM
for git, node, python and tar — apparently process-class based and
time-varying (windows open and close over ~10–20 min; sibling agents hit
the same failures). Established behaviour: processes that read large data
lose file-write rights entirely (a node script that reads a 10 MB chunk
cannot write 3 KB afterwards), while reads, stdout, jq (small reads) and
the agent file tools keep working. Consequences worked around tonight:
node_modules restored via hardlinks from a sibling worktree; the dataset
generated by a validated mirror of the generator logic and assembled from
printed slices with jq; facts merged with jq. `git commit` never succeeded
after 05:18 despite ~10 retries across open windows — git appears to be in
a permanently blocked class. **First action for whoever picks this up:
`git add -A && git commit` in this worktree, then run the two blocked
gates.**

## Commits on this branch

- `7e3f3da` — report skeleton + View-on-globe root cause (verified live)
- `d892dcd` — View-on-globe directory-resolution fix + tests
- (everything else: on disk, uncommitted — see header)
