"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/60";
const labelCls = "block text-xs font-medium text-white/60 mb-1";

export default function CampaignCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [dailyCap, setDailyCap] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject,
          bodyText,
          dailyCap: dailyCap ? Number(dailyCap) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      router.push(`/admin/campaigns/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold text-white mb-4">New campaign</h2>
      <div className="grid gap-4">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Schools — Spring outreach" />
        </div>
        <div>
          <label className={labelCls}>Subject (tokens like {"{{first_name}}"} / {"{{org}}"} work here too)</label>
          <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="A live window on the planet for {{org}}" />
        </div>
        <div>
          <label className={labelCls}>Body (plain text)</label>
          <textarea
            className={`${inputCls} min-h-48 font-mono`}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder={"Hi {{first_name}},\n\n…"}
          />
        </div>
        <div className="max-w-56">
          <label className={labelCls}>Daily cap (blank = warm-up ramp)</label>
          <input
            className={inputCls}
            value={dailyCap}
            onChange={(e) => setDailyCap(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            placeholder="Ramp"
          />
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div>
          <button
            onClick={create}
            disabled={busy || !name.trim()}
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 transition disabled:opacity-40"
          >
            {busy ? "Creating…" : "Create draft campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
