import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, CreditCard, Settings, Tag, Users } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getUserTier, type PlanTier } from "@/lib/camera-alerts/tier";
import { formatClock } from "@/lib/recording/dashboard";
import SiteFooter from "@/components/SiteFooter";
import DashboardCameras from "@/components/dashboard/DashboardCameras";
import SetNamePrompt from "@/components/SetNamePrompt";
import PastDueBanner from "@/components/PastDueBanner";
import DashboardAlerts from "@/components/dashboard/DashboardAlerts";
import DashboardRecordings from "@/components/dashboard/DashboardRecordings";

export const metadata: Metadata = {
  title: "Your Dashboard",
  description:
    "Your WorldEye dashboard — track cameras, set camera alerts, and record multiple cameras at once.",
  robots: { index: false, follow: false },
};

/**
 * The member dashboard. Everything on it is a window onto systems that
 * already exist — tracked cameras are the recording studio's
 * SavedCamera roster, alerts are the VIP camera-alerts service,
 * recordings are the studio's clip library — this page gathers them
 * in one place; it owns no data of its own.
 */

interface DashStats {
  tracked: number | null;
  activeAlerts: number | null;
  clips: number | null;
  clipSeconds: number | null;
  unread: number | null;
}

async function loadStats(userId: string): Promise<DashStats> {
  try {
    const [tracked, activeAlerts, clipAgg, unread] = await Promise.all([
      db.savedCamera.count({ where: { userId } }),
      db.alertRule.count({ where: { userId, active: true } }),
      db.clipMeta.aggregate({
        where: { userId },
        _sum: { durationSec: true },
        _count: true,
      }),
      db.alertEvent.count({ where: { userId, readAt: null } }),
    ]);
    return {
      tracked,
      activeAlerts,
      clips: clipAgg._count,
      clipSeconds: clipAgg._sum.durationSec ?? 0,
      unread,
    };
  } catch {
    return { tracked: null, activeAlerts: null, clips: null, clipSeconds: null, unread: null };
  }
}

function PlanBadge({ tier }: { tier: PlanTier }) {
  if (tier === "vip") {
    return (
      <span className="text-[10px] font-black tracking-[0.12em] px-2 py-0.5 rounded bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black">
        VIP PRO
      </span>
    );
  }
  if (tier === "pro") {
    return (
      <span className="text-[10px] font-black tracking-[0.12em] px-2 py-0.5 rounded bg-[#D4AF37] text-black">
        PRO
      </span>
    );
  }
  return (
    <span className="text-[10px] font-black tracking-[0.12em] px-2 py-0.5 rounded bg-white/10 text-white/70 border border-white/15">
      FREE
    </span>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-[11px] font-mono tracking-wider text-slate-500 uppercase mt-0.5">{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
}

const QUICK_LINKS = [
  { href: "/settings/subscription", icon: CreditCard, label: "Manage subscription", sub: "Plan, billing, trials" },
  { href: "/affiliates", icon: Users, label: "Affiliates", sub: "Invites & earnings" },
  { href: "/settings", icon: Settings, label: "Account settings", sub: "Profile & password" },
  { href: "/pricing", icon: Tag, label: "Plans & pricing", sub: "Pro and VIP Pro" },
];

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session?.user || !userId) redirect("/signin?callbackUrl=/dashboard");

  const [tier, stats] = await Promise.all([getUserTier(userId), loadStats(userId)]);
  const name = session.user.name || "WorldEye member";
  const initial = (session.user.name || session.user.email || "?").trim().charAt(0).toUpperCase();
  const num = (n: number | null) => (n === null ? "—" : String(n));

  return (
    <div className="docs-root min-h-screen bg-[#05070d] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05070d]/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-8 w-auto" />
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-cyan-400/40 text-cyan-300 tracking-[0.2em] font-mono hidden sm:inline">
              DASHBOARD
            </span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto text-sm">
            <a href="#cameras" className="px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 whitespace-nowrap transition-colors">
              My cameras
            </a>
            <a href="#alerts" className="px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 whitespace-nowrap transition-colors">
              Alerts
            </a>
            <a href="#recordings" className="px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 whitespace-nowrap transition-colors">
              Recordings
            </a>
            <Link href="/" className="px-3 py-2 rounded-lg text-slate-400 hover:text-white font-mono whitespace-nowrap transition-colors">
              ← Globe
            </Link>
            <LanguageHeaderControl variant="mobile" />
          </nav>
        </div>
      </header>

      <SetNamePrompt />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {/* Failed-payment recovery: self-hides unless past_due. */}
        <PastDueBanner />
        {/* Member header + real quick stats */}
        <section>
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-lg font-black flex items-center justify-center shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate">{name}</h1>
                <PlanBadge tier={tier} />
              </div>
              <div className="text-sm text-white/45 truncate">{session.user.email}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Tracked cameras" value={num(stats.tracked)} sub="on your roster" />
            <Stat label="Active alerts" value={num(stats.activeAlerts)} sub="cameras being watched" />
            <Stat
              label="Recordings"
              value={num(stats.clips)}
              sub={stats.clipSeconds ? `${formatClock(stats.clipSeconds)} of footage` : "clips on this device"}
            />
            <Stat
              label="Unread alerts"
              value={num(stats.unread)}
              sub="photos in your alert inbox"
            />
          </div>
        </section>

        <section id="cameras" className="scroll-mt-24">
          <DashboardCameras />
        </section>

        <section id="alerts" className="scroll-mt-24">
          <DashboardAlerts />
        </section>

        <section id="recordings" className="scroll-mt-24">
          <DashboardRecordings />
        </section>

        {/* Account quick links */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Your account</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition group"
              >
                <l.icon className="w-5 h-5 text-[#D4AF37] mb-2" />
                <div className="text-sm font-bold text-white group-hover:underline">{l.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{l.sub}</div>
              </Link>
            ))}
          </div>
          <p className="text-xs text-white/30 mt-5 inline-flex items-center gap-1.5">
            <BellRing className="w-3.5 h-3.5" /> WorldEye serves 74,229 live cameras worldwide —
            your tracked ones are the roster above.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
