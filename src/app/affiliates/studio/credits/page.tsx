import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import CreditsClient from "./CreditsClient";
import StudioUpgradeScreen from "../StudioUpgradeScreen";

export const metadata = { title: "Credits & Packs — Marketing Studio" };

export default async function StudioCreditsPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/credits");
  const userId = session.user.id;
  if (userId) {
    const { outcome } = await getStudioGate(userId);
    if (outcome === "membership_required" || outcome === "inactive") {
      return <StudioUpgradeScreen />;
    }
  }
  return <CreditsClient />;
}
