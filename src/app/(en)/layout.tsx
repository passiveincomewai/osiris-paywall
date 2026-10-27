import type { Metadata, Viewport } from "next";
import RootShell, {
  SITE_DESCRIPTION,
  SITE_ICONS,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  siteViewport,
} from "@/components/RootShell";

/**
 * English root layout (route group — URLs unchanged).
 *
 * The shell itself (fonts, JSON-LD, global chrome) lives in
 * RootShell and is shared with the [locale] tree; everything here is
 * metadata only, with values byte-identical to the pre-i18n layout.
 * Hreflang alternates are deliberately NOT set at layout level: only
 * the converted pages carry them (each page's own metadata), so no
 * English page ever advertises a translation that doesn't exist.
 */

export const viewport: Viewport = siteViewport;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | WorldEye",
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
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
  icons: SITE_ICONS,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RootShell locale="en">{children}</RootShell>;
}
