"use client";

/**
 * /invite/[token] — accept a Team Access invitation.
 *
 * Loads the invitation via GET /api/invite/[token], checks sign-in
 * state via /api/user/profile, and accepts via POST /api/invite/accept.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Mail, Users } from "lucide-react";

interface InviteInfo {
  orgName: string;
  role: string;
  inviterName: string | null;
  email: string;
  expiresAt: string;
}

const btnGold = "px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60 inline-flex items-center justify-center gap-2";
const btnGhost = "px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition disabled:opacity-60 inline-flex items-center justify-center gap-2";
const cardCls = "rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 md:p-8";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function InviteClient({ token }: { token: string }) {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<{ text: string; status?: number } | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<{ text: string; status?: number } | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/invite/${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(data.error || `Couldn't load this invitation (${res.status})`) as Error & { status?: number };
          err.status = res.status;
          throw err;
        }
        setInfo(data as InviteInfo);
      } catch (e) {
        const err = e as Error & { status?: number };
        setLoadError({ text: err.message, status: err.status });
      }
      try {
        const p = await fetch("/api/user/profile", { cache: "no-store" });
        setSignedIn(p.ok);
      } catch {
        setSignedIn(false);
      }
    })();
  }, [token]);

  async function accept() {
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || "Couldn't accept this invitation.") as Error & { status?: number };
        err.status = res.status;
        throw err;
      }
      setAccepted(true);
    } catch (e) {
      const err = e as Error & { status?: number };
      setAcceptError({ text: err.message, status: err.status });
    } finally {
      setAccepting(false);
    }
  }

  const callback = `/invite/${encodeURIComponent(token)}`;
  const expired = loadError?.status === 410;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 md:py-16">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to the map
      </Link>

      {!info && !loadError && (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" /></div>
      )}

      {loadError && (
        <section className={cardCls}>
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-xl font-bold">{expired ? "This invitation has expired" : "Invitation unavailable"}</h1>
          </div>
          <p className="text-sm text-white/60">{loadError.text}</p>
          <p className="text-sm text-white/50 mt-2">
            {expired
              ? "Ask the team owner or an admin to resend the invitation from their Team Access page, then open the new link."
              : "The link may be incomplete or the invitation may have been revoked. Ask the sender for a fresh invitation."}
          </p>
        </section>
      )}

      {info && (
        <section className={cardCls}>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-[#D4AF37]" />
            <p className="text-[11px] font-bold tracking-[0.25em] text-[#D4AF37]">TEAM INVITATION</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-3 break-words">
            Join {info.orgName} on WorldEye
          </h1>
          <dl className="space-y-2.5 text-sm mb-6">
            {info.inviterName && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-white/55">Invited by</dt>
                <dd className="font-semibold text-right break-words">{info.inviterName}</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/55">Your role</dt>
              <dd className="font-semibold capitalize">{info.role}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/55">Invited email</dt>
              <dd className="font-semibold text-right break-all">{info.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-white/55">Expires</dt>
              <dd className="font-semibold">{fmtDate(info.expiresAt)}</dd>
            </div>
          </dl>

          {accepted ? (
            <div>
              <p className="flex items-center gap-2 text-sm text-emerald-300 mb-4">
                <Check className="w-4 h-4" /> You&apos;re in — welcome to {info.orgName}.
              </p>
              <Link href="/settings/team" className={btnGold}>Open Team Access</Link>
            </div>
          ) : signedIn === null ? (
            <Loader2 className="w-5 h-5 animate-spin text-white/40" />
          ) : signedIn ? (
            <div>
              {acceptError && (
                <div role="alert" className="mb-4">
                  <p className="text-sm text-red-400">{acceptError.text}</p>
                  {acceptError.status === 403 && (
                    <p className="text-sm text-white/55 mt-1">
                      Sign in with the invited email address ({info.email}) to accept this invitation.
                    </p>
                  )}
                  {acceptError.status === 410 && (
                    <p className="text-sm text-white/55 mt-1">
                      This invitation has expired — ask the team to resend it.
                    </p>
                  )}
                </div>
              )}
              <button onClick={accept} disabled={accepting} className={btnGold}>
                {accepting ? <><Loader2 className="w-4 h-4 animate-spin" /> Accepting…</> : `Accept invitation to ${info.orgName}`}
              </button>
              <p className="text-xs text-white/35 mt-3">
                Accepting gives you access to this team&apos;s shared workspace under its owner&apos;s subscription.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-white/60 mb-4">
                Sign in with the invited email address ({info.email}) to accept — or create a free account with it first.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={`/signin?callbackUrl=${encodeURIComponent(callback)}`} className={btnGold}>
                  Sign in to accept
                </Link>
                <Link href={`/signup?callbackUrl=${encodeURIComponent(callback)}`} className={btnGhost}>
                  Create an account
                </Link>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
