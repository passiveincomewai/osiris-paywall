"use client";

import { useEffect, useState } from "react";

export default function NewsletterBroadcast() {
  const [counts, setCounts] = useState<{ total: number; verified: number } | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    fetch("/api/admin/newsletter/broadcast")
      .then((r) => r.json())
      .then((d) => d.ok && setCounts({ total: d.total, verified: d.verified }))
      .catch(() => {});
  }, []);

  async function send() {
    if (!subject.trim() || !body.trim() || sending) return;
    if (!confirm(`Send this broadcast to ${counts?.verified ?? 0} verified subscribers?`)) return;
    setSending(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/newsletter/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, html: body.replace(/\n/g, "<br>") }),
      });
      const d = await res.json().catch(() => ({}));
      setResult(d.ok ? `Sent to ${d.sent} subscribers.` : `Failed: ${d.error ?? "unknown error"}`);
      if (d.ok) { setSubject(""); setBody(""); }
    } catch {
      setResult("Failed: network error.");
    }
    setSending(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-1">Newsletter broadcast</div>
      <p className="text-xs text-white/45 mb-4">
        {counts ? `${counts.verified} verified of ${counts.total} total subscribers` : "Loading…"}
      </p>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject line"
        className="w-full mb-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#0096FF]/60"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message (plain text, line breaks preserved)…"
        rows={5}
        className="w-full mb-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#0096FF]/60"
      />
      <button
        onClick={send}
        disabled={sending || !subject.trim() || !body.trim()}
        className="px-5 py-2.5 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white text-sm font-semibold transition disabled:opacity-50"
      >
        {sending ? "Sending…" : `Send to ${counts?.verified ?? 0} subscribers`}
      </button>
      {result && <p className="text-xs text-white/60 mt-3">{result}</p>}
    </div>
  );
}
