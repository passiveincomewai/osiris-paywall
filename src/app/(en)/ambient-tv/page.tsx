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
import AmbientPassPromo from "@/components/ambient/AmbientPassPromo";

export const metadata: Metadata = {
  title: "Slow TV Guide — What It Is, Best Scenes, TV & Second-Monitor Setup | WorldEye",
  description:
    "Slow TV explained: the Norwegian format of long, unhurried, real-time broadcasts — and how to watch it from live cameras on your TV or second monitor with WorldEye Ambient.",
  alternates: { canonical: `${BASE}/ambient-tv` },
  openGraph: {
    title: "The Slow TV Guide — WorldEye",
    description:
      "What Slow TV is, why people study and live with it, the best live scenes to watch, and how to set it up on a TV or second monitor.",
    url: "/ambient-tv",
    type: "website",
  },
};

const INTRO = [
  "Slow TV is television at the speed of life. The format was born in Norway, where the broadcaster NRK aired a train journey from Bergen to Oslo minute by minute — all seven hours of it — and followed it with an even longer live coastal voyage that much of the country tuned in to watch. Nothing happened, slowly, together: that was the discovery. A fireplace channel asks you to watch a fire; Slow TV asks you to watch the world, unedited — a ferry crossing, a railway through mountains, a square in the rain — for as long as you care to stay.",
  "The format's quiet insight is that most screens in our lives are not being watched at all. They hum in the background of work, waiting rooms, kitchens and late nights, and what they usually show there — news tickers, ad loops, algorithmic video — is engineered to interrupt. Slow TV is the opposite engineering: long takes, no narration, no cuts, nothing demanding anything. It fills a screen the way a window does.",
  "WorldEye Ambient is Slow TV built from live cameras instead of a broadcast crew. The scenes are real public cameras — harbours, ski lifts, beaches, city squares, mountain passes — crossfading every 90 seconds, so the show never repeats and never ends. This guide covers what to watch, how people use it, and how to put it on a television or a second monitor in a couple of minutes.",
];

const FAQS: Faq[] = [
  {
    q: "What is Slow TV?",
    a: "Slow TV is a broadcast format, pioneered by Norway's NRK, built on long, real-time, minimally edited coverage of ordinary journeys and places — a seven-hour train ride, a multi-day coastal voyage, a fireplace, salmon fishing. There is no plot and no narration; the appeal is presence. WorldEye Ambient applies the format to live public cameras worldwide, crossfading between scenes instead of following one journey.",
  },
  {
    q: "Why do people watch Slow TV while studying or working?",
    a: "Because it is background that behaves. A slow, real scene gives the eyes somewhere to rest without feeding them new information every few seconds, and it makes a room feel occupied and calm rather than silent and empty. Students and remote workers commonly run it on a second screen for the same reason cafés are pleasant to work in: gentle, unhurried life continuing nearby.",
  },
  {
    q: "What are the best Slow TV scenes?",
    a: "The classics are journeys and weather: train and harbour views, mountain passes in snow, beaches, rainy city streets, and night-time cityscapes. In WorldEye Ambient these map to moods — Snowy Mountains for alpine passes and ski towns, Tropical Beaches for coasts and harbours, Rainy Cities for wet streets, and Night Views, which only shows cameras where it is dark right now.",
  },
  {
    q: "How do I watch Slow TV on my television?",
    a: "Open worldeye.app/ambient in your smart TV's web browser and press Start Ambient — it goes full-screen and the controls hide themselves. If your TV's browser is limited, open it on a laptop or phone and cast or mirror the screen, or use the Stream to YouTube feature and watch through the TV's YouTube app.",
  },
  {
    q: "How much does it cost to watch Slow TV on WorldEye?",
    a: "Everyone can watch a 3-minute demo free at worldeye.app/ambient with no signup. Unlimited viewing is WorldEye Ambient at $4.99/month with a 10-day free trial, and it is included free with every WorldEye Pro and VIP plan.",
  },
];

export default function AmbientTvPage() {
  return (
    <PageShell>
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Ambient Mode", href: "/ambient-mode" },
          { label: "Slow TV Guide" },
        ]}
      />

      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0096FF]/40 px-4 py-1.5 text-xs font-semibold tracking-[0.25em] text-[#7cc4ff]">
          THE SLOW TV GUIDE
        </p>
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          Television at the speed of life
        </h1>
        <p className="mt-4 text-white/55">
          What Slow TV is, why it works as a study aid and a living-room
          window — and how to watch it live, from real cameras, on any screen
          you own.
        </p>
        <div className="mt-8">
          <Link
            href="/ambient"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-7 py-3 text-sm font-bold text-black transition hover:brightness-110"
          >
            Watch Slow TV now — free demo
          </Link>
          <p className="mt-4 text-xs text-white/40">
            3 free minutes, no signup · unlimited with Ambient, $4.99/mo
          </p>
        </div>
      </div>

      <Intro paragraphs={INTRO} />

      <section className="mt-12">
        <h2 className="mb-5 text-xl font-bold md:text-2xl">The scenes that carry a room</h2>
        <div className="space-y-4 leading-relaxed text-white/70">
          <p>
            <strong className="text-white">Weather doing its work.</strong> The
            most-loved Slow TV is weather you can watch without being in it:
            snow settling on an alpine pass, rain shining a city street, surf
            working a beach. These scenes change constantly and demand nothing
            — the definition of the genre. Ambient&apos;s{" "}
            <Link href="/ambient?mood=snowy-mountains" className="text-[#7cc4ff] underline underline-offset-2">
              Snowy Mountains
            </Link>{" "}
            and{" "}
            <Link href="/ambient?mood=rainy-cities" className="text-[#7cc4ff] underline underline-offset-2">
              Rainy Cities
            </Link>{" "}
            moods are built from exactly those cameras.
          </p>
          <p>
            <strong className="text-white">Journeys and thresholds.</strong>{" "}
            Harbours, bridges, ferry terminals, airport aprons and famous
            squares — places whose whole purpose is people and machines coming
            and going. A harbour at dawn can hold a room for an hour.
          </p>
          <p>
            <strong className="text-white">The night side of the planet.</strong>{" "}
            Slow TV after dark has a special pull: lit streets, empty bridges,
            a volcano glowing on a ridge.{" "}
            <Link href="/ambient?mood=night-views" className="text-[#7cc4ff] underline underline-offset-2">
              Night Views
            </Link>{" "}
            is computed from the sun&apos;s position, so the show literally
            follows darkness around the Earth — at your midnight, you are
            watching other midnights.
          </p>
          <p>
            <strong className="text-white">The famous and the ordinary, mixed.</strong>{" "}
            A great rotation passes a world landmark — a fountain in Rome, a
            crossing in Tokyo — and then stays a while in a town you have never
            heard of. That mixture is why live cameras beat a curated video
            playlist: the ordinary scenes are the ones that feel like a window
            instead of a programme.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-5 text-xl font-bold md:text-2xl">Three ways people live with it</h2>
        <div className="space-y-4 leading-relaxed text-white/70">
          <p>
            <strong className="text-white">The study window.</strong> Students
            run Ambient on the second monitor or a tablet beside their notes:
            a rainy street or a snowy lift line, moving slowly, with the
            optional ambient music track on low. It makes a desk feel like a
            library carrel — occupied, calm, and pointed at the work.
          </p>
          <p>
            <strong className="text-white">The lounge wall.</strong> Cafés,
            clinics, co-working spaces and hotel lobbies keep a television on
            all day; the choice is between a muted news channel and a window
            onto the world. Ambient is built for unattended walls — no
            playlist to manage, dead cameras skip themselves, and the scene is
            new every couple of minutes.
          </p>
          <p>
            <strong className="text-white">The wind-down screen.</strong> A
            slow beach at dusk or a quiet night street is the rare screen that
            lowers a room&apos;s heart rate instead of raising it. Slow the
            rotation to three minutes per camera, kill the lights, and let
            the planet&apos;s quiet hours play.
          </p>
        </div>
      </section>

      <HowTo
        title="Put Slow TV on your TV or second monitor"
        steps={[
          "On the device connected to the screen, open worldeye.app/ambient and pick a mood.",
          "Press Start Ambient — on most smart TVs and browsers it goes full-screen automatically; the F key toggles fullscreen on a computer.",
          "Second monitor? Drag the browser window onto it before starting, then leave it — controls and cursor hide after three seconds, and a small caption still names each place.",
          "No usable TV browser? Cast or mirror from a phone or laptop — or run the show on your own YouTube channel with Stream to YouTube and open it in the TV's YouTube app.",
        ]}
      />

      {/* Pricing strip — the same embedded-checkout block /ambient-mode
          renders in its pricing section (price and trial wording come
          from the billing plan summary inside the component). */}
      <AmbientPassPromo />

      <FaqSection title="Slow TV questions" faqs={FAQS} />

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Ambient player", href: "/ambient" },
          { label: "Ambient Mode — the product", href: "/ambient-mode" },
          { label: "Stream to YouTube", href: "/stream-to-youtube" },
          { label: "Announcing Ambient Mode", href: "/blog/worldeye-ambient-mode" },
          { label: "Ski webcams", href: "/ski-webcams" },
          { label: "Beach webcams", href: "/beach-webcams" },
        ]}
      />
    </PageShell>
  );
}
