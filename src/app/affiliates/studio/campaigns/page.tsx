import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import CampaignsClient from "./CampaignsClient";
import StudioUpgradeScreen from "../StudioUpgradeScreen";

export const metadata = { title: "Campaigns — Marketing Studio" };

export default async function StudioCampaignsPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/campaigns");
  const userId = session.user.id;
  if (userId) {
    const { outcome } = await getStudioGate(userId);
    if (outcome === "membership_required" || outcome === "inactive") {
      return <StudioUpgradeScreen />;
    }
  }
  return <CampaignsClient />;
}
