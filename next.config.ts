import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      'maplibre-gl.mjs': {
        loaders: [`${__dirname}/tools/maplibre-url-loader.cjs`],
        as: '*.js',
      },
    },
  },
  /* Standalone output exists for the Docker image — the Dockerfile copies
     .next/standalone. Vercel builds its own artifacts and does not want it:
     since the 16.2.6 -> 16.3.4 bump its adapter fails packaging with
     `ENOENT .next/next-server.js.nft.json` in onBuildComplete when a
     Turbopack build also emits standalone. The build itself compiles fine,
     which is why this only ever shows up on a deploy. Keep standalone
     everywhere except Vercel, so Docker and the platform both get what they
     expect. */
  output: process.env.VERCEL ? undefined : 'standalone',
  /* onnxruntime-web runs the camera detector for forecasts, and loads its
     WebAssembly engine from its own folder at run time: bundling it would
     move the code away from the engine, so it stays a package, and the
     standalone build is told to bring the two engine files along. */
  serverExternalPackages: ['ws', 'onnxruntime-web'],
  outputFileTracingIncludes: {
    '/api/**': ['./node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs', './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm', './src/lib/studio/fonts/files/*.ttf'],
  },
  transpilePackages: ['react-map-gl', 'mapbox-gl', 'maplibre-gl'],
  // Type errors block the build again. They were suppressed while 17 stood
  // unfixed; those are cleared, so the gate can do its job — the AstraPanel
  // crash (createPortal used without an import) shipped precisely because
  // nothing stopped it.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Dedupe: /flightradar24-alternative (SEO batch) and /alternatives/flightradar24
  // (comparison system) target the same intent — canonicalize on the richer page.
  async redirects() {
    return [
      {
        // Marathon consolidation (site-audit R3, 2026-10-31): the dated
        // /nyc-marathon-2026 page is the single canonical marathon page —
        // it carries the richer course-line wall (18-point course polyline,
        // camerasAlongRoute within 2.5 km, grouped into five borough walls
        // with per-camera distance captions) with catalogue-computed
        // counts. The undated evergreen page (5 anchors, 2 km) duplicated
        // the intent with contradictory counts, so its route is retired
        // and 301s here. Like the other redirect sources above/below, the
        // source route has no page directory.
        source: '/nyc-marathon',
        destination: '/nyc-marathon-2026',
        permanent: true,
      },
      {
        source: '/flightradar24-alternative',
        destination: '/alternatives/flightradar24',
        permanent: true,
      },
      {
        // EarthCam's alternatives owner is the standalone
        // /earthcam-alternative page (the category's highest-volume
        // alternative query) — /alternatives/earthcam canonicalizes
        // there instead of becoming a third EarthCam page. The
        // /alternatives hub itself is a real page since C7
        // (src/app/alternatives/page.tsx); it is no longer redirected
        // to /compare.
        source: '/alternatives/earthcam',
        destination: '/earthcam-alternative',
        permanent: true,
      },
      // Legacy short paths (SEO batch, 2026-10-26): every source below was
      // probed live and returns 404 today; each maps to the one page that
      // now owns the intent. These cover the classic pre-restructure and
      // guessable URLs (auth, trackers, camera hubs) so any lingering
      // external links or bookmarks land somewhere useful instead of 404.
      // (/ships was in this list until 2026-10-28, when it became a real
      // page — the cruise-ship tracker hub; do not re-add it.)
      { source: '/login', destination: '/signin', permanent: true },
      { source: '/sign-in', destination: '/signin', permanent: true },
      { source: '/register', destination: '/signup', permanent: true },
      { source: '/account', destination: '/settings', permanent: true },
      { source: '/home', destination: '/', permanent: true },
      { source: '/globe', destination: '/', permanent: true },
      { source: '/world-eye', destination: '/', permanent: true },
      { source: '/osiris', destination: '/alternatives/osiris', permanent: true },
      { source: '/flight-tracker', destination: '/live-flight-tracker', permanent: true },
      { source: '/flights', destination: '/live-flight-tracker', permanent: true },
      { source: '/satellites', destination: '/satellite-tracker', permanent: true },
      { source: '/satellite', destination: '/satellite-tracker', permanent: true },
      { source: '/earthquakes', destination: '/earthquake-tracker', permanent: true },
      { source: '/weather', destination: '/weather-tracker', permanent: true },
      { source: '/live-cameras', destination: '/live-webcams', permanent: true },
      { source: '/live', destination: '/live-webcams', permanent: true },
      { source: '/webcams', destination: '/live-webcams', permanent: true },
      { source: '/cctv', destination: '/cameras', permanent: true },
      { source: '/traffic-cameras', destination: '/live-traffic-cameras', permanent: true },
      { source: '/countries', destination: '/cameras/countries', permanent: true },
      { source: '/cities', destination: '/city-webcams', permanent: true },
      // GSC 404 bucket (2026-10-26): Google crawled these exact paths and
      // got 404s. /week, /month, /year are the pricing page's billing
      // periods as bare paths (no in-repo linker; lingering external or
      // guessed URLs) — the pricing page owns the intent. /docs has no
      // page and no in-repo linker either; /faq is the site's help
      // surface (no help-centre or API-docs route exists), so it owns it.
      { source: '/week', destination: '/pricing', permanent: true },
      { source: '/month', destination: '/pricing', permanent: true },
      { source: '/year', destination: '/pricing', permanent: true },
      { source: '/docs', destination: '/faq', permanent: true },
      // C10 threshold enforcement (§4.5, owner-approved 2026-10-27):
      // countries below the substance line (<25 cameras AND <3 areas)
      // are consolidated into their regional hub — the standalone page
      // is retired, the URL 301s to the country's anchored row on the
      // hub (Africa has no hub yet, so its four land on their anchored
      // directory rows), and the sitemap drops the URL. The set is
      // derived in src/lib/indexation-gates.ts; this literal table is
      // pinned against it by indexation-gates.test.ts — regenerate
      // both together after a catalogue rebuild. Iran is below the
      // line but excluded by the traffic gate (59 PV/28d) — see the
      // gates module.
      { source: '/cameras/countries/albania', destination: '/europe-live-cameras#albania', permanent: true },
      { source: '/cameras/countries/armenia', destination: '/europe-live-cameras#armenia', permanent: true },
      { source: '/cameras/countries/azerbaijan', destination: '/europe-live-cameras#azerbaijan', permanent: true },
      { source: '/cameras/countries/barbados', destination: '/north-america-webcams#barbados', permanent: true },
      { source: '/cameras/countries/bermuda', destination: '/north-america-webcams#bermuda', permanent: true },
      { source: '/cameras/countries/bolivia', destination: '/south-america-webcams#bolivia', permanent: true },
      { source: '/cameras/countries/bonaire', destination: '/north-america-webcams#bonaire', permanent: true },
      { source: '/cameras/countries/christmas-island', destination: '/oceania-webcams#christmas-island', permanent: true },
      { source: '/cameras/countries/curacao', destination: '/north-america-webcams#curacao', permanent: true },
      { source: '/cameras/countries/czechia', destination: '/europe-live-cameras#czechia', permanent: true },
      { source: '/cameras/countries/denmark', destination: '/europe-live-cameras#denmark', permanent: true },
      { source: '/cameras/countries/egypt', destination: '/cameras/countries#egypt', permanent: true },
      { source: '/cameras/countries/faroe-islands', destination: '/europe-live-cameras#faroe-islands', permanent: true },
      { source: '/cameras/countries/grenada', destination: '/north-america-webcams#grenada', permanent: true },
      { source: '/cameras/countries/guadeloupe', destination: '/north-america-webcams#guadeloupe', permanent: true },
      { source: '/cameras/countries/honduras', destination: '/north-america-webcams#honduras', permanent: true },
      { source: '/cameras/countries/jordan', destination: '/asia-webcams#jordan', permanent: true },
      { source: '/cameras/countries/lebanon', destination: '/asia-webcams#lebanon', permanent: true },
      { source: '/cameras/countries/madagascar', destination: '/cameras/countries#madagascar', permanent: true },
      { source: '/cameras/countries/martinique', destination: '/north-america-webcams#martinique', permanent: true },
      { source: '/cameras/countries/morocco', destination: '/cameras/countries#morocco', permanent: true },
      { source: '/cameras/countries/north-macedonia', destination: '/europe-live-cameras#north-macedonia', permanent: true },
      { source: '/cameras/countries/oman', destination: '/asia-webcams#oman', permanent: true },
      { source: '/cameras/countries/san-marino', destination: '/europe-live-cameras#san-marino', permanent: true },
      { source: '/cameras/countries/saudi-arabia', destination: '/asia-webcams#saudi-arabia', permanent: true },
      { source: '/cameras/countries/senegal', destination: '/cameras/countries#senegal', permanent: true },
      { source: '/cameras/countries/serbia', destination: '/europe-live-cameras#serbia', permanent: true },
      { source: '/cameras/countries/singapore', destination: '/asia-webcams#singapore', permanent: true },
      { source: '/cameras/countries/sint-maarten', destination: '/north-america-webcams#sint-maarten', permanent: true },
      { source: '/cameras/countries/slovakia', destination: '/europe-live-cameras#slovakia', permanent: true },
      { source: '/cameras/countries/sri-lanka', destination: '/asia-webcams#sri-lanka', permanent: true },
      { source: '/cameras/countries/uruguay', destination: '/south-america-webcams#uruguay', permanent: true },
      { source: '/cameras/countries/vatican-city', destination: '/europe-live-cameras#vatican-city', permanent: true },
      { source: '/cameras/countries/venezuela', destination: '/south-america-webcams#venezuela', permanent: true },
      { source: '/cameras/countries/yemen', destination: '/asia-webcams#yemen', permanent: true },
      // C10 ski folds (§4.5): resorts with no facts row and a failing
      // camera prong fold into the /ski-webcams hub as listed resorts
      // without detail pages. Same derivation + pin as above
      // (FOLDED_RESORT_SLUGS in the gates module).
      { source: '/ski-webcams/gudauri', destination: '/ski-webcams', permanent: true },
      { source: '/ski-webcams/high1-resort', destination: '/ski-webcams', permanent: true },
    ];
  },
  async headers() {
    return [
      /* The worker path carries the MapLibre version, so a given URL never
         changes contents — a version bump moves it. Next serves public/ with
         max-age=0, which made every page load refetch half a megabyte before
         the map could start. Immutable is safe here precisely because the
         version is in the path. */
      {
        source: '/vendor/maplibre/:version/:file*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // The camera detector's model: versioned in its path like the map worker, so the same URL never changes.
      {
        source: '/vendor/yolox/:version/:file*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/((?!embed/).*)',  // everything except the enterprise embed (its own rule follows)
        headers: [
          { key: 'Content-Security-Policy', value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: wss: data: blob:;" },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      {
        // WiFi Sensing (/sensing): its RavenScope mode connects from the
        // visitor's own browser to a RavenScope program running on the
        // visitor's own computer at http://127.0.0.1:8731. The general
        // policy above refuses loopback http: connections, so this route —
        // and only this route — adds that single loopback origin to
        // connect-src. (Placed after the general rule; for a repeated
        // header key the later matching rule wins in Next.js.)
        source: '/sensing',
        headers: [
          { key: 'Content-Security-Policy', value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: wss: data: blob:; connect-src 'self' https: wss: http://127.0.0.1:8731" },
        ],
      },
      {
        // Enterprise camera embed (/embed/<feed-token>): customers paste the
        // iframe into their own sites, so framing is open — and ONLY here.
        // No X-Frame-Options; the CSP names frame-ancestors *. The feed
        // token in the URL remains the credential.
        source: '/embed/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: wss: data: blob:; frame-ancestors *" },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
