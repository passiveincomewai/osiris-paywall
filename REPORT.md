# Country pages: "View on globe" button + search-by-city

Branch `feature/country-globe-button`, worktree `~/workspace/worldeye-globe-button`,
based on production master `e7c0285`. Two commits, nothing pushed or deployed:

- `b55f438` — Country pages: 'View on globe' button on every camera
- `a1994ee` — Country pages: working search-by-city at the top of every page

---

## 1. "View on globe" button on every camera

### The pages

The by-country live camera pages are **`/cameras/countries/[country]`** — one
template renders all 109 country pages. Cameras appear on it in three places,
and all three got the button:

1. **The explorer grid** (`CountryCameraExplorer`, used only by this page):
   every camera in the country, batched from `/api/cctv/country/<slug>`,
   rendered as cards that open the in-page viewer.
2. **Featured live cameras**: the curated samples from the generated country
   index.
3. **Full roster**: for small countries, a name/city list of every camera.

(The country *traffic* pages — `/canada-traffic-cameras` etc. — render no
camera cards at all, only editorial copy and steps, so there was nothing to
attach a button to there. `/live-webcams` is a hub with no camera listings.)

### How the deep link works

The site already has a canonical camera deep link, documented in
`src/lib/camera-share.ts` and used by camera share buttons, `/watch` pages,
and the dashboard/alerts "view" links:

```
/?camera=<catalogue id>
```

The globe page (`src/app/page.tsx`) reads the param back
(`sharedCameraIdFromSearch` + `findCameraById`), flies to the camera and
opens it through the same gated path a map click takes. The new button simply
links there by the camera's catalogue id — the same id the page already holds
for every camera it renders (the featured samples on this very page already
deep-linked by id, and the page's JSON-LD uses the same ids). No coordinates
were needed and no values were invented.

### Changes

- **`src/components/ViewOnGlobeButton.tsx` (new, shared)** — an anchor styled
  as a compact variant of the directory pages' ghost button
  (`border-white/15`, semibold, hover wash) with a lucide `Globe` icon, the
  label **"View on globe"**, and a camera-named aria-label
  (`View <camera name> on the globe`). Href: `/?camera=${encodeURIComponent(id)}`.
- **`src/components/CountryCameraExplorer.tsx`** — the card was a single
  `<button>` wrapping preview + info (click = open the viewer in place). It
  is now a container `<div>` with the same chrome: the preview + info area
  keeps the open-viewer `<button>`, and a footer carries the `ViewOnGlobeButton`
  as its sibling, bottom-aligned via `mt-auto`. (A link nested inside the
  card's `<button>` would be invalid HTML, and its click would have opened
  the viewer instead of navigating.)
- **`src/app/cameras/countries/[country]/page.tsx`** — featured samples: the
  "View on the live map" text link is replaced by the button (same
  destination); full roster: each row gains the button, right-aligned.
- **`src/lib/country-page-content.ts`** — `roster()` now returns
  `{ id, name, city }` (it previously dropped the id), so roster rows can
  deep-link. Its only caller is the country page.

### Not changed (deliberately)

`src/components/directory-page.tsx`'s `SampleGrid` — the shared curated-samples
grid for the region/category/city/state pages (Asia webcams, ski webcams,
US state traffic pages, …) — uses the identical "View on the live map" text
link. It is not part of the country page, so it was left untouched to keep
this change scoped; giving it the same button is a one-line swap per the
pattern in commit `b55f438` if wanted.

---

## 2. Search-by-city at the top of every country page

### What was broken

The exact-city filter itself always worked — it runs server-side in
`/api/cctv/country/<slug>` (`?city=` → `sliceCountryCameras` →
`filterCameras`, exact match on the record's city). Verified against
production (Japan): `city=Tokyo` → **112 cameras**.

But a visitor had effectively no way to use it:

- The explorer renders filter chips for only the **24 largest cities**
  (`MAX_AREA_CHIPS`); the API itself returns at most 40
  (`COUNTRY_CITY_CHIPS`). Japan alone has far more cities in the catalogue;
  most cities in most countries had **no clickable path at all**.
- The only other route was the explorer's free-text box, which is a
  *camera* search: it substring-matches name + city + source, so a city
  query also returns cameras that merely mention the city
  (production: `q=tokyo` → **122** vs the exact-city **112**), and nothing
  tells the visitor which cities exist.
- The explorer sits mid-page (below hero, stats and intro) — there was no
  search of any kind at the top of the page, and nothing labelled
  "search by city" anywhere.

So the feature was missing rather than the filter being broken; the fix
exposes the existing exact filter through a real city search instead of
bolting on a second filtering mechanism.

### What was built

- **`src/components/CountryCitySearch.tsx` (new)** — a search box rendered in
  the hero of the country page (top of the page, every country, via the one
  shared template). It is fed the country's **full** city list — every area
  the catalogue holds for that country, biggest first — computed on the
  server from the same records the page already loads
  (`cameraAreas(loadCountryRecords(...))` in the page), falling back to the
  index's `topCities` if the records fail to load. No invented cities:
  every suggestion is a real city with its real camera count.
  - Case-insensitive partial matching as you type; up to 8 suggestions with
    counts; Enter picks the first match; Escape closes; a graceful
    `No cities in <country> match "<input>".` empty state; hides itself for
    countries with fewer than 2 cities.
  - Styling reuses the explorer search's classes (rounded-xl, white/10
    border, gold focus ring) and the pages' dropdown idiom.
- **Picking a city filters the on-page directory** (the mechanism the page's
  structure supports — see below): `CountryCitySearch` writes the choice to
  the URL (`?city=<name>`, `history.replaceState`) and dispatches a
  `COUNTRY_CITY_EVENT` CustomEvent. `CountryCameraExplorer` listens for it:
  clears any free-text query, applies the city as its existing area filter,
  and the search scrolls it into view (the explorer root is now
  `#country-explorer`). The explorer also reads `?city=` once on load, so a
  shared link lands pre-filtered.
- **Active-filter chip**: a searched city is usually not among the top-24
  chips, so the explorer now renders the active area as its own gold chip
  (name + filtered count, click to clear) — otherwise the applied filter
  would be invisible.
- **`src/app/cameras/countries/[country]/page.tsx`** — computes `cityList`
  (above) and renders `<CountryCitySearch>` under the hero line.

### Why not link to the city pages

`/city-webcams/<city>` pages exist only for cities that met the city-index
thresholds, so search results would 404 or dead-end for most cities in most
countries. The explorer's server-side city filter covers **every** city in
the catalogue for **every** country, which is what "must work for ALL
countries" requires; it also keeps the visitor on the page they were reading.

Files for this feature: `src/components/CountryCitySearch.tsx` (new),
`src/components/CountryCameraExplorer.tsx`, `src/app/cameras/countries/[country]/page.tsx`.

---

## Gates

Box was heavily contended by sibling worktrees throughout (suite transform
phase alone took ~28 min of wall clock); all runs were serialized against
sibling gate runs where detectable.

- **`npx tsc --noEmit`: PASS** — exit 0 on the combined tree, and exit 0
  again on the final committed tree after the two-commit split.
- **Full vitest suite**: 2,992 passed, 23 skipped, **2 failed — exactly the
  two known baselines**:
  - `src/app/api/cctv/route.test.ts` > serves an already-cached region without going upstream again
  - `src/lib/oi/context.test.ts` > gatherContext > carries on without a source that fails
  - One extra *file*-level failure: `src/lib/basemap-mode.test.ts` failed to
    run with `[vitest-worker]: Timeout calling "fetch"` during module
    transform under the load (0 tests ran, 0 tests failed). Re-run in
    isolation it passes **16/16 in 6s**. Unrelated to this change (no basemap
    code touched); a contention artifact of the 45-minute full run.
- No production build was run (the brief's gates were tsc + suite; a sibling
  worktree held the box's build capacity).

## Notes

- No billing, auth, or globe-rendering code was touched; the globe is only
  ever linked *to*.
- Untracked debris left as found: `.gate-logs/` (this run's suite log) and a
  pre-existing `off` file in the worktree root, neither committed.
