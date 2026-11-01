import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import StudioUpgradeScreen from "@/app/(en)/affiliates/studio/StudioUpgradeScreen";
import CalendarClient from "./CalendarClient";

export const metadata = { title: "Content Calendar — Marketing Studio" };

/**
 * Content Calendar (Studio 2.0, spec §10): scheduled posts for
 * Repurposing Machine variations, with once-only reminders delivered
 * in-dashboard and by email. Posting itself is manual (reminder
 * method) unless a platform API integration is genuinely live.
 * Gate flow mirrors the rest of the Studio.
 */
export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/affiliates/studio/calendar")}`);
  }

  const { profile, outcome } = await getStudioGate(session.user.id);

  if (!profile) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
        <h1 className="text-xl font-bold text-white">Join the affiliate program first</h1>
        <p className="text-sm text-slate-400">
          The content calendar schedules posts for your Studio variations, which need an affiliate profile.
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

  return <CalendarClient />;
}
