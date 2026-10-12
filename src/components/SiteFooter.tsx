import Link from "next/link";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [
      ["Live Map", "/"],
      ["Features", "/features"],
      ["Live Cameras", "/cameras"],
      ["Flight Tracker", "/live-flight-tracker"],
      ["Satellite Tracker", "/satellite-tracker"],
      ["Earthquake Tracker", "/earthquake-tracker"],
      ["Pricing", "/pricing"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Documentation", "/docs"],
      ["Use Cases", "/use-cases"],
      ["Blog", "/blog"],
      ["FAQ", "/faq"],
      ["Changelog", "/changelog"],
      ["About", "/about"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy Policy", "/privacy"],
      ["Terms of Service", "/terms"],
      ["Security", "/security"],
      ["Affiliates", "/affiliates"],
      ["Affiliate Terms", "/affiliates/terms"],
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 mt-24">
      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/worldeye-eye.png"
              alt="WorldEye"
              className="h-8 w-auto"
              style={{ filter: "drop-shadow(0 0 10px rgba(0,150,255,0.5))" }}
            />
            <span className="text-lg font-bold tracking-wide font-mono">
              <span className="text-white">World</span>
              <span className="text-[#0096FF]">Eye</span>
            </span>
          </Link>
          <p className="text-sm text-white/40 mt-4 leading-relaxed">
            Live planetary intelligence. The map is free for everyone — Pro funds
            the infrastructure.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-[11px] font-bold tracking-[0.2em] text-white/40 mb-4">
              {col.title.toUpperCase()}
            </p>
            <ul className="space-y-2.5">
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
          </nav>
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/30">
          <span>© 2026 WorldEye. All rights reserved.</span>
          <span className="flex items-center gap-4">
            <span>Live data from public sources worldwide.</span>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/25 transition"
              title="Admin dashboard"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
              Admin
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
