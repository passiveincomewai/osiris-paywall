import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import CreationsClient from "./CreationsClient";
import StudioUpgradeScreen from "../StudioUpgradeScreen";

export const metadata = { title: "My Creations — Marketing Studio" };

export default async function StudioCreationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/creations");
  const userId = session.user.id;
  if (userId) {
    const { outcome } = await getStudioGate(userId);
    if (outcome === "membership_required" || outcome === "inactive") {
      return <StudioUpgradeScreen />;
    }
  }
  return <CreationsClient />;
}
