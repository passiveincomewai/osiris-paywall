import type { Viewport } from "next";
import { Audiowide, Fraunces, JetBrains_Mono, Public_Sans } from "next/font/google";
import ErrorBoundary from '@/components/ErrorBoundary';
import SilentBoundary from '@/components/SilentBoundary';
import AffiliateAttributionSync from '@/components/AffiliateAttributionSync';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import MetaPixel from '@/components/MetaPixel';
import TranslateGate from '@/components/translate/TranslateGate';
import CaptureIndicator from '@/components/recording/CaptureIndicator';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';
import TrialPrompt from '@/components/TrialPrompt';
import NewsletterAccountPopup from '@/components/NewsletterAccountPopup';
import PreferencesProvider from '@/components/PreferencesProvider';
import DeviceHeartbeat from '@/components/DeviceHeartbeat';
import { buildEntityJsonLd } from "@/lib/seo/entity-schema";
import { LOCALES, type LocaleCode } from "@/i18n/config";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import "@/app/globals.css";

/* ── Type system (self-hosted via next/font; no runtime font requests) ──
   The variable classes land on <html> and define the CSS custom properties
   the design tokens in globals.css point at:
     --font-body     Public Sans — humanist UI/body face (was Inter)
     --font-display  Fraunces — editorial serif for landing headlines
     --font-hud      JetBrains Mono — data/labels (unchanged family)
     --font-wordmark Audiowide — brand wordmark only (matches the logo)  */
const fontBody = Public_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
});
const fontDisplay = Fraunces({
  subsets: ["latin"],
  // Variable weight range: with `axes` present, next/font requires the
  // weight to be the variable axis itself, not a static list — the full
  // 100–900 wght range (incl. the 400–700 the type scale uses) is served.
  weight: "variable",
  axes: ["opsz"],
  display: "swap",
  variable: "--font-display",
  // Perf pass 2026-10-26: Fraunces styles only below-fold landing/footer
  // headlines — nothing in the first paint. Preloading its variable file
  // (~67 KB wire) taxed every page's critical path for text most visitors
  // have not scrolled to yet. The face still loads on demand via its
  // @font-face the moment a headline renders, with swap as before.
  preload: false,
});
const fontHud = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-hud",
});
const fontWordmark = Audiowide({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-wordmark",
  // Perf pass 2026-10-26: same reasoning as Fraunces — the wordmark face
  // is not used by the globe's first paint (the splash/header wordmark is
  // the logo image), so its file leaves the preload set and loads on use.
  preload: false,
});


/**
 * The shared root shell: fonts, the entity JSON-LD graph and the
 * global chrome mounts, rendered identically for every locale tree.
 * Extracted from the production src/app/layout.tsx (2026-10-27 rebase
 * of the i18n foundation onto tip a3fbb3e5) so the (en) tree renders
 * byte-identically — including the 2026-10-26 perf pass (Fraunces /
 * Audiowide preload:false and the CARTO preconnect hints) that the
 * original staged RootShell predated. The [locale] tree reuses it
 * with its own locale so <html lang>/<dir> are correct per language.
 *
 * Metadata and viewport cannot live here — Next reads those exports
 * from layout files only — so the shared constants below are exported
 * for both layout files to build theirs from.
 */
export const SITE_URL = "https://worldeye.app";
export const SITE_NAME = "WorldEye";
export const SITE_TITLE = "WorldEye — Live Cams, Flights & Satellites on a 3D Globe";
export const SITE_DESCRIPTION = "Watch 74,229 live cams, track flights live and follow satellites on WorldEye's free 3D globe — no signup. Go Pro for the AI analyst, live traffic and premium intel feeds.";

export const siteViewport: Viewport = {
  themeColor: "#D4AF37",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

export const SITE_KEYWORDS = [
    // OSINT Tools - Primary focus
    "OSINT tools", "free OSINT tools", "online OSINT toolkit", "OSINT framework",
    "nmap online", "nmap scanner online", "free nmap scan", "port scanner online",
    "DNS lookup tool", "WHOIS lookup", "reverse DNS", "DNS records",
    "SSL certificate checker", "certificate transparency", "cert lookup",
    "BGP routing lookup", "ASN lookup", "IP geolocation",
    "threat intelligence", "threat intel lookup", "IP reputation check",
    "network reconnaissance", "recon tools", "penetration testing tools",
    "cybersecurity tools", "infosec tools", "security scanner",
    "linux OSINT tools", "kali linux tools online", "OSINT browser tools",

    // Intelligence Platform
    "OSINT", "open source intelligence", "intelligence platform", "global intelligence",
    "geospatial intelligence", "GEOINT", "SIGINT", "real-time tracking",
    "palantir alternative", "open source palantir", "intelligence dashboard",

    // Tracking & Data
    "flight tracker", "aircraft tracking", "ADS-B tracker", "live flight radar",
    "satellite tracking", "ISS tracker", "space station tracker",
    "CCTV cameras live", "security cameras worldwide", "live cameras",
    "earthquake monitor", "seismic activity", "USGS earthquake",
    "wildfire tracker", "NASA FIRMS", "active fires",
    "nuclear facilities map", "nuclear power plants",
    "severe weather alerts", "weather radar",
    "cyber threats dashboard", "CVE tracker",
    "space weather", "solar storm", "GPS jamming",
    "defense stocks", "commodities tracker",

    // Brand
    "worldeye",
  ];

export const SITE_ICONS = {
    icon: [
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/android-chrome-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
    shortcut: "/favicon.ico",
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/apple-touch-icon.png",
      },
    ],
  };

// JSON-LD Structured Data — canonical brand entity graph
// (Organization / WebSite / WebApplication), built and unit-tested
// in @/lib/seo/entity-schema.
const jsonLd = buildEntityJsonLd(SITE_URL, SITE_DESCRIPTION);
export default function RootShell({
  locale,
  children,
}: {
  locale: LocaleCode;
  children: React.ReactNode;
}) {
  const attrs = LOCALES[locale];
  return (
    <html
      lang={attrs.hreflang}
      dir={attrs.dir}
      className={`${fontBody.variable} ${fontDisplay.variable} ${fontHud.variable} ${fontWordmark.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Perf pass 2026-10-26: the globe's style JSON, sprites, glyphs
            and tiles all come from CARTO's basemap CDN, but the browser
            only discovered that origin after the map chunk downloaded,
            parsed and ran — a cold DNS+TLS handshake sat inside the
            time-to-first-tile on every fresh visit. Warm it up front;
            pages without a map pay one idle handshake and nothing else. */}
        <link rel="preconnect" href="https://basemaps.cartocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://basemaps.cartocdn.com" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

      </head>
      <body className="antialiased">
        {/* Global chrome: each mount gets its own SilentBoundary so a
            failure in any one of them degrades to "that widget is
            absent" — never a dead app. (A root-layout render loop in
            the capture indicator took down every page on 2026-10-20
            precisely because these mounts sat outside any boundary.) */}
        <SilentBoundary name="AffiliateAttributionSync">
          <AffiliateAttributionSync />
        </SilentBoundary>
        <SilentBoundary name="AnalyticsTracker">
          <AnalyticsTracker />
        </SilentBoundary>
        <SilentBoundary name="MetaPixel">
          <MetaPixel />
        </SilentBoundary>
        <SilentBoundary name="TranslateGate">
          <TranslateGate />
        </SilentBoundary>
        <SilentBoundary name="CaptureIndicator">
          <CaptureIndicator />
        </SilentBoundary>
        <SilentBoundary name="PwaInstallPrompt">
          <InstallPrompt />
        </SilentBoundary>
        <SilentBoundary name="PwaServiceWorkerRegister">
          <ServiceWorkerRegister />
        </SilentBoundary>
        <SilentBoundary name="TrialPrompt">
          <TrialPrompt />
        </SilentBoundary>
        {/* Post-newsletter-signup account popup (conversion test,
            2026-10-29): renders nothing until NewsletterForm reports a
            subscribe; the Google gate mirrors auth.ts's provider
            config, the same check the signup page makes. */}
        <SilentBoundary name="NewsletterAccountPopup">
          <NewsletterAccountPopup
            googleEnabled={!!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)}
          />
        </SilentBoundary>
        <SilentBoundary name="DeviceHeartbeat">
          <DeviceHeartbeat />
        </SilentBoundary>
        <ErrorBoundary name="WorldEye">
          <PreferencesProvider>
            <LocaleProvider locale={locale}>{children}</LocaleProvider>
          </PreferencesProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
