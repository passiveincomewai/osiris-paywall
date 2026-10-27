import type { Metadata, Viewport } from "next";
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
import PreferencesProvider from '@/components/PreferencesProvider';
import DeviceHeartbeat from '@/components/DeviceHeartbeat';
import { buildEntityJsonLd } from "@/lib/seo/entity-schema";
import "./globals.css";

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

const SITE_URL = "https://worldeye.app";
const SITE_NAME = "WorldEye";
const SITE_TITLE = "WorldEye — Live Cams, Flights & Satellites on a 3D Globe";
const SITE_DESCRIPTION = "Watch 74,229 live cams, track flights live and follow satellites on WorldEye's free 3D globe — no signup. Go Pro for the AI analyst, live traffic and premium intel feeds.";

export const viewport: Viewport = {
  themeColor: "#D4AF37",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | WorldEye",
  },
  description: SITE_DESCRIPTION,
  keywords: [
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
  ],
  authors: [{ name: "WorldEye", url: SITE_URL }],
  creator: "WorldEye",
  publisher: "WorldEye",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
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
  },
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "WorldEye — Live 3D Globe | Live Cams, Flights, Satellites & OSINT Tools",
    description: "Watch 74,229 live cams, track live aircraft and satellites on a free 3D globe. Go Pro for the AI analyst, live traffic and premium intel feeds.",
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "WorldEye — Live 3D Intelligence Globe",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WorldEye — Live 3D Globe | Live Cams, Flights, Satellites & OSINT Tools",
    description: "Watch 74,229 live cams and track live flights and satellites on a free 3D globe. Pro adds the AI analyst, live traffic and premium intel feeds.",
    images: [`${SITE_URL}/og-image.png`],
  },
  category: "technology",
  classification: "Intelligence & Security",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "WorldEye",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#06060C",
    "msapplication-config": "none",
  },
};

// JSON-LD Structured Data — canonical brand entity graph
// (Organization / WebSite / WebApplication), built and unit-tested
// in @/lib/seo/entity-schema.
const jsonLd = buildEntityJsonLd(SITE_URL, SITE_DESCRIPTION);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
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
        <SilentBoundary name="DeviceHeartbeat">
          <DeviceHeartbeat />
        </SilentBoundary>
        <ErrorBoundary name="WorldEye">
          <PreferencesProvider>{children}</PreferencesProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
