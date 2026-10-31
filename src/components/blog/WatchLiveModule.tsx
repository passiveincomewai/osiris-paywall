import Link from "next/link";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import { EXPLORE_SCOPES } from "@/lib/explore-data";
import type { BlogPost } from "@/app/(en)/blog/posts";

/**
 * "Watch it live" module for blog posts (site-audit Wave 2, R33):
 * posts were dead ends — no path from a story into the live
 * product. A post earns this module ONLY when it maps to a camera
 * family that verifiably exists in the explore registry, by the
 * post's own slug/tags:
 *   - Kīlauea posts → the Kīlauea event wall (event-vo-kilauea)
 *   - Etna posts → the Etna event wall (event-vo-etna)
 *   - aurora posts → the Fairbanks wall the aurora hub itself
 *     reuses (event-le-fairbanks)
 *   - ISS posts → a link card to the satellite tracker (the ISS
 *     has no camera wall; a link is the honest form)
 * Every other post renders nothing rather than a forced tie-in.
 */
export default function WatchLiveModule({ post }: { post: BlogPost }) {
  const slug = post.slug.toLowerCase();
  const tags = post.tags.map((t) => t.toLowerCase());

  let scopeKey: string | null = null;
  let heading = "";
  if (slug.includes("kilauea")) {
    scopeKey = "event-vo-kilauea";
    heading = "Watch Kīlauea live";
  } else if (slug.includes("etna")) {
    scopeKey = "event-vo-etna";
    heading = "Watch Mount Etna live";
  } else if (tags.includes("aurora")) {
    scopeKey = "event-le-fairbanks";
    heading = "Watch the aurora live";
  }

  if (scopeKey && EXPLORE_SCOPES[scopeKey]) {
    return (
      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight mb-6">
          <span className="text-[#D4AF37]">▸</span> {heading}
        </h2>
        <DirectoryExplorer
          scopeKey={scopeKey}
          scopeLabel={EXPLORE_SCOPES[scopeKey].label}
          groupBy="none"
          searchPlaceholder="Search these cameras…"
          explorerId={`watch-live-${post.slug}`}
        />
      </section>
    );
  }

  if (tags.includes("iss")) {
    return (
      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight mb-6">
          <span className="text-[#D4AF37]">▸</span> Track it live
        </h2>
        <Link
          href="/satellite-tracker"
          className="block rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-white/25"
        >
          <p className="font-semibold text-white/90">
            Follow the ISS on the live satellite tracker →
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            The station&apos;s current position, propagated from live
            orbital data alongside the rest of the tracked catalogue.
          </p>
        </Link>
      </section>
    );
  }

  return null;
}
