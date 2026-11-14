"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  fromName: string;
  fromEmail: string;
  status: string;
  dailyCap: number | null;
}

interface Recipient {
  id: string;
  email: string;
  status: string;
  meta: Record<string, unknown>;
  error: string | null;
  sentAt: string | null;
}

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/60";
const labelCls = "block text-xs font-medium text-white/60 mb-1";
const TOKENS = ["name", "first_name", "org", "role", "segment", "source_url"];

const STATUS_BADGE: Record<string, string> = {
  draft: "border-white/20 text-white/60",
  sending: "border-emerald-400/40 text-emerald-300 bg-emerald-400/10",
  paused: "border-amber-400/40 text-amber-300 bg-amber-400/10",
  stopped: "border-red-400/40 text-red-300 bg-red-400/10",
  completed: "border-cyan-400/40 text-cyan-200 bg-cyan-400/10",
};

export default function CampaignDetail({
  campaign,
  counts,
  total,
  recipients,
}: {
  campaign: Campaign;
  counts: Record<string, number>;
  total: number;
  recipients: Recipient[];
}) {
  const router = useRouter();
  const [name, setName] = useState(campaign.name);
  const [subject, setSubject] = useState(campaign.subject);
  const [bodyText, setBodyText] = useState(campaign.bodyText);
  const [bodyHtml, setBodyHtml] = useState(campaign.bodyHtml ?? "");
  const [dailyCap, setDailyCap] = useState(campaign.dailyCap ? String(campaign.dailyCap) : "");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [preview, setPreview] = useState<{ subject: string; text: string; recipientEmail: string | null } | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (msg: string) => {
    setNotice(msg);
    setError(null);
  };
  const fail = (msg: string) => {
    setError(msg);
    setNotice(null);
  };

  async function patch(body: Record<string, unknown>, busyKey: string) {
    setBusy(busyKey);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      router.refresh();
      return true;
    } catch (e) {
      fail(e instanceof Error ? e.message : "Request failed");
      return false;
    } finally {
      setBusy(null);
    }
  }

  const save = async () => {
    if (await patch({ name, subject, bodyText, bodyHtml: bodyHtml || null, dailyCap: dailyCap ? Number(dailyCap) : null }, "save")) {
      flash("Saved.");
    }
  };

  const setStatus = async (status: string) => {
    if (status === "stopped" && !window.confirm("Stop this campaign? No further batches will send until it is restarted.")) return;
    if (await patch({ status }, `status-${status}`)) flash(`Campaign ${status === "sending" ? "started" : status}.`);
  };

  const sendNow = async () => {
    setBusy("tick");
    try {
      const res = await fetch("/api/campaigns/tick", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const mine = (data.campaigns ?? []).find((c: { campaignId: string }) => c.campaignId === campaign.id);
      flash(
        mine
          ? `Batch sent: ${mine.sent} sent, ${mine.failed} failed, ${mine.suppressed} suppressed${mine.completed ? " — campaign completed" : ""}.`
          : "Tick ran — this campaign is not in sending status, so nothing went out.",
      );
      router.refresh();
    } catch (e) {
      fail(e instanceof Error ? e.message : "Tick failed");
    } finally {
      setBusy(null);
    }
  };

  const loadPreview = useCallback(async () => {
    const qs = new URLSearchParams({ subject, bodyText, bodyHtml });
    const res = await fetch(`/api/admin/campaigns/${campaign.id}/preview?${qs.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setPreview({
        subject: data.subject,
        text: data.text,
        recipientEmail: data.recipient?.email ?? null,
      });
    }
  }, [campaign.id, subject, bodyText, bodyHtml]);

  useEffect(() => {
    const t = setTimeout(loadPreview, 600);
    return () => clearTimeout(t);
  }, [loadPreview]);

  const insertToken = (token: string) => setBodyText((b) => `${b}{{${token}}}`);

  async function bulkAdd(text: string) {
    if (!text.trim()) return;
    setBusy("bulk");
    setBulkResult(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setBulkResult(
        `Added ${data.added} · duplicates ${data.duplicates} · suppressed ${data.suppressed} · invalid ${data.invalid}` +
          (data.invalidSamples?.length ? ` (invalid: ${data.invalidSamples.slice(0, 3).join("; ")})` : ""),
      );
      setBulkText("");
      router.refresh();
    } catch (e) {
      fail(e instanceof Error ? e.message : "Bulk add failed");
    } finally {
      setBusy(null);
    }
  }

  async function onFile(file: File) {
    const text = await file.text();
    void bulkAdd(text);
  }

  return (
    <div className="grid gap-6">
      {/* Status + controls */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-wrap items-center gap-3">
        <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_BADGE[campaign.status] ?? STATUS_BADGE.draft}`}>
          {campaign.status}
        </span>
        <span className="text-sm text-white/60">
          {total} recipients · {counts.sent ?? 0} sent · {counts.pending ?? 0} pending · {counts.failed ?? 0} failed ·{" "}
          {counts.suppressed ?? 0} suppressed
        </span>
        <div className="flex flex-wrap gap-2 ml-auto">
          {(campaign.status === "draft" || campaign.status === "paused" || campaign.status === "stopped") && (
            <button
              onClick={() => setStatus("sending")}
              disabled={busy !== null}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition disabled:opacity-40"
            >
              {campaign.status === "draft" ? "Start" : "Resume"}
            </button>
          )}
          {campaign.status === "sending" && (
            <button
              onClick={() => setStatus("paused")}
              disabled={busy !== null}
              className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition disabled:opacity-40"
            >
              Pause
            </button>
          )}
          {campaign.status !== "completed" && campaign.status !== "stopped" && (
            <button
              onClick={() => setStatus("stopped")}
              disabled={busy !== null}
              className="px-4 py-2 rounded-lg border border-red-400/50 text-red-300 text-sm font-semibold hover:bg-red-400/10 transition disabled:opacity-40"
            >
              Stop
            </button>
          )}
          <button
            onClick={sendNow}
            disabled={busy !== null || campaign.status !== "sending"}
            title={campaign.status !== "sending" ? "Start the campaign first" : "Send the next batch (≤10) right now"}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 transition disabled:opacity-40"
          >
            {busy === "tick" ? "Sending…" : "Send next batch now"}
          </button>
        </div>
      </div>

      {notice && <p className="text-sm text-emerald-300">{notice}</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}

      {/* Editors + preview */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 grid gap-4 content-start">
          <h2 className="text-lg font-semibold text-white">Message</h2>
          <div>
            <label className={labelCls}>Campaign name</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Subject</label>
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Body (plain text)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {TOKENS.map((t) => (
                <button
                  key={t}
                  onClick={() => insertToken(t)}
                  className="text-xs px-2 py-1 rounded border border-white/15 text-white/60 hover:text-white hover:border-cyan-400/50 transition"
                >
                  {`{{${t}}}`}
                </button>
              ))}
            </div>
            <textarea className={`${inputCls} min-h-64 font-mono`} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Body HTML (optional — overrides the text-derived HTML)</label>
            <textarea className={`${inputCls} min-h-24 font-mono`} value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
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
          <div>
            <button
              onClick={save}
              disabled={busy !== null}
              className="px-5 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 transition disabled:opacity-40"
            >
              {busy === "save" ? "Saving…" : "Save changes"}
            </button>
            <span className="text-xs text-white/40 ml-3">Edits apply to recipients not yet sent.</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 content-start">
          <h2 className="text-lg font-semibold text-white">Preview</h2>
          <p className="text-xs text-white/40 mt-1">
            Rendered exactly as it will send
            {preview?.recipientEmail ? (
              <>
                {" "}for <span className="font-mono text-white/60">{preview.recipientEmail}</span>
              </>
            ) : (
              " (no recipients yet — tokens render blank)"
            )}
            , CAN-SPAM footer included.
          </p>
          {preview ? (
            <div className="mt-4 rounded-xl bg-white text-zinc-900 p-5">
              <div className="font-semibold mb-3">{preview.subject}</div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{preview.text}</pre>
            </div>
          ) : (
            <p className="text-sm text-white/40 mt-4">Loading preview…</p>
          )}
        </div>
      </div>

      {/* Bulk add */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Add recipients</h2>
        <p className="text-xs text-white/40 mt-1">
          Paste addresses (one per line, or <span className="font-mono">Name &lt;email&gt;</span>) or a CSV with an{" "}
          <span className="font-mono">email</span> header column — every other CSV column becomes a {"{{token}}"}. Suppressed
          addresses are counted and skipped.
        </p>
        <textarea
          className={`${inputCls} min-h-32 font-mono mt-3`}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={"email,name,org,role\njane@school.edu,Jane Doe,Lincoln Elementary,Principal"}
        />
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <button
            onClick={() => bulkAdd(bulkText)}
            disabled={busy !== null || !bulkText.trim()}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 transition disabled:opacity-40"
          >
            {busy === "bulk" ? "Adding…" : "Add recipients"}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            className="px-5 py-2.5 rounded-lg border border-white/15 text-white/70 text-sm hover:text-white transition disabled:opacity-40"
          >
            Upload CSV file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
          {bulkResult && <span className="text-sm text-emerald-300">{bulkResult}</span>}
        </div>
      </div>

      {/* Recipients table */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white mb-3">
          Recipients {total > recipients.length && <span className="text-sm text-white/40">(first {recipients.length} of {total})</span>}
        </h2>
        {recipients.length === 0 ? (
          <p className="text-sm text-white/40">No recipients yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/10">
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Name / Org</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 text-white/70">
                    <td className="py-2 pr-3 font-mono text-xs">{r.email}</td>
                    <td className="py-2 pr-3">
                      {String(r.meta.name ?? "")}
                      {r.meta.org ? <span className="text-white/40"> · {String(r.meta.org)}</span> : null}
                    </td>
                    <td className="py-2 pr-3">{r.status}</td>
                    <td className="py-2 text-xs text-white/40">
                      {r.status === "sent" && r.sentAt
                        ? new Date(r.sentAt).toLocaleString("en-US")
                        : r.error ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
