import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import AiClient from "./AiClient";
import StudioUpgradeScreen from "../StudioUpgradeScreen";

export const metadata = { title: "AI by Cosmo — Marketing Studio" };

export default async function StudioAiPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/ai");
  const userId = session.user.id;
  if (userId) {
    const { outcome } = await getStudioGate(userId);
    if (outcome === "membership_required" || outcome === "inactive") {
      return <StudioUpgradeScreen />;
    }
  }
  return <AiClient />;
}
