import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import QuickEditClient from "./QuickEditClient";
import StudioUpgradeScreen from "../../StudioUpgradeScreen";

export const metadata = { title: "Create — Marketing Studio" };

export default async function StudioCreatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  const { slug } = await params;
  if (!session?.user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/affiliates/studio/create/${slug}`)}`);
  }
  const userId = session.user.id;
  if (userId) {
    const { outcome } = await getStudioGate(userId);
    if (outcome === "membership_required" || outcome === "inactive") {
      return <StudioUpgradeScreen />;
    }
  }
  return <QuickEditClient slug={slug} />;
}
