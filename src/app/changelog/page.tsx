import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, Globe } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Changelog — What's New | WorldEye",
  description:
    "What's new on WorldEye: the WorldEye rebrand, affiliate program, camera directory, new SEO pages, account system and free trials — updates as they ship.",
  alternates: { canonical: "/changelog" },
  openGraph: {
    title: "WorldEye Changelog — What's New",
    description:
      "Recent WorldEye updates: WorldEye rebrand, affiliate program, camera directory, new pages, account system and free trials.",
    type: "website",
    url: "/changelog",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WorldEye Changelog",
  description:
    "A running log of WorldEye updates — new features, pages, and improvements as they ship.",
  url: "https://worldeye.app/changelog",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const ENTRIES: {
  month: string;
  icon: "sparkles" | "globe";
  items: string[];
}[] = [
  {
    month: "October 2026",
    icon: "sparkles",
    items: [
      "Full rebrand to WorldEye with the new eye-and-globe logo across the site, header, and link previews — now live at worldeye.app.",
      "WorldEye affiliate program launch — gamified 3-level recurring commissions, ranks, missions, and a public leaderboard.",
      "Camera directory launch: ~40,000 public webcams organized across 105 countries, with per-country pages and topic collections.",
      "New SEO pages: About, Features, Live Cameras, Use Cases, FAQ, Terms, Contact, Blog, plus live flight, satellite and earthquake trackers.",
      "Full account system — email signup with verification, password reset, and sign-in via Google, Apple, Discord, X and Facebook.",
      "Free trials on Pro: 1 free day on weekly plans, 3 free days on annual — card collected at signup, never charged during the trial.",
      "Guest checkout: start a trial or pay in Stripe first, claim your account after payment — no signup wall.",
      "Stripe live mode for Pro subscriptions, with the webhook as the sole subscription write path.",
      "Soft camera gate: 15 free camera clicks for everyone, then a gentle nudge toward Pro — cameras stay free for Pro subscribers.",
      "Cinematic scroll intro on the homepage — scroll to fly through the WorldEye emblem into the live globe.",
      "Pricing page refresh with per-day framing, a Free-vs-Pro comparison table, and a sticky mobile buy button.",
    ],
  },
  {
    month: "September 2026",
    icon: "globe",
    items: [
      "OSINT toolkit additions — in-browser scans and lookups for domains, IPs, and certificates.",
      "Camera network expansion — the worldwide public camera catalog keeps growing.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100">
      <JsonLd data={jsonLd} />
      <div className="max-w-3xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">
            WORLDEYE
          </span>
        </div>

        {/* Hero */}
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          What&apos;s new
        </h1>
        <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
          A running log of WorldEye updates — new features, pages, and
          improvements as they ship.
        </p>

        {/* Timeline */}
        <div className="mt-12 relative">
          <div
            aria-hidden
            className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-[#D4AF37]/60 via-white/10 to-transparent"
          />
          <div className="space-y-10">
            {ENTRIES.map((entry) => (
              <section key={entry.month} className="relative pl-10">
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full bg-[#050508] border-2 border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.5)]"
                />
                <div className="flex items-center gap-2.5">
                  {entry.icon === "sparkles" ? (
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  ) : (
                    <Globe className="w-4 h-4 text-[#D4AF37]" />
                  )}
                  <h2 className="text-lg md:text-xl font-bold tracking-wide text-[#D4AF37]">
                    {entry.month}
                  </h2>
                </div>
                <ul className="mt-4 space-y-3">
                  {entry.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-sm md:text-base text-white/70 leading-relaxed"
                    >
                      <span
                        aria-hidden
                        className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70 shrink-0"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#D4AF37]/[0.07] to-transparent p-8 text-center">
          <h2 className="text-xl md:text-2xl font-bold">
            See it all live
          </h2>
          <p className="text-white/55 mt-2 text-sm md:text-base">
            The map is free — open it and explore the latest updates yourself.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="px-7 py-3 rounded-2xl bg-[#D4AF37] text-black font-bold text-sm hover:brightness-110 transition"
            >
              Open the live map
            </Link>
            <Link
              href="/features"
              className="px-7 py-3 rounded-2xl border border-white/15 text-sm font-semibold text-white/70 hover:bg-white/5 transition"
            >
              Browse features
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
