import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import AnalyticsClient from "./AnalyticsClient";
import StudioUpgradeScreen from "../StudioUpgradeScreen";

export const metadata = { title: "Studio Analytics — Marketing Studio" };

export default async function StudioAnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/analytics");
  const userId = session.user.id;
  if (userId) {
    const { outcome } = await getStudioGate(userId);
    if (outcome === "membership_required" || outcome === "inactive") {
      return <StudioUpgradeScreen />;
    }
  }
  return <AnalyticsClient />;
}
