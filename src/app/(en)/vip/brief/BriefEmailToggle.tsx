"use client";
import { useState } from "react";

export default function BriefEmailToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const flip = async () => {
    const next = !on;
    setBusy(true);
    const r = await fetch("/api/vip/brief", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ emailEnabled: next }),
    });
    setBusy(false);
    if (r.ok) {
      setOn(next);
      setNote(next ? "Daily email on — one brief each morning (UTC)." : "Daily email off.");
    } else {
      setNote("Couldn't save that just now — try again.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <button
        onClick={flip}
        disabled={busy}
        className={`rounded-xl border px-4 py-2 text-sm font-mono ${
          on
            ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-100"
            : "border-white/15 text-slate-300"
        }`}
      >
        Daily email: {on ? "ON" : "OFF"}
      </button>
      <p className="text-[13px] text-slate-400">
        {note ?? "The same brief, in your inbox once a day. Quiet days (nothing to report) don't send."}
      </p>
    </div>
  );
}
