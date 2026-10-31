import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";
import LatestStories from "@/components/home/LatestStories";
import { hreflangMapFor } from "@/lib/i18n-seo";

/**
 * English homepage route. The globe app itself is the Dashboard
 * client component (src/components/Dashboard.tsx — the pre-i18n
 * page.tsx, moved so this route file can carry metadata); it reads
 * the active locale from context and renders the content shell in
 * that locale's dictionary. Title/description stay the layout
 * defaults, exactly as before; this export adds only the homepage's
 * hreflang alternates (en / es / x-default).
 */
export const metadata: Metadata = {
  alternates: {
    canonical: "https://worldeye.app",
    languages: hreflangMapFor(""),
  },
};

export default function Page() {
  return (
    <>
      <Dashboard />
      <LatestStories />
    </>
  );
}
