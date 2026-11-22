import { createHash } from "crypto";
import { beforeAll, describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { POSTS } from "./(en)/blog/posts";
import cameraCountries from "@/data/camera-countries.json";
import cityPages from "@/data/city-pages.json";
import usStates from "@/data/us-states.json";
import skiResorts from "@/data/ski-resorts.json";
import liveCameraIndex from "@/data/live-camera-index.json";
import cameraNetworkReport from "@/data/camera-network-2026-10.json";
import { MANIFEST_ENTRIES } from "@/i18n/manifest";
import { hreflangMapFor } from "@/lib/i18n-seo";
import { REGISTRY_VERIFIED_AT, SHIPS } from "@/lib/ships/registry";

/**
 * Sitemap lastmod policy pins (index-recovery remainder, 2026-10-27).
 *
 * The rule: an entry carries lastModified only when it equals the date
 * of a real artefact the page's content derives from — a dataset's
 * generatedAt, a post's own date, the methodology page's REVISED
 * stamp, or a GTFS feed's version date (see sitemap.ts). Everything
 * else omits it. Expected dates below are read from the data files
 * themselves, so a legitimate data rebuild moves the pins with it;
 * what is pinned is WHICH artefact dates WHICH family.
 *
 * URL-set invariance: the non-transit set is fully determined by
 * committed data, so its count and a hash of the sorted URLs are
 * pinned exactly — any URL added, removed or renamed breaks this
 * test. (Baseline: the pre-change generator on 2026-10-27, 815
 * URLs; 816 since chunk C7 added the /alternatives hub the same
 * day; 939 since the city-scale wave added 123 generated city pages
 * at the >=25 owned-camera tier later that day; 945 since the
 * i18n rebase added the six manifest-published /es URLs; 968 since
 * Menu #2 Wave A added 10 per-volcano pages and 13 per-place aurora
 * pages, both from committed registries; 928 since C10 threshold
 * enforcement consolidated 35 below-line countries into their
 * regional hubs and folded 5 ski resorts into the /ski-webcams
 * hub; 935 since Menu #2 Wave A part 2 added the /iconic-places
 * hub + 4 place pages and the /launch-sites hub + 1 site page,
 * both from committed registries; 974 since Menu #2 Wave B part 1
 * added the /animal-webcams hub + 12 animal star pages and the
 * /university-webcams hub + 25 per-university pages, all from
 * committed registries; 987 since Menu #2 Wave B part 2 added the
 * /ferry-tracker hub + 3 ferry system pages and 9 cruise-port
 * board pages, all from committed registries; 1,014 since Menu #2
 * Wave C part 1 added the six Wave C seasonal-annual pages (Macy's
 * parade, NYC marathon, July 4 fireworks, Boston marathon, Rose
 * Parade, Balloon Fiesta) and the /iss-over hub + 20 city pages
 * from the committed lib/iss-passes registry; 1,037 since Menu #2
 * Wave C part 2 added the /weather-radar hub + 21 metro pages
 * from a committed registry and the /wildfires hub; 1,052 since
 * the per-ship pages shipped, adding the /ships hub + 14 per-ship
 * pages from the committed lib/ships registry). Transit URLs
 * depend on live GTFS feeds, so they are pinned
 * structurally instead: present, unique, and every lastmod a
 * plausible feed-vintage date. The per-incident /wildfires/<slug>
 * URLs are live-derived from the NIFC WFIGS feed the same way —
 * excluded from the pinned set below and pinned structurally in
 * their own describe.
 */

const BASE = "https://worldeye.app";
const generatedAt = (d: unknown) =>
  new Date((d as { generatedAt: string }).generatedAt).toISOString();
const CATALOGUE = generatedAt(cameraCountries);
const CITY = generatedAt(cityPages);
const STATES = generatedAt(usStates);
const SKI = generatedAt(skiResorts);

type Row = { url: string; lastModified: string | null };

let rows: Row[] = [];
let byUrl = new Map<string, string | null>();
let rawEntries: Awaited<ReturnType<typeof sitemap>> = [];
let rawByUrl = new Map<string, (typeof rawEntries)[number]>();

beforeAll(async () => {
  const entries = await sitemap();
  rawEntries = entries;
  rawByUrl = new Map(entries.map((e) => [e.url, e]));
  rows = entries.map((e) => ({
    url: e.url,
    lastModified: e.lastModified
      ? new Date(e.lastModified).toISOString()
      : null,
  }));
  byUrl = new Map(rows.map((r) => [r.url, r.lastModified]));
}, 600_000);

const lm = (path: string) => byUrl.get(`${BASE}${path}`);

describe("sitemap URL set", () => {
  it("has no duplicate URLs", () => {
    expect(byUrl.size).toBe(rows.length);
  });

  it("keeps the non-transit URL set byte-identical to the pre-change generator", () => {
    const nonTransit = rows
      .map((r) => r.url)
      .filter(
        (u) =>
          !u.startsWith(`${BASE}/transit`) &&
          !u.startsWith(`${BASE}/wildfires/`),
      )
      .sort();
    expect(nonTransit.length).toBe(1181);
    const hash = createHash("sha256").update(nonTransit.join("\n")).digest("hex");
    // Hash history: 6d75d0de… until the SEO audit fix #3 (2026-10-27)
    // normalised the es homepage entry from /es/ to its final /es
    // form — same 945 URLs, one string changed (17582f29…). Menu #2
    // Wave A (2026-10-27) then added the 23 per-volcano and
    // per-place aurora URLs → 968. C10 threshold enforcement
    // (2026-10-28) then removed the 35 consolidated country pages
    // and 5 folded ski resort pages → 928 (8584c79e…). Menu #2 Wave A
    // part 2 (2026-10-28) then added the 7 iconic-places and
    // launch-sites URLs → 935. Menu #2 Wave B part 1 (2026-10-28)
    // then added the animal hub + 12 star pages and the university
    // hub + 25 per-university pages → 974. Menu #2 Wave B part 2
    // (2026-10-28) then added the ferry hub + 3 system pages and 9
    // cruise-port board pages → 987. Menu #2 Wave C part 1
    // (2026-10-28) then added the 6 Wave C seasonal annuals and the
    // 21 iss-over hub + city URLs → 1,014. Menu #2 Wave C part 2
    // (2026-10-28) then added the weather-radar hub + 21 metro
    // pages and the /wildfires hub → 1,037 (per-incident wildfire
    // URLs are live-derived and filtered out of this set). The
    // per-ship pages (built 2026-10-26, shipped 2026-10-28) then
    // added the /ships hub + 14 per-ship pages from the committed
    // lib/ships registry → 1,052. Delta hand-verified: removing
    // exactly those 15 URLs reproduces the 1,037 set and the
    // 4c13bb37… hash byte-for-byte. The WorldEye News section
    // (2026-10-28) then added the /news front page, the editorial
    // standards page and the author profile → 1,055 (the flagged
    // news stories themselves were already listed at their blog
    // URLs). Delta hand-verified: removing exactly those 3 URLs
    // reproduces the 1,052 set and the e14944c6… hash byte-for-byte.
    // The WiFi Sensing tool (2026-10-29) then added /sensing → 1,056.
    // Delta hand-verified: the production sitemap's non-transit set
    // reproduces the 1,055 set and the 6eb73a81… hash byte-for-byte,
    // and removing exactly /sensing from the new set does the same.
    // The competitor head-to-head wave 1 (2026-10-29) then added the
    // two /compare/<a>-vs-<b> pair URLs → 1,058. Delta: removing
    // exactly those 2 URLs reproduces the 1,056 set and the
    // 2080493c… hash byte-for-byte. Wave 2 (2026-10-29) then added
    // the three remaining pair URLs (windy-vs-ventusky,
    // marinetraffic-vs-vesselfinder, google-earth-vs-nasa-worldview)
    // → 1,061. Competitor-vs-competitor wave 2 (2026-10-29) then
    // added the 13 God's Eye View / GodsView AI head-to-head pair
    // URLs (gods-eye-view-vs-* ×9, godsview-vs-* ×4) → 1,074.
    // Delta hand-verified: removing exactly those 13 URLs
    // reproduces the 1,061 set and the b6d93150… hash byte-for-byte.
    // Competitor-vs-competitor wave 2B (2026-10-29) then added the
    // 12 Argos Atlas / flight-tracker / AIS head-to-head pair URLs
    // → 1,086. Delta hand-verified: removing exactly those 12 URLs
    // reproduces the 1,074 set and the 1f29ca5e… hash byte-for-byte.
    // Competitor-vs-competitor wave 2C (2026-10-29) then added the
    // final 12 head-to-head pair URLs (webcam/satellite/OSINT
    // clusters) → 1,098. Delta hand-verified: removing exactly
    // those 12 URLs reproduces the 1,086 set and the 52a52ab4…
    // hash byte-for-byte. The Keyword Gap Programme (2026-10-29)
    // then added /beach-webcams/key-west (29 verified FDOT island
    // cameras, the beach family's tenth spot) → 1,099. Delta
    // hand-verified: removing exactly that URL reproduces the
    // 1,098 set and the a1fe3060… hash byte-for-byte. The White
    // Label page (2026-10-29) then added /white-label (the
    // early-access pilot programme page) → 1,100. Delta: removing
    // exactly that URL reproduces the 1,099 set and the
    // 24d40d31… hash byte-for-byte. The ski expansion
    // (2026-10-30) then added 12 resort pages (alta, angel-fire,
    // blue-mountain-ontario, chamonix, deer-valley, hoodoo,
    // june-mountain, oppdal, perisher, pyha, red-river,
    // sun-valley) → 1,112. Delta hand-verified against the
    // production sitemap: exactly those 12 additions, no
    // removals, reproducing the a49057a2… hash byte-for-byte.
    // The White Label announcement post (2026-10-30) then added
    // /blog/worldeye-white-label → 1,113. Delta: removing exactly
    // that URL reproduces the 1,112 set and the a49057a2… hash.
    // The Daily Blog 2026-10-29 batch (shipped 2026-10-30,
    // recomposed from the batch's source record after the original
    // staging was destroyed by an EPERM truncating write) then
    // added the three sourced news posts
    // (halloween-aurora-g1-storm-watch,
    // spacex-starlink-launch-vandenberg-october-30,
    // colorado-ski-season-opens-keystone-arapahoe-basin) → 1,116.
    // Delta hand-verified: removing exactly those 3 URLs
    // reproduces the 1,113 set and the be9f132b… hash byte-for-byte.
    // The Daily Blog 2026-10-30 batch (shipped 2026-10-30)
    // then added the two sourced news posts
    // (iss-spacewalk-100-seventh-solar-array,
    // super-typhoon-in-fa-northern-mariana-islands) → 1,118.
    // (A third staged story, Keystone opening day, was dropped
    // as a duplicate of the Oct 29 Colorado ski-season post.)
    // Delta hand-verified: removing exactly those 2 URLs
    // reproduces the 1,116 set and the 6012a76e… hash byte-for-byte.
    // The recon tool pages (2026-10-30) then added the /tools hub
    // and 22 per-tool pages → 1,141, and the camera-roster rollout
    // (2026-10-30) added the /city-webcams/mcalester city page
    // → 1,142. Delta hand-verified: removing exactly those 24 URLs
    // reproduces the 1,118 set and the 71edeb7b… hash byte-for-byte.
    // The site-audit Wave 2 R30 consolidation (2026-10-31) then
    // removed /macys-thanksgiving-parade-2026 → 1,141: INVERTED
    // versus the marathon pattern, the undated evergreen page is
    // canonical and the dated shell is retired (301 in
    // next.config.ts). Delta hand-verified: removing exactly that
    // URL reproduces the 1,142 set and the cc960cf3… hash
    // byte-for-byte.
    // The site-audit Wave 2 R20 consolidation (2026-10-31) then
    // removed /photo-location-finder → 1,140: it split one intent
    // with /where-was-this-photo-taken, which survives (301 in
    // next.config.ts). Delta hand-verified: removing exactly that
    // URL reproduces the 1,141 set and the e47811a6… hash
    // byte-for-byte.
    // The site-audit Wave 2 R38 thin-wall tiering (2026-10-31)
    // then removed 34 wall-family spokes → 1,106: the three
    // sub-5 volcanoes (etna, bromo, ruapehu), the six sub-5
    // national parks, and all 25 university spokes (richest
    // registry set is 4 cameras) — lib/indexation-gates holds the
    // measured table; the tiered pages stay live as noindex.
    // The site-audit Wave 3 R65 merge (2026-10-31) then removed
    // /blog/orionid-meteor-shower-2026 → 1,105: the duplicate
    // Orionid post was folded into /blog/watch-the-orionid-meteor-
    // shower-live and deleted from blog/posts.ts (301 in
    // next.config.ts), and blog URLs derive from POSTS. The R77
    // research hub (/research) then added one back in the same
    // wave — net 1,106 with a different set, so the hash moved
    // twice in one day.
    // The Daily Blog 2026-10-31 batch (2026-10-31) then added
    // the three sourced news posts
    // (wolf-creek-opening-day-halloween-2026,
    // kilauea-episode-56-window-november-2-9,
    // falcon-9-700th-launch-starlink-15-18) → 1,109.
    // Delta hand-verified: removing exactly those 3 URLs
    // reproduces the 1,106 set and the 78c9b2ad… hash
    // byte-for-byte (derived by executing sitemap() directly).
    // The pin then went stale: the GEV keyword-gap wave's sitemap
    // additions (2026-11-01, incl. /gods-eye-view-online) landed
    // without a pin update — the production sitemap's non-transit
    // set measures 1,114 against the 1,109 pin. Pricing v3
    // (2026-11-01) then added /powder-pass → 1,115. Delta
    // hand-verified against the production sitemap: its set
    // satisfies this suite's other structural assertions (6 es
    // entries, 12 with alternates, /pricing undated), and the new
    // hash is exactly that set plus /powder-pass.
    // The Daily Blog 2026-11-01 batch (2026-11-01) then added
    // the three sourced news posts
    // (lake-louise-opening-day-november-1-2026,
    // mayon-alert-level-3-eruption-evacuation,
    // cyclone-murasu-forms-andhra-pradesh-landfall) → 1,118.
    // Delta hand-verified against the production sitemap: its
    // non-transit set measures 1,114 (d7099eda…); adding exactly
    // /powder-pass reproduces the 1,115 set and the 72f775c4…
    // hash byte-for-byte, and adding exactly the 3 new blog URLs
    // to that set gives 1,118 / 6fda17cc….
    // The Daily Blog 2026-11-02 batch (2026-11-02) then added
    // the three sourced news posts
    // (cyclone-murasu-severe-landfall-andhra-pradesh,
    // spacex-ussf-432-launch-november-3-vandenberg,
    // southern-taurid-fireballs-peak-november-4-5) → 1,122.
    // Delta verified by executing sitemap() on both trees the
    // same afternoon: the pristine tip generates 1,119 /
    // 7d9e8391… (its own set has drifted +1 since the 1,118 pin
    // above — one R38 thin-wall gated spoke's live camera count
    // crossed the WALL_MIN_CAMERAS line between derivations;
    // the gated families' counts are live, so this pin can move
    // a URL either way when a borderline spoke crosses), and
    // the merged tree's set minus the pristine set is exactly
    // the 3 new blog URLs, giving 1,122 / 3d901fd2….
    // The Daily Blog 2026-11-03 batch (2026-11-03) then added
    // the three sourced news posts
    // (kilauea-episode-56-precursory-lava-alert-watch,
    // cyclone-murasu-crosses-ongole-landfall-complete,
    // four-corners-record-flooding-arizona-emergency-november-3)
    // → 1135. Delta verified by executing sitemap() on both
    // trees the same day: the pristine tip generates 1,132 /
    // 8ea6b57c… (its own set has drifted +10 since the 1,122 pin
    // above — exactly the ten unflagged evergreen posts added
    // to posts.ts on the tip after the Nov 2 batch shipped;
    // verified by diffing the two executed sets), and the merged
    // tree's set minus the pristine set is exactly the 3 new
    // blog URLs.
    // The per-AI-engine pages (2026-11-04) then added the /ai
    // hub + the 11 per-engine pages (/ai/chatgpt, /ai/claude,
    // /ai/perplexity, /ai/gemini, /ai/copilot, /ai/grok,
    // /ai/meta-ai, /ai/mistral, /ai/duckduckgo, /ai/brave,
    // /ai/you-com) from the lib/ai-engines registry → 1,147.
    // Delta verified by executing sitemap() on the merged tree:
    // removing exactly those 12 URLs reproduces the 1,135 set
    // and the 74f28985… hash byte-for-byte.
    // The Daily Blog 2026-11-04 batch (2026-11-04) then added
    // the three sourced news posts
    // (mammoth-mountain-opens-early-november-5-2026,
    // mayon-ash-plume-november-4-strombolian-activity,
    // spacex-ussf-432-launch-moves-november-6) \u2192 1,161.
    // Delta verified by executing sitemap() on both trees the
    // same day: the pristine tip generates 1,158 / a87ed539\u2026
    // (its own set has drifted +11 since the 1,147 pin above
    // \u2014 the eleven unflagged worldeye-in-*/worldeye-on-*
    // blog posts added to posts.ts on the tip after that pin
    // was set are present in the executed set), and the merged
    // tree's set minus the pristine set is exactly the 3 new
    // blog URLs, giving 1,161 / 49851da1\u2026.
    // The question-ranking guide (2026-11-04) then added the
    // evergreen post /blog/how-to-watch-traffic-cameras-live
    // → 1,162. Delta verified by executing sitemap() on both
    // trees the same day: the pristine tip generates 1,161 /
    // 49851da1… and the merged tree's set minus the pristine
    // set is exactly the 1 new blog URL, giving 1,162 /
    // 6ea16898….
    // The indexation fix (2026-11-04) then removed the 42 URLs
    // whose own templates serve noindex — 40 generated cities
    // (the 6 scoped count-gate slugs + 34 cities in the 50–70
    // element band with <2 data elements) and the 2 below-line
    // states (mississippi, rhode-island) → 1,120. Delta verified
    // by executing sitemap() on both trees: the pristine tip
    // generates 1,162 / 6ea16898… and the new set is exactly the
    // old set minus those 42 URLs (the removed set was computed
    // with the templates' own gate functions before the change),
    // giving 1,120 / abb18c4a….
    // The Daily Blog 2026-11-05 batch (2026-11-05) then added
    // the three sourced news posts
    // (iss-spacewalk-101-final-solar-array-november-5,
    // mccaysville-copperhill-record-flood-emergency-november-5,
    // noaa-g1-storm-watch-november-6-7-aurora) → 1,123. Delta
    // verified by executing sitemap() on the merged tree:
    // removing exactly those 3 URLs reproduces the 1,120 set
    // and the abb18c4a… hash byte-for-byte.
    // The featured collections gallery (2026-11-06) then added
    // the /collections gallery index → 1,124. Delta verified by
    // executing sitemap() on both trees (probe-stubbed live
    // transit/wildfire doors, whose URLs this pinned set filters
    // out; the pristine generator under the same probe
    // reproduces 1,123 / 93b987a6… exactly): the staged set
    // minus the pristine set is exactly the 1 new /collections
    // URL, giving 1,124 / 5332f0a1….
    // The launch board (Wave 2 item 9, 2026-11-06) then added
    // /launches — the standing upcoming-launches page over the
    // Launch Library 2 feed → 1,125. Delta verified by
    // executing sitemap() on both trees (probe-stubbed live
    // transit/wildfire doors, whose URLs this pinned set filters
    // out; the pristine generator under the same probe
    // reproduces 1,124 / 5332f0a1… exactly): the staged set
    // minus the pristine set is exactly the 1 new /launches
    // URL, giving 1,125 / fdc6dee3….
    // The Pulse page (2026-11-06) then added the /pulse
    // status page → 1,126. Delta verified by executing
    // sitemap() on the pristine tip — reproduces 1,125 /
    // fdc6dee3… exactly — and adding the single static
    // /pulse entry that the staged generator's one-line
    // delta introduces (the identical one-line delta,
    // executed on both trees on the previous base, gave
    // exactly {/pulse}): 1,126 / 489899b5….
    // The C10 language-aware gate amendment (2026-11-06,
    // site audit A3) then re-measured the 34 element-band
    // cities with fairer corridor/kind patterns: exactly
    // two cities (iida-city, kakogawa-city) now reach ≥2
    // elements and enter the sitemap → 1,128. Delta proof
    // by executed sitemap(): the pristine-patterns run
    // reproduces 1,126 / 489899b5… exactly, the amended
    // run's set differs by exactly those two URLs, added
    // and none removed (full record in the site-audit
    // work-d NOTES.md).
    // The blog daily batch of 2026-11-06 (Kilauea episode
    // 56, M6.1 offshore Japan, Mt. Rose opening day) then
    // added its 3 post URLs → 1,131. Delta verified by
    // executing sitemap() on both trees (probe): the
    // pristine tip reproduces 1,128 / 9603c34e… exactly;
    // the merged run's count is exactly +3 and all 3 new
    // /blog/ URLs are present in the executed set.
    // The blog daily batch of 2026-11-07 (USSF-432
    // launch, Semeru eruption, Loveland opening day) then
    // added its 3 post URLs → 1,134. Delta verified by
    // executing sitemap() on the merged tree (probe):
    // count exactly +3 over the 1,131 pin and all 3 new
    // /blog/ URLs present in the executed set.
    // The blog daily batch of 2026-11-08 (Shizuoka
    // earthquake, Starship Flight 15 plan, Typhoon
    // Cempaka) then added its 3 post URLs → 1,137. Delta
    // verified by executing sitemap() on the merged tree
    // (probe): count exactly +3 over the 1,134 pin and
    // all 3 new /blog/ URLs present in the executed set.
    // The blog daily batch of 2026-11-09 (Lata M6.4
    // earthquake, USSF-627 launch, Copper Mountain
    // opening day) then added its 3 post URLs → 1,140.
    // Delta verified by executing sitemap() on both
    // trees (probe): the pristine tip reproduces 1,137 /
    // a4f2011f… exactly; the merged run's count is
    // exactly +3 and all 3 new /blog/ URLs are present
    // in the executed set. The blog daily batch of
    // 2026-11-10 (USSF-627 move to Tuesday, Cempaka
    // becomes Samuel, Northern Taurids peak) then added
    // its 3 post URLs → 1,143 (3e53bd6a…). Delta verified
    // by executing sitemap() on the merged tree (probe):
    // count exactly +3 over the 1,140 pin and all 3 new
    // /blog/ URLs present in the executed set.
    // The staged blog daily batches of 2026-11-11 to
    // 2026-11-16 (Storm Charles + Breckenridge + USSF-627
    // third attempt; USSF-627 launch + Kilauea Ep 57 +
    // Voyager; Vulcan/Starship double launch + Vail/Winter
    // Park + Sierra storm; Starship orbit + Wolf Creek +
    // Mayon dome + the two Jameson-requested stories;
    // Starship ship catch + Sugar/Cataloochee + Leonids;
    // Cyclone Akvan + Cyclone Xavier + UK snow warning)
    // then added their 20 post URLs → 1,163 (e04f8273…).
    // Delta verified by executing sitemap() on the merged
    // tree (probe, 2026-11-16): count exactly +20 over the
    // 1,143 pin and all 20 new /blog/ URLs present in the
    // executed set (the 3 newest slugs verified explicitly).
    // The blog daily batch of 2026-11-17 (Banda Sea M6.6
    // earthquake + Cyclone Akvan severe/Orange Message +
    // Killington opening day) then added its 3 post URLs
    // → 1,166 (a217c396…). Delta verified by executing
    // sitemap() on the merged tree (probe, 2026-11-17):
    // count exactly +3 over the 1,163 pin and all 3 new
    // /blog/ URLs present in the executed set.
    // The blog daily batch of 2026-11-18 (Voyager 1 one
    // light-day + Cyclone Xavier Category 5 + USSF-317
    // moves to November 19) then added its 3 post URLs
    // → 1,169 (7ffce59b…). Delta verified by executing
    // sitemap() on the merged tree (probe, 2026-11-18):
    // count exactly +3 over the 1,166 pin and all 3 new
    // /blog/ URLs present in the executed set.
    // The blog daily batch of 2026-11-19 (Cyclone Akvan
    // veers north + Snowbowl and Solitude open early +
    // Cyclone Xavier weakens to Category 4) then added
    // its 3 post URLs → 1,172 (e374f73e…). Delta verified
    // by executing sitemap() on the merged tree (probe,
    // 2026-11-19): count exactly +3 over the 1,169 pin
    // and all 3 new /blog/ URLs present in the executed set.
    // The blog daily batch of 2026-11-20 (Cyclone Akvan
    // landfall at Gopalpur + Florida Space Coast record
    // flooding + Dragon CRS-35 undocking) then added
    // its 3 post URLs → 1,175 (09693559…). Delta verified
    // by executing sitemap() on the merged tree (probe,
    // 2026-11-20): count exactly +3 over the 1,172 pin
    // and all 3 new /blog/ URLs present in the executed set.
    // The blog daily batch of 2026-11-21 (M6.8 earthquake
    // near Timor-Leste + M6.7 earthquake in central Peru +
    // Palisades Tahoe opening day) then added its 3 post
    // URLs → 1,178 (ea500310…). Delta verified by executing
    // sitemap() on the merged tree (probe, 2026-11-21):
    // count exactly +3 over the 1,175 pin and all 3 new
    // /blog/ URLs present in the executed set.
    // The blog daily batch of 2026-11-22 (Kilauea episode
    // 57 precursory activity + SpaceX NROL-136 record
    // pad turnaround + Sugar Bowl opening day) then added
    // its 3 post URLs → 1,181 (1d00d880…). Delta verified
    // by executing sitemap() on the merged tree (probe,
    // 2026-11-22): count exactly +3 over the 1,178 pin
    // and all 3 new /blog/ URLs present in the executed set.
    expect(hash).toBe(
      "1d00d880507ad32dde90e4e2070744b91dc88bcdb635c022c76d7476c1541644",
    );
  });

  it("applies the R38 thin-wall tiering to the wall families", () => {
    const has = (path: string) => byUrl.has(`${BASE}${path}`);
    // Tiered out: volcano 3, national-park 6, university 25.
    for (const p of [
      "/volcano-webcams/etna",
      "/volcano-webcams/bromo",
      "/volcano-webcams/ruapehu",
      "/national-park-webcams/grand-canyon",
      "/national-park-webcams/isle-royale",
      "/national-park-webcams/grand-teton",
      "/national-park-webcams/kenai-fjords",
      "/national-park-webcams/black-canyon-of-the-gunnison",
      "/national-park-webcams/olympic",
      "/university-webcams/uc-santa-barbara",
      "/university-webcams/yonsei-university",
    ]) {
      expect(has(p), p).toBe(false);
    }
    expect(rows.some((r) => r.url.startsWith(`${BASE}/university-webcams/`))).toBe(false);
    // Hubs always stay, and so do the spokes at/above the line
    // (crater-lake and bryce-canyon sit exactly on 5).
    for (const p of [
      "/surf-webcams",
      "/beach-webcams",
      "/train-webcams",
      "/volcano-webcams",
      "/national-park-webcams",
      "/interstate-cameras",
      "/university-webcams",
      "/border-crossings",
      "/volcano-webcams/kilauea",
      "/national-park-webcams/crater-lake",
      "/national-park-webcams/bryce-canyon",
      "/national-park-webcams/yellowstone",
      "/surf-webcams/santa-cruz",
      "/beach-webcams/santa-monica",
      "/train-webcams/lincoln",
      "/interstate-cameras/i-40",
    ]) {
      expect(has(p), p).toBe(true);
    }
    // Border exemption: even the camera-thin crossings stay listed —
    // their substance is the CBP wait-time table (lib/indexation-gates).
    for (const p of [
      "/border-crossings/houlton",
      "/border-crossings/international-falls",
      "/border-crossings/derby-line",
      "/border-crossings/brownsville",
      "/border-crossings/champlain",
    ]) {
      expect(has(p), p).toBe(true);
    }
  });

  it("applies the city/state noindex tiering (indexation fix, 2026-11-04)", () => {
    const has = (path: string) => byUrl.has(`${BASE}${path}`);
    // Tiered out: the 6 scoped count-gate cities, a sample of the 34
    // element-band failures (50–70 cameras, <2 data elements), and the
    // 2 below-line states whose §4.2 blocks do not build. Their pages
    // stay live; their templates serve noindex, so the sitemap must
    // not list them (mirrors generatedCityRobots / stateRobots via
    // the same gate functions — src/lib/indexation-gates.ts).
    for (const p of [
      "/city-webcams/albany",
      "/city-webcams/cleveland",
      "/city-webcams/marysville",
      "/city-webcams/riverside",
      "/city-webcams/san-bernardino",
      "/city-webcams/yoakum",
      "/city-webcams/birmingham",
      "/city-webcams/leon",
      "/city-webcams/mobile",
      "/city-webcams/laramie",
      "/city-webcams/stafford",
      "/city-webcams/tatsuno-city",
      "/us-traffic-cameras/mississippi",
      "/us-traffic-cameras/rhode-island",
    ]) {
      expect(has(p), p).toBe(false);
    }
    // Still listed: big cities, band cities with ≥2 elements, and DC
    // (below the state line but both §4.2 blocks build). iida-city
    // and kakogawa-city joined the listed set under the 2026-11-06
    // language-aware amendment (their Route designations now parse);
    // leon above stays tiered out — its corridors now parse too, but
    // a single DGT source and a single (traffic) kind are honestly
    // only one element.
    for (const p of [
      "/city-webcams/austin",
      "/city-webcams/newcastle",
      "/city-webcams/milwaukee",
      "/city-webcams/los-angeles",
      "/city-webcams/seoul",
      "/city-webcams/iida-city",
      "/city-webcams/kakogawa-city",
      "/us-traffic-cameras/district-of-columbia",
      "/us-traffic-cameras/utah",
    ]) {
      expect(has(p), p).toBe(true);
    }
  });

  it("still lists transit URLs from the live feeds", () => {
    const transit = rows.filter((r) => r.url.startsWith(`${BASE}/transit`));
    // R17 index policy (2026-10-31): the sitemap carries only the
    // indexable subset — national/state/agency hubs + rail, BRT and
    // flagship bus routes. With every feed up that is ~170 URLs; a
    // feed that fails to load at sitemap time omits its agency
    // (pre-existing behaviour), so the floor only insists the family
    // is really there (22 hubs max → >40 means route keepers are
    // in), while the ceiling is the policy invariant: nowhere near
    // the ~1,300 route URLs the family used to list.
    expect(transit.length).toBeGreaterThan(40);
    expect(transit.length).toBeLessThan(400);
    expect(transit.some((r) => r.url === `${BASE}/transit`)).toBe(true);
    expect(transit.some((r) => /shuttle/i.test(r.url))).toBe(false);
  });

  it("lists live wildfire incident URLs structurally (feed-derived, never pinned)", () => {
    const incidents = rows.filter((r) => r.url.startsWith(`${BASE}/wildfires/`));
    const seen = new Set<string>();
    for (const r of incidents) {
      const slug = r.url.slice(`${BASE}/wildfires/`.length);
      expect(slug, r.url).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(seen.has(r.url), r.url).toBe(false);
      seen.add(r.url);
      if (r.lastModified) {
        // The perimeter's own timestamp — past, plausible, never future.
        const t = Date.parse(r.lastModified);
        expect(t, r.url).toBeGreaterThanOrEqual(Date.parse("2020-01-01"));
        expect(t, r.url).toBeLessThanOrEqual(Date.now());
      }
    }
    // The hub itself is a committed URL and stays in the pinned set.
    expect(byUrl.has(`${BASE}/wildfires`)).toBe(true);
  });
});

describe("sitemap lastmod policy", () => {
  it("leaves the homepage undated (live app surface, not snapshot content)", () => {
    expect(lm("/")).toBeNull();
  });

  it("dates the catalogue families with the catalogue snapshot's generatedAt", () => {
    expect(lm("/cameras")).toBe(CATALOGUE);
    expect(lm("/cameras/countries")).toBe(CATALOGUE);
    expect(lm("/cameras/countries/japan")).toBe(CATALOGUE);
    expect(lm("/airport-webcams/atl-hartsfield-jackson")).toBe(CATALOGUE);
    for (const p of [
      "/live-webcams",
      "/europe-live-cameras",
      "/live-traffic-cameras",
      "/beach-webcams",
      "/airport-webcams",
      "/japan-traffic-cameras",
      "/germany-traffic-cameras",
    ]) {
      expect(lm(p), p).toBe(CATALOGUE);
    }
  });

  it("dates the Menu #2 Wave A pages (per-volcano, per-place aurora) with the catalogue snapshot", () => {
    // R38 (2026-10-31): etna, bromo and ruapehu are tiered out of
    // the sitemap (thin walls — lib/indexation-gates), so they have
    // no entry to date; the seven remaining volcano spokes keep
    // the catalogue date.
    for (const slug of [
      "kilauea", "reykjanes", "katla", "vesuvius",
      "sakurajima", "merapi", "fuji",
    ]) {
      expect(lm(`/volcano-webcams/${slug}`), slug).toBe(CATALOGUE);
    }
    for (const slug of ["etna", "bromo", "ruapehu"]) {
      expect(lm(`/volcano-webcams/${slug}`), slug).toBeUndefined();
    }
    for (const slug of [
      "fairbanks", "anchorage", "duluth", "marquette", "churchill",
      "reykjavik", "akureyri", "tromso", "alta", "lofoten",
      "rovaniemi", "levi", "abisko",
    ]) {
      expect(lm(`/northern-lights-webcams/${slug}`), slug).toBe(CATALOGUE);
    }
  });

  it("dates the Menu #2 Wave B1 pages (animal hub + stars, university hub + pages) with the catalogue snapshot", () => {
    expect(lm("/animal-webcams")).toBe(CATALOGUE);
    for (const slug of [
      "tembe-elephant-park", "masai-mara", "nkorho-kruger", "olifants-river",
      "tsavo-east", "san-diego-zoo", "kumamoto-city-zoo", "gaia-zoo",
      "belize-zoo", "awaji-island-monkey-center", "hula-nature-reserve",
      "konya-animal-shelter",
    ]) {
      expect(lm(`/animal-webcams/${slug}`), slug).toBe(CATALOGUE);
    }
    expect(lm("/university-webcams")).toBe(CATALOGUE);
    // R38 (2026-10-31): every university spoke is a thin wall
    // (richest registry set is 4 cameras — lib/indexation-gates),
    // so all 25 are tiered out of the sitemap; the hub above stays
    // and keeps the catalogue date.
    for (const slug of [
      "uc-santa-barbara", "vanderbilt-university", "columbia-university",
      "boston-university", "furman-university", "michigan-state-university",
      "west-virginia-university", "warren-wilson-college",
      "worcester-state-university", "university-of-hawaii-manoa",
      "navajo-technical-university", "cuny", "university-of-twente",
      "newcastle-university", "university-of-bristol", "tu-berlin",
      "bucharest-university-of-economic-studies", "ansan-university",
      "dongeui-university", "kyungpook-national-university",
      "jeonnam-university", "silla-university",
      "incheon-catholic-university", "incheon-global-campus",
      "yonsei-university",
    ]) {
      expect(lm(`/university-webcams/${slug}`), slug).toBeUndefined();
    }
  });

  it("dates the Menu #2 Wave C part 2 radar pages with the catalogue snapshot and leaves the wildfires hub undated", () => {
    expect(lm("/weather-radar")).toBe(CATALOGUE);
    for (const slug of [
      "atlanta", "dallas", "salt-lake-city", "houston", "minneapolis",
      "orlando", "portland", "seattle", "tampa", "washington-dc",
      "new-york-city", "denver", "philadelphia", "las-vegas",
      "los-angeles", "kansas-city", "norfolk-virginia-beach", "phoenix",
      "san-antonio", "jacksonville", "st-louis",
    ]) {
      expect(lm(`/weather-radar/${slug}`), slug).toBe(CATALOGUE);
    }
    // The hub is a live view over the federal feed — no honest date.
    expect(lm("/wildfires")).toBeNull();
  });

  it("dates the per-ship pages with the registry verification date", () => {
    const verified = new Date(REGISTRY_VERIFIED_AT).toISOString();
    expect(lm("/ships")).toBe(verified);
    for (const s of SHIPS) {
      expect(lm(`/ships/${s.slug}`), s.slug).toBe(verified);
    }
  });

  it("dates the ten editorial cities like their generated siblings' walls", () => {
    for (const slug of [
      "london", "ottawa", "toronto", "madrid", "houston",
      "dallas", "tokyo", "sydney", "auckland", "fort-worth",
    ]) {
      expect(lm(`/city-webcams/${slug}`), slug).toBe(CATALOGUE);
    }
  });

  it("dates city pages and hubs with the city dataset's generatedAt", () => {
    expect(lm("/city-webcams/austin")).toBe(CITY);
    expect(lm("/city-webcams")).toBe(CITY);
    expect(lm("/world-city-webcams")).toBe(CITY);
  });

  it("dates state pages and their hub with the state index's generatedAt", () => {
    expect(lm("/us-traffic-cameras/utah")).toBe(STATES);
    expect(lm("/us-traffic-cameras")).toBe(STATES);
  });

  it("dates ski pages and their hub with the ski dataset's generatedAt", () => {
    expect(lm("/ski-webcams/park-city")).toBe(SKI);
    expect(lm("/ski-webcams")).toBe(SKI);
    expect(lm("/ski-webcams/compare")).toBe(SKI);
  });

  it("dates the index and report pages with their own files' generatedAt", () => {
    expect(lm("/live-camera-index")).toBe(generatedAt(liveCameraIndex));
    expect(lm("/reports/camera-network-2026-10")).toBe(
      generatedAt(cameraNetworkReport),
    );
  });

  it("dates methodology with the page's own revision stamp", () => {
    expect(lm("/methodology")).toBe("2026-10-27T00:00:00.000Z");
  });

  it("dates blog posts with their own dates and the hub with the latest", () => {
    const first = POSTS[0];
    expect(lm(`/blog/${first.slug}`)).toBe(
      new Date(first.updated ?? first.date).toISOString(),
    );
    const latest = POSTS.reduce(
      (max, p) => {
        const d = p.updated ?? p.date;
        return d > max ? d : max;
      },
      POSTS[0].updated ?? POSTS[0].date,
    );
    expect(lm("/blog")).toBe(new Date(latest).toISOString());
  });

  it("leaves undated everything with no honest date source", () => {
    for (const p of [
      "/features",
      "/pricing",
      "/faq",
      "/compare/acled",
      "/alternatives",
      "/alternatives/windy",
      "/best-osint-tools",
      "/live-plane-spotting",
      "/live-flight-tracker",
      "/ship-tracker",
      "/northern-lights-webcams",
      "/north-america-webcams",
      "/enterprise",
      "/random",
    ]) {
      expect(lm(p), p).toBeNull();
    }
  });

  it("gives every transit lastmod a plausible feed-vintage date", () => {
    const dated = rows.filter(
      (r) => r.url.startsWith(`${BASE}/transit`) && r.lastModified,
    );
    expect(dated.length).toBeGreaterThan(0);
    for (const r of dated) {
      const t = Date.parse(r.lastModified!);
      expect(t, r.url).toBeGreaterThanOrEqual(Date.parse("2020-01-01"));
      expect(t, r.url).toBeLessThan(Date.parse("2028-01-01"));
    }
    // The /transit hub spans every agency's feed — no single vintage.
    expect(lm("/transit")).toBeNull();
  });

  it("never emits a future lastmod (SEO audit fix #2)", () => {
    // The 2026-10-27 audit found 55 future-dated entries — a GTFS
    // validity end date stamped as a version date plus posts dated
    // tomorrow. The generator now drops any artefact date ahead of
    // today instead of emitting it.
    const now = Date.now();
    for (const r of rows) {
      if (!r.lastModified) continue;
      expect(Date.parse(r.lastModified), r.url).toBeLessThanOrEqual(now);
    }
  });
});

/**
 * Localized entries (multilingual foundation, 2026-10-26; merged into
 * this suite by the 2026-10-27 rebase): every manifest-published
 * page × locale appears exactly once with the reciprocal hreflang
 * map; the six English source entries carry the same map; no other
 * entry gained alternates; es entries carry the manifest's
 * translation date as lastModified (never request-time "now").
 */
describe("sitemap — localized entries", () => {
  const ES_SLUGS: Record<string, string> = {
    // The es homepage is the bare /es — /es/ 308-redirects to it, so
    // the sitemap lists the final form (SEO audit 2026-10-27, fix #3).
    "": "https://worldeye.app/es",
    pricing: "https://worldeye.app/es/pricing",
    "live-webcams": "https://worldeye.app/es/live-webcams",
    faq: "https://worldeye.app/es/faq",
    "live-flight-tracker": "https://worldeye.app/es/live-flight-tracker",
    "ship-tracker": "https://worldeye.app/es/ship-tracker",
  };
  const EN_URLS: Record<string, string> = {
    "": "https://worldeye.app/",
    pricing: "https://worldeye.app/pricing",
    "live-webcams": "https://worldeye.app/live-webcams",
    faq: "https://worldeye.app/faq",
    "live-flight-tracker": "https://worldeye.app/live-flight-tracker",
    "ship-tracker": "https://worldeye.app/ship-tracker",
  };

  it("lists each Spanish URL exactly once", () => {
    for (const url of Object.values(ES_SLUGS)) {
      expect(rawEntries.filter((e) => e.url === url)).toHaveLength(1);
    }
    const esEntries = rawEntries.filter(
      (e) =>
        e.url === "https://worldeye.app/es" ||
        e.url.startsWith("https://worldeye.app/es/"),
    );
    expect(esEntries).toHaveLength(6);
  });

  it("gives every es entry the reciprocal hreflang map and the manifest date", () => {
    for (const [slug, esUrl] of Object.entries(ES_SLUGS)) {
      const entry = rawByUrl.get(esUrl);
      expect(entry, esUrl).toBeDefined();
      expect(entry?.alternates?.languages).toEqual(hreflangMapFor(slug));
      const manifestEntry = MANIFEST_ENTRIES.find(
        (e) => e.slug === slug && e.locale === "es",
      );
      expect(entry?.lastModified).toEqual(new Date(manifestEntry!.updatedAt!));
    }
  });

  it("gives the six English entries the identical hreflang map", () => {
    for (const [slug, enUrl] of Object.entries(EN_URLS)) {
      expect(rawByUrl.get(enUrl)?.alternates?.languages, enUrl).toEqual(
        hreflangMapFor(slug),
      );
    }
  });

  it("leaves every other entry without alternates", () => {
    const withAlternates = rawEntries.filter((e) => e.alternates?.languages);
    // 6 English + 6 Spanish, nothing else.
    expect(withAlternates).toHaveLength(12);
    expect(
      rawByUrl.get("https://worldeye.app/features")?.alternates,
    ).toBeUndefined();
  });
});
