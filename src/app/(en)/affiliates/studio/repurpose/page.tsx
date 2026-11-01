import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import StudioUpgradeScreen from "@/app/(en)/affiliates/studio/StudioUpgradeScreen";
import RepurposeClient from "./RepurposeClient";

export const metadata = { title: "Repurposing Machine — Marketing Studio" };

/**
 * AI Video Repurposing Machine (Studio 2.0 flagship).
 *
 * Gate flow mirrors the rest of the Studio: signed-out → sign-in;
 * signed-in non-affiliate → join note; membership gate failure → the
 * upgrade screen. Analysis and rendering happen in the affiliate's
 * browser; the server stores projects/variations and charges credits
 * per render through the existing Studio credits system.
 */
export default async function RepurposePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/affiliates/studio/repurpose")}`);
  }

  const { profile, outcome } = await getStudioGate(session.user.id);

  if (!profile) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
        <h1 className="text-xl font-bold text-white">Join the affiliate program first</h1>
        <p className="text-sm text-slate-400">
          The Repurposing Machine turns your own videos into WorldEye content with your referral
          link, QR code and discount code — which means you need an affiliate profile before you can use it.
        </p>
        <Link
          href="/affiliates"
          className="inline-flex px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f]"
          style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}
        >
          Join the affiliate program
        </Link>
      </div>
    );
  }

  if (outcome !== "ok") {
    return <StudioUpgradeScreen />;
  }

  return <RepurposeClient />;
}
