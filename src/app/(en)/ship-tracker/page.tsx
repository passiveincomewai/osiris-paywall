import type { Metadata } from "next";
import ShipTrackerPage from "@/components/pages/ShipTrackerPage";
import { localizedMetadata } from "@/lib/i18n-seo";
import { enShipTracker } from "@/i18n/dictionaries/en/ship-tracker";

// The body lives in components/pages/ShipTrackerPage and renders
// from the dictionary in both locales.
const baseMetadata = localizedMetadata({
  slug: "ship-tracker",
  locale: "en",
  title: enShipTracker.meta.title,
  description: enShipTracker.meta.description,
});

export const metadata: Metadata = {
  ...baseMetadata,
  openGraph: {
    ...baseMetadata.openGraph,
    description: enShipTracker.meta.ogDescription,
  },
};

export default function Page() {
  return <ShipTrackerPage copy={enShipTracker} locale="en" />;
}
