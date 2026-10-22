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

  /* ── Spot-check pass 2026-10-22: US & Canada additions ──────────── */
  opentrafficcam: clear('Caltrans (California DOT), Ohio DOT, and state DOT 511/CARS-program systems', 'Dominant feed hosts are agency DOT domains — Caltrans and Ohio DOT plus the CARS 511 host — the DOTs themselves are the upstream.'),
  algotraffic: clear('Alabama Department of Transportation (ALDOT) — ALGO Traffic traveller-information system (with Alabama Law Enforcement Agency)', 'Single host is ALDOT\'s official traffic platform; ALGO Traffic provides the ALDOT camera network as public traveller information.'),
  houstontranstar: clear('Houston TranStar (TxDOT / Harris County / City of Houston / METRO consortium)', 'Public-agency transport consortium publishing traveller-information cameras openly.'),
  drivebc: clear('British Columbia Ministry of Transportation and Transit (DriveBC)', 'WorldEye already integrates this upstream directly in production; also a provincial transport authority.'),
  nycdot: clear('New York City Department of Transportation (NYC Traffic Management Center)', 'Municipal road authority publishing traffic cameras as public traveller information.'),
  wyoroad: clear('Wyoming Department of Transportation (WYDOT)', 'State DOT publishing road-condition cameras as open traveller information.'),
  socrata: clear('City of Austin Transportation & Public Works Department', 'Municipal open-data publisher; family name is the open-data portal platform, not the operator.'),
  yorkmaps: clear('Regional Municipality of York, Ontario (York Region)', 'Municipal/regional road authority publishing traffic cameras on its own mapping portal.'),
  arlingtonva: clear('Arlington County, Virginia (county ITS / transportation)', 'Municipal (county) transport authority publishing traffic cameras on its own domain.'),
  njta: clear('New Jersey Turnpike Authority', 'Public (state) toll-road authority publishing Turnpike/Garden State Parkway cameras as traveller information.'),
  msdot: clear('Mississippi Department of Transportation (MDOT)', 'State DOT publishing traffic cameras via its MDOTtraffic traveller-information service.'),
  mtdot: clear('Montana Department of Transportation (MDT 511)', 'State DOT 511 system; family host is the 511 vendor\'s CDN, the operator and publisher is MDT.'),
  pgctrip: clear('Prince George\'s County DPW&T — Traffic Response and Information Partnership (TRIP) Center, Maryland', 'County transport authority publishing traffic cameras to the travelling public; vendor CDN delivery does not change the operator.'),
  'brentwood-tn': clear('City of Brentwood, Tennessee', 'Municipal transport authority publishing its own live traffic cameras on the city website.'),
  durham: clear('Durham County Council, England, UK', 'Municipal (county council) road authority publishing traffic and road-weather cameras as public traveller information.'),
  maineturnpike: clear('Maine Turnpike Authority', 'Public (state) toll-road authority publishing turnpike cameras as traveller information.'),
  'ccg-cameras': clear('Canadian Coast Guard (Fisheries and Oceans Canada)', 'Federal government maritime network publishing cameras via its e-navigation service.'),
  wastateparks: clear('Washington State Parks and Recreation Commission', 'State agency publishing park cameras on its own parks.wa.gov domain.'),
  eaglecrest: clear('Eaglecrest Ski Area — City & Borough of Juneau (municipal)', 'Municipally owned ski area (City & Borough of Juneau) publishing its cameras on the city domain (eaglecams.ci.juneau.ak.us).'),
  mackinac: clear('Mackinac Bridge Authority (MBA) — Michigan state authority (with MDOT)', 'Public-agency publisher: the state bridge authority publishes its five bridge-condition cameras on its own domain as traveller information.'),
  ndawn: clear('North Dakota Agricultural Weather Network (NDAWN), North Dakota State University', 'Public-university research network (NDSU) publishing station cameras as free public data.'),
  'iowa-mesonet': clear('Iowa Environmental Mesonet (IEM), Iowa State University', 'Public-university research network publishing mesonet webcam imagery openly.'),
  hivis: clear('US Geological Survey (USGS) — HIVIS / National Imagery Management System (NIMS)', 'Single host is USGS\'s own imagery store; USGS HIVIS is a US federal camera network, US federal public domain.'),
  hvo: clear('USGS Hawaiian Volcano Observatory', 'US federal public domain (USGS volcano monitoring network).'),
  'goes-satellite': clear('NOAA NESDIS (GOES-East / GOES-West geostationary satellite imagery)', 'US federal public data from NOAA\'s operational weather satellites.'),
  'noaa-esrl': clear('NOAA Global Monitoring Laboratory (formerly ESRL), US Department of Commerce', 'US federal public data — observatory cameras on NOAA\'s own .gov host.'),
  'nasa-worldview': clear('NASA Earthdata / Worldview (MODIS Terra imagery)', 'US federal public data from NASA\'s open Earth-science imagery service.'),
  'nasa-epic': clear('NASA Goddard Space Flight Center — DSCOVR EPIC', 'US federal public data from a NASA mission instrument.'),
  'smithsonian-zoo': clear('Smithsonian National Zoological Park (Smithsonian Institution)', 'US government trust institution publishing its public animal cameras on its own .edu institution domain.'),
  usap: clear('United States Antarctic Program (National Science Foundation)', 'US federal programme publishing Antarctic station cameras on its official programme site.'),
  antarctic: clear('Australian Antarctic Division (Australian Government)', 'Government research network publishing station webcams on its official .gov.au domain.'),
  webcoos: clear('WebCOOS — Webcam Coastal Observation System (SECOORA, funded by NOAA IOOS; university/NOAA partners)', 'Public research/observing network publishing imagery openly for public access (PhenoCam precedent in the registry).'),
  'usace-waterways': clear('US Army Corps of Engineers, Jacksonville District (SAJ)', 'US federal public data — lock and dam cameras on a .mil district host.'),

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

  /* ── Spot-check pass 2026-10-22: Europe additions ────────────────── */
  'informo-madrid': clear('Ayuntamiento de Madrid (Informo traffic portal)', AGENCY),
  'ibb-istanbul': clear('İstanbul Büyükşehir Belediyesi (Istanbul Metropolitan Municipality) — Transportation Management Center (TKM/UYM)', 'Municipal road authority publishing traveller-information cameras publicly; Streamlock hosts are its streaming CDN, not the operator.'),
  balikesir: clear('Balıkesir Büyükşehir Belediyesi (Balıkesir Metropolitan Municipality)', 'Municipal agency publishing city cameras as a public service; the tvkur host is only the player, the operator\'s own portal is sehirkamera.balikesir.bel.tr.'),
  tirol: clear('Land Tirol (Austrian state government, road administration)', AGENCY),
  'zdw-krakow': clear('Zarząd Dróg Wojewódzkich w Krakowie (Małopolska voivodeship road authority)', AGENCY),
  verkeerscentrum: clear('Vlaams Verkeerscentrum (Flemish Traffic Centre, Agentschap Wegen en Verkeer)', AGENCY),
  bizkaimove: clear('Diputación Foral de Bizkaia (Bizkaia provincial council traffic service)', AGENCY),
  'arso-si': clear('ARSO (Slovenian Environment Agency, national meteorological service)', AGENCY),
  'swiss-autobahn': clear('ASTRA / FEDRO (Swiss Federal Roads Office)', 'Public-agency open-data publisher — federal road authority\'s own MobCam hosts, verified on astra.admin.ch (FEDRO, DETEC).'),
  'cic-tenerife': clear('Cabildo de Tenerife — Centro de Información de Carreteras (CIC)', AGENCY),
  'vitoria-gasteiz': clear('Ayuntamiento de Vitoria-Gasteiz (municipal government)', AGENCY),
  'dir-est': clear('DIR Est (Direction interdépartementale des routes Est, French State)', AGENCY),
  dirce: clear('DIR Centre-Est (Direction interdépartementale des routes Centre-Est, French State)', AGENCY),
  meteogalicia: clear('MeteoGalicia (Xunta de Galicia meteorological service)', AGENCY),
  inforoute05: clear('Conseil départemental des Hautes-Alpes (Inforoute 05)', 'Public-agency open-data publisher — departmental council\'s own road-information service.'),
  inforoutes06: clear('Conseil départemental des Alpes-Maritimes (Inforoutes 06)', 'Public-agency open-data publisher — departmental council\'s own road-information service.'),
  'inforoute-alsace': clear('Collectivité européenne d\'Alsace (Inforoute Alsace)', 'Public-agency open-data publisher — territorial authority\'s own road-information service.'),
  grandlyon: clear('Métropole de Lyon (Grand Lyon open data)', AGENCY),
  'dwd-webcams': clear('DWD (Deutscher Wetterdienst, German federal meteorological service)', 'Public-agency open-data publisher — federal service\'s official open-data host.'),
  'belarus-customs': clear('State Customs Committee of the Republic of Belarus', AGENCY),
  'moldova-roads': clear('Administrația de Stat a Drumurilor (Moldova State Road Administration)', AGENCY),
  andorra: clear('Mobilitat — Govern d\'Andorra (Department of Mobility)', AGENCY),
  fintraffic: clear('Fintraffic (Digitraffic, Finland)', ALREADY),
  northyorks: clear('North Yorkshire Council', AGENCY),
  koeln: clear('Stadt Köln (City of Cologne)', AGENCY),
  'czech-highways': clear('ŘSD — Ředitelství silnic a dálnic (Czech Road and Motorway Directorate, via dopravainformace.cz / NDIC)', 'Public-agency open-data publisher — national road authority\'s official traffic-information portal.'),
  'czech-highways-ext': clear('ŘSD — Ředitelství silnic a dálnic (Czech Road and Motorway Directorate, via dopravainformace.cz / NDIC)', 'Public-agency open-data publisher — same upstream and portal as czech-highways.'),
  tallinn: clear('City of Tallinn (Tallinn Transport Department junction cameras)', AGENCY),
  trafiroutes: clear('Service public de Wallonie (SPW) — Wallonia Public Service, PEREX traffic centre, Belgium', 'Public-agency open-data publisher: the Walloon regional road authority publishes its motorway cameras as traveller information on its own domain.'),
  'emsd-kamchatka': clear('Kamchatka Branch of the Geophysical Survey of the Russian Academy of Sciences (EMSD), with FEB RAS', 'Government research network publishing volcano-monitoring imagery publicly — the GSNL supersite record lists EMSD data access as unregistered/public; same posture as the cleared USGS/PhenoCam research networks.'),
  'wsv-waterway': clear('Wasserstraßen- und Schifffahrtsverwaltung des Bundes (WSV) — German Federal Waterways and Shipping Administration, incl. Federal Institute of Hydrology (BfG)', 'Public-agency open-data publisher: federal waterway authority lock/river cameras served from its own infrastructure (pss.wsv.de, bafg.de).'),

  /* ── Asia-Pacific & government networks elsewhere ──────────────────── */
  rivergojp: clear('Japan MLIT river cameras (cam.river.go.jp)', AGENCY),
  'jma-volcam': clear('Japan Meteorological Agency', AGENCY),
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

  /* ── Spot-check pass 2026-10-22: Asia-Pacific & rest of world ───── */
  'road-info-prvs': clear('Japan MLIT (Ministry of Land, Infrastructure, Transport and Tourism) — national highway road-information system', AGENCY),
  kkr: clear('Japan MLIT Kinki Regional Development Bureau (KKR)', AGENCY),
  'mlit-kanto': clear('Japan MLIT Kanto Regional Development Bureau', AGENCY),
  'mlit-yamagata': clear('Japan MLIT Tohoku Regional Development Bureau (Yamagata)', AGENCY),
  niigata: clear('Niigata Prefectural Government (Japan)', AGENCY),
  kaiho: clear('Japan Coast Guard (Kaihocho), MLIT — MICS maritime information service', AGENCY),
  dsat: clear('Macau Transport Bureau (DSAT — Direcção dos Serviços para os Assuntos de Tráfego), Macau SAR Government', AGENCY),
  'thailand-doh': clear('Thailand Department of Highways, Ministry of Transport', AGENCY),
  'bandung-pelindung': clear('Bandung City Government (Indonesia) — Pelindung CCTV portal', AGENCY),
  bantul: clear('Bantul Regency Government (Indonesia)', AGENCY),
  asahan: clear('Asahan Regency Government (Indonesia)', AGENCY),
  bondowoso: clear('Bondowoso Regency Government (Indonesia)', AGENCY),
  tasikmalaya: clear('Tasikmalaya City Government (Indonesia) — ATCS', AGENCY),
  'numazu-snow': clear('Shizuoka Prefectural Government (Japan) — snow/road live cameras', AGENCY),
  geonet: clear('GeoNet / Earth Sciences NZ (GNS Science), New Zealand', 'Government hazard-monitoring network publishing camera data openly under a CC licence.'),
  ecan: clear('Environment Canterbury (Canterbury Regional Council), New Zealand', AGENCY),
  airservices: clear('Airservices Australia', AGENCY),
  'boating-vic': clear('Boating Vic — Maritime Safety Victoria / Better Boating Victoria (Victorian Government, Australia)', 'Public-agency open-data publisher; the opaque host IDs are the agency service\'s own ramp records.'),
  'chile-dgac': clear('DGAC Chile (Dirección General de Aeronáutica Civil) — Directorate of Meteorology / aerodrome weather cameras', 'Public-agency open-data publisher; operator is Chile\'s civil aviation authority.'),
  himawari: clear('NICT (National Institute of Information and Communications Technology, Japan) — Himawari satellite imagery service', 'Japanese national research agency publishing Himawari imagery openly (himawari8-dl.nict.go.jp).'),
  nsw: clear('Transport for NSW (TfNSW) — Live Traffic NSW traffic cameras', 'Public-agency open data (TfNSW Open Data Hub lists Live Traffic Cameras under CC-BY) AND WorldEye already integrates this same upstream directly in production.'),
  biodic: clear('Biodiversity Center of Japan, Ministry of the Environment (Internet Nature Institute / sizenken.biodic.go.jp)', 'Public-agency publisher: a Japanese national government (MOE) nature-monitoring camera network published openly on a .go.jp domain.'),
  'cayman-port': clear('Port Authority of the Cayman Islands — statutory authority owned by the Government of the Cayman Islands', 'Public-agency publisher: the government port authority publishes its George Town/Cayman Brac port webcams on its own domain.'),
  'panama-canal': clear('Panama Canal Authority (Autoridad del Canal de Panamá, ACP) — autonomous public authority of Panama', 'Public-agency publisher: the Canal Authority itself publishes the lock webcams (Agua Clara, Cocoli, Gatun) on its own webcams.delcanal.com host.'),
  'agpse-waterway': clear('Administración General de Puertos S.E. (AGP) — Argentine state ports/waterways administration (succeeded in 2025 by ANPYN, Agencia Nacional de Puertos y Navegación)', 'Public-agency publisher: state waterway authority\'s hydrography camera on the Río Paraná served from a .gob.ar government host.'),
  govje: clear('Government of Jersey / Jersey Met (States of Jersey) — Jersey Airport runway webcams', 'Public-agency publisher: the States of Jersey publishes the airport runway webcam views from its public-data infrastructure.'),
  horizons: clear('Horizons Regional Council (Manawatū-Whanganui, NZ) — regional government environmental monitoring network', 'Public-agency open-data publisher: a NZ regional council publishing river/environmental monitoring cameras on its own .govt.nz domain.'),
  siata: clear('SIATA — Sistema de Alerta Temprana del Valle de Aburrá (Área Metropolitana / Medellín public environmental early-warning system)', AGENCY),
  'medellin-simm': clear('Secretaría de Movilidad de Medellín — SIMM (Sistema Inteligente de Movilidad de Medellín)', AGENCY),
  'recife-cttu': clear('CTTU — Autarquia de Trânsito e Transporte Urbano do Recife (Recife municipal traffic authority)', 'Municipal traffic authority publishing traveller-information cameras as open data; feed host is its contractor, the operator is the agency.'),
  cetsp: clear('CET-SP — Companhia de Engenharia de Tráfego (São Paulo municipal traffic company)', AGENCY),
  'daer-rs': clear('DAER-RS — Departamento Autônomo de Estradas de Rodagem do Rio Grande do Sul (state road agency)', 'Public-agency open-data publisher; feed host is the agency\'s camera-system contractor, the operator is the agency.'),
  dersp: clear('DER-SP — Departamento de Estradas de Rodagem de São Paulo (state road agency)', 'Public-agency open-data publisher (state road authority publishing highway cameras as traveller information).'),
  ineter: clear('INETER — Instituto Nicaragüense de Estudios Territoriales (Nicaraguan government geophysical institute)', AGENCY),
  ovsicori: clear('OVSICORI-UNA — Observatorio Vulcanológico y Sismológico de Costa Rica, Universidad Nacional', 'Public university observatory network publishing monitoring cameras openly.'),
  ipgp: clear('IPGP — Institut de Physique du Globe de Paris / OVPF (French public research institute, volcano observatory for Réunion)', 'Public research institute publishing observatory cameras as open data.'),
  'eso-observatories': clear('Public research institutes at La Silla/Chajnantor — INAF (REM), ESO/MPG/OSO APEX partnership, Astronomical Institute of the Czech Academy of Sciences', 'Public research institutes publishing observatory cameras openly; family slug is a misnomer for the actual hosts.'),
  noirlab: clear('Izaña Observatory cameras served by AEMET (Spanish State Meteorological Agency) / IAC', AGENCY),
  sarao: clear('HartRAO — Hartebeesthoek Radio Astronomy Observatory (SARAO / National Research Foundation, South Africa)', 'Government research facility publishing observatory cameras openly.'),
  saoras: clear('SAO RAS — Special Astrophysical Observatory of the Russian Academy of Sciences', 'Public (state academy) research institute publishing observatory cameras openly.'),
  opgc: clear('OPGC — Observatoire de Physique du Globe de Clermont-Ferrand (Université Clermont Auvergne / CNRS)', 'Public university/CNRS observatory publishing cameras openly.'),
  awi: clear('AWI — Alfred Wegener Institute, Helmholtz Centre for Polar and Marine Research (German federal research institute)', 'Public research institute publishing station cameras openly.'),
  'task-gdansk': clear('CI TASK — Centre of Informatics, Tricity Academic Supercomputer and Network (Gdańsk University of Technology consortium)', 'Public academic network operating a public scenic-camera service for the Tri-City community (kamera.task.gda.pl).'),

  /* ── Held: real upstreams, wrong posture or unverified terms ───────── */
  alertcalifornia: conditional('ALERTCalifornia / ALERTWest', 'WorldEye already integrates this network directly in /api/alert-cameras; importing it into the CCTV catalogue would double-list the same cameras.'),
  panomax: conditional('Panoramax', 'WorldEye integrates Panoramax through its official STAC API in the Street Level layer; republishing its image URLs via an aggregator is a different posture — held.'),
  twipcam: conditional('TWIPCAM platform / Taiwan Freeway Bureau', 'Spot-checked 2026-10-22: 3,909 of 5,754 feeds sit on the commercial platform CDN (c01.twipcam.com) and its terms are not cleared; the 608 Freeway Bureau feeds should be sourced directly (taiwan-freeway is CLEAR). 533 twipcam records are already served via the legacy production sampler — flagged for the owner, not removed by this pass.'),
  'osm-webcams': conditional('OpenStreetMap-listed webcams', 'The listing is OSM data; each image remains its operator\u2019s. Mixed agency/commercial hosts — needs per-host review.'),
  camstreamer: conditional('CamStreamer (YouTube embeds)', 'Commercial streaming platform catalog; embed terms not spot-checked this stage.'),
  'iframe-extract': conditional('Extracted iframe embeds', 'Provenance varies per record; not spot-checked this stage.'),
  ipcamlive: conditional('IPCamLive platform', 'Commercial hosting platform; terms not spot-checked this stage.'),
  'ipcamlive-global': conditional('IPCamLive platform', 'Commercial hosting platform; terms not spot-checked this stage.'),
  feratel: conditional('Feratel', 'Commercial tourism-media platform; terms not spot-checked this stage.'),
  opensnow: conditional('OpenSnow', 'Commercial service; terms not spot-checked this stage.'),
  trafficengland: conditional('HighwaysTrafficCameras portal (National Highways cameras)', 'Records point at a third-party portal rather than National Highways itself; held pending direct sourcing.'),
  opendatahub: conditional('Open Data Hub (South Tyrol) label — mostly Feratel content', 'Spot-checked 2026-10-22: 878 of 1,015 feeds sit on wtvthmb.feratel.com — the commercial Feratel platform under a misleading open-data label; held with feratel.'),
  airportwebcams: conditional('Mixed airport webcam hosts', 'Spot-checked 2026-10-22: mixed provenance; the FAA share (298) is already covered by the CLEAR faa-weathercams family and the rest is unreviewed small-host airport cams.'),
  myairportcams: conditional('MyAirportCams aggregator / Airservices Australia', 'Spot-checked 2026-10-22: dominant host is an aggregator viewer; the Airservices Australia share clears separately as the airservices family.'),
  kielcanal: conditional('Kiel Canal (WSV) via Livespotting', 'Spot-checked 2026-10-22: the operator is the federal WSV (wsv-waterway is CLEAR) but these feeds sit on the commercial Livespotting CDN — held until sourced from the WSV directly.'),
  'isle-of-man': conditional('Isle of Man Government + platform singletons', 'Spot-checked 2026-10-22: 10 of 15 feeds are IoM Government (Open Government Licence) but the family is contaminated with IPCamLive/commercial records — held until split.'),
  'maunakea-observatories': conditional('Maunakea observatories (mixed institutes)', 'Spot-checked 2026-10-22: Gemini/Subaru/EAO are public institutes but Keck is a private non-profit — held until sourced per-observatory.'),
  'small-cams-2': conditional('Ski Utah resort cams + USGS CoastCam subset', 'Spot-checked 2026-10-22: majority is a tourism-association aggregator of resort cams; the 13 USGS CoastCam records are federal material held inside a mixed family — split before any clearance.'),
  'hanshin-expressway': conditional('Hanshin Expressway Co.', 'Spot-checked 2026-10-22: privatised expressway operator; its published terms reserve copyright and no camera-feed licence was found — same held posture as nexco-japan before its definitive terms check.'),
  'satap-sitaf': conditional('SATAP / SITAF (ASTM Group motorway concessionaires)', 'Spot-checked 2026-10-22: private concessionaires; redistribution terms not cleared. Autostrade per l’Italia is a named-operator exception in this registry, not a class clearance for concessionaires.'),
  mudik: conditional('Indonesian toll-road concessionaires via the Ministry mudik portal', 'Spot-checked 2026-10-22: no record sits on a government host — mixed commercial/state toll-operator feeds behind an aggregator portal; source directly.'),
  'prague-tsk': conditional('Prague TSK cameras via ÚAMK portal', 'Spot-checked 2026-10-22: records point at a motoring-club portal (uamk.cz), not TSK itself — same holding pattern as trafficengland; source directly.'),

  /* ── Excluded: terms known not to clear ────────────────────────────── */
  windy: excluded('Windy Webcams', 'Audit §3.4: Windy\u2019s terms grant no commercial redistribution of its catalog/feed URLs. Structural exclusion — no flag enables this family.'),
  'windy-providers': excluded('Windy Webcams (provider feeds)', 'Audit §3.4: same Windy catalog terms. Structural exclusion.'),
  weatherbug: excluded('WeatherBug', 'Commercial camera network (named in the audit\u2019s pseudo-URL/excluded class).'),
  earthcam: excluded('EarthCam', 'Commercial network; its terms do not permit harvesting its catalog into a competing service.'),
  skylinewebcams: excluded('SkylineWebcams', 'Commercial aggregator; WorldEye already runs its own Skyline pipeline (world-skyline.generated.ts) under that posture instead.'),
  'nexco-japan': excluded('NEXCO expressway companies (Drive Traffic)', 'Spot-checked 2026-10-22: Drive Traffic terms bar copying/extraction and any third-party use of site data without explicit authorisation; NEXCO East’s Drive Plaza terms likewise forbid reproducing contents on another website or for commercial purposes.'),
  itraffic: excluded('SANRAL i-TRAFFIC (South Africa)', 'Spot-checked 2026-10-22: SANRAL’s own terms prohibit redistribution or republication of any part of i-traffic.co.za or its content without its prior express written consent.'),
  weatherstem: excluded('WeatherSTEM', 'Spot-checked 2026-10-22: its Media Usage Guidelines require written permission to reuse any content including camera imagery/video, state commercial usage requires a license, and forbid automated recording of live streams.'),
  'nysmesonet': excluded('New York State Mesonet (UAlbany / RFSUNY)', 'Spot-checked 2026-10-22: its Data Access Policy requires a priori approval for web republication and states no redistribution is allowed without the express prior written consent of RFSUNY — not open data despite the public-university operator.'),
  balticlivecam: excluded('BalticLiveCam (SIA BalticLiveCam)', 'Spot-checked 2026-10-22: its Terms of Use §3 prohibit partial or full publication, reproduction or transfer of website/stream content without the rights holder’s permission.'),
  swisswebcams: excluded('swisswebcams.ch portal (Windy-hosted imagery)', 'Spot-checked 2026-10-22: all 1,542 feeds sit on images-webcams.windy.com — Windy catalogue data under another label; the Windy exclusion attaches to the data, not just the family name.'),
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
