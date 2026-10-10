import { Radar, Satellite, Video, ShieldCheck, Zap, Check } from "lucide-react";
import PricingCheckoutButton from "./PricingCheckoutButton";

const FEATURES = [
  { icon: Radar, title: "Live Flight Tracking", desc: "Real-time aircraft positions, telemetry and flight routes on the 3D globe." },
  { icon: Video, title: "CCTV Network", desc: "Worldwide public camera feeds with stream health monitoring." },
  { icon: Satellite, title: "Satellites & Space", desc: "Orbital tracking, passes and space situational awareness." },
  { icon: ShieldCheck, title: "OSINT Toolkit", desc: "Nmap scans, DNS/WHOIS lookups, SSL analysis and threat intel — in-browser." },
  { icon: Zap, title: "Live Intel Feeds", desc: "Earthquakes, wildfires, cyber threats and conflict events as they happen." },
];

export const metadata = {
  title: "Pricing — Weekly Premium Pass",
  description: "One weekly pass unlocks every OSIRIS live feed and OSINT module.",
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
        The open-source Palantir alternative, <span className="text-[#D4AF37]">live</span>.
      </h1>
      <p className="text-zinc-400 mt-4 max-w-xl text-center">
        One weekly pass unlocks every live feed and OSINT module. No tiers, no upsells — the full platform.
      </p>

      {cancelled && (
        <p className="mt-6 text-sm text-amber-300/90 border border-amber-300/20 rounded-lg px-4 py-2">
          Checkout was cancelled — your pass is still waiting whenever you&apos;re ready.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4 mt-12 max-w-3xl w-full">
        {FEATURES.map((f) => (
          <div key={f.title} className="border border-zinc-800 rounded-xl p-5 bg-zinc-950/60">
            <f.icon className="w-6 h-6 text-[#D4AF37] mb-2" />
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-zinc-400 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 border border-[#D4AF37]/30 rounded-2xl p-8 max-w-md w-full bg-gradient-to-b from-zinc-950 to-black text-center">
        <p className="text-sm text-zinc-400 uppercase tracking-widest">Weekly Premium Pass</p>
        <p className="mt-3">
          <span className="text-5xl font-bold">$9</span>
          <span className="text-zinc-400">/week</span>
        </p>
        <ul className="text-left text-sm text-zinc-300 mt-6 space-y-2">
          {[
            "Every live feed & OSINT module",
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
