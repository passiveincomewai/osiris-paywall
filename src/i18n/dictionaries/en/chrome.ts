/**
 * English chrome dictionary — shared UI strings for localized pages.
 *
 * SOURCE OF TRUTH NOTE: every string below was extracted VERBATIM from
 * the components that render it today (SiteFooter.tsx, the homepage
 * header in src/app/page.tsx). The English render path consumes these
 * strings unchanged; if a string here ever disagrees with the component
 * it came from, the component wins until the dictionary is updated and
 * the drift is reviewed (brief §11 maintenance). Re-extracted
 * 2026-10-26 against the current SiteFooter (Ambient Mode + Live Events
 * links added since the first extraction).
 */

export interface ChromeFooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

export interface ChromeCopy {
  signIn: string;
  signUp: string;
  upgradeToPro: string;
  newsletterEyebrow: string;
  newsletterHeadline: string;
  newsletterSub: string;
  brandTagline: string;
  footerColumns: ChromeFooterColumn[];
  copyright: string;
  liveDataNote: string;
  selectorLabel: string;
  selectorHomepageNote: string;
}

export const enChrome: ChromeCopy = {
  // Header / account controls (homepage header, SiteFooter brand row).
  signIn: "Sign in",
  signUp: "Sign up",
  upgradeToPro: "Upgrade to PRO",
  // Newsletter band (SiteFooter defaults).
  newsletterEyebrow: "NEWSLETTER",
  newsletterHeadline: "Intel drops, new layers, launch news.",
  newsletterSub: "One email when it matters. No spam, unsubscribe anytime.",
  // Brand row (SiteFooter).
  brandTagline:
    "Live planetary intelligence. The map is free for everyone — Pro funds the infrastructure.",
  // Link columns (SiteFooter COLUMNS, verbatim including hrefs — hrefs
  // are routing, not copy, and are never translated).
  footerColumns: [
    {
      title: "Product",
      links: [
        { label: "Live Map", href: "/" },
        { label: "Features", href: "/features" },
        { label: "Ambient Mode", href: "/ambient-mode" },
        { label: "Pricing", href: "/pricing" },
        { label: "Enterprise", href: "/enterprise" },
        { label: "White Label", href: "/white-label" },
        { label: "Live Cameras", href: "/cameras" },
        { label: "Cameras by Country", href: "/cameras/countries" },
        { label: "Affiliates", href: "/affiliates" },
      ],
    },
    {
      title: "Trackers",
      links: [
        { label: "Flight Tracker", href: "/live-flight-tracker" },
        { label: "Satellite Tracker", href: "/satellite-tracker" },
        { label: "Ship Tracker", href: "/ship-tracker" },
        { label: "Earthquake Tracker", href: "/earthquake-tracker" },
        { label: "Weather Tracker", href: "/weather-tracker" },
        { label: "Wildfire Tracker", href: "/wildfire-tracker" },
        { label: "Hurricane Tracker", href: "/hurricane-tracker" },
        { label: "Space Station Tracker", href: "/space-station-tracker" },
        { label: "Cyber Threat Map", href: "/cyber-threat-map" },
      ],
    },
    {
      title: "Cameras",
      links: [
        { label: "Live Webcams", href: "/live-webcams" },
        { label: "Traffic Cameras", href: "/live-traffic-cameras" },
        { label: "City Webcams", href: "/world-city-webcams" },
        { label: "Europe Cameras", href: "/europe-live-cameras" },
        { label: "Beach Webcams", href: "/beach-webcams" },
        { label: "Ski Webcams", href: "/ski-webcams" },
        { label: "Live Events", href: "/live-events" },
        { label: "Airport Webcams", href: "/airport-webcams" },
        { label: "Asia Webcams", href: "/asia-webcams" },
        { label: "Live Camera Index", href: "/live-camera-index" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Blog", href: "/blog" },
        { label: "Use Cases", href: "/use-cases" },
        { label: "FAQ", href: "/faq" },
        { label: "Changelog", href: "/changelog" },
        { label: "What is ADS-B?", href: "/what-is-ads-b" },
        { label: "What is AIS?", href: "/what-is-ais" },
        { label: "Best OSINT Tools", href: "/best-osint-tools" },
        { label: "Free OSINT Tools", href: "/free-osint-tools" },
        { label: "Research & Education Access", href: "/research-access" },
      ],
    },
    {
      title: "Compare",
      links: [
        { label: "All Comparisons", href: "/compare" },
        { label: "God's Eye View", href: "/gods-eye-view" },
        { label: "God's Eye View Alternative", href: "/alternatives/gods-eye-view" },
        { label: "World Monitor Alternative", href: "/alternatives/world-monitor" },
        { label: "GodsView AI Alternative", href: "/alternatives/godsview-ai" },
        { label: "Flightradar24 Alternative", href: "/alternatives/flightradar24" },
        { label: "Google Earth Alternative", href: "/alternatives/google-earth" },
        { label: "EarthCam Alternative", href: "/earthcam-alternative" },
      ],
    },
    {
      title: "Company & Legal",
      links: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "Partners & Data Sources", href: "/partners" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Security", href: "/security" },
        { label: "Affiliate Terms", href: "/affiliates/terms" },
        { label: "Admin", href: "/admin" },
      ],
    },
  ],
  // Bottom bar (SiteFooter).
  copyright: "© 2026 WorldEye. All rights reserved.",
  liveDataNote: "Live data from public sources worldwide.",
  // Language selector (components/LanguageSelector).
  selectorLabel: "Language",
  selectorHomepageNote: "homepage",
};
