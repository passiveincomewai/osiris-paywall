import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { ArrowLeft, Sparkles, Globe } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Changelog — What's New",
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
    month: "Late October 2026",
    icon: "sparkles",
    items: [
      "VIP Pro: the annual plan became a true top tier — everything in Pro plus 40-camera recording, a recording dashboard, camera alerts, and exclusive timelapse and OSINT intel layers.",
      "Camera alerts (VIP Pro): watch up to 10 cameras with plain-language conditions like snow on the road. An AI check reads a still image about every 15 minutes and sends you the photo when something changes.",
      "Recording grew up: Pro records up to 20 cameras at once and VIP Pro up to 40, with a dashboard that keeps your sessions and recording library in one place.",
      "Team Access: create a team, invite members by email, and share Pro or VIP Pro access through seats — including ownership transfer when a team changes hands.",
      "Manage Subscription moved in-house: upgrade, downgrade or open the billing portal from your WorldEye settings instead of hunting through email links.",
      "Day map fixed: the daytime basemap now runs on keyless street tiles after the previous tile source started requiring a key — day mode works the way it always should have.",
      "Comparison and alternatives pages expanded with deeper researched content — what each tool actually is, honest side-by-side comparisons, switching guides and real FAQs.",
      "Free camera opens set to 5 per device (down from 15) — enough to properly explore any view; Pro removes the limit entirely.",
    ],
  },
  {
    month: "October 2026",
    icon: "sparkles",
    items: [
      "Full rebrand to WorldEye with the new eye-and-globe logo across the site, header, and link previews — now live at worldeye.app.",
      "WorldEye affiliate program launch — gamified 3-level recurring commissions, ranks, missions, and a public leaderboard.",
      "Camera directory launch: ~40,000 public webcams organized across 105 countries, with per-country pages and topic collections.",
      "New SEO pages: About, Features, Live Cameras, Use Cases, FAQ, Terms, Contact, Blog, plus live flight, satellite and earthquake trackers.",
      "Competitor comparison system: 25 researched head-to-head pages plus alternatives and best-tools guides, all linked from the footer.",
      "Second SEO wave: 20 new pages and 7 blog posts covering ship, weather, wildfire, hurricane and space-station tracking, ADS-B/AIS explainers, and city webcam guides.",
      "Full account system — email signup with verification, password reset, magic-link sign-in, and Continue with Google.",
      "Free trials on Pro: 10 free days on weekly plans, 10 free days on annual — card collected at signup, never charged during the trial.",
      "Guest checkout: start a trial or pay in Stripe first, claim your account after payment — no signup wall.",
      "Stripe live mode for Pro subscriptions, with the webhook as the sole subscription write path.",
      "Newsletter system with double opt-in plus abandoned-cart reminders for unfinished checkouts.",
      "Admin dashboard: users, subscriptions, page views, revenue, trials, newsletter broadcast composer, and competitor manager.",
      "Soft camera gate: 5 free camera clicks for everyone, then a gentle nudge toward Pro — cameras stay free for Pro subscribers.",
      "Cinematic scroll intro on the homepage — scroll to fly through the WorldEye emblem into the live globe.",
      "Pricing page refresh with per-day framing, a Free-vs-Pro comparison table, and a sticky mobile buy button.",
      "Faster page navigation: internal links now use client-side routing instead of full page reloads.",
    ],
  },
  {
    month: "September 2026",
    icon: "globe",
    items: [
      "OSINT toolkit additions — in-browser scans and lookups for domains, IPs, and certificates.",
      "Camera network expansion — the worldwide public camera catalog keeps growing.",
      "Live flight tracking layer with ADS-B data and airport views.",
      "Satellite tracker with ISS and orbital object positions.",
      "Earthquake monitor powered by live seismic feeds.",
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
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">
            WORLDEYE
          </span>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Hero */}
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          What&apos;s new
        </h1>
        <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
          A running log of WorldEye updates — new features, pages, and
          improvements as they ship.
        </p>

        {/* How WorldEye ships */}
        <div className="mt-10 space-y-4 text-white/60 leading-relaxed">
          <p>
            WorldEye is built by a small independent team and developed in the
            open, in short cycles: a change is built, checked, deployed, and
            then verified against the live site before it is called done. That
            is why this log reads the way it does — entries are grouped by
            month and written when something actually reaches the site, not
            when it is merely planned. If it is listed here, it shipped.
          </p>
          <p>
            Most updates fall into a few families. <strong className="text-white/85">The map itself</strong> —
            new layers, new data sources, fixes to feeds and rendering.{" "}
            <strong className="text-white/85">The camera network</strong> — the directory of public
            cameras is playback-verified and re-counted as feeds are added and
            dead ones are dropped, which is why the served count you see on
            the site (74,229 today) is the number the globe actually delivers.{" "}
            <strong className="text-white/85">Accounts and Pro</strong> — sign-in, subscriptions,
            trials, teams and the affiliate program. And <strong className="text-white/85">the site
            around the map</strong> — guides, comparisons and explainers like this page.
          </p>
          <p>
            Two conventions worth knowing. First, the free map is the product:
            entries that add Pro features sit on top of a free tier that keeps
            the globe, cameras, flights, satellites, weather, earthquakes and
            transit free with no signup — that split is deliberate and it is
            not changing. Second, honesty labels travel with the features: when
            a layer is a model or a reconstruction rather than a measurement,
            the map says so on the layer itself, and entries here describe
            features the same way.
          </p>
        </div>

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

        {/* Reading the log + feedback */}
        <div className="mt-16 space-y-4 text-white/60 leading-relaxed">
          <h2 className="text-xl md:text-2xl font-bold text-white">How to read this log</h2>
          <p>
            Newest first, grouped by month. An entry names the change in one
            line — what it is and, where it matters, who it is for (everyone,
            Pro, or VIP Pro). Small fixes ride along inside larger entries
            rather than getting lines of their own, and purely internal work —
            refactors, test coverage, infrastructure — appears only when it
            changes something you can see or feel, like the day-map fix above.
          </p>
          <p>
            Spotted a regression, or a layer that stopped matching what this
            log says it does? That is exactly what the{" "}
            <Link href="/contact" className="text-[#D4AF37] hover:underline">contact page</Link>{" "}
            is for — tell us which layer, your browser, and roughly when it
            started. Feature ideas are welcome at the same address; the
            honest caveat is that a small team ships what it can verify, so
            suggestions are read and weighed, not promised.
          </p>
        </div>

        {/* Changelog FAQ */}
        <div className="mt-16">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Changelog questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-white/90">Why does the camera count change between visits?</h3>
              <p className="text-white/55 leading-relaxed mt-2 text-sm md:text-base">
                Because the directory is alive. New public feeds are verified
                and added; feeds that stop playing are dropped rather than
                left in the count. The number shown on the site is always the
                count the globe actually serves at that moment — today that is
                74,229 cameras across 105 countries — not a marketing figure
                frozen at launch.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white/90">A feature was announced but is not in the log yet — where is it?</h3>
              <p className="text-white/55 leading-relaxed mt-2 text-sm md:text-base">
                Entries are written when a change is verified live, not when
                it is announced or merged. Work in progress, experiments that
                were rolled back, and features still being checked against the
                production site do not appear here. If something was announced
                and never arrived, the log staying silent is the honest state
                of it.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white/90">Can I get these updates by email?</h3>
              <p className="text-white/55 leading-relaxed mt-2 text-sm md:text-base">
                The newsletter carries the bigger releases — new layers, new
                tiers, major expansions — rather than every line of this log.
                You can join it from the site footer; it is double opt-in and
                every send includes an unsubscribe link.
              </p>
            </div>
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
