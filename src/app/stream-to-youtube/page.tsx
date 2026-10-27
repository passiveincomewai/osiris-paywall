import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
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
  title: "Stream Live Cameras to YouTube 24/7 — WorldEye Ambient Relay",
  description:
    "Run a never-ending live-camera show on your own YouTube channel: WorldEye Ambient's relay cycles redistribution-cleared cameras with a WorldEye overlay, for as long as you leave it running.",
  alternates: { canonical: `${BASE}/stream-to-youtube` },
  openGraph: {
    title: "Stream Live Cameras to Your YouTube Channel — WorldEye Ambient",
    description:
      "Your channel, our cleared cameras: a 24/7 Slow TV stream with your own stream key, a small relay program, and scenes that rotate themselves.",
    url: "/stream-to-youtube",
    type: "website",
  },
};

const INTRO = [
  "Some of the most-watched streams on YouTube are barely television at all: a beach that never closes, a city square at night, an eagle's nest, a harbour in the rain — running for days at a time while people study, work and sleep alongside them. Stream to YouTube is WorldEye Ambient's way of putting that format in your hands: a small relay program on your own computer sends a rotating show of live cameras to your own channel, with your own stream key, for as long as you leave it running.",
  "The mechanics are deliberately simple. You paste your YouTube stream key into your WorldEye settings (it is stored encrypted and never displayed again), download the relay, and start it: the relay asks WorldEye for your playlist — the cameras it may use, freshly shuffled — and pushes the show to YouTube, one camera at a time, ten minutes each by default, each stamped with the camera's name and place and a “Live on WorldEye · worldeye.app/ambient” credit. Dead cameras are skipped automatically; when the playlist ends, a new one begins.",
  "One rule shapes the whole feature, and it is a legal one, not a technical one: watching a camera on WorldEye and re-broadcasting it to a public channel are different rights. The relay playlist therefore contains only cameras whose sources are cleared for redistribution — public-agency feeds and sources WorldEye's rights registry has reviewed and cleared. Cameras from sources without redistribution rights, Windy Webcams among them, can be watched on WorldEye but never enter the relay. The playlist is enforced on WorldEye's side; the relay cannot widen it.",
];

const FAQS: Faq[] = [
  {
    q: "What do I need to stream WorldEye cameras to YouTube?",
    a: "Four things: a WorldEye Ambient subscription ($4.99/month with a 10-day free trial — every Pro or VIP plan also includes it), a YouTube channel with live streaming enabled, your channel's stream key, and an always-on computer running the free relay program (Node.js and ffmpeg). The relay machine does the streaming, so it needs a steady upload connection.",
  },
  {
    q: "Why can't the relay run on WorldEye's servers?",
    a: "A live stream is a continuous upload that runs for hours or days; web hosting is built for short requests, not permanent broadcasts. Running the relay on a machine you control — a home server, mini PC or spare laptop — is also what keeps the arrangement clean: the stream goes out under your key, from your connection, to your channel.",
  },
  {
    q: "Which cameras can I restream?",
    a: "Only cameras whose sources are cleared for redistribution in WorldEye's rights registry — mostly public-agency camera networks (transport departments, municipalities, national authorities) and other registry-cleared feeds. That is a smaller pool than the full 74,229-camera catalogue. Windy Webcams and every unreviewed or excluded source are never included, and the restriction is enforced by the playlist WorldEye serves the relay, not by the relay itself.",
  },
  {
    q: "Is my YouTube stream key safe?",
    a: "Your key is stored encrypted on WorldEye's side, is never shown again after you save it (saving a new one replaces it), and is sent only to your relay, over HTTPS, when the relay presents your personal relay token. Only the token's hash is stored, and you can rotate the token or delete the key entirely at any time in settings. Treat the key itself like a password: anyone who holds it can stream to your channel, which is why YouTube lets you reset it there too.",
  },
  {
    q: "What does the stream look like?",
    a: "A clean 720p show: one live camera full-frame, with the camera's name and place in the corner and the “Live on WorldEye · worldeye.app/ambient” credit overlay. Scenes rotate every ten minutes by default (configurable), the audio track is silent — camera audio is never restreamed — and you add your own music, title and description on the YouTube side if you want them.",
  },
  {
    q: "Why do streamers run 24/7 camera channels?",
    a: "Ambient and Slow TV streams gather loyal, long-session audiences: study-with-me viewers, people who keep a place they love open all day, relaxation and sleep viewers. A live window onto real places — a beach, a ski town, a famous square — is content that never needs editing, never goes stale, and gives a channel a permanent live presence. The WorldEye credit overlay means those viewers also discover where the show comes from.",
  },
];

export default function StreamToYoutubePage() {
  return (
    <PageShell>
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Ambient Mode", href: "/ambient-mode" },
          { label: "Stream to YouTube" },
        ]}
      />

      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0096FF]/40 px-4 py-1.5 text-xs font-semibold tracking-[0.25em] text-[#7cc4ff]">
          AMBIENT · STREAM TO YOUTUBE
        </p>
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          Your channel. The whole planet, live.
        </h1>
        <p className="mt-4 text-white/55">
          Run a never-ending live-camera show on your own YouTube channel —
          redistribution-cleared cameras, a WorldEye credit overlay, scenes
          that rotate themselves for as long as you leave the relay running.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/ambient/stream"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-7 py-3 text-sm font-bold text-black transition hover:brightness-110"
          >
            Open stream settings
          </Link>
          <Link
            href="/ambient-mode"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/5"
          >
            About Ambient — $4.99/mo
          </Link>
        </div>
        <p className="mt-4 text-xs text-white/40">
          Included with WorldEye Ambient (10-day free trial) and every Pro plan
        </p>
      </div>

      <Intro paragraphs={INTRO} />

      <HowTo
        title="From signup to live in four steps"
        steps={[
          "Get access: start Ambient ($4.99/month, 10-day free trial) or sign in with any Pro plan — then open worldeye.app/ambient/stream.",
          "In YouTube Studio, enable live streaming and copy your stream key. Paste it into the settings page: it is stored encrypted, and the page shows you a personal relay token exactly once.",
          "On an always-on computer, install Node.js and ffmpeg, download the relay from the WorldEye repository (tools/ambient-relay), and start it with your token.",
          "The relay fetches your playlist and goes live on your channel: scenes rotate every ten minutes by default, dead feeds skip themselves, and the show runs until you stop it.",
        ]}
      />

      <section className="mt-12">
        <h2 className="mb-5 text-xl font-bold md:text-2xl">Why a channel would run this</h2>
        <div className="space-y-4 leading-relaxed text-white/70">
          <p>
            <strong className="text-white">A permanent live presence.</strong>{" "}
            A channel that is always live is always discoverable: viewers drop
            in at 3 a.m. their time and find a snowy pass or a night harbour
            waiting. Long ambient sessions are the format&apos;s strength —
            people keep these streams open for hours, not seconds.
          </p>
          <p>
            <strong className="text-white">Content that produces itself.</strong>{" "}
            No filming, no editing, no uploads: the world supplies the footage
            and the rotation never repeats. Your work is the framing — a good
            title, a description, your own music if you want it — and the
            channel becomes a place rather than a feed of uploads.
          </p>
          <p>
            <strong className="text-white">Built-in attribution.</strong> Every
            scene carries “Live on WorldEye · worldeye.app/ambient” and its
            camera&apos;s real name and place. Viewers who want the interactive
            version — the globe, all the cameras, their own Ambient — know
            exactly where it lives.
          </p>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
        <h2 className="text-xl font-bold md:text-2xl">The eligibility rule, plainly</h2>
        <div className="mt-4 space-y-3 leading-relaxed text-white/70">
          <p>
            WorldEye&apos;s catalogue holds 74,229 cameras, and you can watch
            effectively all of them on the site. Restreaming is narrower by
            design: the relay playlist only includes cameras whose operating
            sources clear them for redistribution — public transport agencies,
            municipalities and national authorities, plus sources cleared in
            WorldEye&apos;s per-source rights registry.
          </p>
          <p>
            Everything else stays out — Windy Webcams, commercial webcam
            networks, unreviewed sources — not because the technology can&apos;t
            carry them, but because their terms don&apos;t grant re-broadcast
            rights. If a source&apos;s clearance is ever revoked, its cameras
            leave the playlist automatically.
          </p>
        </div>
      </section>

      <FaqSection title="Stream to YouTube questions" faqs={FAQS} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Stream settings", href: "/ambient/stream" },
          { label: "Ambient Mode — the product", href: "/ambient-mode" },
          { label: "The Slow TV guide", href: "/ambient-tv" },
          { label: "Announcing Ambient Mode", href: "/blog/worldeye-ambient-mode" },
          { label: "Ambient player", href: "/ambient" },
          { label: "Live webcams", href: "/live-webcams" },
        ]}
      />
    </PageShell>
  );
}
