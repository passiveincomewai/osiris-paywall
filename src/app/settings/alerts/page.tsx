import { Suspense } from "react";
import type { Metadata } from "next";
import AlertsClient from "./AlertsClient";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Camera Alerts",
  description: "VIP Pro camera alerts — WorldEye checks your cameras and tells you when your condition shows.",
  robots: { index: false, follow: false },
};

export default function AlertsPage() {
  return (
    <div className="docs-root min-h-screen bg-[#05070d] text-white">
      <Suspense>
        <AlertsClient />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
