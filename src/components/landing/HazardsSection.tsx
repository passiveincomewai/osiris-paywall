import { ArrowRight } from "lucide-react";
import Reveal from "./Reveal";
import HazardsDemoMount from "./HazardsDemoMount";
import MicroLabel from "../design/MicroLabel";
import Button from "../design/Button";
import { enHome, type HomeCopy } from "@/i18n/dictionaries/en/home";

/**
 * Section 3 — weather, wildfires & earthquakes. The stage + live-data
 * side panel mount behind the IoGate; the static shell keeps the
 * headline, the CTA and the tracker links. Nothing here states or
 * implies a current event: live numbers only ever come from the real
 * feeds inside the island.
 *
 * Copy comes from the home dictionary (hazards block); the tracker
 * links keep their English URLs until those pages get their own
 * localized tranches.
 *
 * Visual transformation (homepage wave): header and CTAs now use the
 * design system (MicroLabel / Button on the --we-* tokens) and the
 * section sits on the ink-1 surface — the retired #0096FF gradient
 * wash is gone. Copy, links, section order and the demo island are
 * unchanged.
 */
export default function HazardsSection({
  copy = enHome,
}: {
  copy?: HomeCopy;
} = {}) {
  const hazards = copy.hazards;
  return (
    <section
      aria-label={hazards.ariaLabel}
      data-landing-view="hazards"
      className="relative"
      style={{ background: "var(--we-ink-1)" }}
    >
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
          <MicroLabel>{hazards.eyebrow}</MicroLabel>
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
            {hazards.title}
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
            {hazards.sub}
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-8">
          <HazardsDemoMount />
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button href="/weather-tracker">
              {hazards.exploreLink} <ArrowRight className="w-4 h-4" aria-hidden />
            </Button>
            <Button variant="quiet" href="/earthquake-tracker">
              {hazards.earthquakeLink}
            </Button>
            <Button variant="quiet" href="/wildfire-tracker">
              {hazards.wildfireLink}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
