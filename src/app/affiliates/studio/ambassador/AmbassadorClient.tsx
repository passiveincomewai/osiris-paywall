"use client";
// Ambassador program: approved affiliates get an exclusive template
// category + early access. Everyone else can apply here.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, SectionTitle } from "@/components/affiliate/ui";

interface AmbassadorApplication {
  id: string;
  platform: string;
  handle: string;
  profileUrl: string;
  audience: number;
  pitch?: string | null;
  status: string;
  createdAt: string;
}

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const btnPrimary =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" };
const input =
  "w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60 placeholder:text-slate-500";
const label = "block text-[11px] font-mono tracking-[0.18em] text-slate-400 uppercase mb-1.5";

const PLATFORMS = ["instagram", "tiktok", "youtube", "x", "twitch", "other"] as const;

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, init);
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j: j as Record<string, unknown> };
}

export default function AmbassadorClient() {
  const [isAmbassador, setIsAmbassador] = useState(false);
  const [application, setApplication] = useState<AmbassadorApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [platform, setPlatform] = useState<string>("instagram");
  const [handle, setHandle] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [audience, setAudience] = useState("");
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    const { ok, j } = await api("/api/affiliate/studio/ambassador");
    if (!ok) setError(typeof j.error === "string" ? j.error : "Couldn't load the ambassador program.");
    else {
      setIsAmbassador(j.isAmbassador === true);
      setApplication((j.application as AmbassadorApplication | null) ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setFormError("");
    const audienceNum = Number(audience);
    if (!handle.trim()) return setFormError("Your handle is required.");
    if (!profileUrl.trim()) return setFormError("Your profile URL is required.");
    if (!Number.isFinite(audienceNum) || audienceNum < 0) return setFormError("Audience must be a number.");
    setSubmitting(true);
    const { ok, j } = await api("/api/affiliate/studio/ambassador", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        handle: handle.trim(),
        profileUrl: profileUrl.trim(),
        audience: Math.floor(audienceNum),
        pitch: pitch.trim() || undefined,
      }),
    });
    if (ok) {
      setApplication((j.application as AmbassadorApplication | null) ?? null);
    } else {
      setFormError(typeof j.error === "string" ? j.error : "Couldn't submit your application.");
    }
    setSubmitting(false);
  };

  if (loading) return <div className="text-slate-400 font-mono text-sm">Loading the ambassador program…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Marketing Studio</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">WorldEye Ambassador</h1>
        <p className="text-sm text-slate-400 mt-1">
          Ambassadors are affiliates who represent WorldEye on their home platform — and get the Studio&apos;s best
          tools first.
        </p>
      </div>

      {error ? (
        <EmptyState title="Ambassador program unavailable" body={error} />
      ) : isAmbassador ? (
        <section className={card}>
          <SectionTitle kicker="You're in" title="Ambassador panel" />
          <p className="text-sm text-slate-300 leading-relaxed">
            Your account carries the Ambassador flag. Your perks:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <span className="text-cyan-300 font-semibold">Exclusive template category</span> — ambassador-only
              designs live in the template library, personalized with your link like everything else.
            </li>
            <li>
              <span className="text-cyan-300 font-semibold">Early access</span> — new templates, drops, and Studio
              features reach ambassadors before the general library.
            </li>
            <li>
              <span className="text-cyan-300 font-semibold">Campaign priority</span> — you see new campaigns in the
              Studio as soon as they go active.
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/affiliates/studio/library" className={btnPrimary} style={btnStyle}>
              Open the template library
            </Link>
            <Link href="/affiliates/studio/campaigns" className={btnPrimary + " border border-white/15 !text-slate-200"} style={{ background: "transparent", boxShadow: "none" }}>
              View campaigns
            </Link>
          </div>
        </section>
      ) : application && application.status === "pending" ? (
        <section className={card}>
          <SectionTitle kicker="Application" title="Under review" />
          <p className="text-sm text-slate-300 leading-relaxed">
            Your ambassador application for <span className="font-mono text-cyan-300">@{application.handle}</span> on{" "}
            <span className="capitalize">{application.platform}</span> was submitted on{" "}
            {new Date(application.createdAt).toLocaleDateString()} and is waiting on admin review. Audience counts
            are verified against the live profile before a decision — you&apos;ll see the outcome here.
          </p>
        </section>
      ) : (
        <section className={card}>
          <SectionTitle kicker="Apply" title="Become an ambassador" />
          {application && application.status === "rejected" && (
            <p className="text-sm text-amber-200 mb-4">
              Your previous application wasn&apos;t approved. You can apply again with an updated profile.
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="amb-platform">Platform</label>
              <select id="amb-platform" className={input} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p} className="bg-slate-900 capitalize">
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="amb-handle">Handle</label>
              <input id="amb-handle" className={input} placeholder="yourhandle" value={handle} onChange={(e) => setHandle(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="amb-url">Profile URL</label>
              <input id="amb-url" className={input} placeholder="https://…" value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="amb-audience">Audience (followers)</label>
              <input id="amb-audience" className={input} inputMode="numeric" placeholder="25000" value={audience} onChange={(e) => setAudience(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="amb-pitch">Pitch (optional)</label>
              <textarea
                id="amb-pitch"
                className={input + " min-h-24"}
                placeholder="What do you post, and how would you feature WorldEye?"
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
              />
            </div>
          </div>
          {formError && <p className="mt-3 text-sm text-red-300">{formError}</p>}
          <button onClick={() => void submit()} disabled={submitting} className={btnPrimary + " mt-5 disabled:opacity-50"} style={btnStyle}>
            {submitting ? "Submitting…" : "Submit application"}
          </button>
          <p className="text-xs text-slate-500 mt-3">
            Audience numbers are self-reported and verified by the admin team against your live profile before approval.
          </p>
        </section>
      )}
    </div>
  );
}
