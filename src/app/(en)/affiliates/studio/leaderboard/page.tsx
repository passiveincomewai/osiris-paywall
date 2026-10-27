import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import LeaderboardClient from "./LeaderboardClient";
import StudioUpgradeScreen from "../StudioUpgradeScreen";

export const metadata = { title: "Studio Leaderboard — Marketing Studio" };

export default async function StudioLeaderboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/leaderboard");
  const userId = session.user.id;
  if (userId) {
    const { outcome } = await getStudioGate(userId);
    if (outcome === "membership_required" || outcome === "inactive") {
      return <StudioUpgradeScreen />;
    }
  }
  return <LeaderboardClient />;
}
