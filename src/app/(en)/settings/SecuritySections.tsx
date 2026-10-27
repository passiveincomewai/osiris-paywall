"use client";

// Security sections for /settings (items 2, 3, 4): two-factor auth
// management, active device sessions with remote sign-out, and the
// sign-in history. All state lives behind /api/account/* endpoints.

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldOff, MonitorSmartphone, History, KeyRound } from "lucide-react";
import QRCode from "qrcode";
import { currentDeviceId } from "@/components/DeviceHeartbeat";
import { formatDateTime } from "@/lib/account/format";
import type { Preferences } from "@/lib/account/preferences";

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
const btnGold = "px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60";
const btnGhost = "px-4 py-2 rounded-xl border border-white/15 text-xs font-semibold text-white/80 hover:bg-white/5 transition disabled:opacity-60";

type TotpStatus = { enabled: boolean; enabledAt: string | null; backupCodesRemaining: number };
type DeviceRow = { deviceId: string; label: string; approximateLocation: string | null; lastSeenAt: string; createdAt: string; revokedAt: string | null };
type SigninRow = { id: string; deviceLabel: string; approximateLocation: string | null; createdAt: string };

export default function SecuritySections({ prefs }: { prefs: Preferences | null }) {
  const [totp, setTotp] = useState<TotpStatus | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpMsg, setTotpMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sessions, setSessions] = useState<DeviceRow[] | null>(null);
  const [signins, setSignins] = useState<SigninRow[] | null>(null);
  const [thisDevice, setThisDevice] = useState("");

  const loadSecurity = useCallback(async () => {
    const [t, s, h] = await Promise.all([
      fetch("/api/account/totp", { cache: "no-store" }),
      fetch("/api/account/sessions", { cache: "no-store" }),
      fetch("/api/account/signins", { cache: "no-store" }),
    ]);
    if (t.ok) setTotp(await t.json());
    if (s.ok) setSessions((await s.json()).sessions);
    if (h.ok) setSignins((await h.json()).signins);
  }, []);

  useEffect(() => {
    setThisDevice(currentDeviceId());
    void loadSecurity();
  }, [loadSecurity]);

  async function totpAction(action: string, withCode = true) {
    setTotpBusy(true);
    setTotpMsg(null);
    try {
      const res = await fetch("/api/account/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(withCode ? { code: code.trim() } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      return data;
    } catch (e) {
      setTotpMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
      return null;
    } finally {
      setTotpBusy(false);
    }
  }

  async function startSetup() {
    const data = await totpAction("setup", false);
    if (!data) return;
    const qr = await QRCode.toDataURL(data.otpauthUrl, { margin: 1, width: 200 });
    setSetup({ secret: data.secret, qr });
    setBackupCodes(null);
  }

  async function enable() {
    const data = await totpAction("enable");
    if (!data) return;
    setBackupCodes(data.backupCodes);
    setSetup(null);
    setCode("");
    setTotpMsg({ ok: true, text: "Two-factor auth is on. Save your backup codes somewhere safe — they're shown once." });
    void loadSecurity();
  }

  async function regenerate() {
    const data = await totpAction("regenerate");
    if (!data) return;
    setBackupCodes(data.backupCodes);
    setCode("");
    setTotpMsg({ ok: true, text: "New backup codes generated — the old ones no longer work." });
    void loadSecurity();
  }

  async function disable() {
    const data = await totpAction("disable");
    if (!data) return;
    setBackupCodes(null);
    setCode("");
    setTotpMsg({ ok: true, text: "Two-factor auth is off." });
    void loadSecurity();
  }

  async function revoke(deviceId: string) {
    await fetch("/api/account/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    void loadSecurity();
  }

  async function revokeOthers() {
    await fetch("/api/account/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allOthers: true, currentDeviceId: thisDevice }),
    });
    void loadSecurity();
  }

  const fmt = (iso: string) =>
    formatDateTime(new Date(iso), { timezone: prefs?.timezone, clockFormat: prefs?.clockFormat, withDate: true });

  return (
    <>
      <Section icon={ShieldCheck} title="Two-factor authentication">
        {totp === null ? (
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        ) : totp.enabled ? (
          <div className="space-y-4">
            <p className="text-sm text-green-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> On — you'll be asked for a code after signing in.
            </p>
            <p className="text-xs text-white/40">
              {totp.backupCodesRemaining} backup code{totp.backupCodesRemaining === 1 ? "" : "s"} left.
              {totp.enabledAt ? ` Enabled ${fmt(totp.enabledAt)}.` : ""}
            </p>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-white/40 mb-1.5">CURRENT CODE (TO MAKE CHANGES)</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="6-digit or backup code" autoComplete="one-time-code" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={regenerate} disabled={totpBusy || !code.trim()} className={btnGhost}>
                <KeyRound className="w-3.5 h-3.5 inline mr-1.5" /> New backup codes
              </button>
              <button onClick={disable} disabled={totpBusy || !code.trim()} className="px-4 py-2 rounded-xl border border-red-400/40 text-xs font-semibold text-red-300 hover:bg-red-400/10 transition disabled:opacity-60">
                <ShieldOff className="w-3.5 h-3.5 inline mr-1.5" /> Turn off 2FA
              </button>
            </div>
          </div>
        ) : setup ? (
          <div className="space-y-4">
            <p className="text-sm text-white/60">Scan this with your authenticator app (Google Authenticator, Authy, 1Password…), then enter the code it shows.</p>
            <div className="flex flex-wrap items-center gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setup.qr} alt="2FA setup QR code" className="rounded-xl bg-white p-1.5 w-[164px] h-[164px]" />
              <div className="min-w-[220px] flex-1">
                <p className="text-xs font-semibold tracking-wider text-white/40 mb-1.5">CAN'T SCAN? ENTER THIS SECRET</p>
                <code className="block break-all rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs">{setup.secret}</code>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-white/40 mb-1.5">CODE FROM YOUR APP</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="123456" autoComplete="one-time-code" />
            </div>
            <div className="flex gap-2">
              <button onClick={enable} disabled={totpBusy || code.trim().length < 6} className={btnGold}>Turn on 2FA</button>
              <button onClick={() => { setSetup(null); setCode(""); }} className={btnGhost}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-white/60">
              Add a second step at sign-in: a 6-digit code from an authenticator app on your phone, with single-use backup codes in case you lose it.
            </p>
            <button onClick={startSetup} disabled={totpBusy} className={btnGold}>Set up 2FA</button>
          </div>
        )}
        {backupCodes && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3">
            <p className="text-sm font-semibold text-amber-200 mb-2">Your backup codes — shown once, save them now:</p>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-sm text-white/85">
              {backupCodes.map((c) => <span key={c}>{c}</span>)}
            </div>
          </div>
        )}
        {totpMsg && <p className={`mt-3 text-sm ${totpMsg.ok ? "text-green-400" : "text-red-400"}`}>{totpMsg.text}</p>}
      </Section>

      <Section icon={MonitorSmartphone} title="Devices & sessions">
        <p className="text-xs text-white/40 mb-4">
          Devices that have signed in to your account. Revoking a device signs it out the next time it loads WorldEye.
        </p>
        {sessions === null ? (
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        ) : sessions.length === 0 ? (
          <p className="text-sm text-white/50">No devices recorded yet — they appear as you browse while signed in.</p>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((s) => (
              <div key={s.deviceId} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {s.label}
                    {s.deviceId === thisDevice && <span className="ml-2 px-2 py-0.5 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-[10px] font-bold tracking-wider">THIS DEVICE</span>}
                    {s.revokedAt && <span className="ml-2 px-2 py-0.5 rounded-full bg-red-400/10 border border-red-400/30 text-red-300 text-[10px] font-bold tracking-wider">SIGNED OUT</span>}
                  </p>
                  <p className="text-xs text-white/40">
                    {s.approximateLocation ? `${s.approximateLocation} · ` : ""}Last active {fmt(s.lastSeenAt)}
                  </p>
                </div>
                {!s.revokedAt && (
                  <button onClick={() => revoke(s.deviceId)} className={btnGhost}>Sign out</button>
                )}
              </div>
            ))}
            <button onClick={revokeOthers} className="text-xs font-semibold text-red-300 hover:text-red-200 transition">
              Sign out all other devices
            </button>
          </div>
        )}
      </Section>

      <Section icon={History} title="Sign-in history">
        {signins === null ? (
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        ) : signins.length === 0 ? (
          <p className="text-sm text-white/50">No sign-ins recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {signins.slice(0, 15).map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 text-sm border-b border-white/5 pb-2">
                <span className="text-white/75">{h.deviceLabel}{h.approximateLocation ? <span className="text-white/40"> · {h.approximateLocation}</span> : null}</span>
                <span className="text-white/40 text-xs whitespace-nowrap">{fmt(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-white/35 mt-3">We email you when a device your account has never used signs in. Locations are approximate (city-level, from your connection) — never exact.</p>
      </Section>
    </>
  );
}
