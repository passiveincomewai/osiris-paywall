/**
 * C10 (§4.5) hub consolidation: the below-line countries of one
 * region, rendered as anchored rows on their regional hub. A country
 * here has no standalone page (its old URL 301s to this row's
 * anchor); its indexed cameras stay watchable — each sample links to
 * the camera on the globe, the site's canonical watch URL. Data:
 * src/lib/indexation-gates.ts, derived from the country index.
 */
import Link from "next/link";
import { Camera } from "lucide-react";
import {
  consolidatedCountriesInRegion,
} from "@/lib/indexation-gates";
import { plural, type RegionKey } from "@/lib/country-page-content";

export default function ConsolidatedCountries({
  region,
  regionLabel,
}: {
  region: RegionKey;
  regionLabel: string;
}) {
  const rows = consolidatedCountriesInRegion(region);
  if (rows.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="text-xl md:text-2xl font-bold mb-2">
        Smaller networks in {regionLabel}
      </h2>
      <p className="text-sm text-white/50 mb-5 max-w-3xl">
        These {regionLabel} countries have only a handful of public cameras,
        so they are gathered here instead of carrying thin pages of their
        own. Every feed WorldEye indexes for them is listed below — each
        one opens live on the globe.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {rows.map((c) => (
          <article
            key={c.slug}
            id={c.slug}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 scroll-mt-24"
          >
            <h3 className="font-semibold">{c.name}</h3>
            <p className="text-xs text-white/45 mt-1">
              {plural(c.count, "live camera")}
              {c.topCities.length > 0 &&
                ` · ${c.topCities.map((a) => a.name).join(", ")}`}
            </p>
            <ul className="mt-3 space-y-1.5">
              {c.samples.map((s) => (
                <li key={s.id} className="text-sm">
                  <Link
                    href={`/?camera=${s.id}`}
                    className="inline-flex items-start gap-1.5 text-[#00E5FF] hover:underline"
                  >
                    <Camera className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      {s.name}
                      {s.city && s.city !== c.name && (
                        <span className="text-white/40"> — {s.city}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {c.count > c.samples.length && (
              <p className="text-xs text-white/40 mt-3">
                Plus {c.count - c.samples.length} more{" "}
                {c.count - c.samples.length === 1 ? "feed" : "feeds"} in the
                live index on the globe.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
