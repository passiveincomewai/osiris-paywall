# Street Level — Panoramax community imagery

A SURVEIL-group layer that drops Panoramax street-level photo positions
onto the globe at street zooms and opens them in an in-globe viewer
panel. Built in Wave 4 of the expansion program (Phase 6); the audit
and provider verdicts live in `~/workspace/worldeye-expansion-2/FEASIBILITY.md`.

## Provider

- **Panoramax** — a federation of community street-level imagery
  instances behind one keyless meta-catalogue, `api.panoramax.xyz`.
  Access is the standard GeoVisio STAC API:
  `GET /api/search?bbox=…&limit=…` for viewport pictures and
  `GET /api/pictures/{id}` for one picture (sequence prev/next ride the
  item's STAC links).
- The upstream base is overridable with **`PANORAMAX_API_BASE`** (any
  federation instance speaks the same API) if the meta-catalogue is
  ever unreachable from the deployment's egress. Default:
  `https://api.panoramax.xyz`.
- Mapillary is a second, deeper-coverage provider classified
  CONDITIONALLY FEASIBLE (needs Jameson's free client token). Nothing
  Mapillary-specific is built; the provider seam is
  `src/lib/streetlevel/panoramax.ts`'s descriptor + the normalized
  `StreetPicture` shape, which a Mapillary module can implement without
  UI changes. KartaView and Google Street View were classified out
  (unmaintained/unpublished terms; paid Google-viewer-only terms).

## Licensing & attribution

- Every picture carries its **own licence** (mostly CC BY-SA 4.0; the
  IGN instance publishes under Licence Ouverte 2.0) and its producer.
  Both travel with the normalized record and are rendered in the
  viewer next to the image, with the licence linked where the provider
  publishes a licence URL.
- Images displayed are the URLs the API itself publishes for viewing
  (STAC assets with roles thumbnail/visual/data). No scraping, no
  third-party tile hotlinking.

## Honesty rules

- Street-level imagery is **dated, never live**: the viewer always
  shows the capture date beside "STREET-LEVEL PHOTOS ARE NOT LIVE",
  and the coverage chip repeats "COMMUNITY IMAGERY — NOT LIVE".
- Coverage is community-contributed and France/Europe-heavy. A
  viewport with no pictures shows the no-coverage chip ("NO
  STREET-LEVEL COVERAGE IN THIS AREA — PANORAMAX IS
  COMMUNITY-CONTRIBUTED, STRONGEST IN FRANCE") — an empty result is
  only ever rendered when Panoramax itself answered empty.
- Provider failure is an **error state**, not fake emptiness: the
  route answers 502 with no-store when there is no cached copy; with a
  cached copy it serves it flagged `stale` with its true fetch time,
  and the chip says so.

## Shape

- `src/lib/streetlevel/` — `types.ts` (normalized record + payload),
  `bbox.ts` (span-guarded viewport parsing, quantized cache keys),
  `panoramax.ts` (provider: URL builders + STAC normalizer),
  `server.ts` (the only upstream caller: 10-min margined bbox cache
  filtered back to the exact viewport, 30-min picture cache, in-flight
  dedup, stale-on-error).
- `src/app/api/streetlevel/route.ts` — `?bbox=w,s,e,n` (span ≤ 2°) and
  `?picture={uuid}` modes.
- Client (`OsirisMap.tsx`): loads **only** while the layer is on and
  the zoom is ≥ 15 (chip explains below that); click a dot → viewer
  panel with prev/next sequence navigation and one-tap return to the
  globe. Nothing about the layer touches the CCTV system or its gate.
