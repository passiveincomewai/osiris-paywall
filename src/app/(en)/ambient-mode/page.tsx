import type { Metadata } from "next";
import Link from "next/link";
import AmbientPassPromo from "@/components/ambient/AmbientPassPromo";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Intro,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  PageShell,
  type Faq,
} from "@/components/directory-page";

export const metadata: Metadata = {
  title: "Ambient Mode — Slow TV From Live Cameras Worldwide | WorldEye",
  description:
    "WorldEye Ambient turns 74,229 live public cameras into Slow TV: rainy cities, snowy mountains, tropical beaches and night views crossfading on your screen. $4.99/mo with a 10-day free trial; free 3-minute demo, no signup.",
  alternates: { canonical: `${BASE}/ambient-mode` },
  openGraph: {
    title: "WorldEye Ambient — Slow TV From the Real Planet",
    description:
      "One live camera at a time, crossfading slowly: rainy cities, snowy mountains, tropical beaches and places where night is falling. Try the free demo.",
    url: "/ambient-mode",
    type: "website",
  },
};

const INTRO = [
  "WorldEye Ambient is Slow TV built from the real world. Instead of a screensaver's loop or a stock-video playlist, Ambient plays WorldEye's live camera network — 74,229 public cameras on every continent — one camera at a time, full-screen, crossfading to somewhere else on Earth every 90 seconds. A rainy street in Bergen dissolves into a snowy pass in the Alps; a beach in the tropics gives way to a city where night is falling. Nothing is recorded, repeated or staged: whatever the camera sees is what is happening there now.",
  "It is made for the screens that are already on: the television in the corner of a room, the second monitor beside your work, the tablet propped on a desk while you study. Ambient needs no attention — that is the point. Pick a mood, press start, and the planet keeps a quiet window open next to whatever you are doing. The interface disappears after three seconds; a small caption names each place as it arrives, and that is all the interface there is.",
  "The collections are curated from the catalogue by place and scene — the honesty note is that no weather feed tells us it is raining on a given street this minute, so Rainy Cities means cameras in the world's famously wet cities, and Snowy Mountains means ski towns, alpine passes and high places. Night Views is the one collection computed live: it only ever shows cameras where the sun is actually down right now, worked out from each camera's coordinates.",
];

const FAQS: Faq[] = [
  {
    q: "What is WorldEye Ambient Mode?",
    a: "Ambient Mode is a Slow TV player at worldeye.app/ambient. It plays WorldEye's live public cameras one at a time, full-screen, crossfading every 30–180 seconds (90 by default), with collections called moods — Rainy Cities, Snowy Mountains, Tropical Beaches, Night Views, or the whole planet shuffled. It is designed for televisions, second monitors and study desks: the controls hide themselves, and a small caption names each camera's place.",
  },
  {
    q: "How much does Ambient cost?",
    a: "Ambient is $4.99/month with a 10-day free trial — start the trial from the player or this page and you will not be charged until it ends. It is a standalone product, separate from WorldEye Pro, but every Pro and VIP plan already includes unlimited Ambient at no extra cost.",
  },
  {
    q: "Can I try Ambient free without signing up?",
    a: "Yes. Open worldeye.app/ambient and press start: everyone gets a 3-minute streaming demo with no account and no card. The demo counts time only while a camera is actually playing — pausing or a slow feed does not burn it. When it ends, the picture blurs and you can start the 10-day free trial or sign in if you already have Ambient or Pro.",
  },
  {
    q: "Where do the cameras come from — is it really live?",
    a: "Every scene is a real public camera from the WorldEye catalogue — the same 74,229 cameras plotted on the WorldEye globe — streamed directly from its source to your browser. Scenes are live feeds (or, for snapshot cameras, frames that refresh continuously), never recordings or loops. Occasionally a camera is down or dark; Ambient skips dead feeds automatically and never charges your demo time for a camera that fails to load.",
  },
  {
    q: "What are the moods, exactly?",
    a: "Four curated collections plus Everywhere. Rainy Cities gathers cameras in famously wet-climate cities and storm-named scenes; Snowy Mountains gathers ski towns, resort and alpine-pass cameras; Tropical Beaches gathers beach and coast cameras in the tropical and warm-temperate band; Night Views is computed from the sun — it only shows cameras where it is dark right now. They are curated by place and scene from catalogue data, not matched to a live weather feed.",
  },
  {
    q: "Can I put Ambient on my TV?",
    a: "Yes — open worldeye.app/ambient in your smart TV's browser, or cast/mirror from a phone, tablet or laptop, then press start: Ambient goes full-screen and its controls hide after three seconds. The Stream to YouTube feature can also put Ambient on a TV through the YouTube app, by running the show on your own channel.",
  },
  {
    q: "Can I stream Ambient to my own YouTube channel?",
    a: "Yes — that is Stream to YouTube, included with Ambient and with Pro. You save your own YouTube stream key in settings and run a small relay program on an always-on computer; it cycles the cameras WorldEye is cleared to redistribute, with a WorldEye credit overlay, for as long as you leave it running. See the Stream to YouTube page for how it works and which cameras are eligible.",
  },
];

const productLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "WorldEye Ambient",
  description:
    "Slow TV from 74,229 live public cameras: mood collections — rainy cities, snowy mountains, tropical beaches, night views — crossfading full-screen.",
  url: `${BASE}/ambient-mode`,
  offers: {
    "@type": "Offer",
    price: "4.99",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: `${BASE}/ambient`,
  },
};

export default function AmbientModePage() {
  return (
    <PageShell>
      <JsonLd data={productLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Ambient Mode" },
        ]}
      />

      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0096FF]/40 px-4 py-1.5 text-xs font-semibold tracking-[0.25em] text-[#7cc4ff]">
          WORLDEYE AMBIENT
        </p>
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          Slow TV from the real planet
        </h1>
        <p className="mt-4 text-white/55">
          74,229 live cameras, one at a time, crossfading on your screen —
          rainy cities, snowy mountains, tropical beaches, and places where
          night is falling right now.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/ambient"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-7 py-3 text-sm font-bold text-black transition hover:brightness-110"
          >
            Launch the free demo
          </Link>
          <Link
            href="/ambient-tv"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/5"
          >
            The Slow TV guide
          </Link>
        </div>
        <p className="mt-4 text-xs text-white/40">
          3 free minutes, no signup · then $4.99/month with a 10-day free
          trial · included free with every Pro plan
        </p>
      </div>

      <Intro paragraphs={INTRO} />

      <section className="mt-12">
        <h2 className="mb-5 text-xl font-bold md:text-2xl">The four moods</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              mood: "rainy-cities",
              title: "Rainy Cities",
              body: "Seattle, Bergen, London, Singapore — cameras in the world's wettest cities, plus storm-named scenes. Wet pavement, grey light, umbrellas: the classic focus-and-study backdrop.",
            },
            {
              mood: "snowy-mountains",
              title: "Snowy Mountains",
              body: "Ski towns, resort cameras and alpine passes from the ski catalogue — lifts turning, snowfields, high roads. Winter, whenever you ask for it.",
            },
            {
              mood: "tropical-beaches",
              title: "Tropical Beaches",
              body: "Beach, harbour and island cameras held to the tropical and warm-temperate band, so the light is always summer somewhere on screen.",
            },
            {
              mood: "night-views",
              title: "Night Views",
              body: "The one live-computed mood: only cameras where the sun is down right now — city lights, night streets and bridges, following the dark around the planet.",
            },
          ].map((m) => (
            <Link
              key={m.mood}
              href={`/ambient?mood=${m.mood}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]"
            >
              <div className="font-semibold">{m.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">{m.body}</p>
              <span className="mt-3 inline-block text-xs font-semibold text-[#7cc4ff]">
                Play this mood →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-5 text-xl font-bold md:text-2xl">Made for the second screen</h2>
        <div className="space-y-4 leading-relaxed text-white/70">
          <p>
            <strong className="text-white">Study and deep work.</strong> A slow,
            silent, real scene is the rare background that does not compete for
            attention — no cuts, no narration, no algorithm. Many people keep a
            rainy city or a mountain pass beside their notes for the same reason
            cafés play lo-fi: it marks the room as a working room. An optional
            ambient music track is built into the player if you want sound.
          </p>
          <p>
            <strong className="text-white">Lounges, cafés and waiting rooms.</strong>{" "}
            A television showing a live beach, a ski lift or a famous square —
            different every two minutes, always real — is a calmer and more
            interesting wall than a news channel on mute. Ambient is built to
            run unattended: dead cameras skip themselves, and there is nothing
            to click.
          </p>
          <p>
            <strong className="text-white">Winding down.</strong> Night Views
            does something a playlist cannot: it follows the actual dark.
            At your midnight it is showing other midnights — and as the hours
            pass, the collection drifts west with the night itself.
          </p>
        </div>
      </section>

      <HowTo
        title="Start watching in under a minute"
        steps={[
          "Open worldeye.app/ambient — no account needed for the demo.",
          "Pick a mood (Everywhere shuffles the whole planet) and press Start Ambient. The show goes full-screen; controls hide after three seconds and return when you move the mouse.",
          "Use the arrows or arrow keys to skip a scene, space to pause, and the interval control to slow the rotation down to three minutes per camera — or speed it up to thirty seconds.",
          "When the 3-minute demo ends, start the 10-day free trial ($4.99/month after, cancel anytime) — or sign in: every Pro and VIP plan already includes unlimited Ambient.",
        ]}
      />

      <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
        <h2 className="text-xl font-bold md:text-2xl">Pricing, honestly</h2>
        <div className="mt-4 space-y-3 leading-relaxed text-white/70">
          <p>
            <strong className="text-white">$4.99/month</strong> for unlimited
            Ambient, after a <strong className="text-white">10-day free
            trial</strong>. One subscription covers the player on your screens
            and Stream to YouTube. There is no annual plan and no tier maze:
            Ambient is one small product at one small price.
          </p>
          <p>
            Already on WorldEye Pro or VIP? You own Ambient already — sign in
            and the demo timer simply never applies to you. Ambient is
            separate from Pro in the other direction: an Ambient subscription
            does not include Pro's recording, alerts or intel layers.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/ambient"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-6 py-2.5 text-sm font-bold text-black transition hover:brightness-110"
          >
            Try the free demo
          </Link>
          <Link
            href="/stream-to-youtube"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/5"
          >
            Stream it to YouTube
          </Link>
        </div>
        {/* Embedded checkout for the Ambient plan — renders nothing
            for users whose plan already includes Ambient. */}
        <AmbientPassPromo />
      </section>

      <FaqSection title="Ambient Mode questions" faqs={FAQS} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Ambient player", href: "/ambient" },
          { label: "The Slow TV guide", href: "/ambient-tv" },
          { label: "Stream to YouTube", href: "/stream-to-youtube" },
          { label: "Announcing Ambient Mode", href: "/blog/worldeye-ambient-mode" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "Volcano webcams", href: "/volcano-webcams" },
        ]}
      />
    </PageShell>
  );
}
