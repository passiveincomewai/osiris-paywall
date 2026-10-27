"use client";

// Admin contact inbox: newest submissions first, unread highlighted.
// Row click expands the full message; actions PATCH/DELETE via
// /api/admin/contact/[id] and update local state from the response.
import { useMemo, useState } from "react";
import { contactTopicLabel } from "@/lib/contact";

export interface ContactMessageView {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: string;
  createdAt: string; // ISO
  readAt: string | null;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "resolved", label: "Resolved" },
] as const;

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Denver",
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

const STATUS_STYLES: Record<string, string> = {
  unread: "border-amber-400/30 text-amber-300 bg-amber-400/10",
  read: "border-sky-400/30 text-sky-300 bg-sky-400/10",
  resolved: "border-emerald-400/30 text-emerald-300 bg-emerald-400/10",
};

export default function ContactInbox({ initial }: { initial: ContactMessageView[] }) {
  const [messages, setMessages] = useState(initial);
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: messages.length, unread: 0, read: 0, resolved: 0 };
    for (const m of messages) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [messages]);

  const visible = filter === "all" ? messages : messages.filter((m) => m.status === filter);

  async function setStatus(m: ContactMessageView, status: string) {
    setBusyId(m.id); setError(null);
    try {
      const res = await fetch(`/api/admin/contact/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `Request failed (${res.status})`);
      setMessages((prev) =>
        prev.map((x) =>
          x.id === m.id
            ? { ...x, status: j.status, readAt: status === "unread" ? null : (x.readAt ?? new Date().toISOString()) }
            : x,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function openMessage(m: ContactMessageView) {
    const next = openId === m.id ? null : m.id;
    setOpenId(next);
    // Opening an unread message marks it read, same as an inbox anywhere.
    if (next && m.status === "unread") void setStatus(m, "read");
  }

  async function remove(m: ContactMessageView) {
    if (!window.confirm(`Delete the message from ${m.name} (${m.email})? This can't be undone.`)) return;
    setBusyId(m.id); setError(null);
    try {
      const res = await fetch(`/api/admin/contact/${m.id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `Request failed (${res.status})`);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      if (openId === m.id) setOpenId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3.5 py-2.5 rounded-lg border text-sm transition ${
              filter === f.value
                ? "border-white/40 text-white bg-white/[0.07]"
                : "border-white/12 text-white/50 hover:text-white"
            }`}
          >
            {f.label} <span className="text-white/40">{counts[f.value] ?? 0}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/40 text-sm">
          {messages.length === 0
            ? "No contact messages yet. Submissions from the /contact form will land here."
            : "Nothing in this filter."}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((m) => {
            const open = openId === m.id;
            const busy = busyId === m.id;
            return (
              <div
                key={m.id}
                className={`rounded-2xl border bg-white/[0.03] overflow-hidden ${
                  m.status === "unread" ? "border-amber-400/25" : "border-white/10"
                }`}
              >
                <button
                  onClick={() => openMessage(m)}
                  className="w-full text-left px-5 py-4 flex items-start gap-4"
                >
                  <span
                    aria-hidden
                    className={`mt-[7px] w-2 h-2 rounded-full shrink-0 ${
                      m.status === "unread" ? "bg-amber-400" : "bg-white/15"
                    }`}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`font-semibold ${m.status === "unread" ? "text-white" : "text-white/85"}`}>
                        {m.name}
                      </span>
                      <span className="text-xs text-white/45">{contactTopicLabel(m.topic)}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[m.status] ?? STATUS_STYLES.read}`}>
                        {m.status}
                      </span>
                    </span>
                    <span className="block text-sm text-white/50 truncate mt-1">
                      {m.message.slice(0, 140)}
                    </span>
                  </span>
                  <span className="text-xs text-white/35 shrink-0">{when(m.createdAt)}</span>
                </button>

                {open && (
                  <div className="px-5 pb-5 pt-1 border-t border-white/[0.06]">
                    <div className="text-sm text-white/50 mt-3">
                      From{" "}
                      <a href={`mailto:${m.email}`} className="text-cyan-300 hover:underline">
                        {m.email}
                      </a>{" "}
                      · {when(m.createdAt)} MDT
                      {m.readAt ? ` · first read ${when(m.readAt)}` : ""}
                    </div>
                    <p className="mt-3 text-[15px] leading-relaxed text-white/80 whitespace-pre-wrap break-words">
                      {m.message}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your WorldEye message")}`}
                        className="inline-flex items-center min-h-10 px-3.5 py-2 rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-200 text-sm hover:bg-cyan-400/25 transition"
                      >
                        Reply by email
                      </a>
                      {m.status !== "read" && (
                        <button
                          disabled={busy}
                          onClick={() => setStatus(m, "read")}
                          className="inline-flex items-center min-h-10 px-3.5 py-2 rounded-lg border border-white/15 text-white/70 text-sm hover:text-white disabled:opacity-50 transition"
                        >
                          Mark read
                        </button>
                      )}
                      {m.status !== "resolved" && (
                        <button
                          disabled={busy}
                          onClick={() => setStatus(m, "resolved")}
                          className="inline-flex items-center min-h-10 px-3.5 py-2 rounded-lg border border-emerald-400/30 text-emerald-300 text-sm hover:bg-emerald-400/10 disabled:opacity-50 transition"
                        >
                          Mark resolved
                        </button>
                      )}
                      {m.status !== "unread" && (
                        <button
                          disabled={busy}
                          onClick={() => setStatus(m, "unread")}
                          className="inline-flex items-center min-h-10 px-3.5 py-2 rounded-lg border border-white/15 text-white/70 text-sm hover:text-white disabled:opacity-50 transition"
                        >
                          Reopen as unread
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => remove(m)}
                        className="inline-flex items-center min-h-10 px-3.5 py-2 rounded-lg border border-red-400/30 text-red-300 text-sm hover:bg-red-400/10 disabled:opacity-50 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
