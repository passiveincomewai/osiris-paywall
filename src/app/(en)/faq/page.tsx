import type { Metadata } from "next";
import FaqPage from "@/components/pages/FaqPage";
import { localizedMetadata } from "@/lib/i18n-seo";
import { enFaq } from "@/i18n/dictionaries/en/faq";

// The body lives in components/pages/FaqPage and renders from the
// dictionary in both locales. (One factual edit rides along, flagged
// in the build REPORT: the "What does Pro include?" answer no longer
// lists the satellite imagery view — it is free for everyone, as the
// pricing page already presents it.)
const baseMetadata = localizedMetadata({
  slug: "faq",
  locale: "en",
  title: enFaq.meta.title,
  description: enFaq.meta.description,
});

export const metadata: Metadata = {
  ...baseMetadata,
  openGraph: {
    ...baseMetadata.openGraph,
    description: enFaq.meta.ogDescription,
  },
};

export default function Page() {
  return <FaqPage copy={enFaq} locale="en" />;
}
