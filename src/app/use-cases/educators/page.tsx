import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Camera,
  CheckCircle2,
  Globe,
  GraduationCap,
  Orbit,
  Telescope,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "WorldEye for Educators — A Live Globe for the Classroom",
  description:
    "Educators use WorldEye's live 3D globe to teach geography, earth science, orbital physics and media literacy — free for classrooms, no signup.",
  alternates: { canonical: "/use-cases/educators" },
  openGraph: {
    title: "WorldEye for Educators",
    description:
      "A live 3D globe for the classroom: geography, earth science, orbital physics and media literacy — free, no signup.",
    type: "website",
    url: "/use-cases/educators",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WorldEye for Educators",
  description:
    "How educators use WorldEye's live 3D globe to teach geography, earth science, orbital physics, and media literacy in the classroom.",
  url: "https://worldeye.app/use-cases/educators",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FAQS = [
  {
    q: "Is WorldEye free for schools?",
    a: "Yes. The entire map — globe, flights, satellites, weather, earthquakes, cameras — is free for everyone, forever, with no account. There is no education tier to apply for because there's no paywall to waive.",
  },
  {
    q: "Do students need accounts to use it?",
    a: "No. WorldEye opens in a browser with no signup, so students can use it on classroom Chromebooks, library computers, or their own devices without accounts, passwords, or personal data collection.",
  },
  {
    q: "What subjects does it support?",
    a: "Geography (a living world map), earth science (earthquakes, volcanoes, weather systems, wildfires), physics (orbital mechanics, flight, the day-night terminator), and media literacy (verifying images against live cameras). It also works for current events and social studies discussions.",
  },
  {
    q: "Can it be used for lesson plans on natural disasters?",
    a: "Yes — that's one of its strongest classroom uses. When an earthquake or hurricane is in the news, show the class the live quake feed or storm on the weather layer, then open cameras near the affected area. Abstract news becomes observable reality. Pair it with official sources like the USGS for the science.",
  },
  {
    q: "Does it work on classroom projectors and Chromebooks?",
    a: "Yes. It's a standard web app — it runs in any modern browser on Chromebooks, tablets, and teacher laptops, and projects fine for whole-class viewing. No installs, no admin rights needed.",
  },
  {
    q: "Can students use it for homework?",
    a: "Yes — it runs in any browser with no account, so a teacher can assign work that needs nothing but a link: 'find three time zones where it's currently dark,' or 'track a flight from New York to London and explain why its path curves.'",
  },
  {
    q: "Is the content appropriate for young students?",
    a: "The map shows public places — streets, weather, planes — with no graphic or adult content by design. That said, breaking-news events can be distressing; preview the globe before projecting it, the same as you would any live news source.",
  },
  {
    q: "Can I use it for remote teaching?",
    a: "Share your screen on any video call and fly the class around the planet together. It works as well over screenshare as it does on the classroom projector — the globe doesn't care where the students are sitting.",
  },
  {
    q: "Does it collect student data?",
    a: "No accounts means no student data to collect. Students open the site and use it — no logins, no profiles, nothing to consent to, and nothing for a school IT department to vet.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const SECTIONS = [
  {
    icon: Globe,
    title: "Geography with a live globe",
    body: "Continents on a flat map are abstract; a spinning globe with live weather swirling over it is not. Show students the terminator line sweeping across the planet at sunrise, trace a flight from your city to a sister school abroad, or compare time zones by watching daylight move. The map they grew up with becomes the planet they live on.",
  },
  {
    icon: Telescope,
    title: "Earth science in real time",
    body: "Plate tectonics stops being a diagram when the earthquake feed lights up the Ring of Fire during class. Track a hurricane's spiral on the weather layer, watch wildfire smoke drift across a state, or open cameras near an erupting volcano. When the news covers a disaster, the classroom can observe it directly — then learn the science behind it.",
  },
  {
    icon: Orbit,
    title: "The physics of orbits and flight",
    body: "Satellites sweep overhead in real orbits; aircraft follow great-circle routes you can trace with a finger. Ask students why the satellite ground tracks curve, why a flight from New York to Tokyo arcs over Alaska, or how many orbits the ISS completes while they're in school. The globe turns orbital mechanics into something they can watch.",
  },
  {
    icon: Camera,
    title: "Media literacy with live cameras",
    body: "Show the class a dramatic image 'from' somewhere — then open a live camera at that location and compare. Is it the same street? The same weather? The same time of day? Teaching students to check a claim against a live source is the most practical media-literacy skill they'll learn, and 40,000 cameras make the exercise endless.",
  },
  {
    icon: BookOpen,
    title: "Current events, grounded in reality",
    body: "When the news covers a place, open it. A story about a drought means more when students can see the reservoir on a camera; a trade dispute lands differently with container ships visible in the harbor. The globe turns headlines from abstractions into places with weather, traffic and people.",
  },
  {
    icon: Globe,
    title: "Environmental science, observed",
    body: "Watch snowpack build through the season on mountain cameras, trace a river from source to sea, or follow wildfire smoke across a continent on the weather layer. Big processes — erosion, seasons, the water cycle — stop being diagrams when students can watch them happening.",
  },
  {
    icon: Telescope,
    title: "Math and data in the wild",
    body: "How fast is that plane actually going? How long until the ISS is overhead again? The map is full of live numbers — speeds, altitudes, coordinates — that turn into estimation problems, unit conversions and graphing exercises with real stakes instead of textbook ones.",
  },
  {
    icon: Camera,
    title: "Culture and language through place",
    body: "A language class can walk the streets of Madrid on traffic cameras, read the shop signs, watch the evening crowds fill the plazas. Geography becomes culture when students can see how people actually use a place — the markets, the commutes, the waterfronts — instead of just where it sits on a map.",
  },
  {
    icon: Camera,
    title: "Time zones and the terminator, live",
    body: "The oldest hard idea in the geography curriculum — that noon is a place, not a moment — becomes obvious on a live globe: daylight over Asia while the Americas sleep, the sunrise line crawling west, a class in Utah watching Tokyo's evening commute in their own morning. Pair the globe's day-night shading with cameras on both sides of the line and students stop memorizing time zones and start seeing them.",
  },
];

export default function EducatorsPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      <JsonLd data={faqJsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] bg-[#D4AF37]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/use-cases" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> All use cases
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <GraduationCap className="w-3.5 h-3.5" /> FOR EDUCATORS
          </p>
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            The planet, <span className="text-[#D4AF37]">live in class.</span>
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            WorldEye is a free live 3D globe — flights, satellites, weather,
            earthquakes and 74,229 cameras — that turns geography, earth science,
            physics and media literacy into things students can watch happen.
          </p>
        </div>

        {/* Sections */}
        <div className="mt-16 md:mt-20 grid sm:grid-cols-2 gap-5">
          {SECTIONS.map((s) => (
            <div
              key={s.title}
              className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
            >
              <s.icon className="w-7 h-7 text-[#D4AF37] mb-4" />
              <h2 className="font-semibold text-white/90 text-lg">{s.title}</h2>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Lesson starters */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-[#D4AF37]" /> Five-minute lesson starters
          </h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
            <p>
              <span className="font-semibold text-white/85">Where is it daytime?</span>{" "}
              Open the globe at the start of class and have students find the
              sunrise line. Who on the planet is waking up right now?
            </p>
            <p>
              <span className="font-semibold text-white/85">Follow the quake.</span>{" "}
              When the earthquake feed shows a significant event, plot its location,
              look up the tectonic setting, and open a camera near the epicenter.
            </p>
            <p>
              <span className="font-semibold text-white/85">Trace the flight.</span>{" "}
              Pick a live long-haul flight and ask why its path curves. Great-circle
              routes on a globe answer the question better than any diagram.
            </p>
            <p>
              <span className="font-semibold text-white/85">Spot the fake.</span>{" "}
              Show a viral image with a claimed location, then open the live camera
              there. Students learn source-checking by doing it, not by hearing about it.
            </p>
            <p>
              <span className="font-semibold text-white/85">Count the satellites.</span>{" "}
              Zoom out and watch the orbital layer swarm. How many pass over your
              city during one class period — and what do they do?
            </p>
            <p>
              <span className="font-semibold text-white/85">Where&apos;s the weather?</span>{" "}
              Find the biggest storm on the planet right now. Which ocean made
              it, and where is it headed? Bonus: check a camera under it.
            </p>
            <p>
              <span className="font-semibold text-white/85">How long is the flight?</span>{" "}
              Pick two cities, find a live flight between them, and estimate its
              arrival from the speed and remaining distance. Then watch if
              you&apos;re right.
            </p>
            <p>
              <span className="font-semibold text-white/85">Night and day.</span>{" "}
              Find a city where the sun just rose and one where it just set. How
              many time zones apart are they — and who&apos;s eating breakfast
              while the other eats dinner?
            </p>
          </div>
        </section>

        {/* FAQs */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">Educator FAQs</h2>
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
        </section>

        {/* CTA */}
        <section className="mt-16 md:mt-20">
          <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold">Bring the planet to class tomorrow.</h2>
            <p className="text-white/55 mt-3 max-w-xl mx-auto">
              No accounts, no installs, no budget approval — just open the globe on
              the classroom screen.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-white/20 text-white font-semibold hover:bg-white/5 transition"
              >
                <Globe className="w-4 h-4" /> Open the live map
              </Link>
              <Link
                href="/pricing"
                className="inline-block hover:brightness-110 transition"
              >
                <img src="/upgrade-to-pro.png" alt="Upgrade to Pro" width={1072} height={262} className="h-12 w-auto" draggable={false} />
              </Link>
            </div>
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              label: "Satellite tracker",
              desc: "Live orbital positions — the layer that makes the physics of orbits visible in class.",
              href: "/satellite-tracker",
            },
            {
              label: "Earthquake tracker",
              desc: "Live seismic activity worldwide — plate tectonics, observable in real time.",
              href: "/earthquake-tracker",
            },
            {
              label: "All use cases",
              desc: "What researchers, journalists, travelers and storm watchers do with WorldEye.",
              href: "/use-cases",
            },
            {
              label: "About",
              desc: "Why the map is free forever, and what Pro funds.",
              href: "/about",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
