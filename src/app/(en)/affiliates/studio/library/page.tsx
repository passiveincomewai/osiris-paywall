import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import LibraryClient from "./LibraryClient";
import StudioUpgradeScreen from "../StudioUpgradeScreen";

export const metadata = { title: "Template Library — Marketing Studio" };

export default async function StudioLibraryPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/library");
  const userId = session.user.id;
  if (userId) {
    const { outcome } = await getStudioGate(userId);
    if (outcome === "membership_required" || outcome === "inactive") {
      return <StudioUpgradeScreen />;
    }
  }
  return <LibraryClient />;
}
