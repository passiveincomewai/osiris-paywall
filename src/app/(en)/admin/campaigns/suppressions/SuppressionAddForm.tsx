"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/60";

export default function SuppressionAddForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaigns/suppressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setEmail("");
      setReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold text-white mb-3">Add an address</h2>
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-56">
          <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@example.com" />
        </div>
        <div className="flex-1 min-w-56">
          <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (unsubscribed, bounced, asked not to be contacted…)" />
        </div>
        <button
          onClick={add}
          disabled={busy || !email.trim()}
          className="px-5 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 transition disabled:opacity-40"
        >
          {busy ? "Adding…" : "Suppress"}
        </button>
      </div>
      {error && <p className="text-sm text-red-300 mt-2">{error}</p>}
    </div>
  );
}
