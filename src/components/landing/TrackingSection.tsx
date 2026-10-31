import { ArrowRight } from "lucide-react";
import Reveal from "./Reveal";
import TrackingDemoMount from "./TrackingDemoMount";
import MicroLabel from "../design/MicroLabel";
import MediaFrame from "../design/MediaFrame";
import Button from "../design/Button";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { isPublished } from "@/i18n/manifest";
import { enHome, type HomeCopy } from "@/i18n/dictionaries/en/home";

/**
 * Section 2 — flights, satellites & maritime tracking. The demo stage
 * (recordings of the real globe + tabs + sample telemetry panel) mounts
 * behind the IoGate; the server-rendered fallback is a real frame from
 * the product's intro film, used as a still, never presented as live.
 *
 * Copy comes from the home dictionary (tracking block). The flight
 * tracker link localizes when that page is published in the locale;
 * the satellite tracker keeps its English URL until its own tranche.
 *
 * Visual transformation (homepage wave): the header, the fallback
 * stage frame and the CTAs now use the design system (MicroLabel /
 * MediaFrame / Button on the --we-* tokens) instead of the retired
 * #0096FF SEO-blue dialect. Copy, links, section order and the demo
 * island are unchanged.
 */
function StaticStage({ alt }: { alt: string }) {
  return (
    <MediaFrame state="none">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/worldeye-cinematic-poster.jpg"
          alt={alt}
          width={1920}
          height={1080}
          loading="lazy"
          className="block w-full h-auto"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(5, 7, 11, 0.7), transparent)",
          }}
        />
      </div>
    </MediaFrame>
  );
}

export default function TrackingSection({
  copy = enHome,
  locale = "en",
}: {
  copy?: HomeCopy;
  locale?: LocaleCode;
} = {}) {
  const tracking = copy.tracking;
  const flightHref = isPublished("live-flight-tracker", locale)
    ? localizedPath("live-flight-tracker", locale)
    : "/live-flight-tracker";
  return (
    <section aria-label={tracking.ariaLabel} data-landing-view="tracking" className="relative">
      <div
        className="mx-auto w-full"
        style={{
          maxWidth: "var(--we-wide)",
          paddingLeft: "var(--we-gutter)",
          paddingRight: "var(--we-gutter)",
          paddingTop: "var(--we-section-y)",
          paddingBottom: "var(--we-section-y)",
        }}
      >
        <Reveal>
          <MicroLabel>{tracking.eyebrow}</MicroLabel>
          <h2
            className="font-[family-name:var(--we-font-display)]"
            style={{
              color: "var(--we-text-1)",
              fontSize: "var(--we-size-display-2)",
              lineHeight: "var(--we-leading-display)",
              fontWeight: 560,
              marginTop: "var(--we-space-4)",
            }}
          >
            {tracking.title}
          </h2>
          <p
            style={{
              color: "var(--we-text-2)",
              fontSize: "var(--we-size-lede)",
              lineHeight: "var(--we-leading-body)",
              marginTop: "var(--we-space-4)",
              maxWidth: "var(--we-measure)",
            }}
          >
            {tracking.sub}
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-8">
          <TrackingDemoMount fallback={<StaticStage alt={tracking.stageAlt} />} />
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button href={flightHref}>
              {tracking.ctaFlight} <ArrowRight className="w-4 h-4" aria-hidden />
            </Button>
            <Button variant="quiet" href="/satellite-tracker">
              {tracking.satelliteLink}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
