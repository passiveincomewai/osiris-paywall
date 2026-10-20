import type { Metadata, Viewport } from "next";
import ErrorBoundary from '@/components/ErrorBoundary';
import AffiliateAttributionSync from '@/components/AffiliateAttributionSync';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import TranslateGate from '@/components/translate/TranslateGate';
import "./globals.css";

const SITE_URL = "https://worldeye.app";
const SITE_NAME = "WorldEye";
const SITE_TITLE = "WorldEye — Live 3D Globe | Flights, CCTV & Satellites";
const SITE_DESCRIPTION = "Track flights, satellites and 74,229 live CCTV cameras on WorldEye's 3D intelligence globe — free. Go Pro for the AI analyst, satellite view and intel feeds.";

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
  manifest: "/site.webmanifest",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "WorldEye — Live 3D Intelligence Globe | Flights, CCTV, Satellites & OSINT Tools",
    description: "Track live aircraft, satellites and 74,229 worldwide CCTV cameras on a 3D globe — free. Go Pro for the AI analyst, satellite view, live traffic and premium intel feeds.",
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
    title: "🛰️ WorldEye — Live 3D Intelligence Globe | Tracking + OSINT Tools",
    description: "Track live flights, satellites & 74,229 CCTV cameras worldwide on a 3D globe — free. Pro unlocks the AI analyst, satellite view and premium intel feeds.",
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

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "WorldEye",
      url: SITE_URL,
      logo: `${SITE_URL}/worldeye-logo.png`,
      contactPoint: {
        "@type": "ContactPoint",
        email: "passiveincomewai@gmail.com",
        contactType: "customer support",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "WorldEye",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "WebApplication",
      name: "WorldEye — Live 3D Intelligence Globe & OSINT Tools",
      alternateName: ["WorldEye"],
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "SecurityApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires a modern web browser",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      featureList: [
        "Nmap port scanning from the browser — no install required",
        "DNS record lookup (A, AAAA, MX, NS, TXT, CNAME)",
        "WHOIS domain registration lookup",
        "SSL/TLS certificate transparency search",
        "BGP routing & ASN lookup",
        "IP geolocation & threat intelligence",
        "Real-time flight tracking via ADS-B",
        "Satellite tracking (including ISS)",
        "Worldwide CCTV camera monitoring",
        "Earthquake monitoring (USGS live feed)",
        "Wildfire detection (NASA FIRMS satellite data)",
        "Nuclear facility mapping (curated reference list, not a live feed)",
        "Severe weather alerts & tracking",
        "Cyber threat & CVE intelligence",
        "Space weather & solar storm monitoring",
        "GPS jamming detection",
        "Defense & commodity market tracking",
        "SIGINT news aggregation feed",
        "Interactive 3D globe with day/night cycle",
        "Region intelligence dossier reports",
      ],
      screenshot: `${SITE_URL}/og-image.png`,
      author: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Audiowide&display=swap"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

      </head>
      <body className="antialiased">
        <AffiliateAttributionSync />
        <AnalyticsTracker />
        <TranslateGate />
        <ErrorBoundary name="WorldEye">
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
