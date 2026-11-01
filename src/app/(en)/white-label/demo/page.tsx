import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Camera, MousePointerClick, Share2 } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import WhiteLabelDemoGenerator from "./WhiteLabelDemoGenerator";

// ── White Label demo generator ──────────────────────────────────────────
// A prospect builds an ILLUSTRATIVE preview of a White Label portal:
// their name + logo over real, current cameras near a place they pick.
// The honesty rules are the /white-label page's, applied tighter: this
// is a concept preview of an early-access pilot — not a live product,
// not a customer deployment, not an endorsement in either direction.
// The cameras are real because they come through the public-embed
// pipeline (rights-cleared sources only, live frames), and the preview
// says exactly that.

export const metadata: Metadata = {
  title: "White Label Demo Generator — Preview Your Branded Camera Portal",
  description:
    "See your organisation's name and logo over live cameras near your location — an illustrative preview of the WorldEye White Label pilot. Free, no account.",
  alternates: { canonical: "/white-label/demo" },
  openGraph: {
    title: "WorldEye White Label — demo generator",
    description:
      "Build an illustrative preview of a branded live-camera portal for your resort, destination or media brand.",
    type: "website",
    url: "/white-label/demo",
  },
};

const STEPS = [
  {
    icon: MousePointerClick,
    title: "1 · Name it and place it",
    body: "Your organisation's name, an optional logo, and the town, city or ski area your portal would cover.",
  },
  {
    icon: Camera,
    title: "2 · See real cameras",
    body: "Your preview fills with real, current cameras near that location — only sources whose terms clear them for redistribution, the same gate a pilot portal would use.",
  },
  {
    icon: Share2,
    title: "3 · Share and request",
    body: "The preview gets a private share link for your colleagues. If it looks right, request the pilot from the same page and we'll scope the real thing.",
  },
];

export default function WhiteLabelDemoPage() {
  return (
    <div className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#D4AF37]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-14">
        <Link href="/white-label" className="text-sm text-white/45 hover:text-white transition">
          ← WorldEye White Label (pilot)
        </Link>

        <div className="max-w-3xl mt-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3.5 py-1.5 text-[11px] font-bold tracking-[0.18em] text-[#D4AF37]">
            DEMO GENERATOR — ILLUSTRATIVE PREVIEW
          </p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-5 leading-[1.08]">
            See your brand on the camera network.{" "}
            <span className="text-[#D4AF37]">In about a minute.</span>
          </h1>
          <p className="text-white/55 mt-5 text-lg leading-relaxed">
            Tell us who you are and where you&apos;d point the cameras, and
            this page builds a shareable preview of your White Label portal:
            your name and logo over real, current cameras near your location.
            It is a concept preview of an early-access pilot — not a live
            product, and creating one implies no partnership.
          </p>
        </div>

        <div className="mt-10 max-w-3xl">
          <WhiteLabelDemoGenerator />
        </div>

        <div className="mt-16 grid sm:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
              <s.icon className="w-6 h-6 text-[#D4AF37]" />
              <h3 className="mt-3 font-semibold text-white/90">{s.title}</h3>
              <p className="mt-1.5 text-sm text-white/55 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8 max-w-3xl">
          <h2 className="font-semibold text-white/90">What a real pilot adds</h2>
          <p className="mt-2 text-sm text-white/55 leading-relaxed">
            A configured portal on your own domain, your colours throughout,
            curated collections beyond one location, the interactive 3D globe
            scoped to your places, embeddable players for your existing site,
            and portal analytics. Indicative pilot pricing starts at $249/mo —
            see the full picture, including what the pilot does and doesn&apos;t
            include today, on the White Label page.
          </p>
          <Link
            href="/white-label"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#D4AF37] hover:underline"
          >
            About the White Label pilot <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
