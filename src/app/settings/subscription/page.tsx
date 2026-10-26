import { Suspense } from "react";
import type { Metadata } from "next";
import SubscriptionClient from "./SubscriptionClient";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Manage Subscription",
  description: "Your WorldEye Pro plan — switch plans, see your next charge, or cancel.",
  robots: { index: false, follow: false },
};

export default function SubscriptionPage() {
  return (
    <div className="docs-root min-h-screen bg-[#05070d] text-white">
      <Suspense>
        <SubscriptionClient />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
