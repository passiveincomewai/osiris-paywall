import { Radar, Satellite, Video, ShieldCheck, Zap, Check, Globe, Lock } from "lucide-react";
import PricingCheckoutButton from "./PricingCheckoutButton";

const FREE_FEATURES = [
  { icon: Globe, title: "The 3D Globe", desc: "The full interactive map — no account, no signup." },
  { icon: Radar, title: "Live Flight Tracking", desc: "Real-time aircraft positions and telemetry." },
  { icon: Satellite, title: "Satellites & Space", desc: "Orbital tracking, passes and space situational awareness." },
  { icon: Zap, title: "Natural Hazards", desc: "Earthquakes, wildfires and severe weather as they happen." },
];

const PREMIUM_FEATURES = [
  { icon: Video, title: "CCTV Network", desc: "36,000+ worldwide public camera feeds." },
  { icon: ShieldCheck, title: "OSINT Toolkit", desc: "Nmap scans, DNS/WHOIS, SSL analysis and threat intel — in-browser." },
  { icon: Zap, title: "Intel Feeds", desc: "Cyber threats, GDELT events, maritime tracking and conflict zones." },
];

export const metadata = {
  title: "Premium — Weekly Pass",
  description: "The map is free. The Weekly Pass unlocks every premium intel feed and OSINT module.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const sp = await searchParams;
  const cancelled = sp.checkout === "cancelled";

  return (
    <main className="min-h-screen bg-black text-zinc-100 flex flex-col items-center px-6 py-16">
      <p className="text-[#D4AF37] tracking-[0.3em] text-xs font-semibold mb-4">
        OSIRIS INTELLIGENCE PLATFORM
      </p>
      <h1 className="text-4xl md:text-5xl font-bold text-center max-w-2xl">
        The map is <span className="text-[#D4AF37]">free</span>. The intel is premium.
      </h1>
      <p className="text-zinc-400 mt-4 max-w-xl text-center">
        Explore the globe, track flights and watch the planet — no account needed. The Weekly Pass unlocks the CCTV network, OSINT toolkit and every premium intel feed.
      </p>

      {cancelled && (
        <p className="mt-6 text-sm text-amber-300/90 border border-amber-300/20 rounded-lg px-4 py-2">
          Checkout was cancelled — your pass is still waiting whenever you&apos;re ready.
        </p>
      )}

      <div className="mt-12 max-w-3xl w-full">
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-4 text-center">Free forever</p>
        <div className="grid md:grid-cols-2 gap-4">
          {FREE_FEATURES.map((f) => (
            <div key={f.title} className="border border-zinc-800 rounded-xl p-5 bg-zinc-950/60">
              <f.icon className="w-6 h-6 text-zinc-400 mb-2" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-zinc-400 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-xs uppercase tracking-[0.25em] text-[#D4AF37] mt-10 mb-4 text-center flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5" /> Weekly Pass unlocks
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {PREMIUM_FEATURES.map((f) => (
            <div key={f.title} className="border border-[#D4AF37]/25 rounded-xl p-5 bg-zinc-950/60">
              <f.icon className="w-6 h-6 text-[#D4AF37] mb-2" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-zinc-400 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 border border-[#D4AF37]/30 rounded-2xl p-8 max-w-md w-full bg-gradient-to-b from-zinc-950 to-black text-center">
        <p className="text-sm text-zinc-400 uppercase tracking-widest">Weekly Premium Pass</p>
        <p className="mt-3">
          <span className="text-5xl font-bold">$9</span>
          <span className="text-zinc-400">/week</span>
        </p>
        <ul className="text-left text-sm text-zinc-300 mt-6 space-y-2">
          {[
            "CCTV network, OSINT toolkit & all premium intel feeds",
            "Cancel anytime — access runs to period end",
            "Renews weekly automatically",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <Check className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
              {t}
            </li>
          ))}
        </ul>
        <PricingCheckoutButton />
        <p className="text-xs text-zinc-500 mt-4">Secured by Stripe · Cancel anytime</p>
      </div>
    </main>
  );
}
