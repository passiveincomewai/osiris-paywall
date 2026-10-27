import type { Metadata } from "next";
import LiveFlightTrackerPage from "@/components/pages/LiveFlightTrackerPage";
import { localizedMetadata } from "@/lib/i18n-seo";
import { enLiveFlightTracker } from "@/i18n/dictionaries/en/live-flight-tracker";

// The body lives in components/pages/LiveFlightTrackerPage and
// renders from the dictionary in both locales.
const baseMetadata = localizedMetadata({
  slug: "live-flight-tracker",
  locale: "en",
  title: enLiveFlightTracker.meta.title,
  description: enLiveFlightTracker.meta.description,
});

export const metadata: Metadata = {
  ...baseMetadata,
  keywords: enLiveFlightTracker.meta.keywords,
  openGraph: {
    ...baseMetadata.openGraph,
    description: enLiveFlightTracker.meta.ogDescription,
  },
};

export default function Page() {
  return <LiveFlightTrackerPage copy={enLiveFlightTracker} locale="en" />;
}
