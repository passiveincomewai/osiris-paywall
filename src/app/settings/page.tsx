import { Suspense } from "react";
import type { Metadata } from "next";
import SettingsClient from "./SettingsClient";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Account Settings — WorldEye",
  description: "Manage your WorldEye profile, password and subscription.",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <Suspense>
        <SettingsClient />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
