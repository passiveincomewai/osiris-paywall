import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import AdminNav from "../AdminNav";
import ContentStudioClient from "./ContentStudioClient";

export const metadata = { title: "Content Studio — Admin" };
export const dynamic = "force-dynamic";

/**
 * Admin → Content Studio.
 *
 * Control surface for the autonomous content engine that runs on
 * Cosmo's VM: per-platform operating modes (with hard ceilings —
 * Reddit stays manual, TikTok caps at hybrid), per-platform pause,
 * and a global pause. This page sets control state only; the engine
 * applies it on its next sync and enforces it again before every
 * claim. It never publishes anything itself. Status numbers come
 * exclusively from snapshots the engine pushes — until the first
 * sync lands, the page says so instead of inventing metrics.
 */
export default async function ContentStudioPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || !adminEmails().includes(email)) redirect("/signin");

  return (
    <main className="min-h-screen bg-[#05080e] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">Content Studio</p>
            <h1 className="mt-1 text-2xl font-semibold">Autonomous Content Engine</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/60">
              Modes and pauses for the content engine on Cosmo&apos;s VM. Changes here are recorded
              and applied by the engine on its next sync — nothing on this page publishes anything.
            </p>
          </div>
          <AdminNav active="content-studio" />
        </header>
        <ContentStudioClient />
      </div>
    </main>
  );
}
