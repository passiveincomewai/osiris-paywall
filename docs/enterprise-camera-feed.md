# Enterprise Camera Feed — rights audit, data model, doors

Shipped 2026-10-20 (code). The enterprise camera feed lets an Enterprise
subscriber build camera collections and publish them to their own site or
platform: an embeddable live player, a private JSON data feed, and optional
API keys. This doc records the redistribution audit behind the payload:
**a camera ships in a feed only when its source is cleared for
redistribution. Default is excluded.**

## 1. Rights audit

Method: per-source verdicts, two layers.

1. **OpenCCTV families** (≈31k catalogue cameras carry `OpenCCTV / <family>`
   source labels) ride the licensing registry that already governs the
   harvest — `src/lib/camera-expansion/families.ts` (Stage B spot-checks,
   summarized in `~/workspace/worldeye-camera-expansion/AUDIT.md` §3.4–3.6).
   A family ships only when its registry verdict is **clear**. Verdicts in
   the registry: 75 clear families present in the catalogue (US state DOTs
   and 511 systems, Canadian provincial 511s, Japan MLIT river cameras,
   Korean city ITS, European national road authorities, NOAA/NPS/HKO and
   other government operators) — all rest on government open-data posture:
   the agency publishes the feed for public traveler information, and the
   payload credits the agency on every camera (`"<agency> via WorldEye"`).
2. **Direct agency sources** (baseline labels) are cleared in
   `src/lib/enterprise/rights.ts` only where the audit gives a basis:
   - US state DOTs — FDOT, TxDOT, GDOT, UDOT, Caltrans, ODOT TripCheck,
     NCDOT, MDOT MiDrive, INDOT TrafficWise, NDOT, ADOT, LADOTD, WSDOT
     (audit §3.4: underlying agency feeds CLEAR).
   - US federal — FAA WeatherCams (federal work product / public domain).
   - Canada — DriveBC, Quebec 511, Ontario 511, Alberta 511, City of
     Ottawa / Toronto / Edmonton (government open data).
   - National road/weather authorities — DGT (Spain), ASFINAG (Austria),
     Autostrade per l'Italia, Trafikverket (Sweden), Fintraffic (Finland),
     Vegagerðin (Iceland), Via Lietuva, Rijkswaterstaat (Netherlands),
     TfL (London), NZTA, LTA Singapore, HK Transport Dept, MLIT
     river.go.jp, Thailand Highway Bureau (government-published open data).

**Excluded — never ships** (with the reason surfaced in the dashboard and
in each payload's `excluded` list):

- **Windy** (any label or family containing "windy") — Windy's terms
  grant no commercial redistribution; excluded structurally, pending
  Jameson's permission decision. (~338 catalogue cameras.)
- **Commercial networks/aggregators** — SkylineWebcams (681), EarthCam,
  WeatherBug, CamStreamer, YouTube/YouTube Live (in the catalogue only as
  streams embedded in WorldEye's own player; redistribution terms do not
  clear).
- **Registry CONDITIONAL families** — terms not spot-checked for
  redistribution (twipcam 548, ipcamlive, osm-webcams, camstreamer,
  feratel, weatherstem, trafficengland, …). Excluded until reviewed.
- **Unreviewed labels** — anything with no audit basis ("Public Webcam"
  300, "Live Traffic" 250, and the long tail). Excluded by default.
- **Link-only records** — a cleared camera with no playable stream or
  snapshot URL in the catalogue is excluded from payloads with that
  reason stated (it stays visible on the globe).

**Coverage (computed 2026-10-20 over the catalogue files** — the Oct 18
production capture of 40,256 records + the 30,889-record OpenCCTV harvest
shards — applying exactly the code's rules, plus the module-generated
cleared additions FAA 3,528, DriveBC 1,056, Caltrans top-up 936):

- **73,627 of 76,625 catalogue cameras (96%) are feed-eligible.**
- ≈2,998 excluded; the largest buckets are SkylineWebcams 681,
  OpenCCTV/twipcam 548 (conditional), Public Webcam 300, Live Traffic 250,
  Windy families 338.

Eligibility is evaluated **live at read time** from the camera's source
label — if a source's posture is ever revoked, removing it from
`rights.ts` / the registry takes it out of every feed, embed and API
response immediately, with no data migration.

## 2. Data model (Prisma, migration `20261020120000_enterprise_camera_feed`)

- `CameraCollection` — id, userId (FK, cascade), name, `feedTokenHash`
  (SHA-256 hex, unique, nullable — null = feed off), `feedHits`, timestamps.
- `CameraCollectionItem` — id, collectionId (FK, cascade), cameraId
  (catalogue id string), createdAt; unique (collectionId, cameraId).
  Ineligible picks are stored like any other; filtering happens at read.
- `EnterpriseApiKey` — id, userId (FK, cascade), name, `keyPrefix`
  (`wek_` + 8 chars, display only), `keyHash` (SHA-256 hex, unique),
  `hits`, `lastUsedAt`, `revokedAt`, createdAt.

Plaintext secrets are shown exactly once (token generation response, key
creation response) and never stored, listed, or logged. Caps: 25
collections per user, 500 picks per collection, 10 live API keys.

## 3. The three doors — one payload

Payload (`src/lib/enterprise/payload.ts`): `{ collection, generatedAt,
attribution, count, cameras[], excludedCount, excluded[] }` where each
camera is `{ id, name, city, country, lat, lng, streamUrl, streamType,
snapshotUrl, attribution, source }`. `snapshotUrl` is WorldEye's own
frame route (`/api/cctv/frame?id=…`) for snapshot cameras. `excluded[]`
carries `{ id, name, reason }` for every pick that did not ship.

1. **Embed** — `GET /embed/<token>` renders the collection as a
   chrome-light live wall (snapshots refresh ~20s; HLS plays muted;
   per-tile agency attribution; "Powered by WorldEye"). The dashboard
   hands the customer an `<iframe>` snippet. Framing: `next.config.ts`
   scopes the exception to this route only — the global rule excludes
   `/embed/*` from `X-Frame-Options: SAMEORIGIN`, and the embed rule
   sends `Content-Security-Policy: …; frame-ancestors *` with no
   X-Frame-Options. Every other route keeps SAMEORIGIN.
2. **Token feed** — `GET /api/feed/<token>` → the payload as JSON,
   `Cache-Control: public, max-age=60`, rate-limited per IP, counts
   `feedHits`. The token (`wef_` + 192-bit) is the credential.
   Regenerating replaces the stored hash — the old link dies everywhere
   at once; deleting the token turns the feed off.
3. **API** — `GET /api/v1/collections/<id>/cameras` with
   `Authorization: Bearer wek_…` (or `X-Api-Key`). Keys are owner-scoped:
   a key reads only its owner's collections (anything else is a 404).
   Revoked keys return 401 immediately. Per-key `hits` + `lastUsedAt`.

## 4. Gate and lapse behavior

- Dashboard + management API: session required (401), and the
  subscription must be enterprise — `stripePriceId ===
  STRIPE_ENTERPRISE_PRICE_ID`, status active/trialing, period unexpired
  (403 otherwise; the dashboard renders the locked offer state). Pro does
  not unlock Enterprise, mirroring `src/lib/recording/access.ts`'s shape.
- Public doors follow the OWNER's subscription: if the enterprise plan
  lapses, the feed and API return 403 and the embed renders an
  "unavailable" notice — automatically, with no per-collection switch.
- The dashboard lists every pick with its live verdict: **Feed-ready**
  (with the clearance basis) or **Excluded** (with the reason) — picks
  are never silently dropped anywhere.

## 5. Offer terms (as published on /pricing + /enterprise)

Custom camera collections, embeddable live player, private data feed,
optional API access, priority customer support (published address
passiveincomewai@gmail.com — no response-time SLA is promised), and
integration help, all under the same **7-day money-back guarantee** on
the first charge as Pro. Copy lives in `src/lib/enterprise/offer.ts`
and is pinned by `offer.test.ts`.
