import type { Metadata } from "next";
import LiveWebcamsPage from "@/components/pages/LiveWebcamsPage";
import { localizedMetadata } from "@/lib/i18n-seo";
import { enLiveWebcams } from "@/i18n/dictionaries/en/live-webcams";
import { fill } from "@/i18n/dictionaries/types";
import { COUNTRY_INDEX } from "@/lib/explore-data";

// The body lives in components/pages/LiveWebcamsPage and renders from
// the dictionary in both locales. The meta description's {countries}
// placeholder is filled from the same country index the page uses —
// the produced string is byte-identical to the pre-i18n template.
const metaTokens = { countries: String(COUNTRY_INDEX.length) };

const baseMetadata = localizedMetadata({
  slug: "live-webcams",
  locale: "en",
  title: enLiveWebcams.meta.title,
  description: fill(enLiveWebcams.meta.description, metaTokens),
});

export const metadata: Metadata = {
  ...baseMetadata,
  // The page's OG description differs from its meta description
  // (as it did pre-i18n) — restore it over the helper's default.
  openGraph: {
    ...baseMetadata.openGraph,
    description: fill(enLiveWebcams.meta.ogDescription, metaTokens),
  },
};

export default function Page() {
  return <LiveWebcamsPage copy={enLiveWebcams} locale="en" />;
}
