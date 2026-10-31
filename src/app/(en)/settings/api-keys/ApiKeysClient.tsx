"use client";

/**
 * /settings/api-keys — public developer API keys.
 *
 * Any signed-in user can hold up to 5 public keys for the WorldEye API
 * (GET /api/developer/keys). A key's plaintext is shown exactly once,
 * at creation; the list only ever carries prefixes and usage. The
 * page itself 404s server-side while PUBLIC_API_ENABLED is off.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Trash2,
} from "lucide-react";

const btnGold =
  "px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60 inline-flex items-center justify-center gap-2";
const btnGhost =
  "px-4 py-2 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition disabled:opacity-60 inline-flex items-center gap-2";
const inputCls =
  "w-full rounded-xl bg-white/[0.04] border border-white/12 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/60";

interface KeyView {
  id: string;
  name: string;
  keyPrefix: string;
  hits: number;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface PlanView {
  tier: string;
  label: string;
  dailyRequests: number;
  requestsPerMinute: number;
}

function fmtDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ApiKeysClient() {
  const [keys, setKeys] = useState<KeyView[] | undefined>(undefined);
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [maxKeys, setMaxKeys] = useState(5);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/developer/keys");
    if (res.status === 401) {
      window.location.href = "/signin?callbackUrl=/settings/api-keys";
      return;
    }
    if (!res.ok) {
      setError("Could not load your API keys. Try again in a moment.");
      setKeys([]);
      return;
    }
    const data = await res.json();
    setKeys(data.keys ?? []);
    setPlan(data.plan ?? null);
    if (typeof data.maxKeys === "number") setMaxKeys(data.maxKeys);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const liveCount = (keys ?? []).filter((k) => !k.revokedAt).length;

  async function createKey() {
    setCreating(true);
    setError(null);
    setFreshKey(null);
    setCopied(false);
    try {
      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "API key" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create the key.");
        return;
      }
      setFreshKey(data.key);
      setName("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    setRevokingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/developer/keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not revoke the key.");
        return;
      }
      setConfirmRevokeId(null);
      await load();
    } finally {
      setRevokingId(null);
    }
  }

  async function copyFreshKey() {
    if (!freshKey) return;
    try {
      await navigator.clipboard.writeText(freshKey);
      setCopied(true);
    } catch {
      /* clipboard unavailable — the key stays visible to copy by hand */
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to settings
      </Link>

      <h1 className="mt-6 flex items-center gap-3 text-2xl font-black tracking-tight">
        <KeyRound className="w-6 h-6 text-[#D4AF37]" /> API keys
      </h1>
      <p className="mt-2 text-sm text-white/55">
        Keys for the WorldEye developer API — search the live camera catalogue and the
        earthquake feed from your own code or AI tools. Full reference:{" "}
        <Link href="/developers" className="text-[#D4AF37] font-semibold hover:underline">
          worldeye.app/developers
        </Link>
        .
      </p>

      {plan && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-2">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-white/40">YOUR PLAN</div>
            <div className="text-sm font-bold">{plan.label}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider text-white/40">DAILY QUOTA</div>
            <div className="text-sm font-bold">{plan.dailyRequests.toLocaleString()} requests</div>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider text-white/40">BURST LIMIT</div>
            <div className="text-sm font-bold">{plan.requestsPerMinute} / minute</div>
          </div>
          <div className="text-xs text-white/40">
            Higher limits come with higher plans — see{" "}
            <Link href="/developers#rate-limits" className="underline hover:text-white/70">
              the ladder
            </Link>
            .
          </div>
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-bold tracking-wide">Create a key</h2>
        <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <input
            className={inputCls}
            placeholder="Name — e.g. My traffic dashboard"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className={btnGold}
            onClick={createKey}
            disabled={creating || liveCount >= maxKeys}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Create key
          </button>
        </div>
        <p className="mt-2 text-xs text-white/35">
          Up to {maxKeys} active keys. The key itself is shown once, at creation — store it
          somewhere safe.
        </p>
        {freshKey && (
          <div className="mt-4 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-3">
            <div className="text-xs font-bold tracking-wider text-[#D4AF37]">
              YOUR NEW KEY — COPY IT NOW, IT WON'T BE SHOWN AGAIN
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-black/40 px-3 py-2 text-sm text-white">
                {freshKey}
              </code>
              <button className={btnGhost} onClick={copyFreshKey}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold tracking-wide">Your keys</h2>
        {keys === undefined ? (
          <div className="mt-4 flex items-center gap-2 text-white/40 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : keys.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">
            No keys yet. Create one above and make your first call in under a minute.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {keys.map((k) => (
              <li
                key={k.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold">{k.name}</div>
                    <div className="mt-0.5 font-mono text-xs text-white/45">{k.keyPrefix}…</div>
                  </div>
                  {k.revokedAt ? (
                    <span className="px-2 py-0.5 rounded-full border border-white/15 text-white/40 text-[10px] font-bold tracking-wider">
                      REVOKED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full border border-green-400/30 text-green-300 text-[10px] font-bold tracking-wider">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-white/40">
                  Created {fmtDate(k.createdAt)} · {k.hits.toLocaleString()} requests · Last
                  used {fmtDate(k.lastUsedAt)}
                </div>
                {!k.revokedAt &&
                  (confirmRevokeId === k.id ? (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-white/60">
                        Revoke this key? Anything using it stops working at once.
                      </span>
                      <button
                        className="px-3 py-1.5 rounded-lg bg-red-500/90 text-white text-xs font-bold hover:bg-red-500 transition disabled:opacity-60"
                        onClick={() => revokeKey(k.id)}
                        disabled={revokingId === k.id}
                      >
                        {revokingId === k.id ? "Revoking…" : "Yes, revoke"}
                      </button>
                      <button className={btnGhost} onClick={() => setConfirmRevokeId(null)}>
                        Keep it
                      </button>
                    </div>
                  ) : (
                    <button
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-red-300 transition"
                      onClick={() => setConfirmRevokeId(k.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Revoke
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
