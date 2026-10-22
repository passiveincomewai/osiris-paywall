# DOT states tail — integration report (branch `feature/dot-states-tail-oct22`, base `97c4f9f`)

Owner order 2026-10-22: integrate the missing/under-covered state DOT camera
feeds for RI, MS, AL, AR, WV, NJ, VT, OK, MA, KS, ME, NM (IA/OH/KY/WY/SD
excluded — sibling program). Method per the Oct-18 AUDIT: agency-direct
channels only (Argus/Ora/Cam Depot reference-only), audit-order dedupe vs the
76,313-record served catalogue, probe-verification, per-state commits.
Public headline 74,229 untouched. **Not deployed, not pushed.**

## Outcome summary

- **9 states integrated and registered**: VT, NM, WV, MS, MA, KS, AR, ME, AL.
- **1 state built but registration HELD**: OK (mechanism question needs one
  real-browser check — see below).
- **2 states HELD, no lawful/usable channel**: RI (no coordinates published
  anywhere), NJ (authenticated session + tokenized HLS + TrafficLand-proxied
  stills — serving it would mean the server minting session tokens).
- 712 OpenCCTV harvest records superseded by the direct modules were removed
  from `opencctv-harvest.generated.ts`, inside the same per-state commits, so
  the map never doubles a camera.

## Totals

- Catalogue before: **76,313** records (payload-best.json baseline).
- Harvest records dropped: **712** (VT 68, NM 145, WV 3, MA 150, KS 275,
  AR 26, ME 45).
- New direct-module regions serve (feed counts at integration time; MS
  measured on the local production build): VT 85 · NM 185 · WV 133 ·
  MS 1,075 · MA 307 · KS 499 · AR 550 · ME 134 · AL 638.
- Catalogue after: **79,205** (= 76,313 − 712 + 3,604), a net growth of **+2,892** records. Region counts were measured on the local production build (`/api/cctv?region=<key>`), not just taken from worker feed counts: AL 635 (feed published 638 at worker fetch — live drift), VT 85, ME 134, NM 185, WV 133, MA 308 (worker accounting 307 — ±1 drift), KS 499, AR 550, MS 1,075.
- Strictly net-new cameras (not previously served in any form):
  VT +1 · NM +20 candidates (19 re-probe-verified alive, 13 origin-dead
  across the wider non-duplicate set) · WV +130 · MS +<MS> (0 duplicates) ·
  MA +128 (+10 near-distinct) · KS +217 · AR +518 (+6 near-distinct) ·
  ME +31 verified live frames (+54 currently serving the NE511 offline
  slate) · AL +638.
- Deferred: OK +316 if registered (449 duplicates dropped against 152
  harvest records + 19 new).

## Gates

- `npx tsc --noEmit`: clean (one fix commit: the shared IBI record type now
  admits the NE511 image `id` that Maine's verbatim fixtures carry).
- Full vitest: **3,096 passed, 2 failed — exactly the 2 known baseline
  failures** (`src/lib/oi/context.test.ts`,
  `src/app/api/cctv/route.test.ts`), 302 files passed / 2 skipped.
- Production build: **exit 0** (compiled in 99 s, 503/503 static pages).
- All 10 new state test files pass (79 tests).

## Per state

### Vermont — INTEGRATED
- Channel: New England 511 (`newengland511.org/List/GetData/Cameras`, IBI
  DataTables) — VTrans's designated channel (its own RWIS page points here).
- Inventory 406 tri-state rows, 89 VT. Found 89; duplicates 84 (url-full 68,
  same-location 3, geo-name 13 — several are distinct sibling cameras at
  shared gantries, served as published); near-distinct 0; dead 0;
  placeholders: 4 sites (58, 282, 814, 1672) serve an identical offline PNG —
  excluded by site id in the mapper. Module serves **85**. Superseded 68.

### Rhode Island — HELD (no coordinates)
- RIDOT publishes 124 unique cameras (155 listings) across six static pages
  at dot.ri.gov with snapshots + Wowza HLS — but **no official source
  publishes coordinates**: the pages and cameras.js carry none, the RIGIS
  ArcGIS org (~470 services) has no camera layer, RIDOT_Roads_2016 has no
  LRS/milepost fields to convert the filename milepoints, tmc.dot.ri.gov is
  dead, and RI has no 511 map. Unblock: RIDOT publishes coordinates, or the
  owner accepts milepoint-derived estimates. Dedupe note: the state's one
  served camera (Tefft Hill, `occ-ridot-680`) url-matches cam81 — its
  superseded file was **not** applied (no replacement module exists).
  Parsed inventory preserved from the worker run.

### Mississippi — INTEGRATED
- Channel: MDOT Traffic (`mdottraffic.com`, the DOT's own ASP.NET site, no
  key): `LoadCameraData` index (457 sites) + per-site pages parsed live;
  Wowza thumbnails + HLS.
- Worker parsed 823 candidate views from ~263 sites pre-outage; the module
  fetches all 457 sites' views at runtime — measured on the production
  build: **1,075 views served** (first call returned 0 inside the route's
  per-region budget while the cold fan-out filled the cache; the second
  call served the full set — the documented cache-landing pattern).
  Duplicates **0** by all methods — the 37 arcgis records in the MS box are
  Tennessee DOT Memphis spillover. Source `novideo.jpg` placeholders
  excluded. Spot probe passed fully. Superseded 0.

### Alabama — INTEGRATED
- Channel: ALGO Traffic API (`api.algotraffic.com/v4.0/Cameras`, GeoJSON,
  no key — ALDOT/ALEA's official platform, built by UA CAPS).
- Inventory 647 in feed / 638 Public (9 restricted dropped by the mapper).
  Duplicates **0** by all methods (nearest catalogue camera 1.76 km away —
  the state was genuinely uncovered). Dead 0, placeholders 0, imported
  **638**, all probe-verified (294 pass 1; remaining 344 verified 344/344 on
  retry; 30 s probe timeout used and disclosed — sandbox egress latency ran
  12–18 s, so the 8 s spec returned transport errors even for known-live
  cameras; acceptance rules unchanged). Superseded 0.

### Arkansas — INTEGRATED (stills only, by design)
- Channel: `layers.idrivearkansas.com/cameras.geojson` — the layer file
  IDriveArkansas's own map loads; layer also publishes its base URL.
- HLS deliberately not imported: the video CDN is CloudFront signed-cookie
  gated and the session endpoint is WAF-challenged (NJ discipline). Stills
  are openly served on the layer host (720×405 PNG bytes under .jpg names).
- Inventory 550 (all reporting online; ARDOT's ITS page counts ~440
  department-owned — the layer also carries partner cameras). Duplicates 26
  (same-location 19, geo-name 7, all vs arcgis_cams — the harvest's AR
  arcgis records were ARDOT); near-distinct 6; new 518. Final probe: 329
  verified-alive, 0 confirmed dead, 0 placeholders; 191 transfers never
  completed (all timeouts, zero HTTP errors — sandbox egress). Module
  serves the 550 published records. Superseded 26.

### West Virginia — INTEGRATED (stream-edge caveat)
- Channel: WV 511's own map service (`wv511.org/wsvc/gmap.asmx/
  buildCamerasJSONjs`); HLS on `vtc1.roadsummary.com` keyed by the feed's
  md5 id (player-page verified for CAM117).
- Inventory 133. Duplicates 3 (url-full); new 130 (border-bleed checked —
  the state511/virginia records near the border are >120 m away).
  Caveat: the stream edge is unreachable from the sandbox egress at every
  budget (coordinator retries included, all CONNECT timeouts); independent
  fetcher evidence: CAM029 valid #EXTM3U master (720×480), CAM005/CAM123
  HTTP 204 (edge up, encoder offline), and the 3 harvest twins were
  probe-verified at harvest with identical URLs. Superseded 3.

### New Jersey — HELD (mechanism documented)
- 511nj.org is a bespoke Angular SPA (not IBI-511). The app logs in with a
  hardcoded anonymous guest account → JWT; the camera inventory endpoint
  returns 401 without the token; no public inventory exists anywhere
  (data.nj.gov carries counts only; no NJDOT ArcGIS camera service).
- HLS is OTP-tokenized per session (default 120 s). Serving NJ would mean
  WorldEye's server continuously logging in and minting per-camera tokens —
  outside the lawfulness bar for this program. Stills are no better: URLs
  are issued only inside the authenticated response, and the image proxy's
  upstream is **TrafficLand** (NJDOT/NJTA's contracted distributor, 368
  cameras) — a commercial feed, not an open DOT channel. NJTA/GSP is not a
  separate open channel.
- Verdict: HELD. Revisit only if NJDOT publishes an unauthenticated feed or
  a TrafficLand licence is obtained. A browser session would not change
  this verdict. Found 0, imported 0, superseded 0.

### Oklahoma — BUILT, REGISTRATION HELD (coordinator adjudication)
- Channel: `oktraffic.org/api/CameraPoles` (LoopBack API behind ODOT's OK
  Traffic map; ODOT's ArcGIS org has no camera layer).
- Public Web filter: 468 cameras / 158 poles (of 899 total). Duplicates 449
  (same-location 435, geo-name 14; url matchers score 0 because stream keys
  rotate per dictionary rebuild — the MapCamera id is the stable key,
  documented in the module header). New 19.
- **Blocker**: current-dictionary playlist URLs return genuine HTTP 404
  from the origin today (worker text-fetcher 3/3, coordinator 1/1 — not an
  egress failure), while the Oct-18 harvest probes found 404/442 alive with
  fresh keys, and the client SDK exposes `MapCameras/:id/startStream` — a
  possible start-on-demand model. Committed as module + tests only
  (9/9 pass), **no route registration, no harvest drop** (the 152
  occ oktraffic records stay served meanwhile).
- **Needs one real-browser check** (coordinator has no live browser): open
  a camera on oktraffic.org. If it plays and its playlist then serves,
  streams are start-on-demand → the module needs a start-trigger design
  (faa-image-style resolver precedent) before registering. If it doesn't
  play either, the delay-stream tier is down → register as-is on the
  Oct-18 evidence. Net effect when registered: +316.

### Massachusetts — INTEGRATED
- Channel: Mass511 GraphQL (`mass511.com/api/graphql`) — Castle Rock CARS,
  the Indiana pattern (the IBI hypothesis was disproven: no /List/GetData
  endpoint). Stills on public.carsprogram.org (even VIDEO views are JPEGs).
- Inventory 309 (byte-stable across fetches; corroborated by Mass.gov's
  developer page — TrafficLand-coordinated API, Mass511 public channel
  integrated per the Indiana precedent). Mapper drops 2 feed-flagged
  unavailable → 307 candidates. Duplicates 169 (url-full 150, same-location
  4, geo-name 15 — all vs OpenCCTV/castlerock); near-distinct 10; new 128.
- Probe (coordinator re-probe after the worker's sweep was zeroed by
  sandbox transfer failures): all 138 new/near-distinct serve HTTP 206;
  **8 serve unique live frames and 130 currently serve the platform's
  placeholder slate** — the same frames Mass511 itself publishes for those
  cameras today (duplicate-class spot check: 4/5 unique frames — a
  per-camera state, not a platform outage). The module mirrors the agency
  feed as published; a live fetcher cannot fingerprint frames at runtime.
  Superseded 150.

### Kansas — INTEGRATED (the "hard case", cracked)
- The Oct research premise was a dead domain: kandrive.org no longer
  resolves. KDOT's live deployment is **kandrive.gov**, a Castle Rock CARS
  SPA whose GraphQL (`channel=KS`) is the Indiana precedent — no key.
  (KDOT ArcGIS has a static TrafficCameras layer with no live advantage;
  KC Scout cameras arrive via KanDrive itself — 272 of 499 stills are KC
  Scout snapshots it republishes.)
- All stills (VIDEO views expose only refreshing JPEGs; no HLS in the API
  or bundle). Inventory 535 published; candidates **499** (36 active
  cameras publish no view URL + 1 svg icon class — dropped by the mapper).
  Duplicates 282 (url-full 274, same-location 4, geo-name 4 — all vs
  castlerock, confirming that harvest family was KDOT); new **217**.
- Documented deviation: 60 s module timeout (GraphQL measured 23–34 s
  healthy); the route's 12 s budget + cache-landing cover it (Florida/
  Georgia precedent). Probe sweep was egress-blocked; healthy-window spot
  checks passed (kscam 200 image/jpeg 21,827 B; kcscout 200; GraphQL
  200 ×3); confirmed dead 0. Superseded 275.

### Maine — INTEGRATED
- Channel: New England 511 (same IBI endpoint as Vermont) — MaineDOT's own
  Map Viewer embeds this network; no MaineDOT-native camera feed exists
  (the CARS-GraphQL hypothesis was disproven — /api/graphql 404s).
- Inventory 134 ME rows (tri-state 405 at coordinator fetch: ME 134 +
  NH 183 + VT 89 — cross-validates Vermont). Duplicates 49 (same-location
  41, geo-name 8; url matchers 0 — the harvest stored the www host form);
  near-distinct 1 (placeholder-serving). Probed 85 non-duplicates: dead 0,
  **54 serve the NE511 offline slate** (identical 15,136-byte PNG),
  **31 verified live frames**. The module serves all 134 published rows —
  the slate carries no row-level flag, so it is indistinguishable in the
  feed (documented in the header). Superseded 45.

### New Mexico — INTEGRATED
- Channel: `servicev5.nmroads.com/RealMapWAR/GetCameraInfo` (plain JSON,
  no key; found in nmroads.com's own JS). Video is RTMP-only upstream →
  snapshot module (stated in the header).
- Inventory 185 (all enabled, per the feed). Duplicates 165 (url-full 145,
  same-location 1, geo-name 19 — the geo-name set is opposite-carriageway
  distinct cameras whose url-matched partners anchor the supersede list).
  Module serves all 185 published.
- Probe: the first sweep was cut when the nmroads hosts blackholed the
  sandbox IP after the burst; coordinator re-probe after the block lifted
  covered 32 non-duplicate candidates: **19 verified-alive unique JPEGs,
  13 origin 404/500** (incl. the Pojoaque camera the worker had flagged —
  corroborated). One alive pair shares a first-2 KB fingerprint (below the
  ≥3 placeholder rule). Superseded 145 — the worker's list was lost in a
  /tmp wipe and **regenerated by the coordinator from the live feed:
  exactly 145 url-full matches**, and Vermont's likewise regenerated at
  exactly 68. West Virginia's 3 ids were reconstructed from the worker
  report's named records.

## Environment note

Sandbox egress degraded badly throughout (all-host CONNECT timeouts in
windows, per-host blackholes after probe bursts, two /tmp wipes, one daemon
restart, an intermittent EPERM write interdiction). Every count above
distinguishes confirmed-dead (origin HTTP errors) from never-probed
(transport timeouts). Probe deviations are disclosed per state; acceptance
rules (200/206 + image type or magic bytes; HLS must start #EXTM3U;
identical fingerprint across ≥3 = placeholder) were applied as specified
throughout.

## Deviations from the brief, for the merge review

1. **families.ts untouched**: the registry covers OpenCCTV harvest families;
   direct agency modules carry their verdict + reasoning in their module
   headers (the Indiana/FAA precedent). No family entries were added.
2. **Harvest file edited surgically** (712 ids) rather than regenerated:
   per-state drops must ride in per-state commits; regeneration is a
   multi-hour pipeline run. The Node filter re-serializes with the same
   JSON round-trip the generator uses; shard counts verified per state
   (30,889 → 30,177 records).
3. **Oklahoma committed unregistered** (see above) — a deliberate hold, not
   an omission.
4. Rhode Island's superseded file was **not** applied (no replacement
   module); New Jersey has no files at all.
5. **Supersede-drop criterion**: harvest records were dropped only where
   the module's camera certainly supersedes them — url-full matches
   (VT 68, NM 145, MA 150, KS 274 of 275), plus geo-verified matches
   where the harvest family's URL forms made URL matching impossible
   (AR 26, ME 45, WV 3). Geo-classified probable duplicates whose
   harvest twins remain served: VT 16, MA 19, KS 7 — their workers
   adjudicated several as distinct sibling cameras at shared gantries;
   the parent may extend the drops at merge. (NM's geo-class matches
   resolved to records already inside its url-full drop set; ME's 4
   residual matches are non-harvest records, untouchable here.)
