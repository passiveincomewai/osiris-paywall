import { Suspense } from "react";
import type { Metadata } from "next";
import InviteClient from "./InviteClient";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Team Invitation",
  description: "Accept your invitation to join a WorldEye team.",
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="docs-root min-h-screen bg-[#05070d] text-white">
      <Suspense>
        <InviteClient token={token} />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
