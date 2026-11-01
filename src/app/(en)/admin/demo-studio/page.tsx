import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import AdminNav from "../AdminNav";
import DemoStudioClient from "./DemoStudioClient";

export const metadata = { title: "AI Demo Studio — Admin" };
export const dynamic = "force-dynamic";

/**
 * Admin → Content Studio → AI Demo Studio.
 *
 * Prompt-driven demonstrations of the real WorldEye site: an admin
 * describes a demo, a recording worker on Cosmo's VM claims the job,
 * drives the real site in a browser, edits the footage, and delivers a
 * draft video to this library. Nothing reaches a public page or an
 * affiliate without an admin approving it and placing/sharing it here.
 */
export default async function DemoStudioPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || !adminEmails().includes(email)) redirect("/signin");

  return (
    <main className="min-h-screen bg-[#05080e] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">Content Studio</p>
            <h1 className="mt-1 text-2xl font-semibold">AI Demo Studio</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/60">
              Describe a demonstration and the studio records the real website, edits the footage,
              and files it here as a draft. Approve a video to place it on the site or share it
              with affiliates — nothing publishes itself.
            </p>
          </div>
          <AdminNav active="demo-studio" />
        </header>
        <DemoStudioClient />
      </div>
    </main>
  );
}
