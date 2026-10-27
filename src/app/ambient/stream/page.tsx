import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SiteFooter from "@/components/SiteFooter";
import StreamKeyForm from "@/components/ambient/StreamKeyForm";
import { resolveAmbientAccess } from "@/lib/ambient/access-server";

/**
 * /ambient/stream — Stream to YouTube settings. Signed-in members
 * with Ambient access (Ambient plan or any Pro/VIP tier) save their
 * own YouTube stream key and get the relay token for the relay
 * program. The key is stored encrypted and never displayed.
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
  const access = await resolveAmbientAccess(session.user.id).catch(() => false);

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
          {access ? (
            <StreamKeyForm />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm leading-relaxed text-white/75">
                Stream to YouTube is part of WorldEye Ambient ($4.99/mo with a
                10-day free trial) — and every WorldEye Pro or VIP plan already
                includes it. Your account doesn&apos;t have it yet.
              </p>
              <Link
                href="/ambient-mode"
                className="mt-4 inline-block rounded-full bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-5 py-2 text-sm font-bold text-black transition hover:brightness-110"
              >
                See Ambient
              </Link>
            </div>
          )}
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
