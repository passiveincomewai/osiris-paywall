'use client';

/**
 * The globe camera viewer's "Set alert" control (camera alerts —
 * Pro watches up to 2 cameras, VIP Pro up to 10).
 *
 * Sits in the viewer's header controls beside Save to My Cameras and
 * works for the camera on screen — including /?camera=<id> deep links,
 * which open this same viewer. One GET /api/camera-alerts per camera
 * resolves everything the control must know: signed out (401), the
 * member's tier and its cap, their existing rule for THIS camera (no
 * duplicates), and the cap itself. Creating posts to the same API the
 * settings page and dashboard use, so a rule made here shows up
 * there — the service stays the single truth (catalogue membership,
 * still-photo requirement, condition and channel validation, the
 * cap), and its own error strings are surfaced verbatim.
 *
 * Gating is honest: signed-out and free members get the upgrade
 * path, never a fake-created rule; a stream-only camera (no still for
 * the checker to look at) says so up front instead of failing at save.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, BellRing, Crown, Loader2, Trash2, X } from 'lucide-react';
import {
  ALERT_CONDITION_EXAMPLES,
  cameraAlertWatchable,
  interpretAlertsGet,
  interpretCreateResult,
  interpretDeleteResult,
  ruleForCamera,
  type AlertRuleLike,
  type AlertsLoadState,
} from '@/lib/camera-alerts/viewer';

const goldBtn =
  'w-full px-3 py-2 bg-[var(--gold-primary)] text-black text-[10px] font-mono font-bold tracking-[0.2em] hover:brightness-110 disabled:opacity-50 transition inline-flex items-center justify-center gap-2';
const ghostBtn =
  'px-3 py-2 bg-white/5 border border-white/10 text-[10px] font-mono font-bold tracking-[0.2em] text-[var(--text-secondary)] hover:bg-white/10 transition inline-flex items-center justify-center gap-2';

export default function CameraAlertButton({ camera }: { camera: any | null }) {
  const cameraId: string | null =
    camera?.id !== undefined && camera?.id !== null && camera?.id !== '' ? String(camera.id) : null;
  const cameraName: string = camera?.name || camera?.title || 'Camera';
  const watchable = cameraAlertWatchable(camera);

  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<{ forId: string; state: AlertsLoadState } | null>(null);
  const [condition, setCondition] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [busy, setBusy] = useState<'create' | 'delete' | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const reload = useCallback(async (forId: string) => {
    try {
      const res = await fetch('/api/camera-alerts', { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      setLoad({ forId, state: interpretAlertsGet(res.status, body) });
    } catch {
      setLoad({ forId, state: { kind: 'error' } });
    }
  }, []);

  /* A camera switch starts clean: fresh state for the new camera, the
     panel closed, no half-typed form carried across. */
  useEffect(() => {
    setOpen(false);
    setNotice(null);
    setCondition('');
    setBusy(null);
    if (cameraId) void reload(cameraId);
  }, [cameraId, reload]);

  if (!cameraId) return null;

  const state: AlertsLoadState | { kind: 'loading' } =
    load && load.forId === cameraId ? load.state : { kind: 'loading' };
  const ready = state.kind === 'ready' ? state.view : null;
  const existing: AlertRuleLike | null = ready ? ruleForCamera(ready.rules, cameraId) : null;
  const atCap = ready ? ready.activeCount >= ready.maxActive : false;
  /** Alerts live on the paid plans: the member's own cap (0 free · 2 pro · 10 vip). */
  const canAlert = ready ? ready.maxActive > 0 : false;

  const create = async () => {
    setBusy('create');
    setNotice(null);
    try {
      const res = await fetch('/api/camera-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraId, condition, emailEnabled, inAppEnabled }),
      });
      const body = await res.json().catch(() => null);
      const outcome = interpretCreateResult(res.status, body);
      if (outcome.kind === 'created') {
        setNotice({ tone: 'ok', text: `Alert set — watching for “${outcome.rule.condition}”.` });
        await reload(cameraId);
      } else if (outcome.kind === 'signin') {
        setLoad({ forId: cameraId, state: { kind: 'signed-out' } });
      } else if (outcome.kind === 'plan') {
        await reload(cameraId);
      } else {
        setNotice({ tone: 'err', text: outcome.message });
      }
    } catch {
      setNotice({ tone: 'err', text: "Couldn't create that alert." });
    }
    setBusy(null);
  };

  const remove = async (ruleId: string) => {
    setBusy('delete');
    setNotice(null);
    try {
      const res = await fetch(`/api/camera-alerts/${ruleId}`, { method: 'DELETE' });
      const body = await res.json().catch(() => null);
      if (res.status === 401) {
        setLoad({ forId: cameraId, state: { kind: 'signed-out' } });
      } else {
        const outcome = interpretDeleteResult(res.status, body);
        if (outcome.kind === 'deleted') {
          setNotice({ tone: 'ok', text: 'Alert removed.' });
          await reload(cameraId);
        } else {
          setNotice({ tone: 'err', text: outcome.message });
        }
      }
    } catch {
      setNotice({ tone: 'err', text: "Couldn't remove that alert." });
    }
    setBusy(null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={existing ? 'Alert set for this camera' : 'Set alert for this camera'}
        title={
          existing
            ? 'Alert set for this camera — view or remove it'
            : 'Set alert for this camera'
        }
        className={`p-1.5 rounded-sm border transition-all ${
          existing
            ? 'bg-[var(--gold-primary)]/20 border-[var(--gold-primary)]'
            : 'bg-white/5 border-white/10 hover:bg-[var(--gold-primary)]/20 hover:border-[var(--gold-primary)]'
        }`}
      >
        {existing ? (
          <BellRing className="w-3 h-3 text-[var(--gold-primary)]" />
        ) : (
          <Bell className="w-3 h-3 text-[var(--text-secondary)]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] max-w-[86vw] border border-[var(--border-primary)] bg-black/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-[var(--gold-primary)]">
              CAMERA ALERT
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close alert panel"
              className="p-1 rounded-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <X className="w-3 h-3 text-[var(--text-secondary)]" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            <p className="text-[10px] font-mono text-white/60 truncate" title={cameraName}>
              {cameraName}
            </p>

            {notice && (
              <p
                className={`text-[10px] font-mono leading-relaxed px-2.5 py-2 border ${
                  notice.tone === 'ok'
                    ? 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
                    : 'text-amber-300 border-amber-300/30 bg-amber-400/10'
                }`}
              >
                {notice.text}
              </p>
            )}

            {state.kind === 'loading' && (
              <p className="inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-white/50">
                <Loader2 className="w-3 h-3 animate-spin" /> CHECKING YOUR ALERTS…
              </p>
            )}

            {state.kind === 'error' && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-mono text-white/60 leading-relaxed">
                  Couldn’t load your alerts just now.
                </p>
                <button onClick={() => void reload(cameraId)} className={ghostBtn}>
                  RETRY
                </button>
              </div>
            )}

            {state.kind === 'signed-out' && (
              <div className="space-y-2.5">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-mono text-white/85">
                  <Crown className="w-3.5 h-3.5 text-[var(--gold-primary)]" /> Camera alerts come
                  with Pro and VIP Pro.
                </p>
                <p className="text-[10px] font-mono text-white/50 leading-relaxed">
                  Sign in with a paid plan to watch this camera — Pro watches up to 2 cameras, VIP
                  Pro up to 10 — and we’ll email you the first time your condition shows in its
                  photos.
                </p>
                <a
                  href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/?camera=${cameraId}`)}`}
                  className={goldBtn}
                >
                  SIGN IN
                </a>
              </div>
            )}

            {ready && existing && (
              <div className="space-y-2.5">
                <p className="text-[11px] font-mono text-white/85 leading-relaxed">
                  Watching for{' '}
                  <span className="text-[var(--gold-primary)]">“{existing.condition}”</span>
                </p>
                <p className="text-[9px] font-mono tracking-widest text-white/45">
                  {existing.active ? 'ACTIVE' : 'PAUSED'} · EMAIL{' '}
                  {existing.emailEnabled ? 'ON' : 'OFF'} · IN-APP{' '}
                  {existing.inAppEnabled ? 'ON' : 'OFF'}
                </p>
                {!canAlert && (
                  <p className="text-[10px] font-mono text-amber-300/90 leading-relaxed">
                    Your plan isn’t active right now, so this alert is paused. It resumes on its
                    own when Pro or VIP Pro is back.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => void remove(existing.id)}
                    disabled={busy !== null}
                    className="px-3 py-2 bg-red-900/30 border border-red-500/30 text-[10px] font-mono font-bold tracking-[0.2em] text-red-300 hover:bg-red-500/30 transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {busy === 'delete' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}{' '}
                    REMOVE
                  </button>
                  <Link href="/dashboard#alerts" className={`${ghostBtn} flex-1`}>
                    ALL MY ALERTS
                  </Link>
                </div>
              </div>
            )}

            {ready && !existing && !canAlert && (
              <div className="space-y-2.5">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-mono text-white/85">
                  <Crown className="w-3.5 h-3.5 text-[var(--gold-primary)]" /> Camera alerts start
                  with Pro.
                </p>
                <p className="text-[10px] font-mono text-white/50 leading-relaxed">
                  Pro can watch up to 2 cameras like this one; VIP Pro (the annual plan) raises it
                  to 10 — and you get emailed when a condition first shows.
                </p>
                <Link href="/pricing" className={goldBtn}>
                  SEE PLANS
                </Link>
              </div>
            )}

            {ready && !existing && canAlert && !watchable && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-mono text-white/60 leading-relaxed">
                  Alerts check a camera’s still photo about every 15 minutes. This camera is a live
                  stream without still photos, so it can’t be watched.
                </p>
                <Link href="/dashboard#alerts" className={ghostBtn}>
                  FIND A WATCHABLE CAMERA
                </Link>
              </div>
            )}

            {ready && !existing && canAlert && watchable && atCap && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-mono text-amber-300/90 leading-relaxed">
                  {ready.vip
                    ? `You’re watching ${ready.maxActive} cameras — the VIP Pro limit. Pause or remove one to add this camera.`
                    : `You’re watching ${ready.maxActive} cameras — your Pro limit. VIP Pro raises it to 10.`}
                </p>
                {!ready.vip && (
                  <Link href="/pricing" className={goldBtn}>
                    GET VIP PRO
                  </Link>
                )}
                <Link href="/dashboard#alerts" className={ghostBtn}>
                  MANAGE ALERTS
                </Link>
              </div>
            )}

            {ready && !existing && canAlert && watchable && !atCap && (
              <div className="space-y-2.5">
                <span className="block text-[9px] font-mono tracking-[0.2em] text-white/45">
                  WATCH FOR
                </span>
                <input
                  value={condition}
                  maxLength={140}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="snow on the road"
                  aria-label="What to watch for"
                  className="w-full bg-white/5 border border-white/10 px-2.5 py-2 text-[11px] font-mono text-white placeholder:text-white/30 outline-none focus:border-[var(--gold-primary)]/60"
                />
                <div className="flex flex-wrap gap-1.5">
                  {ALERT_CONDITION_EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setCondition(ex)}
                      className="px-2 py-0.5 border border-white/10 text-[9px] font-mono text-white/55 hover:bg-white/5 transition"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                <div className="flex gap-4 text-[10px] font-mono text-white/65">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailEnabled}
                      onChange={(e) => setEmailEnabled(e.target.checked)}
                    />{' '}
                    Email me
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inAppEnabled}
                      onChange={(e) => setInAppEnabled(e.target.checked)}
                    />{' '}
                    Post in dashboard
                  </label>
                </div>
                <button
                  onClick={() => void create()}
                  disabled={busy !== null || condition.trim().length < 3}
                  className={goldBtn}
                >
                  {busy === 'create' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Bell className="w-3 h-3" />
                  )}{' '}
                  START WATCHING
                </button>
                <p className="text-[9px] font-mono text-white/35 leading-relaxed">
                  We check this camera’s latest photo about every 15 minutes and tell you the first
                  time your condition shows. A check is an AI look at one photo, not a guarantee.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
