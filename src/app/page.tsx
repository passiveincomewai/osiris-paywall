import { redirect } from "next/navigation";
import Link from "next/link";
import { Radar, Satellite, Video, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { auth } from "@/auth";

const HIGHLIGHTS = [
  { icon: Radar, title: "Live Flight Tracking", desc: "Real-time aircraft positions and telemetry on a 3D globe." },
  { icon: Video, title: "CCTV Network", desc: "Worldwide public camera feeds with stream health monitoring." },
  { icon: Satellite, title: "Satellites & Space", desc: "Orbital tracking, passes and space situational awareness." },
  { icon: ShieldCheck, title: "OSINT Toolkit", desc: "Nmap scans, DNS/WHOIS, SSL analysis and threat intel — in-browser." },
  { icon: Zap, title: "Live Intel Feeds", desc: "Earthquakes, wildfires, cyber threats and conflicts as they happen." },
];

export const metadata = {
  title: "OSIRIS — Open Source Intelligence Platform",
  description:
    "The open-source Palantir alternative. Live flight tracking, CCTV, satellites and OSINT tools on a 3D globe.",
};

export default async function HomePage() {
  // Active subscribers skip the marketing page entirely.
  const session = await auth().catch(() => null);
  if (session?.user?.subscriptionStatus === "active") {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 md:px-10 py-5 max-w-6xl mx-auto">
        <p className="font-bold tracking-[0.25em] text-[#D4AF37]">OSIRIS</p>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/docs" className="text-zinc-400 hover:text-zinc-100 px-3 py-2">
            Docs
          </Link>
          <Link
            href="/api/auth/signin"
            className="text-zinc-300 hover:text-white border border-zinc-700 rounded-lg px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/pricing"
            className="bg-[#D4AF37] text-black font-semibold rounded-lg px-4 py-2 hover:bg-[#e5c04b]"
          >
            Get Access
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-6 pt-16 md:pt-24 pb-12 text-center max-w-4xl mx-auto">
        <p className="text-[#D4AF37] tracking-[0.3em] text-xs font-semibold mb-5">
          OPEN SOURCE INTELLIGENCE PLATFORM
        </p>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight">
          The open-source Palantir alternative, <span className="text-[#D4AF37]">live</span>.
        </h1>
        <p className="text-zinc-400 mt-6 text-lg max-w-2xl mx-auto">
          Track aircraft, satellites and CCTV cameras on a 3D globe. Run Nmap scans, DNS lookups
          and threat-intel queries — all from your browser. One weekly pass unlocks everything.
        </p>
        <div className="mt-9 flex items-center justify-center gap-4">
          <Link
            href="/pricing"
            className="bg-[#D4AF37] text-black font-bold rounded-xl px-7 py-3.5 hover:bg-[#e5c04b] inline-flex items-center gap-2"
          >
            Get Weekly Access <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/docs"
            className="border border-zinc-700 text-zinc-200 rounded-xl px-7 py-3.5 hover:border-zinc-500"
          >
            Explore the docs
          </Link>
        </div>
        <p className="text-zinc-500 text-sm mt-5">$9/week · cancel anytime · secured by Stripe</p>
      </section>

      {/* Highlights */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {HIGHLIGHTS.map((f) => (
            <div key={f.title} className="border border-zinc-800 rounded-xl p-5 bg-zinc-950/60">
              <f.icon className="w-6 h-6 text-[#D4AF37] mb-2" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-zinc-400 mt-1">{f.desc}</p>
            </div>
          ))}
          <Link
            href="/pricing"
            className="border border-[#D4AF37]/30 rounded-xl p-5 bg-gradient-to-b from-zinc-950 to-black flex flex-col justify-center hover:border-[#D4AF37]/60"
          >
            <h3 className="font-semibold text-[#D4AF37]">+ 20 more live data layers</h3>
            <p className="text-sm text-zinc-400 mt-1 inline-flex items-center gap-1">
              See what&apos;s inside <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 px-6 py-8 text-center text-sm text-zinc-500">
        <div className="flex items-center justify-center gap-6 mb-3">
          <Link href="/pricing" className="hover:text-zinc-300">Pricing</Link>
          <Link href="/docs" className="hover:text-zinc-300">Docs</Link>
          <Link href="/privacy" className="hover:text-zinc-300">Privacy</Link>
        </div>
        <p>OSIRIS is open source (MIT). This hosted service is a separate offering.</p>
      </footer>
    </main>
  );
}
