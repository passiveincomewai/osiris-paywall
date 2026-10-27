import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserTier } from "@/lib/vip/tier";
import { buildBrief, type PersonalBrief } from "@/lib/vip/brief";
import VipShell from "@/components/vip/VipShell";
import VipLock from "@/components/vip/VipLock";
import BriefEmailToggle from "./BriefEmailToggle";

export const metadata: Metadata = {
  title: "Your personal brief — WorldEye VIP Pro",
  description:
    "The VIP Pro personal brief: your alert events, quakes near your places, ISS passes over your sky, and the next 48 hours of launches.",
};

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-mono uppercase tracking-[0.25em] text-cyan-400">{title}</h2>
      {children}
    </section>
  );
}

function BriefBody({ brief }: { brief: PersonalBrief }) {
  const fmt = (iso: string) => new Date(iso).toLocaleString();
  return (
    <div className="space-y-10">
      <BriefEmailToggle initial={brief.emailEnabled} />

      <Section title="Your alerts — last 24 hours">
        {brief.eventEvents.length === 0 && brief.cameraEvents.length === 0 ? (
          <p className="text-sm text-slate-500">
            No alert events in the last day. Set up{" "}
            <Link href="/vip/alerts" className="text-cyan-300">event alerts</Link> and{" "}
            <Link href="/settings/alerts" className="text-cyan-300">camera alerts</Link> and they
            will collect here.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {brief.eventEvents.map((e) => (
              <li key={e.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="font-bold text-white">{e.title}</div>
                <p className="mt-0.5 text-[11px] font-mono text-slate-500">{fmt(e.createdAt)}</p>
              </li>
            ))}
            {brief.cameraEvents.map((e) => (
              <li key={e.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="font-bold text-white">📷 {e.cameraName}</div>
                <p className="mt-0.5 text-[13px] text-slate-400">{e.observation}</p>
                <p className="mt-0.5 text-[11px] font-mono text-slate-500">{fmt(e.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Earthquakes near your places">
        {brief.places.length === 0 ? (
          <p className="text-sm text-slate-500">
            No watched places yet — <Link href="/vip/alerts" className="text-cyan-300">add one</Link>{" "}
            and this section tracks the ground around it.
          </p>
        ) : brief.quakesNear.length === 0 ? (
          <p className="text-sm text-slate-500">Quiet — no earthquakes inside your places' radii in the last 24 hours.</p>
        ) : (
          <ul className="space-y-2">
            {brief.quakesNear.map((q) => (
              <li key={q.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm">
                <span className="font-bold text-white">M{q.mag.toFixed(1)}</span> — {q.place}{" "}
                <span className="font-mono text-xs text-slate-500">near {q.nearPlace}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Strongest worldwide — last 24 hours">
        {brief.quakesStrongest.length === 0 ? (
          <p className="text-sm text-slate-500">The USGS feed has nothing to report right now.</p>
        ) : (
          <ul className="space-y-2">
            {brief.quakesStrongest.map((q) => (
              <li key={q.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm">
                <span className="font-bold text-white">M{q.mag.toFixed(1)}</span> — {q.place}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[12px] text-slate-500">
          From the USGS M2.5+ feed — the same data as the globe's earthquake layer.
        </p>
      </Section>

      <Section title="ISS — best pass over each place, next 24 hours">
        {brief.places.length === 0 ? (
          <p className="text-sm text-slate-500">Add a watched place to see its passes.</p>
        ) : brief.passes.length === 0 ? (
          <p className="text-sm text-slate-500">No pass reaching 10° over your places in the next day.</p>
        ) : (
          <ul className="space-y-2">
            {brief.passes.map((p) => (
              <li key={p.placeName} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm">
                🛰️ <span className="font-bold text-white">{p.placeName}</span> — peaks ~
                {Math.round(p.pass.peakElevationDeg)}° at {fmt(new Date(p.pass.peakMs).toISOString())}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[12px] text-slate-500">
          Computed from the current orbital elements. A high pass still needs a dark, clear sky to be seen.
        </p>
      </Section>

      <Section title="Launches — next 48 hours">
        {brief.launches.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing scheduled in the Launch Library 2 feed for the next two days.</p>
        ) : (
          <ul className="space-y-2">
            {brief.launches.map((l) => (
              <li key={l.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm">
                🚀 <span className="font-bold text-white">{l.name}</span>{" "}
                <span className="font-mono text-xs text-slate-500">
                  {l.netMs ? fmt(new Date(l.netMs).toISOString()) : "NET to be confirmed"}
                  {l.padLocation ? ` · ${l.padLocation}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="text-[11px] font-mono text-slate-600">
        Brief built {fmt(brief.generatedAt)} · Refresh the page for a fresh one.
      </p>
    </div>
  );
}

export default async function VipBriefPage() {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  return (
    <VipShell
      title="Your personal brief"
      blurb="Today in the Sky is the same for everyone. This brief is yours: your alerts, your places, your sky — the last 24 hours behind you and the next 48 ahead."
    >
      {!userId ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-sm text-slate-300">Sign in to read your brief.</p>
          <Link
            href="/api/auth/signin?callbackUrl=/vip/brief"
            className="mt-4 inline-block rounded-2xl px-8 py-3 font-mono font-bold text-[#04121f]"
            style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}
          >
            Sign in
          </Link>
        </div>
      ) : (await getUserTier(userId)) !== "vip" ? (
        <VipLock
          title="The personal brief is a VIP Pro feature"
          freshCopy="The brief is built from VIP data — your event alerts, camera alerts and watched places — and comes with the VIP Pro plan (the annual plan)."
          lapsedCopy="Your VIP Pro isn't active right now, so the brief is paused. Your places and rules are kept, and the brief resumes when VIP Pro is back."
        />
      ) : (
        <BriefBody brief={await buildBrief(userId)} />
      )}
    </VipShell>
  );
}
