"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, KeyRound, RefreshCw, Trash2 } from "lucide-react";

/**
 * Stream-to-YouTube settings: save the member's own YouTube stream
 * key (write-only — the API never returns it), and receive the relay
 * token shown exactly once for the relay program's config. Talks to
 * /api/ambient/stream-key (+ /rotate). The parent page gates on
 * sign-in + Ambient access server-side; this form handles the 401 /
 * 403 answers as states anyway (sessions expire).
 */
type State =
  | { kind: "loading" }
  | { kind: "locked"; message: string }
  | { kind: "ready"; configured: boolean };

export default function StreamKeyForm() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [key, setKey] = useState("");
  const [relayToken, setRelayToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/ambient/stream-key", { cache: "no-store" });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        setState({
          kind: "locked",
          message: j?.error ?? "Stream settings are unavailable right now.",
        });
        return;
      }
      const j = (await r.json()) as { configured?: boolean };
      setState({ kind: "ready", configured: !!j.configured });
    } catch {
      setState({ kind: "locked", message: "Stream settings could not load." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/ambient/stream-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeKey: key }),
      });
      const j = (await r.json().catch(() => null)) as {
        error?: string;
        relayToken?: string | null;
      } | null;
      if (!r.ok) {
        setError(j?.error ?? "The key could not be saved.");
        return;
      }
      setKey("");
      if (j?.relayToken) setRelayToken(j.relayToken);
      setState({ kind: "ready", configured: true });
    } catch {
      setError("The key could not be saved — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [key]);

  const rotate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/ambient/stream-key/rotate", { method: "POST" });
      const j = (await r.json().catch(() => null)) as {
        error?: string;
        relayToken?: string;
      } | null;
      if (!r.ok || !j?.relayToken) {
        setError(j?.error ?? "A new token could not be created.");
        return;
      }
      setRelayToken(j.relayToken);
      setCopied(false);
    } catch {
      setError("A new token could not be created.");
    } finally {
      setBusy(false);
    }
  }, []);

  const remove = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/ambient/stream-key", { method: "DELETE" });
      setRelayToken(null);
      setState({ kind: "ready", configured: false });
    } catch {
      setError("The key could not be removed.");
    } finally {
      setBusy(false);
    }
  }, []);

  if (state.kind === "loading") {
    return <p className="font-mono text-sm text-white/50">Loading your stream settings…</p>;
  }

  if (state.kind === "locked") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-sm text-white/75">{state.message}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/ambient-mode"
            className="rounded-full bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-5 py-2 text-sm font-bold text-black transition hover:brightness-110"
          >
            See Ambient — $4.99/mo, 10-day free trial
          </Link>
          <Link
            href="/signin?callbackUrl=%2Fambient%2Fstream"
            className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/5"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <label htmlFor="yt-key" className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="h-4 w-4 text-[#D4AF37]" /> Your YouTube stream key
        </label>
        <p className="mt-2 text-xs leading-relaxed text-white/50">
          From YouTube Studio → Settings → Stream (or the Go Live page). It is
          stored encrypted, is never shown again after saving, and is only
          ever used to send these cameras to your own channel. Treat it like
          a password — anyone holding it can stream to your channel.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            id="yt-key"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={state.configured ? "A key is saved — paste a new one to replace it" : "Paste your stream key"}
            autoComplete="off"
            className="w-full flex-1 rounded-xl border border-white/15 bg-black/40 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#0096FF]/60"
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || key.trim().length < 8}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/85 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save key"}
          </button>
        </div>
        {state.configured && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-300/90">
            <CheckCircle2 className="h-3.5 w-3.5" /> A stream key is saved for your account.
          </p>
        )}
        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="text-sm font-semibold">Relay token</h3>
        <p className="mt-2 text-xs leading-relaxed text-white/50">
          The relay program (the small always-on helper described in the
          guide) proves it is yours with this token. It is shown once — copy
          it into the relay&apos;s config now. Rotating creates a new one and
          kills the old immediately.
        </p>
        {relayToken ? (
          <div className="mt-4">
            <div className="flex items-center gap-2 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-3">
              <code className="min-w-0 flex-1 truncate font-mono text-sm text-[#e8c55a]">
                {relayToken}
              </code>
              <button
                type="button"
                aria-label="Copy relay token"
                onClick={() => {
                  void navigator.clipboard?.writeText(relayToken);
                  setCopied(true);
                }}
                className="shrink-0 rounded-lg bg-white/10 p-2 transition hover:bg-white/20"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-white/50">
              {copied ? "Copied. " : ""}Save it now — it cannot be shown again.
            </p>
          </div>
        ) : (
          <p className="mt-3 font-mono text-xs text-white/40">
            {state.configured
              ? "Token already issued (not shown again)."
              : "Your token appears here when you save your first key."}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void rotate()}
            disabled={busy || !state.configured}
            className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" /> Rotate token
          </button>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy || !state.configured}
            className="flex items-center gap-2 rounded-xl border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Remove key & token
          </button>
        </div>
      </div>
    </div>
  );
}
