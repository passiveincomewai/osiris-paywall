import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import AmbassadorClient from "./AmbassadorClient";
import StudioUpgradeScreen from "../StudioUpgradeScreen";

export const metadata = { title: "Ambassador — Marketing Studio" };

export default async function StudioAmbassadorPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/ambassador");
  const userId = session.user.id;
  if (userId) {
    const { outcome } = await getStudioGate(userId);
    if (outcome === "membership_required" || outcome === "inactive") {
      return <StudioUpgradeScreen />;
    }
  }
  return <AmbassadorClient />;
}
