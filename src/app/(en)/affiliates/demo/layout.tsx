// /affiliates/demo — layout for the whole demo suite.
// Auto-hide enforcement: a signed-in user with an ACTIVE affiliate
// profile never sees the demo — every demo route redirects them to
// their real dashboard. Everyone else (signed-out prospects and
// signed-in non-affiliates) keeps full demo access. The shell itself
// (demo bar, terms modal, engagement prompt) is DemoShell.
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import DemoShell from "@/components/affiliate/DemoShell";

export default async function AffiliateDemoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (userId) {
    const profile = await db.affiliateProfile
      .findUnique({ where: { userId }, select: { status: true } })
      .catch(() => null);
    if (profile?.status === "active") redirect("/affiliates/dashboard");
  }
  return <DemoShell>{children}</DemoShell>;
}
