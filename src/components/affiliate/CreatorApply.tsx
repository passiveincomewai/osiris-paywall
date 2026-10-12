"use client";

// Creators: free Pro — application section for /affiliates.
// Signed-out visitors see the pitch + sign-in CTA; signed-in users get the
// application form (or their current application status). Follower counts
// are self-reported here and verified by an admin before approval.
import { useEffect, useState } from "react";
import Link from "next/link";
import { CREATOR_PLATFORMS, CREATOR_MIN_FOLLOWERS } from "@/lib/pro/creator";

interface Application {
  id: string;
  platform: string;
  handle: string;
  profileUrl: string;
  followers: number;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X (Twitter)",
  twitch: "Twitch",
  other: "Other",
};

const input =
  "w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60 placeholder:text-slate-500";
const label = "block text-[11px] font-mono tracking-[0.18em] text-slate-400 uppercase mb-1.5";

const SIGNIN = "/api/auth/signin?callbackUrl=/affiliates";

export default function CreatorApply() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [app, setApp] = useState<Application | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [platform, setPlatform] = useState<string>("instagram");
  const [handle, setHandle] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [followers, setFollowers] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        const ok = !!s?.user;
        setSignedIn(ok);
        if (ok) {
          fetch("/api/affiliate/creator-apply", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d?.application) {
                setApp(d.application);
                setPlatform(d.application.platform);
                setHandle(d.application.handle);
                setProfileUrl(d.application.profileUrl);
                setFollowers(String(d.application.followers));
              }
            })
            .catch(() => {})
            .finally(() => setLoaded(true));
        } else {
          setLoaded(true);
        }
      })
      .catch(() => {
        setSignedIn(false);
        setLoaded(true);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/affiliate/creator-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          handle,
          profileUrl,
          followers: Number(followers.replace(/[^0-9]/g, "")),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Something went wrong — try again.");
        return;
      }
      setApp(j.application);
      setEditing(false);
    } catch {
      setError("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const showForm = signedIn && loaded && (!app || app.status === "rejected" || editing);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 md:p-6 relative overflow-hidden"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)" }}>
      <div className="absolute right-0 top-0 w-[300px] h-[160px] rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(ellipse,#f472b6,transparent)" }} />
      <div className="relative grid md:grid-cols-2 gap-6">
        <div>
          <div className="font-mono text-xs tracking-[0.25em] text-[#f472b6] uppercase">// Creator program</div>
          <h3 className="mt-2 text-2xl font-black text-white">25k+ followers? Pro is on us.</h3>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            If you create content and your audience is {CREATOR_MIN_FOLLOWERS.toLocaleString()}+ strong on
            Instagram, TikTok, YouTube, X or Twitch, you get <span className="text-white font-bold">WorldEye Pro free
            for 12 months</span> — every camera, layer and intel feed unlocked while you make content with it.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>✓ Full Pro access — no card, no trial clock</li>
            <li>✓ Renewable after 12 months with a quick re-verification</li>
            <li>✓ Stacks with affiliate earnings — promote WorldEye, earn 15–30% too</li>
            <li>✓ Approved creators also get a <span className="text-white font-bold">20% discount code</span> to share with their audience</li>
          </ul>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            We verify every application by hand — follower count and account ownership are checked
            before approval, and comp access can be revoked for fake followers or abuse.
            See the <Link href="/affiliates/terms" className="text-cyan-300 hover:underline">program terms</Link>.
          </p>
        </div>

        <div>
          {signedIn === null || !loaded ? (
            <div className="h-full flex items-center justify-center text-slate-500 font-mono text-sm">Loading…</div>
          ) : !signedIn ? (
            <div className="h-full flex flex-col items-start justify-center gap-4">
              <p className="text-sm text-slate-300">Sign in to apply — it takes under a minute.</p>
              <Link href={SIGNIN}
                className="px-6 py-3 rounded-2xl font-mono font-black text-[#04121f] transition-transform hover:scale-[1.03]"
                style={{ background: "linear-gradient(135deg,#f9a8d4,#f472b6)", boxShadow: "0 0 24px rgba(244,114,182,.45)" }}>
                Sign in to apply
              </Link>
            </div>
          ) : app && !showForm ? (
            <div className="h-full flex flex-col justify-center gap-3">
              {app.status === "pending" && (
                <>
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-mono font-bold text-amber-300">
                    ● APPLICATION UNDER REVIEW
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    We received your application for <span className="text-white font-bold">@{app.handle}</span> on{" "}
                    {PLATFORM_LABELS[app.platform] ?? app.platform} ({app.followers.toLocaleString()} followers).
                    Reviews are manual — watch your inbox.
                  </p>
                  <button onClick={() => setEditing(true)}
                    className="w-fit px-4 py-2 rounded-xl text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60">
                    Update application
                  </button>
                </>
              )}
              {app.status === "approved" && (
                <>
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-mono font-bold text-emerald-300">
                    ● APPROVED — PRO ACTIVE
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Your creator comp is live: WorldEye Pro is unlocked on your account for 12 months.
                    Go make something with it — and don&apos;t forget your affiliate link pays 15–30% on
                    every subscriber you bring in.
                  </p>
                  <Link href="/affiliates/dashboard" className="w-fit text-sm font-mono text-cyan-300 hover:text-white">
                    Open your dashboard →
                  </Link>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              {app?.status === "rejected" && !editing && (
                <div className="rounded-xl border border-red-400/30 bg-red-400/[0.07] px-3 py-2 text-xs text-red-200">
                  Your previous application wasn&apos;t approved. If your audience has grown or the details
                  were off, you can apply again below.
                </div>
              )}
              <div>
                <label className={label} htmlFor="creator-platform">Platform</label>
                <select id="creator-platform" className={input} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  {CREATOR_PLATFORMS.map((p) => (
                    <option key={p} value={p} className="bg-slate-900">{PLATFORM_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="creator-handle">Handle (without @)</label>
                <input id="creator-handle" className={input} placeholder="yourhandle" value={handle}
                  onChange={(e) => setHandle(e.target.value)} required maxLength={100} />
              </div>
              <div>
                <label className={label} htmlFor="creator-url">Profile URL</label>
                <input id="creator-url" className={input} placeholder="https://instagram.com/yourhandle" value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)} required type="url" maxLength={500} />
              </div>
              <div>
                <label className={label} htmlFor="creator-followers">Followers</label>
                <input id="creator-followers" className={input} placeholder="25000" inputMode="numeric" value={followers}
                  onChange={(e) => setFollowers(e.target.value)} required />
              </div>
              {error && <div className="text-xs text-red-300 font-mono">{error}</div>}
              <button type="submit" disabled={submitting}
                className="w-full px-6 py-3 rounded-2xl font-mono font-black text-[#04121f] transition-transform hover:scale-[1.02] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#f9a8d4,#f472b6)", boxShadow: "0 0 24px rgba(244,114,182,.45)" }}>
                {submitting ? "Submitting…" : editing ? "Update application" : "Apply for free Pro"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
