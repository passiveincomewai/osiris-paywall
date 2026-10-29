import type { Metadata } from "next";
import SensingTool from "@/components/sensing/SensingTool";

/**
 * WorldEye WiFi Sensing — a free public tool (in the OSINT tools menu and
 * the sitemap, like the other /tools pages; no plan gate, no sign-in).
 *
 * One page, three REAL sensing modes — no simulation anywhere:
 *  1. RavenScope mode: the visitor's own laptop runs the free RavenScope
 *     program (WiFi signal-strength sensing); this page is its display.
 *     Flagship on desktop — auto-connects when the program is running.
 *  2. WiFi Link mode: the page times probes to /api/sensing-ping and runs
 *     the timings through RavenScope's ping-backend pipeline. Senses
 *     disturbance of THIS device's own link only — copy says exactly that.
 *  3. Camera mode: on-device frame-difference motion sensing. Frames are
 *     never uploaded, recorded or stored.
 *
 * Honesty rules for this page (do not weaken):
 * - Motion/disturbance sensing only. No people counting, no breathing or
 *   heart rate, no sleep, no falls — those need WiFi CSI hardware, and
 *   the copy names them only to disclaim them.
 * - A perfectly still person reads as a still scene (camera) / a quiet
 *   link (WiFi Link). The copy says so, plainly.
 * - RavenScope setup copy must keep the connector step: stock RavenScope
 *   sends no CORS header, so no web page can read it without the
 *   one-file connector. Pretending otherwise ships a broken flow.
 */
export const metadata: Metadata = {
  title: "WiFi Sensing — Sense Motion in a Room with WiFi & Camera (Free)",
  description:
    "Free WiFi sensing tool: sense presence and motion in a room three real ways — RavenScope on your computer (WiFi signal strength), your device's own WiFi link timing, or its camera, processed on-device. No extra hardware, nothing uploaded.",
  alternates: { canonical: "/sensing" },
  openGraph: {
    title: "WiFi Sensing — Sense Motion in a Room (Free) | WorldEye",
    description:
      "Three real ways to sense motion in a room from one free page: RavenScope WiFi sensing on your computer, WiFi link timing on any device, or on-device camera motion sensing.",
    url: "/sensing",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "WorldEye WiFi Sensing",
  description:
    "A free browser tool that senses presence and motion in a room using WiFi signal strength (via the open-source RavenScope program), WiFi link timing, or the device camera processed on-device.",
  url: "https://worldeye.app/sensing",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

export default function SensingPage() {
  return (
    <main className="min-h-screen" style={{ background: "#050810" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-16 text-white">
        <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          WorldEye Sensing · Free tool · Experimental
        </p>
        <h1 className="mt-3 text-3xl sm:text-5xl font-bold leading-tight">
          Sense motion in a room — with the WiFi and camera you already have.
        </h1>
        <p className="mt-5 max-w-3xl text-base sm:text-lg text-white/70 leading-relaxed">
          WiFi signals wobble when bodies move through them, and a camera sees the movement
          directly. This free page turns both into a live room readout — presence, stillness,
          movement, strong activity — three real ways, no extra hardware and nothing simulated:
        </p>
        <ul className="mt-4 max-w-3xl space-y-2 text-base text-white/70 leading-relaxed">
          <li>
            <span className="font-semibold text-white">RavenScope</span> — on a laptop or desktop,
            run the free RavenScope program and this page becomes its display: true WiFi
            signal-strength sensing of the room that computer is in.
          </li>
          <li>
            <span className="font-semibold text-white">WiFi Link</span> — on any device, including
            a phone: the page times its own connection and senses disturbance of that link.
            Starts by itself.
          </li>
          <li>
            <span className="font-semibold text-white">Camera</span> — motion sensing with this
            device&apos;s camera, processed entirely on the device.
          </li>
        </ul>
        <p className="mt-4 max-w-3xl text-sm text-white/50">
          Free to use — no account, no plan, no limits. Sensing runs on your device; WorldEye&apos;s
          servers only serve this page and answer the WiFi Link timing probes.
        </p>

        <div className="mt-6 max-w-3xl rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
          <p className="text-sm leading-relaxed text-amber-100/90">
            <span className="font-semibold text-amber-200">What this can and cannot do — read first.</span>{" "}
            These modes sense motion and disturbance, not people. A person sitting perfectly still
            looks like a still scene to the camera and barely stirs a WiFi link, and these modes
            cannot count people or measure breathing, heart rate, sleep or falls — that takes
            WiFi CSI hardware (a dedicated sensing node). This is an experimental demonstration,
            not a security or medical device. On a phone, keep this page open and in the
            foreground while sensing — mobile browsers pause sensors in the background.
          </p>
        </div>

        <SensingTool />

        <section className="mt-12 max-w-3xl space-y-4 text-sm leading-relaxed text-white/60">
          <h2 className="text-base font-semibold text-white">How each mode works</h2>
          <p>
            <span className="text-white/85">RavenScope mode.</span> RavenScope is a free,
            open-source program that watches the signal strength (RSSI) of the WiFi networks your
            computer can hear. Moving bodies perturb those signals; the program despikes and
            detrends them, measures motion energy against a calibrated noise floor, and reports a
            room state — EMPTY, STILL, MOTION or ACTIVE — plus a coarse sector and an anomaly
            score for sudden bursts. This page reads that feed directly from the program on your
            computer; the sensing, and the data, never leave your machine.
          </p>
          <p>
            <span className="text-white/85">WiFi Link mode.</span> About three times a second the
            page fetches an empty response from WorldEye and times the round trip. The first hop
            is your own WiFi link, so movement that disturbs that link — carrying the device, a
            person moving close to it, motion between the device and the router — shows up as
            timing jitter. The timings run through the same signal pipeline RavenScope uses for
            its gateway-ping backend: median despiking, a detrended baseline, windowed jitter
            energy, a calibrated quiet floor, and a state machine with hysteresis. Its states are
            about the link: LINK QUIET, LINK UNSETTLED, DISTURBANCE, ACTIVE DISTURBANCE.
          </p>
          <p>
            <span className="text-white/85">Camera mode.</span> With your permission, the page
            compares consecutive camera frames at low resolution (96×72) a few times a second and
            runs the same pipeline over the frame-difference energy, including the same
            left/centre/right sector readout. Frames are processed in your browser and are never
            uploaded, recorded or stored.
          </p>
          <p>
            <span className="text-white/85">The fuller WiFi tiers.</span> This display is
            feed-agnostic by design: richer WiFi sensing — RavenScope running on a computer in the
            room, and beyond it a RuView CSI node, the hardware tier this programme grows into
            next — plugs into the same readouts. Today the three modes above are the live feeds.
          </p>
        </section>

        <footer className="mt-12 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/40">
          <p>
            Signal-processing approach adapted from{" "}
            <a
              href="https://github.com/tmanish/raven-scope"
              className="text-cyan-300/80 underline decoration-dotted underline-offset-2"
              rel="noreferrer"
              target="_blank"
            >
              RavenScope
            </a>{" "}
            (MIT License, © 2026 RavenScope contributors) — its DSP pipeline and state machine,
            retargeted from WiFi signal energy to link-timing jitter and camera frame differences,
            and its own feed displayed directly in RavenScope mode. RavenScope implements the
            RSSI tier of the RuView sensing project. Experimental tool — readings are indicative
            only and are not validated for any safety, security or medical use.
          </p>
        </footer>
      </div>
    </main>
  );
}
