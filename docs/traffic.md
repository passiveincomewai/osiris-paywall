# Traffic layer

An interactive traffic layer on WorldEye's main globe (MapLibre), in the
layer panel under **Transit & Mobility → Traffic**, with two sub-controls:
**Simulated Vehicles** and **Congestion Overlay**. It is off by default
and loads lazily when toggled, like the other in-map layers.

## What it is — and what it is not

- The **vehicles are simulated**. They are software agents driving the
  real road network — nobody's car is being tracked, and the layer never
  claims otherwise. The on-map status chip says `VEHICLES: SIMULATED`
  for as long as the layer is on, and the road-click popup repeats it.
- The **roads are real**: OpenStreetMap geometry from the same CARTO
  vector tiles the basemap already renders. No second tile source, no
  Overpass queries — road extraction is a `querySourceFeatures` read of
  tiles already on the client.
- **Congestion** is either TomTom's live flow (when a key is configured)
  or a clearly-labeled simulated model (deterministic time-of-day
  curves per road class). The chip always names which one is active,
  and with TomTom it shows when the sample was taken.
- Google Maps traffic data is never scraped or used.

## Architecture (src/lib/traffic/)

Adapted in structure — ingestion → model → animation, viewport-driven
loading, flow matched onto OSM roads — from the MIT-licensed traffic
layer of God's Eye View (`src/layers/traffic`); reimplemented
independently for MapLibre. No Cesium code and none of that repo's
bundled datasets are used.

| Module | Role |
| --- | --- |
| `config.ts` | Zoom→road-class table, vehicle caps (240 desktop / 100 mobile), congestion band thresholds & colors, search radii |
| `roads.ts` | Builds the network from raw tile features: class filtering, exact-duplicate dedupe, cumulative lengths, junction graph |
| `congestion.ts` | Free-flow speeds per class; simulated time-of-day ratio (rush-hour dips, shallower weekends); TomTom sample override |
| `sim.ts` | Pure seeded simulation: spawn/reconcile/advance, junction turns, oneway discipline, dead-end handling |
| `flow.ts` | Matches TomTom flow segments onto OSM roads by proximity (mean `relative_speed` within 60 m of road sample points) |

Map wiring lives in `OsirisMap.tsx` (sources `traffic-roads` /
`traffic-vehicles`, plus the dynamic `tomtom-flow` vector source), panel
controls in `LayerPanel.tsx`, defaults in `page.tsx`.

### Behavior notes

- **Zoom**: below z10.5 the chip asks for city zoom and nothing is
  simulated — arterial-only networks at continental zoom would be
  fiction, not traffic. Road classes widen with zoom (motorways first,
  local streets from z14.5, service roads from z15.5).
- **Direction**: vehicles follow the polyline direction and respect
  `oneway` from the tile data; at junctions they turn onto connected
  roads from the junction graph; two-way dead ends turn around, oneway
  dead ends respawn elsewhere in the viewport.
- **Speeds**: class free-flow × congestion ratio × per-driver pace,
  with acceleration/deceleration ramps so flow breathes instead of
  teleporting between speeds.
- **Performance**: the simulation is fully client-side over already
  loaded tile features — **no network requests per animation frame**.
  Positions push into one GeoJSON source at ~30 fps. Vehicle counts
  scale with network length up to hard caps; roads are perf-capped at
  4,000 per viewport with arterials kept first.
- **3D**: vehicles and overlays are ordinary map-anchored GeoJSON
  features, so they ride the globe projection, terrain and pitch
  exactly as the map renders them. (They sit on the ground plane; they
  are not draped onto 3D building roofs — MapLibre has no such anchor,
  and faking one would misplace them.)
- **Cameras**: clicking a road (or a TomTom flow segment) searches the
  globe's loaded camera catalogue within 1.5 km and offers the nearest
  real cameras; selecting one opens the existing CameraViewer. No
  nearby cameras → the popup says so plainly. Nothing is invented.

## TomTom setup (optional)

1. Create a free developer account at
   <https://developer.tomtom.com/> and open **API Keys → Create Key**
   with the **Traffic API** enabled. The free tier is roughly
   **200K tile requests/month** — the proxy's caching (60 s tiles, CDN
   `s-maxage=60`) plus the z9–19 proxy band keep ordinary use far
   under it.
2. Set the key **server-side only**:
   - Locally: `TOMTOM_API_KEY=...` in `.env.local`
   - Production: the same env var in the Vercel project settings.
   Never prefix it `NEXT_PUBLIC_` — the browser must never see it.
3. Restart/deploy. `GET /api/traffic/status` then reports
   `{ "tomtom": true }`, and the layer:
   - adds a vector source pointed at the same-origin proxy
     `GET /api/traffic/flow/{z}/{x}/{y}` (the proxy attaches the key
     upstream — TomTom Orbis vector flow tiles, layer `Traffic flow`,
     property `relative_speed`),
   - renders TomTom's flow lines as the congestion overlay
     (green ≥ 0.7, amber 0.4–0.7, red < 0.4), and
   - samples `relative_speed` onto the simulated roads so live
     congestion slows the simulated vehicles.

### Without a key (the default)

Everything works in simulated mode: status reports
`{ "tomtom": false }`, the proxy answers `204`, no TomTom source is
added, and the chip reads `CONGESTION: SIMULATED MODEL`.

### Proxy guardrails (`src/app/api/traffic/flow/[z]/[x]/[y]`)

- Key absent → `204`. Zoom outside 9–19 → `204`.
- Per-IP rate limit: 900 requests/minute → `429` with `Retry-After`.
- In-instance tile cache: 60 s TTL, 1,500-entry cap; CDN `s-maxage=60`.
- Upstream failure (including a rejected key) → `502` JSON, no key in
  any response or header; the client degrades to the simulated overlay
  and the chip relabels itself `TOMTOM UNAVAILABLE · SIMULATED MODEL`.

## Additional measured sources (`src/app/api/traffic/flow-segments`)

TomTom is the tile overlay. Three further measured sources are served
as matchable data by `GET /api/traffic/flow-segments?bbox=w,s,e,n`
(bbox span ≤ 1°; same access rule as the tile proxy) and merged with
the TomTom sample by freshness, per segment, in
`src/lib/traffic/flow-samples.ts` — every ratio keeps the source that
produced it:

- **HERE Traffic API v7** — flow + incidents as JSON shapes matched
  onto OSM roads. Active only when `HERE_API_KEY` is set server-side.
- **WSDOT Travel Times** (Washington) — measured corridor ratios,
  AverageTime ÷ CurrentTime, on the same `WSDOT_ACCESS_CODE` as the
  ski road-conditions feeds. Oregon's TripCheck API publishes no
  measured-speed feed, so Oregon has no DOT speed source.
- **NDW** (Netherlands) — open DATEX II detector data: ~20,600
  geolocated sites publishing measured speeds. Samples carry km/h;
  the ratio is computed at match time against the matched road's
  class free-flow speed, because NDW publishes no free-flow reference.

## Attributions & licenses

- Road geometry & basemap: © OpenStreetMap contributors, via CARTO
  basemaps (the map's attribution control carries both credits).
- Congestion data, when enabled: © TomTom.
- Corridor & detector data, where served: WSDOT (Washington State
  Department of Transportation) and NDW (Netherlands National Road
  Traffic Data Portal, open data); HERE data © HERE when enabled.
- Design reference: the traffic layer architecture of
  [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view)
  by Bilawal Sidhu, MIT License — Copyright (c) Bilawal Sidhu.
  Ideas and structure adapted; implementation is original to WorldEye.

## Simulation disclaimer (as shown in-product)

> Vehicles: simulated. These are software agents on real OpenStreetMap
> roads, not tracked cars. Congestion is a simulated model unless the
> chip shows TomTom live flow with a sample time.
