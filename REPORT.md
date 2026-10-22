# Camera integrations — October 22 (six picked sources)

**Branch:** `feature/camera-integrations-oct22` (worktree `~/workspace/worldeye-camera-integrations`)
**Base:** `97c4f9f` (production master at start of work)
**Date:** 2026-10-22
**Status:** All integrable sources implemented and committed per source. **NOT pushed, NOT deployed** (per brief — Cosmo adjudicates, merges, ships).
**Public headline:** unchanged — 74,229 (owner decision; no headline copy or camera-stats tiers touched).

## Catalogue totals

| | Unique ids served |
|---|---|
| Before (production, measured 2026-10-22 ~07:52 UTC, pipeline counting) | **75,835** (76,455 records) |
| After | **PENDING** — requires the harvest sync + a local built-server count, which are blocked by the sandbox environment failure described in §8. Expected movement: +~2,300–2,500 harvest records (England + NI, minus probe-dead/duplicates) and +~2,800 net runtime records from the new direct modules (IA 1,264 / OH ~1,124 / KY ~352 / SD ~173 views, CoastCams 5; overlapping OpenCCTV records dedupe out at sync). |

## Commits on the branch

| Commit | Source |
|---|---|
| `ab4a09b` | Traffic England — registry verdict flipped to clear |
| `51bdbf4` | HAK — registry verdict set to excluded (held) |
| `c3d5b03` | TrafficWatch NI — registry clear + proxy/probe Referer plumbing |
| `fbea408` | Iowa DOT — direct module |
| `b3d2915` | Ohio DOT — direct module |
| `facc608` | Kentucky — direct module |
| `84a962f` | South Dakota — direct module (Wyoming blocked, §3.5) |
| `552b008` | USGS CoastCams — direct module |
| (this file) | REPORT.md |

Each source is one commit so any single source can be dropped cleanly at merge.

---

## 1. USGS CoastCams — INTEGRATED (5 cameras)

**Verdict:** Integrate — unconditional. USGS CoastCam imagery is U.S. Government public domain: USGS data-release metadata states *"Public domain (CC0-1.0) data from the U.S. Government are freely distributable with proper metadata and source attribution. Please recognize the U.S. Geological Survey (USGS) as the source"*; EXIF tags in the images themselves read `Copyright: 'Public Domain'`. Not for navigational use.

**Channel:** curated direct module `src/app/api/cctv/coastcams.ts`, region key `coastcams`. USGS publishes no inventory API with camera positions, so the module is a curated list under a strict bar: a camera ships only if (1) its `latest/` S3 snapshot is live and updating, **and** (2) USGS itself publishes the camera's position. All five were re-verified by the coordinator at ingest (2026-10-22 ~08:39 UTC): HTTP 200, `image/jpeg`, Last-Modified within the hour.

**Counts:** found 14 listed stations (11 active, 3 decommissioned) / 28 nominal cameras → **imported 5**:

| Camera | Position basis |
|---|---|
| Marconi Beach MA c1, c2 | RTK-GNSS pole position in USGS EXIF metadata (41.892622, −69.963194) |
| Madeira Beach FL c1 | USGS calibration EO, UTM 17N converted (27.796214, −82.796098) |
| Isla Verde PR c1, c2 | Pole coordinates printed on the USGS CMGDS station page (18.44382, −66.01224) |

**Excluded, with reasons:** 11 live cameras with **no USGS-published position** (Santa Cruz c1/c2, Sunset State Beach c1/c2, Shishmaref c1/c2, Golovin c1/c2, Teller c1/c2, Madeira Beach c2) — coordinates were not invented; Sand Key c2 (has coordinates, feed stale since 2026-10-01); Dorado Beach c1/c2 (feed dead since 2025-01-23); decommissioned stations Head of the Meadow, Nuvuk/Point Barrow, Tyndall AFB; Sand Key c1 (no image object exists, HTTP 403).

**Follow-ups:** Isla Verde's printed longitude is digit-identical to its wave-buoy longitude on the same USGS page (suspected USGS typo — carried exactly as published, worth a sanity re-check); Alaska-station coordinates may exist in the USGS GNSS data release DOI 10.5066/P13YIWKC (calibration-support points — needs manual review before use).

## 2. Traffic Scotland — BLOCKED-ON-OWNER-REGISTRATION (no code shipped)

**Verdict:** Do not integrate now. A keyless public channel exists but is **terms-prohibited**; the only sanctioned channel is the registered FTP service, and registration is the owner's action (no accounts were created, no terms agreed).

**Evidence (all verified live 2026-10-22):**
- Public site `traffic.gov.scot` exposes the full inventory keylessly: `GET /tsis/cameras` returns **415 markers / 413 unique locations / 500 views**, all with coordinates; per-camera images are served only as inline base64 via `/tsis/camerahtml` (no image URL exists to hotlink). The "~304" figure in circulation is a stale third-party app listing.
- Traffic Scotland's own copyright page (`traffic.gov.scot/copyright`) states: *"The Scottish Government retains the full copyright of all live traffic camera images. Traffic Scotland users may not hyperlink directly to the traffic camera images. Users identified as actively hyperlinking directly to the traffic camera images may be banned from accessing the site."* It also prohibits use on private networks/intranets without explicit authorisation. No OGL rescue: Scottish Government OGL boilerplate excludes images, and no OGL is offered on the camera pages.
- No open-data channel carries the cameras (data.gov.uk: no camera dataset; ArcGIS Online: no Transport Scotland camera service).

**What Jameson needs to do (exact path):**
1. Developer hub: https://www.traffic.gov.scot/traffic-scotland-developer-hub → register at https://developer.trafficscotland.org/register (email, password ≥12 chars, first name, surname, organisation). Login itself accepts the portal privacy policy; the FTP service has its own T&Cs inside the portal.
2. Subscribe to the **Live Traffic Camera FTP Service** inside the portal. Approval is manual ("approved subscribers"; expect a follow-up email, not instant credentials). On approval Traffic Scotland provides FTP access to all live images plus the camera list with coordinates. No fee is published.
3. Recommended in parallel: email **info@trafficscotland.org** explaining who you are and why/how you want to use the images — the copyright page expressly invites this for company use.
4. Integration conditions once approved: credit Traffic Scotland as source, keep feed URLs unchanged/functional, avoid polling patterns that degrade their service (they may block), no uptime guarantee.

## 3. US state DOT completion

Direct modules (one file per agency, `stealthFetch` + `cachedSource`, pure exported mapper + colocated tests), registered in `route.ts` under their own region keys with explicit bounds rules — mirroring the Indiana/Oregon/FAA precedents. Every still-image URL in each inventory was probe-verified by the coordinator (Range-request method, same criteria as the pipeline probe) before the modules were committed; per-state numbers below.

### 3.1 Iowa — INTEGRATED (`fbea408`)
- **Channel:** Iowa DOT ArcGIS Online `Traffic_Cameras_View` FeatureServer (the inventory 511ia.org publishes), paged by FID past the 1,000-record service cap. Keyless.
- **Counts:** found **1,264 views** (~865 sites) → module imports all in-bounds views with a still and/or HLS playlist. Probe: stills **1,234/1,234 unique URLs alive** (30 views share a sibling's URL); HLS — 1,230 unique playlists published, 436 confirmed alive in a full 20-way pass, 252/396 in a gentler re-probe, and **13/13 in a sequential sample spread across all video hosts** with the pipeline's own prober: the mass "dead" readings were timeout artefacts of the throttled sandbox egress (the failure mode `probe.ts` itself warns about), not feed death. Previously served: ~121.
- Record mapping: `feed_url` = still, `stream_url` = HLS where published.

### 3.2 Ohio — INTEGRATED (`b3d2915`)
- **Channel:** `https://api.ohgo.com/cameras` — the keyless API OHGO's own web/mobile apps poll. **The documented developer API (`publicapi.ohgo.com`) is registration-key-gated (keyless call → HTTP 401 "API key required") and was NOT signed up for**; the web-app channel needs no key.
- **Counts:** found **1,159 sites / 1,163 views** → probe: stills **1,124/1,124 unique URLs alive**. The feed's 39 KYTC cross-listed sites are excluded here and served by the Kentucky module from KYTC's own inventory (no double-listing). Previously served: ~151.

### 3.3 Kentucky — INTEGRATED (`facc608`)
- **Channels:** the two ArcGIS layers GoKY itself loads — KYTC `trafficCamerasCur_Prd` (256 records) and LFUCG Lexington `Traffic_Camera_Locations_Public_view` (108). Keyless.
- **Counts:** KYTC 256 = 247 in-state + 9 Louisville-metro TRIMARC rows on the Indiana shore (published by KYTC as part of the Louisville network; kept as published, inside the module's bounds by design); the 1 record marked `Offline` is skipped. Probe: KYTC stills **231/235 unique URLs alive** (4 dead as published — they remain in the agency inventory the module mirrors, as with other direct modules); Lexington stills **108/108 alive**. Previously served: ~159.

### 3.4 South Dakota — INTEGRATED (`84a962f`)
- **Channel:** `https://sd.cdn.iteris-atis.com/geojson/icons/metadata/icons.cameras.geojson` — the exact file sd511.org loads. Keyless.
- **Counts:** found **40 sites / 173 views** → probe: stills **162/173 unique URLs alive** (11 dead as published; mirrored-inventory convention as above). Previously served: ~101.

### 3.5 Wyoming — BLOCKED (no code shipped)
No keyless machine-readable inventory with coordinates exists; checked exhaustively 2026-10-22:
- Legacy wyoroad.info route pages enumerate exactly the 228 published sites, but carry **no coordinates anywhere**, and images are served only through per-view obfuscated token URLs (`/web-cam/cache?ref=…`), not stable image URLs.
- The current 511 map's camera feed is an intentionally obfuscated protobuf (`webcameras_v1_pkg`) with encoded feed locations — recovering it means reverse-engineering, against WYDOT's stated posture (its 2023 upgrade notice warns third-party aggregators of WYDOT website data face interruptions).
- WYDOT's ArcGIS Online org (143 services) has no camera service.
Options for the owner: (1) ask WYDOT ITS for a data feed; (2) accept a hand-geocoded HTML scrape (no published coordinates — precision the programme does not accept); (3) leave the gap (34 served vs 228 published). No action taken.

## 4. HAK Croatia — HELD, registry EXCLUDED (`51bdbf4`)

**Verdict:** Terms-prohibit. Do not integrate; the family's 63 held OpenCCTV records stay out, and the registry now records the family as `excluded` so it can never be force-enabled.

**Evidence (verified 2026-10-22):** HAK is a motoring association (a citizens' association exercising public powers), not a state agency. Real inventory is **486 cameras** (the "~260" figure is a 2019 Axis case-study number). Its Terms of Use (https://www.hak.hr/hak/uvjeti-koristenja/, rev. 14 Sep 2026):
- §6: no taking/reproducing content without prior consent;
- §7: permitted use is **personal, non-commercial** only;
- §8: the relay permission expressly **excludes systematic or automated taking of the whole content or a substantial part**, and any substitute product;
- §9: commercial use, inclusion in paid products, and redistribution via an app/data interface only with **prior written consent**, commercial terms by **written agreement**;
- §10: **scraping/robots expressly prohibited** without prior written approval.
A written-agreement path exists (§§9/16) — pursuing it is the owner's call. No open licence or open channel exists. This is a held source with a clear reason, per the programme's legal discipline.

## 5. TrafficWatch Northern Ireland — INTEGRATED (`c3d5b03`)

**Verdict:** Public-agency-open. Operator is the Department for Infrastructure (DfI) itself, delivered via TICC Belfast. DfI's own Crown Copyright page licenses the site's material: *"You may use and re-use the information featured on this website (not including logos) free of charge in any format or medium, under the terms of the Open Government Licence"* — conditions: attribution, no suggestion of endorsement, no misrepresentation; exemptions are logos, personal data, and third-party rights. **No carve-out for the CCTV stills.** The OpenCCTV family `trafficwatch-ni` is flipped to `clear` in the registry with this basis recorded.

**Channel:** the harvest family (127 records — matches DfI's public list page exactly; DfI's own map feed carries 145 markers, so 18 map-only cameras are a documented follow-up for a future direct module; the "~185" figure traces to DfI's ~190-camera operational TICC network, not the published set).

**Technical catch, found and fixed:** the image host `cctv.trafficwatchni.com` enforces hotlink protection — coordinator-verified 2026-10-22: no Referer → **403**; `Referer: https://trafficwatchni.com/` → **200**; the camera subdomain itself as Referer → **403**; any third-party Referer → **403**. Without plumbing, every NI camera would probe dead and browsers couldn't load the stills. The commit therefore: adds the host to `PROXY_IMAGE_HOSTS` (stills are stored as proxy URLs), allowlists it in the CCTV proxy with a Referer override to the apex site (the proxy's default origin-Referer is the subdomain — which 403s), and makes the harvest probe send the same Referer. Unit tests cover all three behaviours. (Harvest health will count NI records as "unverified" in its join — a pre-existing wart shared with the Selangor proxied host, since generated `feed_url`s are proxy paths while the probe cache is keyed by raw URL; informational only.)

**Expected import:** up to 127 records, minus probe-dead and dedupe against the current catalogue at sync.

## 6. Traffic England — INTEGRATED, judgment call recorded in full (`ab4a09b`)

**Verdict:** Integrate — the family `trafficengland` (2,372 records, all license-held in the last run) is flipped from `conditional` to `clear` in the registry, with the full basis in the registry entry. **This is the one judgment call in this batch and is flagged as such.**

**The Oct-18 hold, and why it no longer stands:** the audit held the family because records point at `public.highwaystrafficcameras.co.uk` / trafficengland.com, which it read as a third-party portal rather than National Highways itself. Primary evidence gathered 2026-10-22 refutes that premise:
- **Find a Tender notice 2025/S 000-047293** (National Highways, published 8 Aug 2025) names `www.trafficengland.com` and `www.nationalhighways.co.uk` as the NTIS service's own websites; the NTIS contract (Sopra Steria) runs to Jan 2027. A GOV.UK press release (2021-01-27) corroborates.
- The image host is Highways England's own **HETC** system, and the held records use its designated **public-access tier** (`public.` subdomain + `/cctvpublicaccess/` paths) — not the authenticated operational system. Coordinator-verified live: sample held-record image → HTTP 200, `image/jpeg`, no auth, any Referer.
- `trafficengland.com/` now 301-redirects to nationalhighways.co.uk (front-end retired ~2026-06-30); the image host is separate and live. Nothing in the integration depends on trafficengland.com pages.

**Terms posture (stated plainly):** no express OGL licence for the CCTV stills was found (OGL statements cover publications / non-camera APIs), and **no prohibition** on the public-access tier was found either. A downstream re-user describes the images as Crown Copyright provided under licence via the service providers. The documented formal reuse channel is **NTIS subscriber registration + approval**.

**Decision rule applied** (the brief's standard): the channel is established as the agency's own, the images are publicly served on a tier designated for public access, and terms are silent/murky rather than prohibitive → integrate, with the reasoning recorded here and in the registry, Crown-copyright attribution to National Highways, and the residual terms gap named: **closing it fully means Jameson registering as an NTIS subscriber** (recommended; not done by any agent). The flip is reversible with one registry edit + resync if the owner judges otherwise. Contrast Traffic Scotland (§2), where the agency's own page expressly prohibits the act — that one is held.

**Expected import:** up to 2,372 records, minus probe-dead/placeholder and dedupe at sync.

## 7. What was NOT touched

Windy families (structurally excluded); the settled Oct-18 exclusions (EarthCam, WeatherBug, SkylineWebcams direct, osm-webcams, camstreamer, ipcamlive, feratel, opensnow, weatherstem, twipcam, panomax); the ~49k records in other CONDITIONAL families (not in this task's scope); headline copy and camera-stats tiers; no accounts created, no registrations, no terms agreed, nothing pushed or deployed.

## 8. Gates — status and the environment blocker

| Gate | Result |
|---|---|
| Targeted unit tests (all touched modules: families, probe, proxy, iowa, ohio, kentucky, southdakota, coastcams, normalize) | **PASS** — 58 passed, 4 skipped (live opt-ins), 2026-10-22 |
| `npx tsc --noEmit` | **PASS** — exit 0 |
| Full vitest suite | **NOT RUN TO COMPLETION** — blocked by the environment failure below (baseline invariant to preserve: only `src/lib/oi/context.test.ts` and `src/app/api/cctv/route.test.ts` fail) |
| Production build (`npm run build`) | **NOT COMPLETED** — blocked, see below |
| Harvest sync (`tools/sync-cameras.ts --write`) + rebuild + after-count | **NOT RUN** — depends on the build |

**The blocker is environmental, not code.** Two sandbox failures compounded on 2026-10-22:
1. **Google Fonts fetch lottery (box-wide, previously documented):** Turbopack's font fetches fail while the sandbox egress proxy is slow (asset latency measured 7–21s; a full stall ~09:38–09:44 UTC). Five build attempts in this worktree failed with exactly the 4 `next/font` errors and nothing else. Sibling workstreams hit the same wall (one needed seven attempts; another hit a Turbopack persistence panic). Standing fix per AGENTS.md: rebuild when network/load clears.
2. **Write-EPERM flap (this session, from ~10:02 UTC):** `write()` syscalls from this session's processes began returning `EPERM` intermittently-to-deterministically — strace shows Next failing to write `.next/cache/.rscinfo` and `.next/trace-build`; npm fails writing its own log; redirected log files are created empty. File creation and the file tools still work; process content-writes flap. This killed later build attempts before the font stage and blocks vitest run via npm/npx.

**To finish (exact sequence, from a healthy session):**
```
cd ~/workspace/worldeye-camera-integrations
npm run build                      # needs .next/BUILD_ID; retry on font errors until egress is fast
npx esbuild tools/sync-cameras.ts --bundle --platform=node --format=esm --alias:@=./src --outfile=node_modules/.cache/sync-cameras.mjs
node node_modules/.cache/sync-cameras.mjs --write   # flag-off baseline; expect refusal gates to pass (~+7% generation growth)
npm run build                      # generated harvest file changed
npx tsc --noEmit
npx vitest run                     # expect ONLY the 2 known baseline failures
# after-count: start the built server (harvest on, fresh OSIRIS_CCTV_SNAPSHOT), GET /api/cctv?region=all, count unique ids vs 75,835
```
Then update the Catalogue totals table and §8 of this report with the sync report's per-family accounting (inspected/duplicates/dead/placeholder/imported for trafficengland and trafficwatch-ni) and the after-total, and commit the sync's regenerated artifacts (`opencctv-harvest.generated.ts`, reports, `harvest-health.json`, `sync-status.json`) as a final commit on this branch.

## 9. Owner actions summary

1. **Traffic Scotland** — register on the developer portal + subscribe to the FTP service (§2); optionally email info@trafficscotland.org. Nothing else unblocks it.
2. **Traffic England** — optional but recommended: NTIS subscriber registration to close the residual terms gap on an integration that has already been made on the recorded reasoning (§6). Reversible if you'd rather hold it.
3. **HAK** — only a written agreement with HAK (§§9/16 of its Terms) unblocks it; otherwise it stays excluded.
4. **Wyoming** — only a WYDOT ITS data-feed request offers a clean path (§3.5).
5. **Headline number** — 74,229 unchanged; updating it after the sync lands is a separate call.
