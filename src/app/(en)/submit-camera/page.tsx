import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { ArrowLeft, Video, Search, ClipboardCheck, ArrowRight } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import SubmitCameraForm from "@/components/camera-submissions/SubmitCameraForm";

export const metadata: Metadata = {
  title: "Submit a Camera — WorldEye",
  description:
    "Run a public camera, or found a live feed WorldEye doesn't have? Submit it for review — operators can list their own cameras and anyone can suggest a public feed.",
  alternates: { canonical: "/submit-camera" },
  openGraph: {
    title: "Submit a Camera — WorldEye",
    description:
      "Help grow the live map: submit your own public camera, or suggest a public feed we've missed.",
    type: "website",
    url: "/submit-camera",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Submit a Camera — WorldEye",
  description:
    "Submit a public camera you operate, or suggest a public live feed, for review and inclusion on WorldEye.",
  url: "https://worldeye.app/submit-camera",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const STEPS = [
  {
    icon: Video,
    title: "1. Send the feed",
    body: "Paste the stream or page address, tell us where the camera is, and confirm the permission statement that fits — yours, or a public feed you're suggesting.",
  },
  {
    icon: Search,
    title: "2. We check it by hand",
    body: "A person reviews every submission: the feed has to be live, publicly viewable (or permissioned by its operator), and not already on the map.",
  },
  {
    icon: ClipboardCheck,
    title: "3. Approved = cleared for import",
    body: "Approved cameras join the import list and are added to the map in batches. We'll email you the decision either way — approval and going live aren't the same moment.",
  },
];

const FAQS = [
  {
    q: "What counts as a public feed?",
    a: "A stream or camera page that anyone on the internet can watch without an account, a password, or being on a private network — a resort's public webcam page, a city or DOT traffic camera, a harbor or beach cam the operator publishes for everyone. If it needs a login, it isn't public and we can't list it.",
  },
  {
    q: "I run a camera — why list it on WorldEye?",
    a: "Your feed goes in front of the audience already exploring 74,229 live cameras by place and category, on the map and on your location's pages. Listing is free. You keep ownership of your feed; you're giving us permission to display it, and you can ask us to remove it at any time via the contact page.",
  },
  {
    q: "Can I suggest a camera that isn't mine?",
    a: "Yes — that's the second path on the form. Suggest feeds that are published publicly by their operator. We still verify the feed is genuinely public before listing it, and a suggestion never overrides an operator's wishes: if an operator asks us to take a feed down, we do.",
  },
  {
    q: "What stream formats work?",
    a: "HLS (.m3u8) is best. Public MJPEG, MP4 and snapshot-image feeds also work, and a public page where the camera plays is fine to send — we'll sort out the underlying feed during review.",
  },
  {
    q: "How long does review take?",
    a: "Every submission is checked by a person on a small team, so it can take a while — we don't promise a timeframe. You'll get an email when the decision is made, and you can submit more cameras in the meantime.",
  },
  {
    q: "My camera was approved — why isn't it on the map yet?",
    a: "Approval means the camera is cleared to be added. New cameras are imported into the catalogue in batches rather than one at a time, so there's usually a gap between the approval email and the camera appearing. Nothing is wrong and there's nothing you need to do.",
  },
  {
    q: "What gets rejected?",
    a: "Feeds that aren't reachable, need a login or password, sit on a private network, duplicate a camera already listed, or that we can't confirm are public or permissioned. The decision email says what happened, and you can resubmit with corrected details.",
  },
];

export default function SubmitCameraPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] bg-[#D4AF37]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        <div className="text-center max-w-2xl mx-auto">
          <img
            src="/worldeye-eye.png"
            alt="WorldEye"
            width={600}
            height={432}
            className="h-14 md:h-16 w-auto mx-auto mb-6"
            style={{ filter: "drop-shadow(0 0 18px rgba(0,150,255,0.45))" }}
          />
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Put a camera <span className="text-[#D4AF37]">on the map</span>.
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            WorldEye grows one verified feed at a time. If you operate a
            public camera — or you&apos;ve found a live feed we don&apos;t
            have yet — send it in and we&apos;ll review it for the map.
          </p>
        </div>

        {/* How it works */}
        <section className="mt-12 md:mt-16">
          <div className="grid sm:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.title} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                <s.icon className="w-7 h-7 text-[#D4AF37] mb-4" />
                <h3 className="font-semibold text-white/90">{s.title}</h3>
                <p className="text-sm text-white/50 mt-2 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The form */}
        <section className="mt-14 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Submit a <span className="text-[#D4AF37]">camera</span>
          </h2>
          <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto leading-relaxed">
            Two ways in: list a camera you operate, or suggest a public
            feed. Either way a person reviews it — nothing is published
            automatically.
          </p>
          <div className="mt-8">
            <SubmitCameraForm />
          </div>
        </section>

        {/* Good candidates */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">What makes a <span className="text-[#D4AF37]">good submission</span></h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
            <ul className="space-y-3 text-sm md:text-base">
              <li className="flex gap-3"><span aria-hidden className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70 shrink-0" /><span><strong className="text-white/85">The direct feed address.</strong> A stream URL (HLS is ideal) or the public page where the camera plays. The closer to the actual feed, the faster the review.</span></li>
              <li className="flex gap-3"><span aria-hidden className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70 shrink-0" /><span><strong className="text-white/85">An exact location.</strong> City and country are required; coordinates are optional but place the pin perfectly and save a round of checking.</span></li>
              <li className="flex gap-3"><span aria-hidden className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70 shrink-0" /><span><strong className="text-white/85">A name that says what it sees.</strong> &ldquo;Jackson Hole Town Square&rdquo; beats &ldquo;CAM 04&rdquo;. The name you send is close to what appears on the map.</span></li>
              <li className="flex gap-3"><span aria-hidden className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70 shrink-0" /><span><strong className="text-white/85">Context in the notes.</strong> Who runs the feed, whether it&apos;s seasonal or 24/7, anything that helps us confirm it&apos;s public and keep it labeled correctly.</span></li>
            </ul>
            <p>
              Running a resort, town, harbor or venue with several cameras?
              The <Link href="/contact#partnerships" className="text-[#D4AF37] hover:underline">partnerships route</Link>{" "}
              may fit better than one form per camera — tell us what you run
              and we&apos;ll talk.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Before you <span className="text-[#D4AF37]">submit</span>
          </h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-medium text-white/90">{f.q}</span>
                  <span aria-hidden className="text-[#D4AF37] shrink-0 transition-transform group-open:rotate-180 text-lg leading-none">▾</span>
                </summary>
                <p className="px-6 pb-5 text-sm text-white/60 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Supplier routes — for operators with more than one camera to place */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Run cameras? <span className="text-[#D4AF37]">Three more routes</span>
          </h2>
          <div className="mt-8 grid sm:grid-cols-3 gap-5">
            <Link href="/enterprise" className="block rounded-3xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#D4AF37]/40 transition">
              <h3 className="font-semibold text-white/90">Embed on your own site</h3>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">WorldEye Enterprise covers the embed player and camera-feed API for your own pages.</p>
            </Link>
            <Link href="/partners" className="block rounded-3xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#D4AF37]/40 transition">
              <h3 className="font-semibold text-white/90">Partnerships</h3>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">Networks and agencies: work with us on how your feeds appear and are attributed on the globe.</p>
            </Link>
            <Link href="/affiliates" className="block rounded-3xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#D4AF37]/40 transition">
              <h3 className="font-semibold text-white/90">Affiliates</h3>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">Refer viewers to WorldEye and earn recurring commission on the subscriptions you bring in.</p>
            </Link>
          </div>
        </section>

        <p className="mt-12 text-center text-sm text-white/40">
          Want to look around first? <Link href="/" className="text-[#D4AF37] hover:underline">Open the live map</Link> or
          browse <Link href="/cameras/countries" className="text-[#D4AF37] hover:underline">cameras by country</Link>.
          <ArrowRight className="inline w-3.5 h-3.5 ml-1 text-[#D4AF37]" />
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}
