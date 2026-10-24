import { Suspense } from "react";
import type { Metadata } from "next";
import SettingsClient from "./SettingsClient";
import SetNamePrompt from "@/components/SetNamePrompt";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Manage your WorldEye profile, password and subscription.",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <div className="docs-root min-h-screen bg-[#05070d] text-white">
      <SetNamePrompt />
      <Suspense>
        <SettingsClient />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
