/**
 * Camera expansion — OpenCCTV source-family licensing registry.
 *
 * OpenCCTV republishes cameras from ~380 upstream "families" (its `source`
 * field). The Stage A audit (~/workspace/worldeye-camera-expansion/AUDIT.md
 * §3.4) classified the OpenCCTV families as a class CONDITIONAL: usable only
 * with a per-family spot-check of the upstream's terms, preferring direct
 * agency integration where a module already exists. This registry is that
 * spot-check, recorded.
 *
 * A family is CLEAR only when one of these holds, verified from the Argus
 * family census (dominant feed hosts) and/or the live OpenCCTV records:
 *   (a) the upstream is a public agency — national/state/municipal road or
 *       transport authority, meteorological service, or government network —
 *       publishing traveller-information cameras as open data; or
 *   (b) WorldEye already integrates the same upstream directly in
 *       production (the module named in the basis is the precedent).
 *
 * Everything not listed here defaults to CONDITIONAL (held out of the
 * harvest until someone spot-checks it) — never silently enabled. Families
 * whose data terms are known NOT to clear are EXCLUDED and can never be
 * enabled by flag: the Windy catalog families (Windy's terms grant no
 * commercial redistribution of harvested feed URLs — audit §3.4) and the
 * commercial networks named below.
 */

export type FamilyVerdict = 'clear' | 'conditional' | 'excluded';

export interface FamilyInfo {
  verdict: FamilyVerdict;
  /** Who actually operates the cameras / publishes the feed. */
  upstream: string;
  /** Why this verdict — the spot-check evidence, in one line. */
  basis: string;
}

const clear = (upstream: string, basis: string): FamilyInfo => ({ verdict: 'clear', upstream, basis });
const conditional = (upstream: string, basis: string): FamilyInfo => ({ verdict: 'conditional', upstream, basis });
const excluded = (upstream: string, basis: string): FamilyInfo => ({ verdict: 'excluded', upstream, basis });

const AGENCY = 'Public-agency open-data publisher (dominant feed hosts are agency domains in the Argus census).';
const ALREADY = 'WorldEye already integrates this upstream directly in production.';

export const FAMILY_REGISTRY: Record<string, FamilyInfo> = {
  /* ── United States & Canada: DOT / 511 systems ─────────────────────── */
  state511: clear('US state 511 traveller-information systems', 'Feeds sit on IBI-511 and state 511 portals; WorldEye runs IBI-511 modules (florida/georgia/northcarolina/louisiana) in production.'),
  arcgis_cams: clear('Agency ArcGIS publishers (Iowa DOT, Oregon TripCheck, TravelMidwest dominate)', AGENCY),
  castlerock: clear('State DOT 511/CARS systems (MnDOT, Indiana TrafficWise, CARS program hosts dominate)', 'Family name is the 511-systems vendor; the feed hosts are the DOTs themselves.'),
  virginia: clear('Virginia DOT (VDOT)', AGENCY),
  ny511: clear('New York 511 (NYSDOT)', AGENCY),
  txdot: clear('Texas DOT', ALREADY),
  caltrans: clear('Caltrans', ALREADY),
  wsdot: clear('Washington State DOT', ALREADY),
  ontario: clear('Ontario 511 (MTO)', ALREADY),
  alberta: clear('Alberta 511', ALREADY),
  toronto: clear('City of Toronto open data', ALREADY),
  ottawa: clear('City of Ottawa', ALREADY),
  'faa-weathercams': clear('US FAA weather cameras', 'US federal public data. Records are individually gated: the harvest rejects non-HTTP feed URLs (Argus carries this family as pseudo-URLs), so only records with real image endpoints can pass.'),
  phenocam: clear('PhenoCam network (US academic/government ecological monitoring)', 'Public research network publishing imagery openly for reuse.'),
  'usgs-ashcam': clear('USGS', 'US federal public domain.'),
  nps: clear('US National Park Service', 'US federal public domain.'),
  'ndbc-buoycam': clear('NOAA National Data Buoy Center', 'US federal public domain.'),
  mdchart: clear('Maryland DOT CHART', AGENCY),
  scdot: clear('South Carolina DOT', AGENCY),
  midot: clear('Michigan DOT (MiDrive)', ALREADY),
  tripcheck: clear('Oregon DOT TripCheck', ALREADY),
  cotrip: clear('Colorado DOT (COtrip)', AGENCY),
  ohgo: clear('Ohio DOT (OHGO)', AGENCY),
  sddot: clear('South Dakota DOT', AGENCY),
  ridot: clear('Rhode Island DOT', AGENCY),
  nmroads: clear('New Mexico DOT (NMRoads)', AGENCY),
  wv511: clear('West Virginia 511', AGENCY),
  oktraffic: clear('Oklahoma DOT', AGENCY),
  kcscout: clear('KC Scout (MoDOT/KDOT bi-state programme)', AGENCY),
  netravel: clear('New England 511', AGENCY),
  newengland: clear('New England 511', AGENCY),
  travelmidwest: clear('TravelMidwest (Illinois DOT gateway)', ALREADY),
  'portland-or': clear('City of Portland (PBOT)', AGENCY),
  sdot: clear('Seattle DOT', AGENCY),
  kingcounty: clear('King County', AGENCY),
  calgary: clear('City of Calgary', AGENCY),
  vancouver: clear('City of Vancouver', AGENCY),
  newbrunswick: clear('New Brunswick (511/gov)', AGENCY),
  novascotia: clear('Nova Scotia (511/gov)', AGENCY),
  saskatchewan: clear('Saskatchewan highway hotline', AGENCY),
  manitoba: clear('Manitoba 511', AGENCY),
  newfoundland: clear('Newfoundland & Labrador roads', AGENCY),
  pei: clear('Prince Edward Island (511/gov)', AGENCY),
  yukon: clear('Yukon 511', AGENCY),
  nwt: clear('Northwest Territories highways', AGENCY),

  /* ── Europe: national road authorities ─────────────────────────────── */
  dgt: clear('Spain DGT', ALREADY),
  trafikverket: clear('Swedish Transport Administration', ALREADY),
  asfinag: clear('ASFINAG (Austrian motorway operator)', ALREADY),
  autostrade: clear('Autostrade per l\u2019Italia', ALREADY),
  tfl: clear('Transport for London', ALREADY),
  digitraffic: clear('Fintraffic (Finland)', ALREADY),
  vegvesen: clear('Norwegian Public Roads Administration', AGENCY),
  dars: clear('DARS (Slovenian motorway operator)', AGENCY),
  bayerninfo: clear('Bavarian traffic authority (BayernInfo)', AGENCY),
  trafficwales: clear('Traffic Wales (Welsh Government)', AGENCY),
  'tii-ireland': clear('Transport Infrastructure Ireland', AGENCY),
  catalonia: clear('Servei Català de Trànsit', AGENCY),
  euskadi: clear('Basque Government traffic', AGENCY),
  luxembourg: clear('Luxembourg CITA / public roads', AGENCY),
  iceland: clear('Icelandic Road and Coastal Administration', ALREADY),
  'tik-estonia': clear('Estonian Transport Administration (TIK)', AGENCY),
  'tik-lithuania': clear('Lithuanian road administration (TIK)', AGENCY),
  'tik-latvia': clear('Latvian State Roads (TIK)', AGENCY),
  'netherlands-rws': clear('Rijkswaterstaat', ALREADY),
  eismoinfo: clear('Via Lietuva', 'Already integrated directly (lithuania.ts); the existing module\u2019s COVERED_ELSEWHERE host rule plus harvest dedupe keep one copy.'),
  meteoswiss: clear('MeteoSwiss (Swiss federal met service)', AGENCY),

  /* ── Asia-Pacific & government networks elsewhere ──────────────────── */
  rivergojp: clear('Japan MLIT river cameras (cam.river.go.jp)', AGENCY),
  'jma-volcam': clear('Japan Meteorological Agency', AGENCY),
  'nexco-japan': conditional('NEXCO expressway companies', 'Privatised expressway operators; public pages, terms not spot-checked this stage.'),
  hongkong: clear('Hong Kong Transport Department', ALREADY),
  'hko-webcams': clear('Hong Kong Observatory', AGENCY),
  singapore: clear('Singapore Land Transport Authority', ALREADY),
  'taiwan-freeway': clear('Taiwan Freeway Bureau', AGENCY),
  qldtraffic: clear('Queensland TMR (Australia)', AGENCY),
  nzta: clear('NZ Transport Agency', ALREADY),
  'topis-seoul': clear('Seoul TOPIS (city ITS)', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  busan: clear('Busan city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  ansan: clear('Ansan city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  ulsan: clear('Ulsan city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  incheon: clear('Incheon city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  daegu: clear('Daegu city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  goyang: clear('Goyang city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  pohang: clear('Pohang city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  changwon: clear('Changwon city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  gwangju: clear('Gwangju city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  wonju: clear('Wonju city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  sejong: clear('Sejong city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  geoje: clear('Geoje city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  chungju: clear('Chungju city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  gimpo: clear('Gimpo city ITS', 'Official city operator; already served via the production OpenCCTV Asia sample.'),
  'vietnam-traffic': clear('Ho Chi Minh City traffic authority', 'Municipal operator; already served via the production OpenCCTV Asia sample.'),
  jakarta: clear('Jakarta provincial government', 'Municipal operator; already served via the production OpenCCTV Asia sample.'),
  jogjaprov: clear('Yogyakarta provincial government', AGENCY),
  jogjakarta: clear('Yogyakarta provincial government', AGENCY),
  'thai-drr': clear('Thailand Department of Rural Roads', AGENCY),
  'selangor-flood': clear('Selangor state flood cameras (JPS)', 'Already proxied in production (types.ts PROXY_IMAGE_HOSTS).'),

  /* ── Held: real upstreams, wrong posture or unverified terms ───────── */
  alertcalifornia: conditional('ALERTCalifornia / ALERTWest', 'WorldEye already integrates this network directly in /api/alert-cameras; importing it into the CCTV catalogue would double-list the same cameras.'),
  panomax: conditional('Panoramax', 'WorldEye integrates Panoramax through its official STAC API in the Street Level layer; republishing its image URLs via an aggregator is a different posture — held.'),
  twipcam: conditional('TWIPCAM platform / Taiwan Freeway Bureau', 'Mixed family: most records sit on the platform CDN (c01.twipcam.com), the rest on the Freeway Bureau. Held until the split is sourced directly.'),
  'osm-webcams': conditional('OpenStreetMap-listed webcams', 'The listing is OSM data; each image remains its operator\u2019s. Mixed agency/commercial hosts — needs per-host review.'),
  camstreamer: conditional('CamStreamer (YouTube embeds)', 'Commercial streaming platform catalog; embed terms not spot-checked this stage.'),
  'iframe-extract': conditional('Extracted iframe embeds', 'Provenance varies per record; not spot-checked this stage.'),
  ipcamlive: conditional('IPCamLive platform', 'Commercial hosting platform; terms not spot-checked this stage.'),
  'ipcamlive-global': conditional('IPCamLive platform', 'Commercial hosting platform; terms not spot-checked this stage.'),
  feratel: conditional('Feratel', 'Commercial tourism-media platform; terms not spot-checked this stage.'),
  opensnow: conditional('OpenSnow', 'Commercial service; terms not spot-checked this stage.'),
  weatherstem: conditional('WeatherSTEM', 'Commercial/university network; terms not spot-checked this stage.'),
  trafficengland: conditional('HighwaysTrafficCameras portal (National Highways cameras)', 'Records point at a third-party portal rather than National Highways itself; held pending direct sourcing.'),

  /* ── Excluded: terms known not to clear ────────────────────────────── */
  windy: excluded('Windy Webcams', 'Audit §3.4: Windy\u2019s terms grant no commercial redistribution of its catalog/feed URLs. Structural exclusion — no flag enables this family.'),
  'windy-providers': excluded('Windy Webcams (provider feeds)', 'Audit §3.4: same Windy catalog terms. Structural exclusion.'),
  weatherbug: excluded('WeatherBug', 'Commercial camera network (named in the audit\u2019s pseudo-URL/excluded class).'),
  earthcam: excluded('EarthCam', 'Commercial network; its terms do not permit harvesting its catalog into a competing service.'),
  skylinewebcams: excluded('SkylineWebcams', 'Commercial aggregator; WorldEye already runs its own Skyline pipeline (world-skyline.generated.ts) under that posture instead.'),
};

/** Slugs that can never be enabled, whatever the registry says. */
export function isStructurallyExcluded(family: string): boolean {
  return family.toLowerCase().includes('windy');
}

/**
 * The licensing verdict for a family. Unknown families are CONDITIONAL —
 * the registry is an allowlist for clearing, not a denylist.
 */
export function familyInfo(family: string): FamilyInfo {
  const slug = (family || '').trim();
  if (isStructurallyExcluded(slug)) {
    return { verdict: 'excluded', upstream: 'Windy Webcams', basis: 'Structural exclusion: family name marks Windy-catalog data (audit §3.4).' };
  }
  return FAMILY_REGISTRY[slug] ?? {
    verdict: 'conditional',
    upstream: 'Unreviewed upstream',
    basis: 'Not spot-checked in Stage B; held by default until its upstream terms are reviewed.',
  };
}

/**
 * Whether the harvest may take this family's records: CLEAR families, plus
 * CONDITIONAL families explicitly force-enabled for this run (the Stage C/D
 * spot-check workflow). EXCLUDED families can never be force-enabled.
 */
export function familyEnabled(family: string, forceEnabled?: ReadonlySet<string>): boolean {
  const info = familyInfo(family);
  if (info.verdict === 'excluded') return false;
  if (info.verdict === 'clear') return true;
  return forceEnabled?.has(family) ?? false;
}
