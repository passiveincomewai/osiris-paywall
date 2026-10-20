"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ArrowLeft, Loader2, Check, User, Lock, CreditCard, LogOut, Crown, BellRing,
} from "lucide-react";

type Profile = {
  name: string | null;
  email: string | null;
  phone: string | null;
  hasPassword: boolean;
  emailVerified: boolean;
};

type Subscription = {
  plan: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
} | null;

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 md:p-7">
      <h2 className="flex items-center gap-2 text-base font-bold mb-5">
        <Icon className="w-4.5 h-4.5 text-[#D4AF37]" /> {title}
      </h2>
      {children}
    </section>
  );
}

const inputCls = "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-[#00E5FF]/60";
const labelCls = "block text-xs font-semibold tracking-wider text-white/40 mb-1.5";
const btnGold = "px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60";

export default function SettingsClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sub, setSub] = useState<Subscription | undefined>(undefined);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await fetch("/api/user/profile", { cache: "no-store" });
      if (p.status === 401) { window.location.href = "/signin?callbackUrl=/settings"; return; }
      if (p.ok) {
        const d = await p.json();
        setProfile(d);
        setName(d.name ?? "");
        setPhone(d.phone ?? "");
      } else setErr("Couldn't load your profile.");
      const s = await fetch("/api/user/subscription", { cache: "no-store" });
      if (s.ok) setSub((await s.json()).subscription);
    })();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setErr(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save.");
      setSaved(true);
      setProfile((p) => p && { ...p, name: data.name, phone: data.phone });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pwNew.length < 8) { setPwMsg({ ok: false, text: "New password must be at least 8 characters." }); return; }
    if (pwNew !== pwConfirm) { setPwMsg({ ok: false, text: "New passwords don't match." }); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't update password.");
      setPwMsg({ ok: true, text: "Password updated." });
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      setProfile((p) => p && { ...p, hasPassword: true });
    } catch (e) {
      setPwMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't update password." });
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to the map
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">Account settings</h1>

      {err && <p className="mb-4 text-sm text-red-400">{err}</p>}

      {!profile ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" /></div>
      ) : (
        <div className="space-y-5">
          <Section icon={User} title="Profile">
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className={labelCls}>USERNAME</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={32} />
              </div>
              <div>
                <label className={labelCls}>PHONE NUMBER</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} autoComplete="tel" />
              </div>
              <div>
                <label className={labelCls}>EMAIL</label>
                <input value={profile.email ?? ""} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
                <p className="text-xs text-white/35 mt-1.5">
                  {profile.emailVerified ? "Verified." : "Not verified — check your inbox for the verification link."} Email changes aren't supported yet — contact support if you need one.
                </p>
              </div>
              <button type="submit" disabled={saving} className={btnGold}>
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
              </button>
            </form>
          </Section>

          <Section icon={Lock} title={profile.hasPassword ? "Change password" : "Set a password"}>
            <form onSubmit={changePassword} className="space-y-4">
              {profile.hasPassword && (
                <div>
                  <label className={labelCls}>CURRENT PASSWORD</label>
                  <input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} className={inputCls} autoComplete="current-password" />
                </div>
              )}
              <div>
                <label className={labelCls}>NEW PASSWORD</label>
                <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} className={inputCls} autoComplete="new-password" placeholder="At least 8 characters" />
              </div>
              <div>
                <label className={labelCls}>CONFIRM NEW PASSWORD</label>
                <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} className={inputCls} autoComplete="new-password" />
              </div>
              {pwMsg && <p className={`text-sm ${pwMsg.ok ? "text-green-400" : "text-red-400"}`}>{pwMsg.text}</p>}
              <button type="submit" disabled={pwSaving} className={btnGold}>
                {pwSaving ? "Updating…" : profile.hasPassword ? "Update password" : "Set password"}
              </button>
            </form>
          </Section>

          <Section icon={Crown} title="Subscription">
            {sub === undefined ? (
              <Loader2 className="w-5 h-5 animate-spin text-white/40" />
            ) : sub ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/55">Plan</span>
                  <span className="font-bold">{sub.plan} <span className="text-[#D4AF37]">PRO</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/55">Status</span>
                  <span className={`text-sm font-semibold capitalize ${sub.status === "active" || sub.status === "trialing" ? "text-green-400" : "text-white/60"}`}>
                    {sub.status === "trialing" ? "Free trial" : sub.status}
                    {sub.cancelAtPeriodEnd && " · cancels at period end"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/55">{sub.cancelAtPeriodEnd ? "Access until" : "Renews"}</span>
                  <span className="text-sm">{new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
                <Link href="/settings/subscription" className={`${btnGold} mt-2 inline-flex items-center gap-2`}>
                  <CreditCard className="w-4 h-4" /> Manage subscription
                </Link>
                <div>
                  <Link href="/settings/alerts" className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition">
                    <BellRing className="w-4 h-4 text-[#D4AF37]" /> Camera alerts
                    <span className="px-2 py-0.5 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold tracking-wider">VIP PRO</span>
                  </Link>
                </div>
                <p className="text-xs text-white/35">Switch plans right here on WorldEye — payment details and cancellation stay with Stripe.</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-white/55 mb-4">You're on the free plan. Upgrade to unlock the full intelligence toolkit.</p>
                <Link href="/pricing" className={`${btnGold} inline-block`}>See Pro plans</Link>
              </div>
            )}
          </Section>

          <Section icon={LogOut} title="Sign out">
            <p className="text-sm text-white/55 mb-4">Sign out of WorldEye on this device.</p>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
            >
              Sign out
            </button>
          </Section>
        </div>
      )}
    </div>
  );
}
