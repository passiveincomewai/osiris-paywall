import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import TeamClient from "./TeamClient";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Team Access",
  description: "Manage your WorldEye team — members, seats, shared workspaces and team billing.",
  robots: { index: false, follow: false },
};

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/settings/team");
  return (
    <div className="docs-root min-h-screen bg-[#05070d] text-white">
      <Suspense>
        <TeamClient />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
