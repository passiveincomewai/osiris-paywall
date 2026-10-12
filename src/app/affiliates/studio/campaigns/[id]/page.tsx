import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import KitClient from "./KitClient";
import StudioUpgradeScreen from "../../StudioUpgradeScreen";

export const metadata = { title: "Campaign Kit — Marketing Studio" };

export default async function StudioCampaignKitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/api/auth/signin?callbackUrl=/affiliates/studio/campaigns/${id}`);
  const userId = session.user.id;
  if (userId) {
    const { outcome } = await getStudioGate(userId);
    if (outcome === "membership_required" || outcome === "inactive") {
      return <StudioUpgradeScreen />;
    }
  }
  return <KitClient campaignId={id} />;
}
