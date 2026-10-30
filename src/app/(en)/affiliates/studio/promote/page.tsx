import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import PromoteClient from "./PromoteClient";
import StudioUpgradeScreen from "../StudioUpgradeScreen";

export const metadata = { title: "Promote & Share — Marketing Studio" };

export default async function StudioPromotePage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/promote");
  const userId = session.user.id;
  if (userId) {
    const { outcome } = await getStudioGate(userId);
    if (outcome === "membership_required" || outcome === "inactive") {
      return <StudioUpgradeScreen />;
    }
  }
  return <PromoteClient />;
}
