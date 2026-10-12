import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import CaptionsClient from "./CaptionsClient";
import StudioUpgradeScreen from "../StudioUpgradeScreen";

export const metadata = { title: "Caption Generator — Marketing Studio" };

export default async function StudioCaptionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/captions");
  const userId = session.user.id;
  if (userId) {
    const { outcome } = await getStudioGate(userId);
    if (outcome === "membership_required" || outcome === "inactive") {
      return <StudioUpgradeScreen />;
    }
  }
  return <CaptionsClient />;
}
