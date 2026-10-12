# WorldEye SEO Gap Analysis (2026-10-11)

## Existing coverage (from src/app/sitemap.ts)
- Core: `/`, `/features`, `/pricing`, `/about`, `/faq`, `/contact`, `/docs`, `/changelog`, `/security`, `/terms`, `/privacy`
- Trackers: `/live-flight-tracker`, `/satellite-tracker`, `/earthquake-tracker`
- Cameras: `/cameras`, `/live-webcams`, `/live-traffic-cameras`, `/world-city-webcams`, `/europe-live-cameras`, `/north-america-webcams`, `/asia-webcams`, `/oceania-webcams`, `/cameras/countries` + 30 country pages, `/city-webcams/{london,ottawa,toronto,madrid}`, `/us-traffic-cameras/{georgia,utah,texas,florida,indiana,nevada}`
- Blog: 8 posts (OSINT intro, flight tracking x2, live cameras x3, earthquake, travel planning)

## Gaps identified

### 1. Feature trackers with no dedicated page (HIGH)
- **Ship / marine vessel tracking** — the site tracks ships (AIS) but there is no `/ship-tracker` page. "ship tracker" is a high-volume query family.
- **Weather tracking** — no `/weather-tracker` page despite weather being a free layer.
- **Wildfire tracking** — no `/wildfire-tracker` page despite wildfires being a free layer.
- **Hurricane / storm tracking** — no dedicated page; seasonal spikes make this valuable.
- **ISS / space station tracking** — the satellite tracker is generic; an ISS-specific page captures distinct intent.

### 2. Glossary / "what is" definition pages (HIGH)
- `/what-is-ads-b` — the technology behind flight tracking; strong informational intent.
- `/what-is-ais` — the technology behind ship tracking.
- (Blog already covers "what is OSINT" — no dedicated page needed.)

### 3. Use-case depth (MEDIUM)
- `/use-cases` is a single page. Dedicated sub-pages for distinct audiences: journalists, emergency preparedness, travelers, educators. Each has different jobs-to-be-done and different keyword clusters.

### 4. City webcam coverage (MEDIUM)
- Only 4 cities (London, Ottawa, Toronto, Madrid). Data supports: Houston (1,158), Dallas (845), Tokyo (73), Sydney (~186). (Paris has only 2 feeds — too thin; New York has none in the index.)

### 5. Camera category pages (MEDIUM)
- No category hubs: beach/coastal webcams, ski-resort webcams, airport webcams. These match real browsing behavior ("beach cams", "ski cams").

### 6. Comparison / alternative pages (MEDIUM-HIGH)
- `/flightradar24-alternative` and `/earthcam-alternative` — classic high-intent SEO; must be honest, feature-based comparisons, not hit pieces.

### 7. Blog depth (MEDIUM)
- 8 posts is thin. Missing: AIS/ship tracking guide, weather radar reading, wildfire safety, plane spotting, OSINT for journalists, news verification with cameras, why some flights don't appear on trackers.

### 8. Deliberately skipped (spam/quality risk)
- Synonym doorway pages (`/plane-tracker` duplicating `/live-flight-tracker`).
- Single-landmark pages (Times Square webcam etc.) — too thin.
- `/volcano-tracker` — no data support in the product.
- City pages where the index has <10 feeds (Paris: 2).

## Wave 5 page list (20 new pages)
**Feature trackers:** `/ship-tracker`, `/weather-tracker`, `/wildfire-tracker`, `/hurricane-tracker`, `/space-station-tracker`
**Glossary:** `/what-is-ads-b`, `/what-is-ais`
**Comparisons:** `/flightradar24-alternative`, `/earthcam-alternative`
**Use cases:** `/use-cases/journalists`, `/use-cases/emergency-preparedness`, `/use-cases/travelers`, `/use-cases/educators`
**Cities (added to city-webcams CITIES record):** `/city-webcams/houston`, `/city-webcams/dallas`, `/city-webcams/tokyo`, `/city-webcams/sydney`
**Categories (sitemap-only):** `/beach-webcams`, `/ski-webcams`, `/airport-webcams`
