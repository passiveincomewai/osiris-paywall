# OpenCCTV held-family licensing spot-check pass — 2026-10-22

Branch: `feature/opencctv-held-spotcheck` (base `97c4f9f`, production master).
Scope: every CONDITIONAL (held) OpenCCTV source family in the licensing
registry (`src/lib/camera-expansion/families.ts`) — 266 families holding
49,277 harvested-but-unimported records (last full harvest report,
2026-10-19). Method: identify each family's true upstream from primary
evidence (dominant feed hosts from the harvest record census + the
operator's own site/terms), then apply the programme's standing rule —
public-agency or explicitly open-licensed upstreams CLEAR; aggregators,
commercial networks and prohibiting terms stay HELD; definitive
prohibitions move to EXCLUDED.

## Headline outcome

- **CLEAR: 107 families / 19,517 held records** — flipped to `clear` in the
  registry (commits below) and **imported 2026-10-22**: of 19,605
  records the sync inspected for these families, 7,493 were imported
  probe-verified and 5,649 skipped as duplicates of the served
  catalogue — see "Import reconciliation" for the full accounting.
- **EXCLUDED: 6 families / 2,634 records** — definitive terms evidence
  (itraffic/SANRAL, nexco-japan/Drive Traffic, weatherstem,
  nysmesonet/RFSUNY, balticlivecam) plus swisswebcams, whose 1,542 feeds
  all sit on Windy's image CDN — Windy data under another label.
- **CONDITIONAL (still held): 150 families / 24,564 records** — commercial
  platforms, aggregators, YouTube-embed catalogues, TV-station cams,
  mixed-provenance families and genuinely ambiguous cases, each with its
  evidence recorded in the table below and, for the decision-relevant
  holds, in the registry itself.
- **Deferred to the sibling integrations program (untouched here):
  3 families / 2,562 records** — trafficengland (2,372), trafficwatch-ni
  (127), hak (63).

Commits on this branch: `a4f142a` (registry: 107 families cleared),
`26f9a92` (registry: 6 exclusions, twipcam basis refreshed, 11 documented
conditional holds), `2c4c1db` (test fixture: nexco-japan's new excluded
status), `55ad043` (the import: regenerated catalogue + sync artefacts),
and this report.

## ⚠ twipcam — owner decision needed at merge time

**Definitive verdict: the family stays CONDITIONAL — do not import it via
the harvest, and do not clear it.** The census split is now measured, not
assumed: of 5,754 held twipcam records, 3,909 feeds (68%) sit on
`c01.twipcam.com`, the commercial TWIPCAM platform's own CDN, and only
608 (11%) sit on `cctvn.freeway.gov.tw`, the Taiwan Freeway Bureau's own
domain (remainder scattered). TWIPCAM is a commercial platform whose
terms have never cleared; republishing its CDN wholesale is exactly the
posture this programme exists to avoid. The Bureau's cameras are a
different matter — they should be sourced from the Bureau directly, and
that route already exists: the `taiwan-freeway` family is CLEAR in the
registry.

**The exposure to decide:** 533 twipcam-labelled records are *already in
the served catalogue* — they arrive via the legacy production Asia
sampler in `opencctv.ts`, not via this harvest. This pass has neither
imported more twipcam records nor removed the served ones (per the
pass's instructions). Options at merge: (a) accept and keep the 533;
(b) drop twipcam from the legacy sampler's reach; (c) replace the
sampler's twipcam reach with direct Freeway Bureau sourcing.
Recommendation: (c), falling back to (b) — keeping served records
sourced from an uncleared commercial platform is inconsistent with the
registry standard applied everywhere else in this pass.

## Import reconciliation

**COMPLETED 2026-10-22 (write run 21:46 UTC, commit `55ad043`).** The
registry flips were already committed, so this was the mechanical sync
the earlier draft specified — with one operational wrinkle: each sync
pass probes at most 90 minutes of feeds (the harvest tool's
`--probe-budget-min` default; the sync wrapper does not forward an
override), and unprobed candidates count as dead for that pass only.
Four passes burned the queue down against the persistent probe cache —
fresh verdicts grew 35,119 → 38,839 → 44,815 → 46,395 → 51,077 — until
the final dry-run (pass D) and the write run both completed **without
hitting the probe budget** (verified: no "probe budget reached" line in
either log). Every candidate in the final accounting therefore carries
a real probe verdict: never-probed = 0. The write run's own harvest
phase finished in 88 s on the warm cache.

**The 107 cleared families — full accounting (write report,
`harvest-latest-write.json`):** inspected **19,605** records →
imported **7,493** (probe-verified alive, incl. 140 near-distinct
records imported as distinct per pipeline semantics) · duplicates
skipped **5,649** (provider-id 362, URL-full 1,026, URL-host/path
1,057, same-location 2,889, geo+name 315) · intra-family duplicates
**1,313** · invalid feed **222** · probe-dead **4,807** · placeholder-
fingerprinted **121** · licence-held **0** · licence-excluded **0** ·
invalid coordinates **0**. Sum reconciles exactly:
7,493 + 5,649 + 1,313 + 222 + 4,807 + 121 = 19,605.

Against the census figure of 19,517 held records, the sync inspected
19,605 (+88): the harvest marker set drifted between the census and
the sync (upstream records added/removed). Two census families —
`ipgp` (9 records) and `nasa-epic` (1) — produced no rows in the sync
report: the current marker set holds no records for them, so nothing
was imported and nothing was lost; they remain `clear` in the registry
for any future sync.

**Sanity anchors (already-integrated upstreams dedupe, never
double-import):** drivebc 1,041 duplicates skipped of 1,041 inspected
(census 1,042 — one record of snapshot drift; 0 imported, 0 dead);
nsw 192 of 192 (census 193, same drift); fintraffic 4 of 4 (exact).

**Deviation — thailand-doh:** the census expectation was ~163 records
deduping against the direct module; the sync found only **20**
duplicates (provider-id class) and **139 probe-dead**, 0 imported. The
direct module's records evidently do not share URL/id forms with the
harvest records for the remaining 139, and those feeds probe dead
from this sandbox. No served camera was lost — the direct module
keeps serving its Thailand DOH cameras — and the family stays `clear`,
so a future sync from unblocked egress can import the harvest records
without a new licensing decision.

**Probe-dead caveat (the sync report's own standing note):** sandbox
probe verdicts are floors, not ceilings — hosts that block datacenter
IPs read dead here and may play in a browser. Three cleared families
are dominated by this pattern and imported nothing this run despite
being cleared: **nycdot** (946 of 946 probe-dead), **road-info-prvs**
(1,725 of 1,822) and the thailand-doh records above. Their registry
verdicts stand; the cameras were simply not verifiable from this
network. All other probe-dead counts are ordinary origin failures
(HTTP errors, timeouts, unreachable hosts) on real probe attempts.

**Held back, as required:** twipcam remains `conditional` — 5,709
records inspected by the sync, 5,709 licence-held, 0 imported — and
its 533 already-served records (via the legacy sampler, not this
harvest) are untouched, pending the owner decision above. The three
sibling-deferred families also stayed held (trafficengland 2,371,
trafficwatch-ni 127, hak 62 licence-held; 0 imported). Catalogue-wide,
the licence gate verified 0 verified-new Windy records.

| Family | Inspected | Imported | Duplicates skipped | Intra-family dup | Invalid feed | Probe-dead | Placeholder |
|---|---:|---:|---:|---:|---:|---:|---:|
| agpse-waterway | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| airservices | 141 | 35 | 4 | 81 | 0 | 21 | 0 |
| algotraffic | 649 | 505 | 0 | 37 | 0 | 96 | 11 |
| andorra | 68 | 54 | 0 | 2 | 0 | 12 | 0 |
| antarctic | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| arlingtonva | 267 | 223 | 0 | 15 | 0 | 29 | 0 |
| arso-si | 51 | 22 | 0 | 19 | 0 | 10 | 0 |
| asahan | 18 | 7 | 3 | 0 | 0 | 8 | 0 |
| awi | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| balikesir | 26 | 3 | 19 | 1 | 0 | 3 | 0 |
| bandung-pelindung | 270 | 65 | 65 | 35 | 0 | 105 | 0 |
| bantul | 41 | 13 | 14 | 4 | 0 | 10 | 0 |
| belarus-customs | 12 | 0 | 4 | 0 | 0 | 8 | 0 |
| biodic | 36 | 0 | 2 | 0 | 0 | 34 | 0 |
| bizkaimove | 58 | 46 | 0 | 3 | 0 | 9 | 0 |
| boating-vic | 92 | 0 | 0 | 0 | 92 | 0 | 0 |
| bondowoso | 18 | 0 | 18 | 0 | 0 | 0 | 0 |
| brentwood-tn | 31 | 0 | 0 | 0 | 31 | 0 | 0 |
| cayman-port | 8 | 3 | 0 | 1 | 0 | 4 | 0 |
| ccg-cameras | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| cetsp | 9 | 0 | 0 | 0 | 0 | 9 | 0 |
| chile-dgac | 93 | 0 | 0 | 0 | 93 | 0 | 0 |
| cic-tenerife | 96 | 47 | 0 | 36 | 0 | 13 | 0 |
| czech-highways | 7 | 4 | 0 | 0 | 0 | 3 | 0 |
| czech-highways-ext | 12 | 6 | 0 | 0 | 0 | 6 | 0 |
| daer-rs | 17 | 9 | 0 | 0 | 0 | 8 | 0 |
| dersp | 18 | 9 | 0 | 0 | 0 | 9 | 0 |
| dir-est | 33 | 23 | 0 | 0 | 0 | 10 | 0 |
| dirce | 34 | 25 | 0 | 0 | 0 | 9 | 0 |
| drivebc | 1,041 | 0 | 1,041 | 0 | 0 | 0 | 0 |
| dsat | 101 | 18 | 59 | 15 | 0 | 9 | 0 |
| durham | 30 | 20 | 0 | 0 | 0 | 10 | 0 |
| dwd-webcams | 8 | 3 | 0 | 1 | 0 | 4 | 0 |
| eaglecrest | 5 | 0 | 0 | 0 | 0 | 5 | 0 |
| ecan | 4 | 0 | 0 | 0 | 0 | 4 | 0 |
| emsd-kamchatka | 23 | 13 | 0 | 4 | 0 | 6 | 0 |
| eso-observatories | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| fintraffic | 4 | 0 | 4 | 0 | 0 | 0 | 0 |
| geonet | 10 | 2 | 0 | 2 | 0 | 6 | 0 |
| goes-satellite | 16 | 9 | 0 | 0 | 0 | 7 | 0 |
| govje | 10 | 1 | 0 | 3 | 0 | 6 | 0 |
| grandlyon | 14 | 6 | 0 | 0 | 0 | 8 | 0 |
| himawari | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| hivis | 907 | 701 | 1 | 93 | 0 | 112 | 0 |
| horizons | 21 | 12 | 0 | 0 | 0 | 9 | 0 |
| houstontranstar | 1,090 | 120 | 929 | 15 | 0 | 20 | 6 |
| hvo | 16 | 0 | 0 | 0 | 0 | 16 | 0 |
| ibb-istanbul | 341 | 0 | 157 | 0 | 0 | 184 | 0 |
| ineter | 14 | 0 | 0 | 0 | 0 | 14 | 0 |
| informo-madrid | 353 | 309 | 5 | 9 | 0 | 30 | 0 |
| inforoute-alsace | 12 | 6 | 0 | 0 | 0 | 6 | 0 |
| inforoute05 | 41 | 23 | 0 | 0 | 0 | 18 | 0 |
| inforoutes06 | 100 | 82 | 0 | 5 | 0 | 13 | 0 |
| iowa-mesonet | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| ipgp | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| kaiho | 70 | 52 | 6 | 2 | 0 | 10 | 0 |
| kkr | 324 | 254 | 18 | 22 | 0 | 30 | 0 |
| koeln | 24 | 15 | 0 | 0 | 0 | 9 | 0 |
| mackinac | 5 | 4 | 0 | 0 | 0 | 1 | 0 |
| maineturnpike | 22 | 10 | 0 | 3 | 0 | 9 | 0 |
| medellin-simm | 78 | 0 | 0 | 0 | 0 | 78 | 0 |
| meteogalicia | 31 | 20 | 0 | 0 | 0 | 11 | 0 |
| mlit-kanto | 68 | 39 | 6 | 13 | 0 | 10 | 0 |
| mlit-yamagata | 12 | 5 | 0 | 0 | 0 | 7 | 0 |
| moldova-roads | 11 | 4 | 4 | 0 | 0 | 3 | 0 |
| msdot | 109 | 33 | 0 | 63 | 0 | 13 | 0 |
| mtdot | 34 | 23 | 0 | 0 | 0 | 10 | 1 |
| nasa-epic | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| nasa-worldview | 8 | 4 | 0 | 0 | 0 | 4 | 0 |
| ndawn | 1,704 | 1,563 | 0 | 3 | 0 | 138 | 0 |
| niigata | 175 | 146 | 8 | 0 | 0 | 21 | 0 |
| njta | 134 | 110 | 0 | 5 | 0 | 19 | 0 |
| noaa-esrl | 7 | 1 | 0 | 3 | 0 | 3 | 0 |
| noirlab | 4 | 1 | 0 | 3 | 0 | 0 | 0 |
| northyorks | 23 | 12 | 0 | 2 | 0 | 9 | 0 |
| nsw | 192 | 0 | 192 | 0 | 0 | 0 | 0 |
| numazu-snow | 15 | 0 | 1 | 0 | 0 | 14 | 0 |
| nycdot | 946 | 0 | 0 | 0 | 0 | 946 | 0 |
| opentrafficcam | 4,625 | 999 | 2,792 | 575 | 1 | 192 | 66 |
| opgc | 2 | 0 | 0 | 0 | 0 | 2 | 0 |
| ovsicori | 7 | 4 | 0 | 0 | 0 | 3 | 0 |
| panama-canal | 5 | 3 | 0 | 0 | 0 | 2 | 0 |
| pgctrip | 42 | 15 | 0 | 18 | 0 | 9 | 0 |
| recife-cttu | 54 | 35 | 0 | 0 | 0 | 19 | 0 |
| road-info-prvs | 1,822 | 0 | 97 | 0 | 0 | 1,725 | 0 |
| saoras | 4 | 0 | 4 | 0 | 0 | 0 | 0 |
| sarao | 4 | 1 | 0 | 3 | 0 | 0 | 0 |
| siata | 188 | 134 | 0 | 32 | 0 | 22 | 0 |
| smithsonian-zoo | 8 | 1 | 0 | 7 | 0 | 0 | 0 |
| socrata | 608 | 439 | 30 | 30 | 0 | 84 | 25 |
| swiss-autobahn | 45 | 8 | 0 | 0 | 0 | 37 | 0 |
| tallinn | 12 | 5 | 0 | 1 | 0 | 6 | 0 |
| tasikmalaya | 16 | 7 | 2 | 0 | 0 | 7 | 0 |
| task-gdansk | 6 | 4 | 1 | 0 | 0 | 1 | 0 |
| thailand-doh | 159 | 0 | 20 | 0 | 0 | 139 | 0 |
| tirol | 192 | 23 | 143 | 16 | 0 | 10 | 0 |
| trafiroutes | 199 | 96 | 0 | 74 | 0 | 22 | 7 |
| usace-waterways | 4 | 2 | 0 | 0 | 0 | 2 | 0 |
| usap | 5 | 4 | 0 | 0 | 0 | 1 | 0 |
| verkeerscentrum | 63 | 0 | 0 | 0 | 0 | 63 | 0 |
| vitoria-gasteiz | 38 | 29 | 0 | 0 | 0 | 9 | 0 |
| wastateparks | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| webcoos | 30 | 15 | 0 | 1 | 0 | 14 | 0 |
| wsv-waterway | 10 | 1 | 0 | 0 | 0 | 9 | 0 |
| wyoroad | 672 | 569 | 0 | 1 | 5 | 95 | 2 |
| yorkmaps | 390 | 342 | 0 | 16 | 0 | 29 | 3 |
| zdw-krakow | 76 | 26 | 0 | 39 | 0 | 11 | 0 |

## Catalogue totals

Committed OpenCCTV harvest generation before this pass: **30,889**
unique served ids (counted from
`src/app/api/cctv/opencctv-harvest.generated.ts`). After the import:
**38,799** unique served ids — 8,733 ids added, 823 prior-generation
ids dropped (records that failed this cycle's re-verification or
dedupe), net **+7,910**. All 38,799 ids unique (no duplicates). The
public headline number 74,229 is untouched, per the owner's separate
call.

## Verdict table — every held family

| Family | Held records | Upstream identified | Verdict | Evidence (one line) |
|---|---:|---|---|---|
| opentrafficcam | 4,538 | Caltrans (California DOT), Ohio DOT, and state DOT 511/CARS-program systems | CLEAR | Dominant feed hosts are agency DOT domains — Caltrans and Ohio DOT plus the CARS 511 host — the DOTs themselves are the upstream. |
| road-info-prvs | 1,785 | Japan MLIT (Ministry of Land, Infrastructure, Transport and Tourism) — national highway road-information system | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| ndawn | 1,704 | North Dakota Agricultural Weather Network (NDAWN), North Dakota State University | CLEAR | Public-university research network (NDSU) publishing station cameras as free public data. |
| houstontranstar | 1,073 | Houston TranStar (TxDOT / Harris County / City of Houston / METRO consortium) | CLEAR | Public-agency transport consortium publishing traveller-information cameras openly. |
| drivebc | 1,042 | British Columbia Ministry of Transportation and Transit (DriveBC) | CLEAR | WorldEye already integrates this upstream directly in production; also a provincial transport authority. |
| nycdot | 946 | New York City Department of Transportation (NYC Traffic Management Center) | CLEAR | Municipal road authority publishing traffic cameras as public traveller information. |
| hivis | 908 | US Geological Survey (USGS) — HIVIS / National Imagery Management System (NIMS) | CLEAR | Single host is USGS's own imagery store; USGS HIVIS is a US federal camera network, US federal public domain. |
| wyoroad | 677 | Wyoming Department of Transportation (WYDOT) | CLEAR | State DOT publishing road-condition cameras as open traveller information. |
| socrata | 638 | City of Austin Transportation & Public Works Department | CLEAR | Municipal open-data publisher; family name is the open-data portal platform, not the operator. |
| algotraffic | 613 | Alabama Department of Transportation (ALDOT) — ALGO Traffic traveller-information system (with Alabama Law Enforcement Agency) | CLEAR | Single host is ALDOT's official traffic platform; ALGO Traffic provides the ALDOT camera network as public traveller information. |
| yorkmaps | 390 | Regional Municipality of York, Ontario (York Region) | CLEAR | Municipal/regional road authority publishing traffic cameras on its own mapping portal. |
| informo-madrid | 354 | Ayuntamiento de Madrid (Informo traffic portal) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| ibb-istanbul | 345 | İstanbul Büyükşehir Belediyesi (Istanbul Metropolitan Municipality) — Transportation Management Center (TKM/UYM) | CLEAR | Municipal road authority publishing traveller-information cameras publicly; Streamlock hosts are its streaming CDN, not the operator. |
| kkr | 324 | Japan MLIT Kinki Regional Development Bureau (KKR) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| arlingtonva | 268 | Arlington County, Virginia (county ITS / transportation) | CLEAR | Municipal (county) transport authority publishing traffic cameras on its own domain. |
| bandung-pelindung | 266 | Bandung City Government (Indonesia) — Pelindung CCTV portal | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| trafiroutes | 197 | Service public de Wallonie (SPW) — Wallonia Public Service, PEREX traffic centre, Belgium | CLEAR | Public-agency open-data publisher: the Walloon regional road authority publishes its motorway cameras as traveller information on its own domain. |
| nsw | 193 | Transport for NSW (TfNSW) — Live Traffic NSW traffic cameras | CLEAR | Public-agency open data (TfNSW Open Data Hub lists Live Traffic Cameras under CC-BY) AND WorldEye already integrates this same upstream directly in production. |
| tirol | 192 | Land Tirol (Austrian state government, road administration) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| siata | 188 | SIATA — Sistema de Alerta Temprana del Valle de Aburrá (Área Metropolitana / Medellín public environmental early-warning system) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| niigata | 175 | Niigata Prefectural Government (Japan) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| thailand-doh | 163 | Thailand Department of Highways, Ministry of Transport | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| airservices | 141 | Airservices Australia | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| njta | 135 | New Jersey Turnpike Authority | CLEAR | Public (state) toll-road authority publishing Turnpike/Garden State Parkway cameras as traveller information. |
| msdot | 110 | Mississippi Department of Transportation (MDOT) | CLEAR | State DOT publishing traffic cameras via its MDOTtraffic traveller-information service. |
| dsat | 101 | Macau Transport Bureau (DSAT — Direcção dos Serviços para os Assuntos de Tráfego), Macau SAR Government | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| inforoutes06 | 100 | Conseil départemental des Alpes-Maritimes (Inforoutes 06) | CLEAR | Public-agency open-data publisher — departmental council's own road-information service. |
| cic-tenerife | 96 | Cabildo de Tenerife — Centro de Información de Carreteras (CIC) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| boating-vic | 94 | Boating Vic — Maritime Safety Victoria / Better Boating Victoria (Victorian Government, Australia) | CLEAR | Public-agency open-data publisher; the opaque host IDs are the agency service's own ramp records. |
| chile-dgac | 92 | DGAC Chile (Dirección General de Aeronáutica Civil) — Directorate of Meteorology / aerodrome weather cameras | CLEAR | Public-agency open-data publisher; operator is Chile's civil aviation authority. |
| medellin-simm | 78 | Secretaría de Movilidad de Medellín — SIMM (Sistema Inteligente de Movilidad de Medellín) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| zdw-krakow | 75 | Zarząd Dróg Wojewódzkich w Krakowie (Małopolska voivodeship road authority) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| kaiho | 70 | Japan Coast Guard (Kaihocho), MLIT — MICS maritime information service | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| andorra | 69 | Mobilitat — Govern d'Andorra (Department of Mobility) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| mlit-kanto | 68 | Japan MLIT Kanto Regional Development Bureau | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| verkeerscentrum | 63 | Vlaams Verkeerscentrum (Flemish Traffic Centre, Agentschap Wegen en Verkeer) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| bizkaimove | 58 | Diputación Foral de Bizkaia (Bizkaia provincial council traffic service) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| recife-cttu | 53 | CTTU — Autarquia de Trânsito e Transporte Urbano do Recife (Recife municipal traffic authority) | CLEAR | Municipal traffic authority publishing traveller-information cameras as open data; feed host is its contractor, the operator is the agency. |
| arso-si | 51 | ARSO (Slovenian Environment Agency, national meteorological service) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| swiss-autobahn | 45 | ASTRA / FEDRO (Swiss Federal Roads Office) | CLEAR | Public-agency open-data publisher — federal road authority's own MobCam hosts, verified on astra.admin.ch (FEDRO, DETEC). |
| ccg-cameras | 44 | Canadian Coast Guard (Fisheries and Oceans Canada) | CLEAR | Federal government maritime network publishing cameras via its e-navigation service. |
| pgctrip | 42 | Prince George's County DPW&T — Traffic Response and Information Partnership (TRIP) Center, Maryland | CLEAR | County transport authority publishing traffic cameras to the travelling public; vendor CDN delivery does not change the operator. |
| inforoute05 | 41 | Conseil départemental des Hautes-Alpes (Inforoute 05) | CLEAR | Public-agency open-data publisher — departmental council's own road-information service. |
| bantul | 41 | Bantul Regency Government (Indonesia) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| vitoria-gasteiz | 38 | Ayuntamiento de Vitoria-Gasteiz (municipal government) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| biodic | 37 | Biodiversity Center of Japan, Ministry of the Environment (Internet Nature Institute / sizenken.biodic.go.jp) | CLEAR | Public-agency publisher: a Japanese national government (MOE) nature-monitoring camera network published openly on a .go.jp domain. |
| mtdot | 34 | Montana Department of Transportation (MDT 511) | CLEAR | State DOT 511 system; family host is the 511 vendor's CDN, the operator and publisher is MDT. |
| dir-est | 34 | DIR Est (Direction interdépartementale des routes Est, French State) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| dirce | 34 | DIR Centre-Est (Direction interdépartementale des routes Centre-Est, French State) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| brentwood-tn | 32 | City of Brentwood, Tennessee | CLEAR | Municipal transport authority publishing its own live traffic cameras on the city website. |
| webcoos | 32 | WebCOOS — Webcam Coastal Observation System (SECOORA, funded by NOAA IOOS; university/NOAA partners) | CLEAR | Public research/observing network publishing imagery openly for public access (PhenoCam precedent in the registry). |
| meteogalicia | 31 | MeteoGalicia (Xunta de Galicia meteorological service) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| durham | 30 | Durham County Council, England, UK | CLEAR | Municipal (county council) road authority publishing traffic and road-weather cameras as public traveller information. |
| iowa-mesonet | 26 | Iowa Environmental Mesonet (IEM), Iowa State University | CLEAR | Public-university research network publishing mesonet webcam imagery openly. |
| balikesir | 26 | Balıkesir Büyükşehir Belediyesi (Balıkesir Metropolitan Municipality) | CLEAR | Municipal agency publishing city cameras as a public service; the tvkur host is only the player, the operator's own portal is sehirkamera.balikesir.bel.tr. |
| emsd-kamchatka | 24 | Kamchatka Branch of the Geophysical Survey of the Russian Academy of Sciences (EMSD), with FEB RAS | CLEAR | Government research network publishing volcano-monitoring imagery publicly — the GSNL supersite record lists EMSD data access as unregistered/public; same posture as the cleared USGS/PhenoCam research networks. |
| koeln | 24 | Stadt Köln (City of Cologne) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| northyorks | 23 | North Yorkshire Council | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| maineturnpike | 22 | Maine Turnpike Authority | CLEAR | Public (state) toll-road authority publishing turnpike cameras as traveller information. |
| horizons | 21 | Horizons Regional Council (Manawatū-Whanganui, NZ) — regional government environmental monitoring network | CLEAR | Public-agency open-data publisher: a NZ regional council publishing river/environmental monitoring cameras on its own .govt.nz domain. |
| asahan | 19 | Asahan Regency Government (Indonesia) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| bondowoso | 18 | Bondowoso Regency Government (Indonesia) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| tasikmalaya | 18 | Tasikmalaya City Government (Indonesia) — ATCS | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| daer-rs | 18 | DAER-RS — Departamento Autônomo de Estradas de Rodagem do Rio Grande do Sul (state road agency) | CLEAR | Public-agency open-data publisher; feed host is the agency's camera-system contractor, the operator is the agency. |
| dersp | 18 | DER-SP — Departamento de Estradas de Rodagem de São Paulo (state road agency) | CLEAR | Public-agency open-data publisher (state road authority publishing highway cameras as traveller information). |
| hvo | 16 | USGS Hawaiian Volcano Observatory | CLEAR | US federal public domain (USGS volcano monitoring network). |
| goes-satellite | 16 | NOAA NESDIS (GOES-East / GOES-West geostationary satellite imagery) | CLEAR | US federal public data from NOAA's operational weather satellites. |
| czech-highways-ext | 15 | ŘSD — Ředitelství silnic a dálnic (Czech Road and Motorway Directorate, via dopravainformace.cz / NDIC) | CLEAR | Public-agency open-data publisher — same upstream and portal as czech-highways. |
| numazu-snow | 15 | Shizuoka Prefectural Government (Japan) — snow/road live cameras | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| grandlyon | 14 | Métropole de Lyon (Grand Lyon open data) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| ineter | 14 | INETER — Instituto Nicaragüense de Estudios Territoriales (Nicaraguan government geophysical institute) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| belarus-customs | 13 | State Customs Committee of the Republic of Belarus | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| inforoute-alsace | 12 | Collectivité européenne d'Alsace (Inforoute Alsace) | CLEAR | Public-agency open-data publisher — territorial authority's own road-information service. |
| moldova-roads | 12 | Administrația de Stat a Drumurilor (Moldova State Road Administration) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| mlit-yamagata | 12 | Japan MLIT Tohoku Regional Development Bureau (Yamagata) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| czech-highways | 11 | ŘSD — Ředitelství silnic a dálnic (Czech Road and Motorway Directorate, via dopravainformace.cz / NDIC) | CLEAR | Public-agency open-data publisher — national road authority's official traffic-information portal. |
| geonet | 10 | GeoNet / Earth Sciences NZ (GNS Science), New Zealand | CLEAR | Government hazard-monitoring network publishing camera data openly under a CC licence. |
| wsv-waterway | 10 | Wasserstraßen- und Schifffahrtsverwaltung des Bundes (WSV) — German Federal Waterways and Shipping Administration, incl. Federal Institute of Hydrology (BfG) | CLEAR | Public-agency open-data publisher: federal waterway authority lock/river cameras served from its own infrastructure (pss.wsv.de, bafg.de). |
| govje | 10 | Government of Jersey / Jersey Met (States of Jersey) — Jersey Airport runway webcams | CLEAR | Public-agency publisher: the States of Jersey publishes the airport runway webcam views from its public-data infrastructure. |
| ipgp | 9 | IPGP — Institut de Physique du Globe de Paris / OVPF (French public research institute, volcano observatory for Réunion) | CLEAR | Public research institute publishing observatory cameras as open data. |
| nasa-worldview | 8 | NASA Earthdata / Worldview (MODIS Terra imagery) | CLEAR | US federal public data from NASA's open Earth-science imagery service. |
| smithsonian-zoo | 8 | Smithsonian National Zoological Park (Smithsonian Institution) | CLEAR | US government trust institution publishing its public animal cameras on its own .edu institution domain. |
| dwd-webcams | 8 | DWD (Deutscher Wetterdienst, German federal meteorological service) | CLEAR | Public-agency open-data publisher — federal service's official open-data host. |
| cayman-port | 8 | Port Authority of the Cayman Islands — statutory authority owned by the Government of the Cayman Islands | CLEAR | Public-agency publisher: the government port authority publishes its George Town/Cayman Brac port webcams on its own domain. |
| noaa-esrl | 7 | NOAA Global Monitoring Laboratory (formerly ESRL), US Department of Commerce | CLEAR | US federal public data — observatory cameras on NOAA's own .gov host. |
| tallinn | 6 | City of Tallinn (Tallinn Transport Department junction cameras) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| ovsicori | 6 | OVSICORI-UNA — Observatorio Vulcanológico y Sismológico de Costa Rica, Universidad Nacional | CLEAR | Public university observatory network publishing monitoring cameras openly. |
| eso-observatories | 6 | Public research institutes at La Silla/Chajnantor — INAF (REM), ESO/MPG/OSO APEX partnership, Astronomical Institute of the Czech Academy of Sciences | CLEAR | Public research institutes publishing observatory cameras openly; family slug is a misnomer for the actual hosts. |
| task-gdansk | 6 | CI TASK — Centre of Informatics, Tricity Academic Supercomputer and Network (Gdańsk University of Technology consortium) | CLEAR | Public academic network operating a public scenic-camera service for the Tri-City community (kamera.task.gda.pl). |
| usap | 5 | United States Antarctic Program (National Science Foundation) | CLEAR | US federal programme publishing Antarctic station cameras on its official programme site. |
| panama-canal | 5 | Panama Canal Authority (Autoridad del Canal de Panamá, ACP) — autonomous public authority of Panama | CLEAR | Public-agency publisher: the Canal Authority itself publishes the lock webcams (Agua Clara, Cocoli, Gatun) on its own webcams.delcanal.com host. |
| mackinac | 5 | Mackinac Bridge Authority (MBA) — Michigan state authority (with MDOT) | CLEAR | Public-agency publisher: the state bridge authority publishes its five bridge-condition cameras on its own domain as traveller information. |
| eaglecrest | 5 | Eaglecrest Ski Area — City & Borough of Juneau (municipal) | CLEAR | Municipally owned ski area (City & Borough of Juneau) publishing its cameras on the city domain (eaglecams.ci.juneau.ak.us). |
| usace-waterways | 4 | US Army Corps of Engineers, Jacksonville District (SAJ) | CLEAR | US federal public data — lock and dam cameras on a .mil district host. |
| fintraffic | 4 | Fintraffic (Digitraffic, Finland) | CLEAR | WorldEye already integrates this upstream directly in production. |
| ecan | 4 | Environment Canterbury (Canterbury Regional Council), New Zealand | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| noirlab | 4 | Izaña Observatory cameras served by AEMET (Spanish State Meteorological Agency) / IAC | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| sarao | 4 | HartRAO — Hartebeesthoek Radio Astronomy Observatory (SARAO / National Research Foundation, South Africa) | CLEAR | Government research facility publishing observatory cameras openly. |
| saoras | 4 | SAO RAS — Special Astrophysical Observatory of the Russian Academy of Sciences | CLEAR | Public (state academy) research institute publishing observatory cameras openly. |
| himawari | 4 | NICT (National Institute of Information and Communications Technology, Japan) — Himawari satellite imagery service | CLEAR | Japanese national research agency publishing Himawari imagery openly (himawari8-dl.nict.go.jp). |
| antarctic | 3 | Australian Antarctic Division (Australian Government) | CLEAR | Government research network publishing station webcams on its official .gov.au domain. |
| wastateparks | 2 | Washington State Parks and Recreation Commission | CLEAR | State agency publishing park cameras on its own parks.wa.gov domain. |
| cetsp | 2 | CET-SP — Companhia de Engenharia de Tráfego (São Paulo municipal traffic company) | CLEAR | Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census). |
| opgc | 2 | OPGC — Observatoire de Physique du Globe de Clermont-Ferrand (Université Clermont Auvergne / CNRS) | CLEAR | Public university/CNRS observatory publishing cameras openly. |
| nasa-epic | 1 | NASA Goddard Space Flight Center — DSCOVR EPIC | CLEAR | US federal public data from a NASA mission instrument. |
| awi | 1 | AWI — Alfred Wegener Institute, Helmholtz Centre for Polar and Marine Research (German federal research institute) | CLEAR | Public research institute publishing station cameras openly. |
| agpse-waterway | 1 | Administración General de Puertos S.E. (AGP) — Argentine state ports/waterways administration (succeeded in 2025 by ANPYN, Agencia Nacional de Puertos y Navegación) | CLEAR | Public-agency publisher: state waterway authority's hydrography camera on the Río Paraná served from a .gob.ar government host. |
| swisswebcams | 1,542 | Windy-hosted imagery under the swisswebcams.ch portal label | EXCLUDED | Every one of the 1,542 feeds sits on images-webcams.windy.com — Windy catalogue data under another label; the Windy exclusion attaches to the data, not just the family name. |
| itraffic | 673 | SANRAL (South African National Roads Agency Ltd) — i-TRAFFIC freeway management system | EXCLUDED | SANRAL's own i-TRAFFIC terms definitively prohibit redistribution/republication of the site's content without its prior express written consent. |
| nysmesonet | 162 | New York State Mesonet at the University at Albany (SUNY / Research Foundation for SUNY) | EXCLUDED | Operator's own data-access policy definitively prohibits redistribution without prior written consent — not open data despite the public-university operator. |
| nexco-japan | 129 | NEXCO East/Central/West expressway companies — Drive Traffic (drivetraffic.jp) | EXCLUDED | Drive Traffic terms prohibit copying, extraction and any third-party use of site data without explicit authorisation. |
| weatherstem | 103 | WeatherSTEM (Ucompass.com, Tallahassee FL) — commercial weather-station/camera network hosted largely by schools, universities and counties | EXCLUDED | WeatherSTEM's published Media Usage Guidelines prohibit reuse of its camera imagery without written permission and state commercial usage requires a license. |
| balticlivecam | 25 | SIA BalticLiveCam (Latvia) — commercial live-webcam network/operator | EXCLUDED | BalticLiveCam's own Terms of Use §3 prohibit publication, reproduction or transfer of its website/stream content without the rights holder's permission. |
| twipcam | 5,754 | TWIPCAM commercial platform (Taiwan) republishing Taiwan Freeway Bureau cameras | CONDITIONAL (held) | Commercial platform; terms never cleared. 3,909/5,754 feeds on the platform CDN (c01.twipcam.com), 608 on the Freeway Bureau domain — source the Bureau share directly (taiwan-freeway is already CLEAR), not via the platform. |
| osm-webcams | 2,236 | OpenStreetMap-listed webcams — each camera's own operator (mixed municipal/agency and private hosts worldwide) | CONDITIONAL (held) | The listing is OSM data; each image remains its operator's — mixed agency/commercial hosts, needs per-host review. |
| camstreamer | 1,551 | CamStreamer s.r.o. (commercial in-camera streaming app for Axis cameras) — records are third-party owners' YouTube live streams | CONDITIONAL (held) | Commercial streaming platform catalog delivered as YouTube embeds; streams belong to individual camera owners, not CamStreamer or any agency. |
| opensnow | 1,300 | OpenSnow (Cloudnine Weather, Inc.) — commercial subscription ski-weather service aggregating resort DOT/resort cameras | CONDITIONAL (held) | Commercial service; cams are resorts' own feeds republished on cams.opensnow.com under OpenSnow's paid-service terms, not an agency source. |
| alertcalifornia | 1,271 | ALERTCalifornia (UC San Diego / SDG&E partnership) | CONDITIONAL (held) | Held: WorldEye already integrates this network directly at /api/alert-cameras — importing would double-list ~1,259 cameras. |
| airportwebcams | 1,048 | Mixed — US FAA weather cameras (largest single host) plus many independent airport/aeroclub webcam hosts worldwide | CONDITIONAL (held) | Mixed-provenance family labelled by subject, not operator: the FAA share is a minority and the rest is unreviewed small-host airport webcams. |
| opendatahub | 1,015 | Feratel (feratel media technologies AG) — commercial tourism-media platform; minor Panomax remainder | CONDITIONAL (held) | Misleading label: 86.5% of feeds are Feratel content, the same commercial platform held conditional in the registry's feratel family. |
| openwebcamdb | 876 | OpenWebcamDB aggregator — third-party camera operators, predominantly YouTube live-stream channels | CONDITIONAL (held) | Aggregator catalog of other operators' public webcams; no single agency upstream and per-camera rights stay with each operator/streamer. |
| idokep | 668 | Időkép Kft (Időkép Üzleti Szolgáltatások Kft) — private Hungarian commercial weather service | CONDITIONAL (held) | Single host is a commercial weather company's own webcam platform, not Hungary's state meteorological service; commercial platform terms not spot-checked. |
| skaping | 662 | Skaping — French commercial webcam platform/vendor serving cities, resorts and tourist offices | CONDITIONAL (held) | Commercial platform: Skaping sells turnkey webcam installation, maintenance and HD broadcasting to destinations; feeds are served on Skaping's platform hostnames, not by an agency publisher. |
| panomax | 598 | Panomax (commercial panorama platform) | CONDITIONAL (held) | Held: WorldEye integrates Panoramax via its official STAC API in the Street Level layer; harvested image URLs are a different posture and stay held. |
| webcamtaxi | 533 | Webcamtaxi aggregator — third-party YouTube live-stream channels (each stream's own operator) | CONDITIONAL (held) | Aggregator directory, not an operator: 100% of feeds are other parties' YouTube streams, so rights remain with each channel operator. |
| myairportcams | 512 | Mixed — MyAirportCams aggregator (dominant) plus Airservices Australia weather cameras | CONDITIONAL (held) | Mixed family: the dominant host is an independent aggregator's viewer, and only a minority share is the government Airservices Australia network. |
| webcamera-pl | 428 | webcamera.pl (commercial Polish webcam aggregator) | CONDITIONAL (held) | Commercial aggregator platform; terms not spot-checked this stage. |
| feratel | 391 | feratel media technologies AG (Innsbruck, Austria) — commercial tourism-media/panorama camera network | CONDITIONAL (held) | Commercial tourism-media platform; distribution is a paid product sold to destinations, terms grant no harvesting right. |
| avamet | 310 | AVAMET (Associació Valenciana de Meteorologia) and member stations | CONDITIONAL (held) | Volunteer meteorological association aggregating member-owned cameras; not a public agency and no open-data terms spot-checked. |
| fotowebcam | 308 | foto-webcam.eu (private webcam platform/operators) | CONDITIONAL (held) | Commercial/private tourism webcam platform; terms not spot-checked this stage. |
| ipcamlive-global | 269 | IPCamLive (EU-based commercial cloud camera-streaming platform); individual cameras owned by unrelated third parties | CONDITIONAL (held) | Commercial hosting platform; each stream is its owner's content, embeddable only under the owner's IPCamLive plan. |
| iframe-extract | 224 | Mixed — per-record iframe sources (largest single host: City of Vancouver trafficcams.vancouver.ca, 32; rest scattered venue/airfield sites) | CONDITIONAL (held) | Provenance varies per record by construction; no single upstream whose terms can clear the family. |
| yarnet | 221 | SafeRegion platform (YarNet ISP "Safe City" network, Yaroslavl, RU) | CONDITIONAL (held) | Commercial ISP/platform network; terms not spot-checked this stage — held. |
| infoclimat | 209 | Infoclimat (French amateur meteorological association) | CONDITIONAL (held) | Non-profit amateur weather association aggregating member cameras; not Météo-France or another public agency, terms not spot-checked. |
| camsecure | 205 | Camsecure (UK) — commercial webcam hosting/streaming service; cameras owned by its customers (harbours, sailing clubs, venues) | CONDITIONAL (held) | Commercial paid hosting platform (£2.99/mo+ per camera); customer streams carry content protection, no redistribution grant. |
| opentopia | 177 | Opentopia (commercial webcam network, US) | CONDITIONAL (held) | Commercial webcam network (images.opentopia.com) carrying personal/business cameras; terms not cleared. |
| sakura-live-cams | 151 | Sakura Live Cams (YouTube live-cam aggregator, Japan) | CONDITIONAL (held) | YouTube aggregator catalog; the underlying cameras are third parties' official streams, embed/reuse terms not spot-checked this stage. |
| sochi-camera | 150 | Sochi.Camera (commercial webcam project/aggregator, Sochi and Krasnaya Polyana, RU/GE) | CONDITIONAL (held) | Commercial platform aggregating resort/city cameras; terms not spot-checked this stage — held. |
| terrahd | 144 | terra-hd.de (commercial live-webcam platform) | CONDITIONAL (held) | Commercial hosting platform; terms not spot-checked this stage. |
| climaaovivo | 139 | Clima ao Vivo (commercial Brazilian webcam platform; cameras owned by partner hotels, ISPs and businesses) | CONDITIONAL (held) | Commercial platform/partner network; terms not spot-checked this stage — held. |
| vedetta | 136 | Vedetta.org (commercial Italian webcam aggregator) | CONDITIONAL (held) | Commercial aggregator platform; terms not spot-checked this stage. |
| mudik | 126 | Indonesian toll-road concessionaires, aggregated via the Ministry of Public Works mudik portal | CONDITIONAL (held) | Mixed commercial/state toll-operator hosts behind an aggregator portal; held until sourced directly from the operators/agency. |
| forecastweather | 120 | forecastweather.gr — Greek commercial weather/webcam portal (private meteo site, not the National Observatory of Athens/HNMS) | CONDITIONAL (held) | Commercial/private webcam aggregator; no agency open-data licence identified, terms not cleared. |
| kenyaaeroclub | 111 | KenyaWebcam / KenyaWebcams (commercial tourism webcam sites, despite the family slug) | CONDITIONAL (held) | Commercial aggregator/portal; no public-agency upstream — held. |
| ipcamlive | 109 | IPCamLive (commercial cloud camera-streaming platform); cameras owned by unrelated third parties (inns, venues, attractions) | CONDITIONAL (held) | Commercial hosting platform; terms not cleared for harvesting — same posture as ipcamlive-global. |
| wetmet | 99 | WetMet (commercial weather-camera network) | CONDITIONAL (held) | Commercial camera network/API; terms not spot-checked this stage. |
| explore-org | 95 | Explore.org (private philanthropic nature-cam platform, Annenberg Foundation) | CONDITIONAL (held) | Non-profit but private platform network distributed via YouTube; not a public agency and terms not spot-checked this stage — held. |
| tv-singles | 79 | Mixed singletons — scattered individual sites (disasterwatch-iotp.com.au, Belgian/German/Australian venue and club sites) | CONDITIONAL (held) | Grab-bag of unrelated one-off sources; no single upstream to clear, provenance varies per record. |
| cam-aero | 79 | Cam-Aero (cam-aero.eu) — French commercial airfield webcam platform/network | CONDITIONAL (held) | Commercial platform aggregating aeroclub/airfield cameras; airfields do not publish via it as open data, terms not cleared. |
| webcam-autoroute | 78 | webcam-autoroute.eu portal (mixed; minority Bison Futé / DIR feeds) | CONDITIONAL (held) | Mixed provenance: 69/78 on a commercial portal host, only 7 on bison-fute.gouv.fr; held pending direct sourcing from the DIRs. |
| small-cams-2 | 77 | Mixed — Ski Utah (Utah Ski & Snowboard Association) resort-cam page (64) and USGS/Coastal-Marine CMGP CoastCam S3 (13) | CONDITIONAL (held) | Family mixes a tourism-association aggregator of resort cams with a federal research network; the Ski Utah majority is not agency open data. |
| hdontap | 70 | HDOnTap (Del Mar, CA) — commercial live-webcam streaming network/service | CONDITIONAL (held) | Commercial streaming provider selling paid hosting plans; camera feeds are client content delivered through HDOnTap's network, no harvesting grant. |
| epic-ski | 66 | Vail Resorts' Epic pass resorts (Beaver Creek, Heavenly, Northstar et al.), streams hosted by BrownRice Internet | CONDITIONAL (held) | Commercial resort-operator cameras delivered via a commercial hosting provider (player.brownrice.com); no open licence. |
| kukaj-sk | 65 | Kukaj.sk (Profi-Net, commercial Slovak webcam aggregator) | CONDITIONAL (held) | Commercial aggregator platform; terms not spot-checked this stage. |
| itic | 65 | iTIC Foundation (Intelligent Traffic Information Center Foundation, Thailand) | CONDITIONAL (held) | Non-profit aggregator of government CCTV; developer/data access is by contact, terms not spot-checked this stage. |
| rta-telecom | 65 | M-TEN / RTA telecom operator, Mezhdurechensk (Kemerovo Oblast, RU) | CONDITIONAL (held) | Commercial telecom/ISP city-camera network; terms not spot-checked this stage — held. |
| livespotting | 65 | Livespotting (commercial German webcam platform) | CONDITIONAL (held) | Commercial platform CDN (cdn.livespotting.com); terms not cleared. |
| nadmorski24 | 63 | Nadmorski24 / TK Chopin (private regional Pomeranian portal) | CONDITIONAL (held) | Commercial regional media portal; terms not spot-checked this stage. |
| prague-tsk | 61 | Technická správa komunikací hl. m. Prahy (TSK, City of Prague road administration) — as republished by ÚAMK | CONDITIONAL (held) | Records point at a third-party motoring-club portal rather than TSK itself; held pending direct sourcing. |
| aopa-nz | 59 | AOPA NZ (Aircraft Owners and Pilots Association New Zealand) and member aeroclubs | CONDITIONAL (held) | Member-association aggregator of its own and aeroclub cameras; not a public agency, terms not spot-checked this stage. |
| hispacams | 48 | Hispacams (commercial webcam aggregator, Spain) | CONDITIONAL (held) | Commercial aggregator of town/beach cameras; terms not spot-checked this stage. |
| pocono-cams | 47 | WetMet (api.wetmet.net) — commercial weather-camera network carrying Pocono-area private/venue cameras | CONDITIONAL (held) | Commercial cam network platform; samples are private properties, lodges and venues, not a public agency. |
| astrakhan | 46 | Astrakhan city DVR camera service on astrakhan.ru (local provider/city portal, operator not verified as a public agency) | CONDITIONAL (held) | Provenance ambiguous — public street views, but no agency domain or primary source establishing a public operator; held. |
| resortcams | 44 | ResortCams.com — commercial US resort/tourism webcam network | CONDITIONAL (held) | Commercial tourism webcam network; resort feeds republished on its own streaming CDN, terms not cleared. |
| oceancity | 44 | IPCamLive platform — Ocean City, MD boardwalk/hotel venue cameras | CONDITIONAL (held) | Commercial IPCamLive hosting of venue-owned cams; not the Town of Ocean City publishing directly. |
| mazury24 | 40 | Mazury24 (private regional Masuria portal) | CONDITIONAL (held) | Commercial regional media portal; terms not spot-checked this stage. |
| livecameras-gr | 40 | livecameras.gr (commercial Greek webcam aggregator) | CONDITIONAL (held) | Commercial aggregator platform; terms not spot-checked this stage. |
| africam | 40 | Africam (commercial safari/wildlife live-cam platform; lodges and reserves in ZA/BW/KE) | CONDITIONAL (held) | Commercial platform network; terms not spot-checked this stage — held. |
| avistabaleares | 38 | aVista, a project of IB-Red (private Balearic telecom operator) | CONDITIONAL (held) | Private commercial camera network (operator's own site: "avista es un proyecto de ib-red"); collaboration with IB3/112 does not make it a government publisher. |
| mauritius-traffic | 38 | Mauritius Telecom (my.t Traffic Watch) | CONDITIONAL (held) | Commercial telecom platform; its own Traffic Watch terms govern the feeds — held. |
| amsbih | 33 | AMSBiH (Auto-Moto Savez Bosne i Hercegovine, motoring association) | CONDITIONAL (held) | Motoring association, not a public road agency; terms not spot-checked this stage. |
| hdontap-wildlife | 33 | HDOnTap — commercial streaming network carrying zoo/aquarium/refuge client cameras | CONDITIONAL (held) | Same commercial HDOnTap platform as hdontap; wildlife-venue branding does not change the platform posture. |
| wowza-streamlock | 32 | Mixed operators streaming through Wowza Streaming Engine with StreamLock SSL (CDN endpoints, not a publisher) | CONDITIONAL (held) | StreamLock hostnames identify only the streaming technology; underlying operators vary per record (PL bridges, a US university) and are unverified. |
| freecam-ro | 32 | FreeCam.ro / Digi Live (RCS & RDS) — Romanian commercial webcam portal on a telecom operator's network | CONDITIONAL (held) | Commercial portal/telecom-hosted cams (digilive.rcs-rds.ro); aeroclub and town cameras carried commercially, terms not cleared. |
| camscape-curated | 31 | CamScape — curated webcam aggregator (mixed YouTube, rtsp.me and direct feeds) | CONDITIONAL (held) | Aggregator curation of third-party feeds; provenance and rights vary per record. |
| savannah-cams | 31 | Unidentified operator streaming Savannah/Charleston-area cams via Wowza StreamLock endpoints | CONDITIONAL (held) | StreamLock hosts identify only the streaming stack; the publishing operator is unverified and samples include non-Savannah municipal-style views (Isle of Palms, Summerville). |
| tangerang | 27 | Tangerang (Indonesia) Dishub / ATCS — operator unverified from census | CONDITIONAL (held) | Dominant feed host is unrecorded in the census; upstream not verified from a primary source this stage. |
| panocloud-ski | 25 | PanoCloud — commercial panoramic webcam hosting platform used by Alpine/Finnish ski areas | CONDITIONAL (held) | Commercial webcam hosting platform (per-resort *.panocloud.webcam subdomains); terms not cleared. |
| city-webcams | 25 | Mixed platform embeds (BrownRice / YouTube / IPCamLive) | CONDITIONAL (held) | Mixed-provenance embed set; no single upstream to clear. |
| stringmeteo | 24 | StringMeteo (private Bulgarian weather site/community) | CONDITIONAL (held) | Private weather portal aggregating village cameras; not NIMH or another Bulgarian agency, terms not spot-checked. |
| thesnowcloud | 24 | SnowCloud Services LLC (Juneau, Alaska) — commercial ISP/webcam hosting provider | CONDITIONAL (held) | Commercial hosting/ISP network (AS395475, thesnowcloud.com) carrying Juneau-area client cameras; not an agency source. |
| small-cams | 24 | Mixed small set — Mt. Bachelor resort API (14), Colonial Williamsburg Foundation media server (4), BrownRice-hosted cams (4), IPCamLive (1) | CONDITIONAL (held) | Mixed commercial-resort, foundation and platform sources; no single upstream to clear. |
| nsw-coastal | 24 | CoastalComs — commercial coastal/bar camera network (widget.coastalcoms.com), cameras at NSW coastal bars and waterways | CONDITIONAL (held) | Commercial coastal-camera platform; not TfNSW/Maritime open data despite the NSW geography, terms not cleared. |
| satap-sitaf | 23 | SATAP and SITAF SpA (ASTM Group motorway concessionaires, A4/A21 and A32/T4 Fréjus) | CONDITIONAL (held) | Private concessionaires, not state-owned operators; redistribution terms not spot-checked — held per the concessionaire rule. |
| meter-ac | 23 | meter.ac — Bulgarian private weather-station/webcam network | CONDITIONAL (held) | Private meteo/webcam service; not the Bulgarian national met service (NIMH), terms not cleared. |
| wolfnet | 23 | Wolfnet (kamery.wolfnet.cz) — Czech regional ISP/webcam hosting service | CONDITIONAL (held) | Commercial ISP-hosted town/ski cameras; hosting provider is not the camera publisher and no open licence applies. |
| florida-beach-cams | 23 | IPCamLive platform (20) and YouTube (3) — Florida beach venue/municipal-view cameras | CONDITIONAL (held) | Predominantly commercial IPCamLive hosting; venue-owned beach cams, same posture as other ipcamlive families. |
| gray-tv | 22 | Gray Media Group (Gray Television) affiliate stations — US commercial TV broadcasters | CONDITIONAL (held) | TV-station cams on the broadcaster's own content CDN (webpubcontent.gray.tv); commercial media property, terms not cleared. |
| sweden-ski | 20 | Swedish ski-resort operators (Branäsgruppen and individual resorts) | CONDITIONAL (held) | Commercial ski-resort cameras on resort-group CDNs; no agency or open-data source. |
| kg-camera | 20 | ElCat Ltd (webcam.elcat.kg) — Kyrgyzstan's largest private ISP/telecom operator | CONDITIONAL (held) | Commercial ISP's public webcam portal; ElCat is a private telecom company, not a government open-data publisher. |
| seejh | 20 | See Jackson Hole (seejh.com) — commercial tourism webcam network for Jackson Hole, WY, incl. Jackson Hole Mountain Resort cams | CONDITIONAL (held) | Commercial tourism-media network mixing its own, resort (Roundshot) and YouTube feeds; terms not cleared. |
| stv | 20 | STV — Sapporo Television Broadcasting (stv.jp), commercial Japanese TV station (NTV affiliate) | CONDITIONAL (held) | TV-station cams on the broadcaster's own site; commercial media property. |
| kahramanmaras | 19 | Kahramanmaraş Büyükşehir Belediyesi (Metropolitan Municipality) Traffic Management Centre — unverified for this feed | CONDITIONAL (held) | Ambiguous: municipal operation is real, but this feed sits on a bare IP with no operator portal or terms tying it to the municipality; held pending direct sourcing. |
| hanshin-expressway | 17 | Hanshin Expressway Co., Ltd. (Japan) | CONDITIONAL (held) | Privatised expressway operator; public pages, camera-specific terms not spot-checked this stage. |
| xcom-aktau | 17 | XCom (Kazakh ISP, Aktau) | CONDITIONAL (held) | Commercial ISP city-camera network; terms not spot-checked this stage — held. |
| webcamsdemexico | 17 | Webcams de México (commercial portal) | CONDITIONAL (held) | Commercial webcam portal; terms not cleared. |
| tabi-cam | 16 | Tabi-Cam (YouTube live-cam aggregator) | CONDITIONAL (held) | YouTube aggregator catalog; provenance varies per record, terms not spot-checked this stage. |
| ski-brownrice | 16 | Angel Fire Resort (NM) cameras hosted by BrownRice Internet (commercial webcam hosting) | CONDITIONAL (held) | Commercial resort cameras on a commercial host (brownrice.com); no open licence. |
| maunakea-observatories | 15 | Maunakea observatories — Gemini North (NSF NOIRLab), Subaru Telescope (NAOJ), W. M. Keck Observatory, East Asian Observatory | CONDITIONAL (held) | Mixed family: majority public research institutes, but Keck is a private non-profit observatory — held until the split is sourced per-observatory. |
| pictimo | 15 | Mixed curated set (Roundshot resort cams, hazcams.com, Skaping, Opentopia singletons) | CONDITIONAL (held) | No single upstream — a hand-picked mix across at least four unrelated platforms; cannot clear as a family. |
| isle-of-man | 15 | Mixed — Isle of Man Government webcams (images.gov.im, 10) plus IPCamLive (3) and commercial singletons (Bushys, S3) | CONDITIONAL (held) | Majority is a public agency (IoM Government, whose content is published under the Open Government Licence), but the family is contaminated with platform/commercial records — held until split. |
| oceancity-com | 15 | OceanCity.com — commercial Ocean City, MD tourism portal, cameras via IPCamLive | CONDITIONAL (held) | Commercial tourism-media portal's cam network (hotel/boardwalk venues) on IPCamLive; terms not cleared. |
| bihamk | 14 | BIHAMK (Bosanskohercegovački auto-moto klub, motoring club) | CONDITIONAL (held) | Motoring club, not a public road agency; terms not spot-checked this stage. |
| hakai | 13 | Hakai Institute (Tula Foundation), Calvert Island, British Columbia | CONDITIONAL (held) | Private-foundation research institute, not a public agency or public university — no open-data terms verified, held. |
| intersaar-saarland | 13 | InterSaar (private Saarland regional ISP/webcam host) | CONDITIONAL (held) | Private regional hosting/aggregator; not the Saarland road authority, terms not spot-checked. |
| railstream | 13 | RailStream, LLC — commercial subscription railfan camera network (US) | CONDITIONAL (held) | Commercial membership network ($8.95–$12.95/mo tiers); its cameras are its paid product, no redistribution grant. |
| paesaggidigitali | 12 | Paesaggi Digitali (private Italian tourism-webcam project) | CONDITIONAL (held) | Commercial/tourism webcam operator; terms not spot-checked this stage. |
| airlive | 12 | AIRLIVE — commercial airport live-stream brand/channel (YouTube-based airport cam aggregator) | CONDITIONAL (held) | Commercial YouTube-embed airport-cam catalog; feeds are airport/spotter streams republished under the AIRLIVE brand. |
| cbsdenver | 12 | CBS News and Stations / KCNC CBS Colorado (Denver) — commercial TV broadcaster (Paramount) | CONDITIONAL (held) | TV-station cams on CBS Local CDNs (radar.cbslocal.com, static.cbslocal.com); commercial media property. |
| cumbernauld-airport | 12 | Cumbernauld Airport (UK) weather-cam site (egpgmet.net) — airport operator's own MET camera pages | CONDITIONAL (held) | Single commercial general-aviation airport operator; public web page but no open-data licence, terms not spot-checked to a clearance standard. |
| surf-cams | 12 | 805 Webcams (805webcams.com) — commercial California Central Coast webcam network | CONDITIONAL (held) | Commercial surf/beach cam network operator; venue cams carried commercially, terms not cleared. |
| cairngorm | 11 | Cairngorm Mountain (ski-resort operator) | CONDITIONAL (held) | Commercial resort operator's own cameras; not a road or meteorological agency publishing open data, terms not spot-checked. |
| vvo-dresden | 11 | VVO — Verkehrsverbund Oberelbe (Upper Elbe transport association, Dresden) | CONDITIONAL (held) | Ambiguous: a public-purpose transport association, but the cameras are Dresden road views republished on the association's site with no open-data terms verified; held pending direct sourcing from the city/DVB. |
| varitech-patagonia | 11 | Cerro Catedral resort cameras via Varitech (AR) | CONDITIONAL (held) | Commercial ski-resort cameras on a vendor host; terms not cleared. |
| namibia-webcams | 10 | NamSearch (commercial Namibian web portal; lodge cameras) | CONDITIONAL (held) | Commercial portal aggregating private lodge webcams; terms not spot-checked this stage — held. |
| fox13tampa | 10 | FOX 13 Tampa Bay (WTVT, Fox Television Stations) — commercial TV broadcaster | CONDITIONAL (held) | TV-station cams on Fox's media CDN (media.foxtv.com); commercial media property. |
| bkom-brno | 9 | Brněnské komunikace a.s. (BKOM, Brno municipal roads company) | CONDITIONAL (held) | Ambiguous: a city company (a.s.) operating Brno's traffic cameras, but publishing on its own commercial-style domain with no agency open-data terms verified; held pending direct confirmation. |
| uab-bg | 9 | UAB — Union of Bulgarian Motorists (Съюз на българските автомобилисти) | CONDITIONAL (held) | Motoring association republishing highway/border cameras; not API (Bulgaria's Road Infrastructure Agency), terms not spot-checked. |
| bird-cams | 9 | PixCams (commercial wildlife streaming operator) | CONDITIONAL (held) | Commercial streaming operator via YouTube embeds; terms not spot-checked this stage — held. |
| novosibirsk | 9 | Novo-Sibirsk.ru city portal webcams (Novosibirsk, RU) | CONDITIONAL (held) | Commercial city-portal camera network; terms not spot-checked this stage — held. |
| nl-port-webcams | 9 | Mixed Dutch port cams — Wowza StreamLock hosts, YouTube and webcam-rotterdam.nl (port-city venue/aggregator feeds) | CONDITIONAL (held) | No single agency publisher; Rotterdam/Harlingen views arrive via commercial stream hosts and aggregators, not the Port of Rotterdam Authority directly. |
| beachcam-il | 9 | IPCamLive platform — Israeli beach venue cameras | CONDITIONAL (held) | Commercial IPCamLive hosting of beach-operator cams; no agency publisher (not Israel's Ministry of Environmental Protection beach service). |
| vedrid | 9 | vedrid.fo — Faroe Islands weather camera service, believed Landsverk (Faroese Public Works Authority) weather-station network; operator not confirmed from the domain | CONDITIONAL (held) | Likely a public-authority weather service (Landsverk runs the Faroes' weather measurements and publishes them publicly), but the vedrid.fo operator identity was not definitively verified — ambiguous, so held. |
| ibericam | 8 | Ibericam (commercial Spanish webcam-hosting service) | CONDITIONAL (held) | Commercial hosting platform for hotel/tourism cameras; terms not spot-checked this stage. |
| geilo-cams | 8 | Geilo ski-area camera operators via CID/Infotec hosting (Norway) | CONDITIONAL (held) | Commercial ski/tourism cameras on private hosting; not Vegvesen or another agency — the registry's cleared Norwegian operator is the Public Roads Administration, which this is not. |
| perisher | 8 | Perisher Ski Resort (Vail Resorts), Australia | CONDITIONAL (held) | Commercial ski-resort operator; public snow cams, terms not spot-checked this stage. |
| starvisor | 8 | StarVisor (starvisor.net) — Russian sky/all-sky camera network (astronomy/aurora monitoring service) | CONDITIONAL (held) | Private network/service publishing participants' sky cameras; not a public agency open-data source, terms not cleared. |
| livecameras-ru | 7 | LiveCameras aggregator (RU), republishing VK Video / Rutube streams | CONDITIONAL (held) | Aggregator republishing third-party platform embeds; per-camera provenance unverified — held. |
| worldcam | 7 | WorldCam.pl — Polish commercial webcam aggregator portal | CONDITIONAL (held) | Commercial aggregator of third-party (mostly Albanian/Austrian/Armenian venue) cams; terms not cleared. |
| naodos-gr | 6 | Attiki Odos (Attikes Diadromes SA, Athens motorway concessionaire) via IPCamLive | CONDITIONAL (held) | Private motorway concessionaire, and the feed host is the commercial IPCamLive platform the registry already holds; held on both grounds. |
| cipolletti | 6 | Cipolletti (Río Negro, AR) city cameras, channel operator unverified | CONDITIONAL (held) | YouTube-embed family; upstream channel/operator not verified as a public agency — held. |
| cbs58 | 6 | CBS 58 Milwaukee (Weigel Broadcasting) — commercial TV station | CONDITIONAL (held) | TV-station cams on the station owner's CDN (newscdn2.weigelbroadcasting.com); commercial media property. |
| wreg | 6 | WREG News Channel 3 Memphis (Nexstar) — commercial TV station | CONDITIONAL (held) | TV-station cams on the station's cam domain (wreglivecams.com); commercial media property. |
| zurich-airport | 6 | Flughafen Zürich AG — Zurich Airport's listed commercial operator | CONDITIONAL (held) | Airport-operator cams on the operator's own domain; Flughafen Zürich AG is a publicly traded company, not a public agency publishing open data. |
| livebeaches-yt | 5 | LiveBeaches — YouTube beach-cam aggregator channel; cameras owned by beach venues | CONDITIONAL (held) | YouTube-embed catalog of third-party beach cams; no upstream licence beyond YouTube embed terms. |
| kimt | 5 | KIMT News 3 (Rochester, MN; Allen Media Broadcasting) — commercial TV station | CONDITIONAL (held) | TV-station cams on the station's own server (ftp2.kimt.com); commercial media property. |
| wlbt | 5 | WLBT Jackson, MS (Gray Media Group) — commercial TV station | CONDITIONAL (held) | TV-station cams streamed via the station's Wowza/StreamGuys endpoint; commercial media property. |
| portguide | 5 | Unidentified YouTube port-cam streams (Arrecife, Brest, La Spezia et al.) | CONDITIONAL (held) | YouTube-embed catalog subset; channel operator and camera ownership unverified. |
| chinapeak | 5 | China Peak Mountain Resort via IPCamLive | CONDITIONAL (held) | Commercial resort cameras on the IPCamLive platform; terms not cleared. |
| villa-gesell | 4 | Villa Gesell beach/pier webcams on gesell.com.ar (municipal tourism portal, operator not verified as the municipality itself) | CONDITIONAL (held) | Provenance ambiguous — public beach views, but not on an agency domain; held pending operator verification. |
| king5 | 4 | KING 5 Seattle (TEGNA) — commercial TV station; records partly re-host third-party cams (NPS, University of Washington) | CONDITIONAL (held) | TV-station cam page; mixed provenance (2 TEGNA CDN, 1 nps.gov, 1 washington.edu) prevents a family clearance. |
| aeropuerto-caracas | 4 | Aeropuerto Caracas (Venezuela) — private general-aviation airport operator | CONDITIONAL (held) | Private airport operator's own cams; no open-data licence, Venezuelan public-agency status not established. |
| caribbean-ipcamlive | 4 | IPCamLive platform — beach/resort venue cameras in Puerto Rico and the British Virgin Islands | CONDITIONAL (held) | Commercial IPCamLive hosting; venue-owned beach cams, same posture as ipcamlive families. |
| fws-wildlife | 3 | Friends of Blackwater NWR (nonprofit support group) at the US Fish & Wildlife Service's Blackwater National Wildlife Refuge, delivered via HDOnTap | CONDITIONAL (held) | Cameras are maintained by a nonprofit friends group and delivered through a commercial streaming platform, not published directly by the federal agency — held. |
| ukraine-webcams | 3 | Bukovel resort (private ski-resort operator) via Camflg streaming | CONDITIONAL (held) | Commercial resort cameras on a commercial streaming host; no agency upstream, terms not spot-checked. |
| whsv | 3 | WHSV Harrisonburg, VA (Gray Media Group) — commercial TV station | CONDITIONAL (held) | TV-station cams served via virginianewslink.com; commercial media property. |
| hillhead | 3 | Hill Head Sailing Club (UK) — private members' sailing club cameras | CONDITIONAL (held) | Private club's own cams on its site (content1.hillheadsc.org.uk); no open licence, not an agency. |
| dolnimorava | 3 | HolidayInfo.cz (exports.holidayinfo.cz) — Czech commercial ski/tourism information portal (Chatar/Cham/O2-era ski info service) | CONDITIONAL (held) | Commercial tourism portal's resort cameras for Dolní Morava; terms not cleared. |
| jp-airports | 2 | Mixed — WeatherNews Inc. (wni.co.jp, commercial weather company) cam at Izumo and Misawa Airport's own site cam | CONDITIONAL (held) | Two unrelated sources, one a commercial weather vendor; no family-level clearance possible. |
| kielcanal | 2 | Kiel Canal (NOK) locks at Brunsbüttel and Holtenau — waterway operated by Germany's federal WSV, but feeds delivered via Livespotting (commercial webcam platform) | CONDITIONAL (held) | True operator is a federal agency, but the records' feeds sit on a commercial platform's CDN (cdn.livespotting.com), not on the WSV — held until sourced from the WSV directly. |
| adelaide | 2 | Unverified (generic S3 host; samples suggest City of Adelaide views) | CONDITIONAL (held) | Operator not verifiable from a primary source — feed host is a bare S3 bucket. |
| swellmagnet | 2 | Swell Magnet (commercial surf-cam channel, YouTube) | CONDITIONAL (held) | YouTube-embed surf cams from a commercial channel; terms not cleared. |
| sba-bg | 1 | UAB — Union of Bulgarian Motorists (same CDN as uab-bg) | CONDITIONAL (held) | Same motoring-association upstream and host as uab-bg; not a public road agency. |
| hatyai-climate | 1 | Hat Yai City Climate project (hatyaicityclimate.org) — municipal/ACCCRN city-resilience partnership, Thailand | CONDITIONAL (held) | Project/partnership site on a non-government domain; camera ownership and terms not verified from a primary agency source this stage. |
| singapore-weather | 1 | SingaporeWeather.info (private weather-cam site, Singapore) | CONDITIONAL (held) | Private single-camera site; not the Singapore LTA/NEA/MSS, terms not spot-checked this stage. |
| telpin-argentina | 1 | Telpin (Cooperativa Telefónica de Pinamar) via estadodelmar.com.ar | CONDITIONAL (held) | Commercial/cooperative telecom webcam service; terms not spot-checked this stage — held. |
| middle-east-yt | 1 | Unidentified YouTube live stream of the Western Wall (Kotel), Jerusalem | CONDITIONAL (held) | Single YouTube embed of unknown operator; provenance and terms unverified. |
| pacific-ipcamlive | 1 | IPCamLive platform — Lomani Island Resort (Fiji) camera | CONDITIONAL (held) | Single resort camera on the commercial IPCamLive platform; no licence clearance. |
| falklands | 1 | Sure Falkland Islands (sure.co.fk) — commercial telecom operator's Stanley jetty webcam | CONDITIONAL (held) | Single cam hosted by a commercial telecom (Sure, part of Batelco Group), not the Falkland Islands Government; terms not cleared. |
| atv | 1 | ATV — Aomori Television Broadcasting (atv.jp), commercial Japanese TV station | CONDITIONAL (held) | Single TV-station HQ cam (Mutsu Bay view); commercial media property. |
| railwebcams | 1 | Air Zermatt (air-zermatt.ch) — commercial Swiss helicopter/rescue company's site carrying a Zermatt station view | CONDITIONAL (held) | Single record on a commercial operator's domain; the railway (MGB/Gornergrat) does not publish this feed as open data here. |
| nbc-montana | 1 | NBC Montana (commercial TV station) | CONDITIONAL (held) | TV-station camera; commercial media property. |
| uludaginfo | 1 | Uludağ info portal (TR ski area) | CONDITIONAL (held) | Commercial/tourism portal camera; terms not cleared. |
| trafficengland | 2,372 | National Highways via trafficengland.com portal | DEFERRED (sibling program) | NOT ADJUDICATED IN THIS BRANCH — the parallel integrations program (feature/camera-integrations-oct22) owns this source. |
| trafficwatch-ni | 127 | TrafficWatch NI (DfI Northern Ireland) | DEFERRED (sibling program) | NOT ADJUDICATED IN THIS BRANCH — the parallel integrations program owns this source. |
| hak | 63 | HAK (Croatian Auto Club) | DEFERRED (sibling program) | NOT ADJUDICATED IN THIS BRANCH — the parallel integrations program owns this source. |

## Gates

All gates run 2026-10-22 after the import write (the VM platform fault
that blocked the verdict pass's own gates had cleared — fork/write
repro and git object writes verified healthy before the sync passes
ran):

- Sync (dry-run passes B–D, then `--write --allow-growth`): **PASS** —
  status ok, reconciliation exact, licensing gates intact (0
  verified-new Windy records); harvest-health after the write: 38,799
  records, 38,778 with an alive probe verdict on file.
- `npx tsc --noEmit`: **PASS** (clean).
- Full vitest suite: 3,016 passed, 3 failed, 23 skipped (296 files).
  Two failures are the known baselines (`src/lib/oi/context.test.ts`,
  `src/app/api/cctv/route.test.ts`). The third —
  `src/lib/enterprise/rights.test.ts`, "excludes registry-conditional
  families" — was a stale fixture caused by this pass itself:
  `26f9a92` moved nexco-japan from conditional to EXCLUDED, and the
  test still asserted the old status. Repaired in `2c4c1db` (family
  moved to the excluded list; behaviour unchanged — nexco-japan was
  and remains ineligible) and re-run: 10/10 PASS. No other failures.
- Production build (`next build`): **PASS** — compiled successfully,
  503/503 static pages generated, exit 0.
