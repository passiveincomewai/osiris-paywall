import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SiteFooter from "@/components/SiteFooter";
import StreamKeyForm from "@/components/ambient/StreamKeyForm";

/**
 * /ambient/stream — Stream to YouTube settings. Any signed-in member
 * lands on the settings form; whether they may actually save a key is
 * enforced by /api/ambient/stream-key (Ambient plan or any Pro/VIP
 * tier), and the form renders that answer as its locked state. The
 * page deliberately does NOT pre-gate on access itself: a page-level
 * gate that fails closed turned this page into a dead end — signed-in
 * members without access (or with a hiccuping entitlement lookup) got
 * an upsell card instead of the settings surface the "Open stream
 * settings" button promised, with no way forward. The key is stored
 * encrypted and never displayed.
 */
export const metadata: Metadata = {
  title: "Stream to YouTube — WorldEye Ambient",
  description:
    "Send WorldEye's redistribution-cleared live cameras to your own YouTube channel around the clock with the Ambient relay.",
  robots: { index: false, follow: false },
};

export default async function AmbientStreamPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=%2Fambient%2Fstream");
  }

  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white">
      <div className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <p className="font-mono text-[11px] font-medium tracking-[0.25em] text-[#0096FF]">
          WORLDEYE AMBIENT
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Stream to YouTube
        </h1>
        <p className="mt-4 leading-relaxed text-white/60">
          Run a never-ending Ambient show on your own YouTube channel: the
          relay program pulls the cameras WorldEye is cleared to redistribute,
          stamps each scene with a “Live on WorldEye · worldeye.app/ambient”
          overlay, and cycles scenes for as long as you leave it running.{" "}
          <Link href="/stream-to-youtube" className="text-[#7cc4ff] underline underline-offset-2">
            How it works
          </Link>
          .
        </p>

        <div className="mt-8">
          <StreamKeyForm />
        </div>

        <section className="mt-10 space-y-3 text-sm leading-relaxed text-white/55">
          <h2 className="text-lg font-bold text-white">Running the relay</h2>
          <p>
            The relay is a small program that must run on an always-on
            computer you control — a home server, a mini PC, a spare laptop:
            streaming is continuous upload, so it can&apos;t run on
            WorldEye&apos;s web hosting. It needs Node.js and ffmpeg. Point it
            at worldeye.app with your relay token and it fetches your playlist
            (your stream key + the cleared cameras), then pushes the show to
            your channel. Full instructions ship with the relay in the
            WorldEye repository under <code className="font-mono text-white/75">tools/ambient-relay</code>.
          </p>
          <p>
            Only cameras whose sources are cleared for redistribution are in
            the relay playlist — public-agency and registry-cleared feeds.
            Cameras from sources without redistribution rights (Windy and
            others) never enter it, even though you can watch them on
            WorldEye itself.
          </p>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
