"use client";

import { useEffect, useState } from "react";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ArrowLeft, Loader2, Check, User, Lock, CreditCard, LogOut, Crown, BellRing, Users,
  MailCheck, MailWarning, MailPlus, Camera,
} from "lucide-react";
import AccountSections from "./AccountSections";

type Profile = {
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
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
  // Email verification resend (current address).
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  // Email change: pending target + the request form + landing notice.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pendingBusy, setPendingBusy] = useState<"resend" | "cancel" | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changeBusy, setChangeBusy] = useState(false);
  const [changeMsg, setChangeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  // Avatar upload (item 1).
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function uploadAvatar(file: File) {
    setAvatarBusy(true);
    setAvatarMsg(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't upload that image.");
      setProfile((p) => p && { ...p, image: data.image });
      setAvatarMsg({ ok: true, text: "Picture updated." });
    } catch (e) {
      setAvatarMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't upload that image." });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setAvatarMsg(null);
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Couldn't remove the picture.");
      setProfile((p) => p && { ...p, image: null });
    } catch (e) {
      setAvatarMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't remove the picture." });
    } finally {
      setAvatarBusy(false);
    }
  }

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
      const ce = await fetch("/api/auth/change-email", { cache: "no-store" });
      if (ce.ok) setPendingEmail((await ce.json()).pendingEmail ?? null);
    })();
  }, []);

  // Landing from the change-email confirmation link: /settings?emailChange=…
  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("emailChange");
    if (!flag) return;
    if (flag === "done") setNotice({ ok: true, text: "Your account email has been updated." });
    else if (flag === "expired") setNotice({ ok: false, text: "That confirmation link expired — request a new change below." });
    else if (flag === "taken") setNotice({ ok: false, text: "That email is now used by another account, so the change couldn't be completed." });
    else setNotice({ ok: false, text: "That confirmation link isn't valid — request a new change below." });
  }, []);

  // Resend cooldown ticker (the endpoint is the real rate limiter; this
  // just keeps the button from being hammered).
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

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

  async function resendVerificationEmail() {
    if (!profile?.email || resendState === "sending" || resendCooldown > 0) return;
    setResendState("sending");
    setResendMsg(null);
    try {
      // Same endpoint the sign-in / sign-up forms use. It answers
      // { ok: true } on success (429 with its own message when the
      // per-IP limit trips) — errors are surfaced as returned.
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send the verification email.");
      setResendState("sent");
      setResendMsg("Verification email sent — check your inbox for the link.");
      setResendCooldown(60);
    } catch (e) {
      setResendState("error");
      setResendMsg(e instanceof Error ? e.message : "Couldn't send the verification email.");
      setResendCooldown(60);
    }
  }

  async function requestEmailChange(target: string) {
    const res = await fetch("/api/auth/change-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail: target }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't start the email change.");
    return data.pendingEmail as string;
  }

  async function submitEmailChange() {
    const target = newEmail.trim();
    if (!target || changeBusy) return;
    setChangeBusy(true);
    setChangeMsg(null);
    try {
      const pending = await requestEmailChange(target);
      setPendingEmail(pending);
      setPendingMsg({ ok: true, text: "Confirmation email sent — the change lands when you click the link in that inbox." });
      setChangeOpen(false);
      setNewEmail("");
    } catch (e) {
      setChangeMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't start the email change." });
    } finally {
      setChangeBusy(false);
    }
  }

  async function resendPendingChange() {
    if (!pendingEmail || pendingBusy) return;
    setPendingBusy("resend");
    setPendingMsg(null);
    try {
      await requestEmailChange(pendingEmail);
      setPendingMsg({ ok: true, text: "Confirmation email re-sent." });
    } catch (e) {
      setPendingMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't re-send the confirmation." });
    } finally {
      setPendingBusy(null);
    }
  }

  async function cancelPendingChange() {
    if (pendingBusy) return;
    setPendingBusy("cancel");
    try {
      const res = await fetch("/api/auth/change-email", { method: "DELETE" });
      if (!res.ok) throw new Error("Couldn't cancel the pending change.");
      setPendingEmail(null);
      setPendingMsg(null);
    } catch (e) {
      setPendingMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't cancel the pending change." });
    } finally {
      setPendingBusy(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to the map
        </Link>
        <LanguageHeaderControl variant="mobile" />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">Account settings</h1>

      {err && <p className="mb-4 text-sm text-red-400">{err}</p>}
      {notice && <p className={`mb-4 text-sm ${notice.ok ? "text-green-400" : "text-red-400"}`}>{notice.text}</p>}

      {!profile ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" /></div>
      ) : (
        <div className="space-y-5">
          <Section icon={User} title="Profile">
            <div className="flex items-center gap-4 mb-5">
              {profile.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.image} alt="Your profile picture" className="w-16 h-16 rounded-full object-cover border border-white/15" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-xl font-bold text-[#D4AF37]">
                  {(profile.name || profile.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-xs font-semibold text-white/80 hover:bg-white/5 transition cursor-pointer">
                  <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {avatarBusy ? "Uploading…" : profile.image ? "Change picture" : "Upload picture"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    disabled={avatarBusy}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); e.target.value = ""; }}
                  />
                </label>
                {profile.image && (
                  <button type="button" onClick={removeAvatar} disabled={avatarBusy} className="block mt-2 text-xs font-semibold text-white/45 hover:text-white transition">
                    Remove picture
                  </button>
                )}
                {avatarMsg && <p className={`text-xs mt-1.5 ${avatarMsg.ok ? "text-green-400" : "text-red-400"}`}>{avatarMsg.text}</p>}
                <p className="text-[11px] text-white/35 mt-1.5">PNG, JPEG, WebP or GIF, up to 2 MB. Shown in the header, your dashboard and leaderboards.</p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className={labelCls}>USERNAME</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={32} />
                <p className="text-xs text-white/35 mt-1.5">Letters, numbers, _ or - — no spaces. This is the name shown across WorldEye.</p>
              </div>
              <div>
                <label className={labelCls}>PHONE NUMBER</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} autoComplete="tel" />
              </div>
              <div>
                <label className={labelCls}>EMAIL</label>
                <input value={profile.email ?? ""} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {profile.emailVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-green-400/30 bg-green-400/10 text-green-300 text-[11px] font-bold tracking-wider">
                      <MailCheck className="w-3.5 h-3.5" /> EMAIL VERIFIED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 text-[11px] font-bold tracking-wider">
                      <MailWarning className="w-3.5 h-3.5" /> EMAIL NOT VERIFIED
                    </span>
                  )}
                  {!profile.emailVerified && (
                    <button
                      type="button"
                      onClick={resendVerificationEmail}
                      disabled={resendState === "sending" || resendCooldown > 0}
                      className="text-xs font-semibold text-[#D4AF37] hover:brightness-110 transition disabled:opacity-60"
                    >
                      {resendState === "sending" ? "Sending…" : resendCooldown > 0 ? `Resend again in ${resendCooldown}s` : "Resend verification email"}
                    </button>
                  )}
                </div>
                {!profile.emailVerified && (
                  resendMsg ? (
                    <p className={`text-xs mt-1.5 ${resendState === "error" ? "text-red-400" : "text-green-400"}`}>{resendMsg}</p>
                  ) : (
                    <p className="text-xs text-white/35 mt-1.5">We emailed a verification link when you signed up — links expire 24 hours after they're sent.</p>
                  )
                )}

                {pendingEmail ? (
                  <div className="mt-4 rounded-xl border border-[#00E5FF]/25 bg-[#00E5FF]/5 px-4 py-3">
                    <p className="text-sm text-white/80">
                      Confirmation sent to <span className="font-semibold text-white">{pendingEmail}</span> — your email stays{" "}
                      <span className="font-semibold text-white">{profile.email}</span> until you confirm the link in that inbox.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                      <button
                        type="button"
                        onClick={resendPendingChange}
                        disabled={pendingBusy !== null}
                        className="text-xs font-semibold text-[#D4AF37] hover:brightness-110 transition disabled:opacity-60"
                      >
                        {pendingBusy === "resend" ? "Sending…" : "Resend confirmation"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelPendingChange}
                        disabled={pendingBusy !== null}
                        className="text-xs font-semibold text-white/60 hover:text-white transition disabled:opacity-60"
                      >
                        {pendingBusy === "cancel" ? "Cancelling…" : "Cancel change"}
                      </button>
                    </div>
                    {pendingMsg && <p className={`text-xs mt-2 ${pendingMsg.ok ? "text-green-400" : "text-red-400"}`}>{pendingMsg.text}</p>}
                  </div>
                ) : changeOpen ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className={labelCls}>NEW EMAIL</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className={inputCls}
                        autoComplete="email"
                        placeholder="you@example.com"
                      />
                    </div>
                    <p className="text-xs text-white/35">
                      We'll email a confirmation link to the new address. Your current email keeps working for sign-in until you confirm.
                    </p>
                    {changeMsg && <p className={`text-sm ${changeMsg.ok ? "text-green-400" : "text-red-400"}`}>{changeMsg.text}</p>}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={submitEmailChange} disabled={changeBusy} className={btnGold}>
                        {changeBusy ? "Sending…" : "Send confirmation"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setChangeOpen(false); setChangeMsg(null); }}
                        disabled={changeBusy}
                        className="px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setChangeOpen(true)}
                    className="mt-3.5 inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition"
                  >
                    <MailPlus className="w-4 h-4 text-[#D4AF37]" /> Change email
                  </button>
                )}
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
                  <Link href="/settings/team" className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition">
                    <Users className="w-4 h-4 text-[#D4AF37]" /> Team Access
                    <span className="px-2 py-0.5 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold tracking-wider">TEAMS</span>
                  </Link>
                </div>
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
                <div className="mt-4">
                  <Link href="/settings/team" className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition">
                    <Users className="w-4 h-4 text-[#D4AF37]" /> Team Access
                  </Link>
                  <p className="text-xs text-white/35 mt-1">Teams you belong to live here — creating your own team needs a paid plan.</p>
                </div>
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

          <AccountSections />
        </div>
      )}
    </div>
  );
}
