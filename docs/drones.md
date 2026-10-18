# Drone Tracking layer

Live drone tracking on WorldEye's main globe (MapLibre), in the layer
panel under **Aviation → Drone Tracking**, with one sub-control:
**FAA Airspace**. Off by default; loads lazily when toggled, like the
other in-map layers.

## What it is — and what it is not

- **There is no global drone firehose, and this layer does not pretend
  otherwise.** FAA Remote ID (ASTM F3411) is a *local broadcast*
  protocol: a drone transmits its position over Bluetooth/Wi-Fi to
  receivers within roughly a kilometre or two. The FAA publishes **no**
  live drone-position API. A drone therefore appears on WorldEye only
  while a receiver that feeds WorldEye is within radio range of it, or
  while an opted-in operator's gateway reports it.
- **Nothing is simulated.** With no receivers connected, the honest
  state of the layer is *zero detected drones*, and the on-map counter
  says exactly that, including *why* ("NO RECEIVERS CONNECTED"). No
  test, demo, or model traffic is ever rendered as a detection.
- **Coverage is drawn, not implied.** Every reporting receiver gets a
  dashed circle at its real detection radius. Where no circle covers
  the viewport, the counter chip adds: `NO RECEIVER COVERAGE IN THIS
  AREA — DRONES MAY FLY UNDETECTED`. "0 detected" inside coverage and
  "no coverage" outside it are different statements, and the UI keeps
  them different.

## Architecture

```
Remote ID receivers / operator gateways
        │  POST /api/drones/ingest   (Bearer token, per receiver)
        ▼
lib/drones/privacy.ts   ── THE TRUST BOUNDARY ──
        │  operator location / IDs / Self-ID / auth pages DROPPED;
        │  persistent serial → session-scoped SHA-256 hash
        ▼
lib/drones/store.ts     in-memory live store (per warm instance)
        │  drone TTL 90 s · trail ≤ 10 min · receiver coverage model
        ▼
GET /api/drones/live    public snapshot: drones, receivers, count
        ▼
OsirisMap drone effect  5 s poll · markers, trails, follow, chip

GET /api/drones/airspace?bbox=…   FAA LAANC grids + restrictions,
        proxied from FAA ArcGIS, cached 10 min per bbox
```

### Why polling, not WebSockets

Jameson's brief asked for WebSocket updates "where supported". They
are **not supported here**: Next.js route handlers on Vercel cannot
hold native per-client WebSocket connections, and the drone store is
per-instance memory (the same trade-off as `lib/sourceCache`), so a
socket tier would need an external realtime service and a shared
store. Rather than fake it, the client short-polls every 5 s behind a
5-second shared CDN cache. If the layer ever moves to a dedicated
realtime backend, `GET /api/drones/live` is the seam to replace.

### The store is memory-only, on purpose

Nothing about a drone or a receiver is written to the database or
disk. When an instance dies, everything it knew dies with it. That is
a privacy property (no movement history can accumulate) as much as an
architectural simplification. Consequence: on multi-instance
deployments a client sees the drones reported to the instance serving
it; receivers should keep reporting (their gateways do — Remote ID is
a ~1 Hz broadcast, normally batched every few seconds).

## Privacy design (hard requirements, unit-tested)

Enforced in `lib/drones/privacy.ts` at ingest, before storage:

1. **Operator location is dropped.** The OpenDroneID System message
   carries the pilot's latitude/longitude. It is never read into the
   stored record — the clean type has no field that could hold it, and
   a unit test feeds a full System message in and proves the operator
   coordinates appear nowhere in the output.
2. **Operator IDs and Self-ID text are dropped** (Self-ID is free text;
   pilots routinely put a name or phone number in it).
3. **Raw serial numbers are never served.** Clients see
   `drn_<16 hex>` — a SHA-256 of the persistent id with a salt
   (`DRONE_ID_SALT`), bucketed into 6-hour windows. One flight renders
   as one track; the same airframe is a different id tomorrow, and the
   hash cannot be reversed into a serial.
4. **No history.** Trails keep at most 120 points inside a 10-minute
   window; drones vanish 90 s after their last observation; the store
   itself is RAM.

## Connecting a receiver or an operator gateway

### 1. Get an ingest token

Tokens are provisioned by the WorldEye operator in the environment —
there is no self-signup, by design:

```
# one token per receiver (the token IS the receiver identity):
DRONE_INGEST_TOKENS="rx-ogden-roof:<long-random>,rx-slc-field:<long-random>"
# optional id salt (recommended so ids are stable across restarts):
DRONE_ID_SALT="<long-random>"
```

A single shared token also works (`DRONE_INGEST_TOKEN`), in which case
the receiver names itself via `receiver.id` in the body. With neither
variable set, the ingest endpoint answers **404** — it pretends not to
exist (same convention as `/api/internal/studio-ai`).

### 2. POST observations

```bash
curl -X POST https://worldeye.app/api/drones/ingest \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "receiver": { "name": "Ogden rooftop", "lat": 41.19, "lng": -111.97, "radiusM": 2500 },
    "observations": [{
      "id": "1581F67QC23BX00A1B2C",
      "lat": 41.191, "lng": -111.968,
      "altitudeMslM": 1480, "heightAglM": 42,
      "headingDeg": 175, "speedMps": 9.2, "verticalSpeedMps": 0.4,
      "uaType": 2,
      "timestamp": 1792300000000
    }]
  }'
```

- `receiver.lat/lng` is the **receiver's** position (it defines the
  coverage circle) — never the pilot's.
- The nested OpenDroneID shape (`BasicID` / `Location` / `System`
  message objects, as exported by libopendroneid-based receivers) is
  accepted too; the `System` object may be forwarded whole — the
  privacy filter drops it.
- Limits: ≤ 500 observations per request, ≤ 512 KB body, 120 requests
  per minute per receiver. Responses: `200 {accepted, received,
  stored}`, `401` bad token, `404` ingest not configured, `429` rate
  limited.
- Report at least every few seconds while drones are in range; a
  drone not re-reported for 90 s leaves the map.

### Receiver hardware/software that can feed this

- **OpenDroneID receiver-android** (github.com/opendroneid) or any
  ASTM F3411 receiver (Dronetag RIDER/Scout, other RID receivers)
  behind a small gateway that batches decoded messages into the POST
  above. The gateway is deliberately the integrator's piece: receiver
  export formats vary (app logs, serial, MQTT), the HTTP contract here
  does not.
- **Opted-in operators**: a telemetry gateway (e.g. a MAVLink →
  OpenDroneID bridge via libmav2odid, or a fleet cloud webhook) POSTing
  the same shape for their own aircraft.

## Dronetag (investigated 2026-10-18 — decision for Jameson)

Dronetag's API is real but **account-scoped**: REST
(api-docs.dronetag.com — `/v1/flights`, `/v1/devices`, `/v1/aircrafts`)
plus a Socket.io real-time API and a **Data Push** integration portal,
authenticated with Personal Access Tokens (own devices) or OpenID
Connect. It serves *your* Dronetag devices and *your* receivers'
detections — there is no public or pooled feed, and cloud/live
features require a paid Dronetag subscription. WorldEye is therefore
**not** connected to Dronetag. The path, if wanted: create a Dronetag
account + integration, and either (a) point Dronetag Data Push at
`/api/drones/ingest` (their pushed telemetry shape would need a small
mapping in the gateway sense), or (b) issue a WorldEye ingest token to
a Dronetag-connected fleet operator. No scraping of their app map —
their terms govern their data.

## FAA airspace overlay

`GET /api/drones/airspace?bbox=west,south,east,north` (span ≤ 3°)
proxies the FAA's own public ArcGIS services
(services6.arcgis.com, FAA NAS org):

- **FAA_UAS_FacilityMap_Data** — the LAANC facility-map grids:
  380,860 cells, each with its published ceiling (ft AGL), airport and
  LAANC availability. Colored red (0 ft) → green (400 ft).
- **Part_Time_National_Security_UAS_Flight_Restrictions** — the
  standing national-security UAS restrictions.

This is the FAA's public reference data, published with a "not an
authorization, not for navigation" disclaimer; the popups repeat that
authorization runs through LAANC / FAA DroneZone. Cached 10 minutes
per bbox (grids change on the 56-day chart cycle).

## Day-one state (honest)

With no receivers provisioned, the layer shows: the FAA airspace
overlay, an empty sky, and a counter reading `0 DETECTED · NO
RECEIVERS CONNECTED`. That is the correct and intended behaviour
until the first receiver token is issued and its gateway starts
reporting — after which real drones appear within one 5-second poll.
