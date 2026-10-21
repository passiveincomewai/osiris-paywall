import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { planTierOf } from "@/lib/plan-tier";
import VipShell from "@/components/vip/VipShell";
import VipLock from "@/components/vip/VipLock";

export const metadata: Metadata = {
  title: "VIP Pro hub — WorldEye",
  description:
    "The VIP Pro member hub: event alerts for earthquakes, launches and ISS passes, your personal brief, and saved globe views.",
};

const NEW_FEATURES = [
  {
    href: "/vip/alerts",
    icon: "🔔",
    title: "Event alerts",
    body: "WorldEye watches the planet for you: earthquakes at your magnitude near your places, rocket-launch reminders before liftoff, and ISS passes over your sky. Email + in-app, checked every ~15 minutes.",
  },
  {
    href: "/vip/brief",
    icon: "🗞️",
    title: "Personal brief",
    body: "A brief built from your account — your alert events, quakes near your watched places, the best ISS pass over each place, and the next 48 hours of launches. On the page, or in your inbox every morning.",
  },
  {
    href: "/vip/views",
    icon: "🔖",
    title: "Saved views",
    body: "Name and keep up to 25 globe setups — a layer stack plus an optional camera — and restore any of them in one click. Capture a view straight from the globe's address bar.",
  },
];

const EXISTING = [
  { href: "/settings/alerts", title: "Camera alerts", body: "Up to 10 cameras watched with plain-language conditions." },
  { href: "/recording/dashboard", title: "Recording dashboard", body: "Your clips and multi-camera recording sessions." },
  { href: "/recording/multi", title: "Record 40 cameras", body: "The multi-camera recording wall — VIP Pro raises the cap to 40." },
  { href: "/", title: "Timelapse & intel layers", body: "Premium timelapse lives on the globe's camera view; the intel layers (cyber, maritime, GDELT, live news) are in the Layers panel." },
];

export default async function VipHubPage() {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const tier = planTierOf(session);
  const vip = tier === "vip";

  return (
    <VipShell
      title="VIP Pro hub"
      blurb="Everything the annual plan unlocks, in one place — including the three newest additions: event alerts, the personal brief, and saved views."
    >
      {!userId && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-sm text-slate-300">Sign in to open your VIP hub.</p>
          <Link
            href="/api/auth/signin?callbackUrl=/vip"
            className="mt-4 inline-block rounded-2xl px-8 py-3 font-mono font-bold text-[#04121f]"
            style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}
          >
            Sign in
          </Link>
        </div>
      )}

      {userId && !vip && (
        <VipLock
          title="These features come with VIP Pro"
          freshCopy="VIP Pro is the annual plan ($74.99/yr). It includes everything in Pro, plus camera alerts, 40-camera recording, timelapse, the premium intel layers — and the three features below."
          lapsedCopy="Your VIP Pro isn't active right now, so these features are paused — your places, rules and views are kept, and everything resumes on its own when VIP Pro is back."
        />
      )}

      <section>
        <h2 className="mb-3 text-xs font-mono uppercase tracking-[0.25em] text-cyan-400">
          New for VIP Pro
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {NEW_FEATURES.map((f) => (
            <Link
              key={f.href + f.title}
              href={f.href}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-300/40"
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-bold text-white">{f.title}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">{f.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-mono uppercase tracking-[0.25em] text-cyan-400">
          Also included
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXISTING.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/25"
            >
              <div className="font-bold text-white">{f.title}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{f.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </VipShell>
  );
}
