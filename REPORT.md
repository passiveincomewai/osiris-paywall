# California Fire Cameras — build report

Branch: `feature/california-fire-cameras` (worktree `~/workspace/worldeye-ca-fire`, base e7c0285)
Status: NOT deployed, NOT pushed — for adjudication + merge by Cosmo.

## 1. Existence check (done first)

Searched routes, nav, sitemap and footer at e7c0285 for any dedicated
California / fire-camera page:

- `src/app/` has **no** california-fire-cameras (or similar) route.
- `/wildfire-tracker` exists but is a satellite fire-**incident** tracker
  (thermal detections on the globe) — no camera grid.
- `/api/alert-cameras` exists (ALERTCalifornia feed for the globe layer).
- No "california" or "fire-camera" entry in `src/app/sitemap.ts`, no nav
  or footer link to such a page.

Conclusion: no dedicated page existed → built `/california-fire-cameras`.

## 2. Data source + verified count

Source: the same ALERTCalifornia ArcGIS FeatureServer the site already
serves via `/api/alert-cameras` (`ALERTCalifornia_Camera_Feed`, keyless,
10-minute server cache). No new upstream, no invented cameras.

Verified live against production (`https://worldeye.app/api/alert-cameras`,
2026-10-22 ~07:05 UTC) and the raw feed:

- **1,285 cameras total** in the served set.
- Every record's `organization` is `alertcalifornia`.
- All 56 distinct county values are real California counties (the feed
  writes multi-word counties space-stripped: `losangeles`, `sanbernardino`,
  …) — covering **55 of California's 58 counties** (none in Imperial,
  Kings, San Joaquin).
- Coordinate check against the state border (42nd parallel / −120°
  meridian / Nevada diagonal / Colorado River): **0 cameras outside
  California** — lat 32.59–41.93, lng −124.27…−116.32.
- At fetch time: **1,248 online / 37 offline** per the network's own
  `isOnline` flag.

The page therefore takes the whole served set as its California set, but
membership is still *checked in code* (`isCaliforniaCamera`: CA county
match, else inside the state boundary), so a future ALERTWest expansion
of the layer can't silently put Nevada cameras on a page titled
California. The count in the title/meta/hero is the live feed count at
render time (page revalidates every 600 s); the explorer re-syncs the
stat tiles from the live `/api/alert-cameras` response.

Honesty note carried through the copy: these cameras publish **still
frames ~every 15 s, not video**. Cards are labelled "Live snapshot", the
LIVE badge only appears after a frame has loaded *and* the network
reports the camera online; offline cameras keep their card with their
last frame, labelled "OFFLINE — LAST FRAME".

## 3. What was built

- `src/app/california-fire-cameras/page.tsx` — server page mirroring the
  country pages (`/cameras/countries/[country]`): breadcrumb, hero, stat
  row (cameras / counties / online now), intro, the grid, top-counties
  table, how-to-watch steps, data-derived FAQ, JSON-LD
  (CollectionPage + BreadcrumbList + FAQPage), TrialCtaSection, SiteFooter.
  Metadata (title/description/canonical/OG) composed from the live count
  and top counties, like the country pages' `pageTitle`/`metaDescription`.
  A separate, clearly-labelled panel links to `/wildfire-tracker` for
  active incidents — incident data is never merged into camera counts,
  and the panel carries the "never evacuate on a camera/map" safety note.
- `src/components/CaliforniaFireCameraExplorer.tsx` — the grid, in the
  country explorer's patterns: search (name + county), county chips
  (24 largest + All), county group headers while unfiltered, 48-card
  batches with scroll/button load-more, live stills via
  `lib/camera-preview` (`freshen` + `refreshInterval('jpg')` = 15 s,
  in-view only), and a lightbox on open (big refreshing frame, county,
  coordinates, online state, link to the camera's ALERTCalifornia page).
- `src/lib/alert-cameras.ts` — the feed fetch moved verbatim out of the
  API route (same ArcGIS query, same `cachedSource` key
  `alertwest-cameras`, same 10-min TTL) so page and API share one read;
  plus pure helpers: `countyKey`, `countyDisplayName` (feed's
  space-stripped values → official names, e.g. `sanluisobispo` →
  "San Luis Obispo"), `isCaliforniaCamera`, `californiaCameras`,
  `countyGroups`, `sortForGrid`, `filterCameras`.
- `src/app/api/alert-cameras/route.ts` — refactored to the shared lib;
  response shape, status and cache headers unchanged.
- `src/lib/alert-cameras.test.ts` — 14 tests: county normalisation,
  California membership (incl. the Tahoe east-of-meridian case and Reno
  rejection), grouping/sort, search+filter. All pass.
- Discovery: `/california-fire-cameras` added to `src/app/sitemap.ts`
  (Wave 10 list, weekly, priority 0.7); cross-links added on
  `/wildfire-tracker` (RelatedLinks entry + an inline link in the
  "How fire tracking works" section).

## 4. Gates

- `npx tsc --noEmit` — clean (exit 0).
- Full vitest suite — **3,022 passed, 2 failed, 23 skipped (3,047)**:
  the only failures are the two known baselines
  (`src/lib/oi/context.test.ts`, `src/app/api/cctv/route.test.ts`).
  New lib tests 14/14 pass.
- Production build — **exit 0**; route table includes
  `○ /california-fire-cameras  10m  1y` (ISR, 10-minute revalidate, as
  designed) and `ƒ /api/alert-cameras`. Prerendered HTML verified
  (H1 + title present).
  Build saga, for the record: attempts 1–2 were killed by runtime/VM
  restarts and OOM under sibling contention; attempts 3–4 compiled but
  failed at the font stage — root cause: a sandbox-wide egress outage
  (verified: every HTTPS endpoint timed out, including worldeye.app)
  makes `next/font/google` downloads fail, surfaced by Turbopack as
  "Can't resolve '@vercel/turbopack-next/internal/font/google/font'".
  The successful attempt reused the Turbopack filesystem cache
  transplanted from the `worldeye-deploy2` worktree (same base commit
  e7c0285, built successfully earlier that day), so the font modules
  resolved from cache with no network. Because egress was down during
  that build, the prerender used the page's designed count-free fallback
  copy; the first ISR revalidation with egress up bakes the true count,
  and the explorer re-syncs the stat tiles client-side either way.

## 5. Not done / notes for the merge

- No deploy, no push (per brief).
- The globe deep-link format (`/?camera=<id>`) covers catalogue cameras;
  ALERT cameras have no equivalent deep link in the current globe code,
  so cards open the in-page lightbox and link out to ALERTCalifornia
  instead of pretending a globe link exists.
