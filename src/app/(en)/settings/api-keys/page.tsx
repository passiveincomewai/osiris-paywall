import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ApiKeysClient from "./ApiKeysClient";
import SiteFooter from "@/components/SiteFooter";
import { publicApiEnabled } from "@/lib/developer/flag";

export const metadata: Metadata = {
  title: "API Keys",
  description: "Create and manage API keys for the WorldEye developer API.",
  robots: { index: false, follow: false },
};

/** Dark with the platform: 404 while PUBLIC_API_ENABLED is off. */
export default function ApiKeysPage() {
  if (!publicApiEnabled()) notFound();
  return (
    <div className="docs-root min-h-screen bg-[#05070d] text-white">
      <Suspense>
        <ApiKeysClient />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
