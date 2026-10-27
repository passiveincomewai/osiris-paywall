import Dashboard from "@/components/Dashboard";

/**
 * Localized homepage (/es). Title, description and the hreflang
 * alternates come from the [locale] layout's generateMetadata; the
 * Dashboard reads the route locale from context and renders its
 * content shell (and FAQ JSON-LD) in that locale's dictionary.
 */
export default function Page() {
  return <Dashboard />;
}
