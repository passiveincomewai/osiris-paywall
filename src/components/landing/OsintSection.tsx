import Link from "next/link";
import Reveal from "./Reveal";
import MicroLabel from "../design/MicroLabel";
import Button from "../design/Button";
import { enHome, type HomeCopy } from "@/i18n/dictionaries/en/home";

/**
 * Section 4 — the professional OSINT toolkit. Every card is a real,
 * implemented Pro capability (verified against the app's gating code).
 * No OI / AI-analyst content appears here, by explicit direction.
 * Card visuals are captured screenshots of the actual panels; the icon
 * treatment is the pre-capture shell.
 *
 * Card titles/descriptions come from the home dictionary (osint block,
 * in OSINT_CARDS order); slugs and hrefs stay in code — routes are
 * never translated. NOTE: the imagery alt texts in HomeSeoShell's
 * OSINT_VISUALS stay English in this tranche (alt copy for the
 * satellite/maritime/search captures was not part of the dictionary
 * extraction; flagged in the build REPORT).
 *
 * Visual transformation (W1, deferred from the homepage wave): the
 * section now sits on the design system — token container, MicroLabel
 * header, ink-panel cards with hairline borders, the PRO badge as a
 * token chip — replacing the gold/#0096FF dialect. Copy, links, card
 * order, analytics attributes and the visuals are unchanged. Gold
 * survives only as a locked fact (pricing Pro accent, affiliate rank
 * art); a "this is a Pro feature" badge is neither, so it tokenized.
 */
export const OSINT_CARDS = [
  {
    slug: "satellite-maps",
    title: "Satellite Maps",
    desc: "Full-screen satellite imagery on the globe.",
    href: "/features",
  },
  {
    slug: "maritime-tracking",
    title: "Maritime Tracking",
    desc: "Ships, ports and naval movements, live.",
    href: "/features",
  },
  {
    slug: "global-search",
    title: "Advanced Search",
    desc: "Pro filters across places, cameras and intel — basic search is free.",
    href: "/features",
  },
  {
    slug: "cyber-intelligence",
    title: "Cyber Intelligence",
    desc: "Malware, botnets and outages as they surface.",
    href: "/features",
  },
  {
    slug: "camera-recording",
    title: "Camera Recording",
    desc: "Record clips from live cameras in your browser.",
    href: "/recording",
  },
] as const;

export default function OsintSection({
  visuals,
  copy = enHome,
}: {
  visuals?: Record<string, React.ReactNode>;
  copy?: HomeCopy;
}) {
  const osint = copy.osint;
  return (
    <section aria-label={osint.ariaLabel} data-landing-view="osint" className="relative">
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
          <MicroLabel>{osint.eyebrow}</MicroLabel>
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
            {osint.title}
          </h2>
          {osint.sub ? (
            <p
              style={{
                color: "var(--we-text-2)",
                fontSize: "var(--we-size-lede)",
                lineHeight: "var(--we-leading-body)",
                marginTop: "var(--we-space-4)",
                maxWidth: "var(--we-measure)",
              }}
            >
              {osint.sub}
            </p>
          ) : null}
        </Reveal>
        <div className="mt-10 flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-visible md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {OSINT_CARDS.map((card, i) => {
            const localized = osint.cards[i] ?? card;
            return (
              <Reveal key={card.slug} delay={i * 0.06} className="min-w-[240px] snap-start md:min-w-0">
                <Link
                  href={card.href}
                  data-landing-event={`osint_card:${card.slug}`}
                  className="block h-full overflow-hidden transition hover:border-[var(--we-line-3)]"
                  style={{
                    background: "var(--we-ink-2)",
                    border: "1px solid var(--we-line-2)",
                    borderRadius: "var(--we-radius-2)",
                  }}
                >
                  <div
                    className="relative aspect-[4/3] flex items-center justify-center overflow-hidden"
                    style={{ background: "var(--we-ink-3)" }}
                  >
                    {visuals?.[card.slug] ?? (
                      <span
                        aria-hidden
                        className="w-14 h-14 rounded-full flex items-center justify-center font-[family-name:var(--we-font-mono)] text-lg font-bold"
                        style={{
                          border: "1px solid var(--we-line-3)",
                          color: "var(--we-blue-strong)",
                        }}
                      >
                        {localized.title.split(" ").map((w) => w[0]).join("")}
                      </span>
                    )}
                    <span
                      className="absolute top-3 left-3 font-[family-name:var(--we-font-mono)] uppercase"
                      style={{
                        fontSize: "var(--we-size-micro)",
                        letterSpacing: "var(--we-tracking-micro)",
                        color: "var(--we-text-1)",
                        border: "1px solid var(--we-line-3)",
                        borderRadius: "var(--we-radius-1)",
                        padding: "0.25rem 0.5rem",
                        background: "var(--we-ink-0)",
                      }}
                    >
                      {osint.proBadge}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 style={{ color: "var(--we-text-1)", fontWeight: 600, margin: 0 }}>
                      {localized.title}
                    </h3>
                    <p
                      style={{
                        color: "var(--we-text-2)",
                        fontSize: "var(--we-size-small)",
                        lineHeight: "var(--we-leading-body)",
                        marginTop: "var(--we-space-1)",
                      }}
                    >
                      {localized.desc}
                    </p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={0.15}>
          <div style={{ marginTop: "var(--we-space-6)" }}>
            <Button variant="quiet" href="/features">
              {osint.exploreLink}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
