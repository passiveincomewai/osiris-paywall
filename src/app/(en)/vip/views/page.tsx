import type { Metadata } from "next";
import VipShell from "@/components/vip/VipShell";
import VipViewsClient from "./VipViewsClient";

export const metadata: Metadata = {
  title: "Saved views — WorldEye VIP Pro",
  description:
    "VIP Pro saved globe views: name a layer stack (plus a camera) once and restore it in one click.",
};

export default function VipViewsPage() {
  return (
    <VipShell
      title="Saved views"
      blurb="The globe has dozens of layers; your setups shouldn't live in your memory. Save the combinations you actually use — storm watch, commute cameras, night sky — and open any of them in one click."
    >
      <VipViewsClient />
    </VipShell>
  );
}
