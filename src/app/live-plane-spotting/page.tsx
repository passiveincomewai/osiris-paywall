import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Plane } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import TrialCtaSection from "@/components/TrialCtaSection";

// Facts (verified against production 2026-10-18): /api/flights returned 3,700
// aircraft on the map at once (2,864 commercial); FAA WeatherCams contribute
// 3,528 cameras at 981 US airport sites; aircraft follow cam + cameras-near-
// aircraft shipped in the October 2026 expansion.
export const metadata: Metadata = {
  title: "Live Plane Spotting — Watch Flights Land & Take Off on the Map",
  description:
    "Plane spotting without leaving home: follow live flights on the globe as they climb, cruise and descend, ride along with a chase camera, and check airport cameras. Free.",
  alternates: { canonical: "https://worldeye.app/live-plane-spotting" },
  openGraph: {
    title: "Live Plane Spotting — Watch Flights Land & Take Off | WorldEye",
    description:
      "Follow thousands of live flights on one globe, ride a chase camera behind any aircraft, and see a real photo of the exact plane. Free, no signup.",
    url: "https://worldeye.app/live-plane-spotting",
    type: "website",
  },
};

const STEPS = [
  {
    title: "Open the map, turn on flights",
    desc: "Enable Commercial Aviation on the WorldEye globe. Thousands of live aircraft appear, moving in real time.",
  },
  {
    title: "Pick your plane",
    desc: "Click any aircraft for its callsign, route, altitude and speed — or zoom into an airport and watch arrivals stack up on approach.",
  },
  {
    title: "Follow it down",
    desc: "Hit Follow and the camera rides with the aircraft in chase, forward or orbit view as it descends toward its destination.",
  },
];

const FAQS = [
  {
    q: "What is live plane spotting on WorldEye?",
    a: "Instead of standing at a fence with binoculars, you watch live air traffic on a 3D globe: thousands of real flights (3,500+ aircraft on the map at a typical moment) drawn from live ADS-B data, each with its route, altitude, speed and heading. You can follow any of them with a chase camera and pull up a real photo of that exact aircraft. It is plane spotting as a map, not a video stream.",
  },
  {
    q: "Can I actually watch planes land?",
    a: "You watch the landing happen on the map: the aircraft's real descent profile, flown live, with the follow camera riding behind it to touchdown. Where a public airport camera exists near the field, you can open it too — WorldEye carries 3,528 FAA airport weather cameras at 981 US airports, plus airport webcams worldwide. Be clear about what those are: most are airfield weather views, and only some frame a ramp or runway — we show them as they are rather than promising a touchdown video at every airport.",
  },
  {
    q: "Which flights can I follow?",
    a: "Any aircraft on the map — commercial airliners, private jets, cargo and military traffic that broadcasts ADS-B. Click one to see its origin, destination, progress and a real photo of that exact aircraft, then follow it in chase, forward or orbit view.",
  },
  {
    q: "How live is the data?",
    a: "Positions refresh every 30 seconds from the live feed and are interpolated smoothly between fixes, so aircraft glide rather than jump. The follow HUD always shows the age of the last fix, and it labels itself honestly: a telemetry view, not an onboard camera.",
  },
  {
    q: "What are the best airports to spot at?",
    a: "On the map, the busiest approach paths — Atlanta, Chicago O'Hare, Dallas/Fort Worth, London Heathrow, Frankfurt, Tokyo Haneda, Dubai — give you a landing every minute or two at peak. Zoom to the final approach path, pick an aircraft on descent, and follow it in.",
  },
  {
    q: "Is there a cost or account needed?",
    a: "No. Flights, the follow camera and cameras are free with no account and no signup. Open the globe and start spotting.",
  },
  {
    q: "Can I see military aircraft?",
    a: "Only the ones broadcasting ADS-B publicly — some military traffic does (tankers, transports and training flights often appear), and much of it doesn't, by design. What you see is what the aircraft themselves are transmitting; WorldEye doesn't track anything that isn't broadcast.",
  },
  {
    q: "Do helicopters show up?",
    a: "Yes — rotorcraft get their own icon on the map so they stand out from fixed-wing traffic. Around cities you'll see news, police and medical helicopters working; along coasts and in the North Sea, the offshore energy traffic.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Live Plane Spotting — Watch Flights Land & Take Off on the Map",
  description:
    "Follow live flights on a 3D globe with a chase camera and airport cameras — plane spotting from live ADS-B data, free with no signup.",
  url: "https://worldeye.app/live-plane-spotting",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  dateModified: "2026-10-18",
};

export default function LivePlaneSpottingPage() {
  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-10">
          <Link href="/live-flight-tracker" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <Plane className="w-4 h-4" /> Flight tracker
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Plane className="w-3.5 h-3.5" /> LIVE AVIATION
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Live Plane Spotting, <span className="text-[#D4AF37]">From Your Sofa</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            Plane spotters drive to airport fences for a reason — watching a
            heavy jet on final is genuinely thrilling. WorldEye brings the
            fence to you: thousands of live flights on one globe, real routes
            and altitudes, a chase camera that rides behind any aircraft, and
            real cameras at the fields themselves.
          </p>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            Pick a descending A380 over London, a freighter crossing the
            Pacific, or the next arrival into your home airport — and follow it
            all the way down. Free, with no account and no signup.
          </p>
        </div>

        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">Ways to spot</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-5">
            {[
              {
                t: "Follow a flight in",
                d: "Click any aircraft and start the follow camera — chase, forward or orbit views ride with it through descent and landing rollout, with live altitude, speed and fix age on the HUD.",
              },
              {
                t: "Work the approach path",
                d: "Zoom to a major airport at peak hour and the arrivals line up like beads on a string. Each popup shows the route, aircraft type and how far out it is.",
              },
              {
                t: "See the actual aircraft",
                d: "Flight panels show a real photo of the exact aircraft — the same tail number — credited to its photographer on Planespotters, alongside live altitude, speed and heading.",
              },
              {
                t: "Check the airport itself",
                d: "3,528 FAA weather cameras at 981 US airports plus airport webcams worldwide: see the field's weather and activity before you even look at the sky.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
                <h3 className="font-bold">{c.t}</h3>
                <p className="text-sm text-white/55 leading-relaxed mt-2">{c.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">How to start spotting</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-7">
                <span className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-bold">
                  {i + 1}
                </span>
                <h3 className="font-bold mt-4">{s.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed mt-2">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">A spotter&rsquo;s session: how regulars use it</h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed max-w-3xl">
            <p>
              Airport-fence spotting runs on local knowledge: which runway is
              in use, when the heavies arrive, where the light is. The map
              version has its own version of that craft. Hubs work in banks —
              waves of arrivals and departures — and at the top of a bank the
              approach path into Atlanta, Heathrow or Haneda delivers a
              landing every minute or two. Pick the bank, not the airport:
              mid-morning and early evening at the big hubs are the reliable
              shows.
            </p>
            <p>
              Cargo is the night shift&rsquo;s reward. When the passenger
              banks sleep, the freighters move — Anchorage, Memphis,
              Louisville and Leipzig run some of the busiest night skies on
              the planet, and following a 747 freighter down through a dark
              continent is a different, quieter kind of spotting. And when
              the weather turns, the map gets dramatic: holding stacks
              building over a hub, diversions peeling off, a storm line
              rerouting a whole sky — the days aviation is most interesting
              are the days it isn&rsquo;t routine.
            </p>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold">Plane spotting FAQs</h2>
          <div className="mt-6 space-y-4">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 group"
              >
                <summary className="font-semibold cursor-pointer list-none flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  {f.q}
                </summary>
                <p className="text-sm text-white/55 leading-relaxed mt-3 pl-7">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <TrialCtaSection utmSource="live-plane-spotting" />

        <div className="mt-16 text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10 md:p-14">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            Your next arrival is <span className="text-[#D4AF37]">already on approach.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            Open the globe, turn on flights, and follow one down.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Start spotting <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/airport-webcams"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              Airport webcams
            </Link>
          </div>
          <p className="text-xs text-white/35 mt-6">
            Go deeper: <Link href="/live-flight-tracker" className="text-[#D4AF37] hover:underline">live flight tracker</Link> · <Link href="/what-is-ads-b" className="text-[#D4AF37] hover:underline">what is ADS-B?</Link> · <Link href="/satellite-tracker" className="text-[#D4AF37] hover:underline">satellite tracker</Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
