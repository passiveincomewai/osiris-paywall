import Link from "next/link";
import NewsletterForm from "./NewsletterForm";
import FooterAuthButtons from "./FooterAuthButtons";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [
      ["Live Map", "/"],
      ["Features", "/features"],
      ["Ambient Mode", "/ambient-mode"],
      ["Pricing", "/pricing"],
      ["Live Cameras", "/cameras"],
      ["Cameras by Country", "/cameras/countries"],
      ["Affiliates", "/affiliates"],
    ],
  },
  {
    title: "Trackers",
    links: [
      ["Flight Tracker", "/live-flight-tracker"],
      ["Satellite Tracker", "/satellite-tracker"],
      ["Ship Tracker", "/ship-tracker"],
      ["Earthquake Tracker", "/earthquake-tracker"],
      ["Weather Tracker", "/weather-tracker"],
      ["Wildfire Tracker", "/wildfire-tracker"],
      ["Hurricane Tracker", "/hurricane-tracker"],
      ["Space Station Tracker", "/space-station-tracker"],
      ["Cyber Threat Map", "/cyber-threat-map"],
    ],
  },
  {
    title: "Cameras",
    links: [
      ["Live Webcams", "/live-webcams"],
      ["Traffic Cameras", "/live-traffic-cameras"],
      ["City Webcams", "/world-city-webcams"],
      ["Europe Cameras", "/europe-live-cameras"],
      ["Beach Webcams", "/beach-webcams"],
      ["Ski Webcams", "/ski-webcams"],
      ["Live Events", "/live-events"],
      ["Airport Webcams", "/airport-webcams"],
      ["Asia Webcams", "/asia-webcams"],
      ["Live Camera Index", "/live-camera-index"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Blog", "/blog"],
      ["Use Cases", "/use-cases"],
      ["FAQ", "/faq"],
      ["Changelog", "/changelog"],
      ["What is ADS-B?", "/what-is-ads-b"],
      ["What is AIS?", "/what-is-ais"],
      ["Best OSINT Tools", "/best-osint-tools"],
      ["Free OSINT Tools", "/free-osint-tools"],
    ],
  },
  {
    title: "Compare",
    links: [
      ["All Comparisons", "/compare"],
      ["God's Eye View", "/gods-eye-view"],
      ["God's Eye View Alternative", "/alternatives/gods-eye-view"],
      ["OSIRIS Alternative", "/alternatives/osiris"],
      ["World Monitor Alternative", "/alternatives/world-monitor"],
      ["GodsView AI Alternative", "/alternatives/godsview-ai"],
      ["Flightradar24 Alternative", "/alternatives/flightradar24"],
      ["Google Earth Alternative", "/alternatives/google-earth"],
      ["EarthCam Alternative", "/earthcam-alternative"],
    ],
  },
  {
    title: "Company & Legal",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Privacy Policy", "/privacy"],
      ["Terms of Service", "/terms"],
      ["Security", "/security"],
      ["Affiliate Terms", "/affiliates/terms"],
      ["Admin", "/admin"],
    ],
  },
];

export default function SiteFooter({
  newsletterHeadline = "Intel drops, new layers, launch news.",
  newsletterSub = "One email when it matters. No spam, unsubscribe anytime.",
}: {
  newsletterHeadline?: string;
  newsletterSub?: string;
} = {}) {
  return (
    <footer className="border-t border-white/10 mt-24">
      {/* Newsletter band */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5 justify-between">
          <div>
            <p className="font-mono text-[11px] font-medium tracking-[0.25em] text-[#0096FF] mb-2">NEWSLETTER</p>
            <h3 className="font-display text-2xl font-medium text-white">{newsletterHeadline}</h3>
            <p className="text-sm text-white/50 mt-1">{newsletterSub}</p>
          </div>
          <div className="w-full md:w-auto md:min-w-[340px]">
            <NewsletterForm source="footer" />
          </div>
        </div>
      </div>

      {/* Brand row */}
      <div className="max-w-6xl mx-auto px-6 pt-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <Link href="/" aria-label="WorldEye — back to the live globe" className="inline-flex items-center">
            <img
              src="/worldeye-header-logo.png"
              alt="WorldEye"
              width={1063}
              height={290}
              loading="lazy"
              decoding="async"
              className="h-10 w-auto"
            />
          </Link>
          <p className="text-sm text-white/50 mt-4 leading-relaxed">
            Live planetary intelligence. The map is free for everyone — Pro funds
            the infrastructure.
          </p>
        </div>
        <FooterAuthButtons />
      </div>

      {/* Link columns */}
      <nav aria-label="Footer" className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-x-6 gap-y-10">
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="font-mono text-[11px] font-medium tracking-[0.25em] text-white/60 mb-4">
              {col.title.toUpperCase()}
            </p>
            <ul className="space-y-3">
              {col.links.map(([label, href]) => (
                <li key={href + label}>
                  <Link
                    href={href}
                    className="text-sm text-white/55 hover:text-[#D4AF37] transition"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/50">
          <span>© 2026 WorldEye. All rights reserved.</span>
          <span className="hidden sm:inline">Live data from public sources worldwide.</span>
        </div>
      </div>
    </footer>
  );
}
