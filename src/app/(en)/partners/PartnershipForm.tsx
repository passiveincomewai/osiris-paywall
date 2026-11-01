"use client";

// Partnership application form for /partners. Posts to
// /api/partners/apply (validation + limits live server-side in
// src/lib/partners.ts; this component mirrors the required markers for
// UX only). Listens for the directory's interest event to preselect the
// partnership type and record which opportunity the applicant clicked.
import { useEffect, useState } from "react";
import {
  PARTNER_INTEREST_EVENT,
  type PartnerInterestDetail,
  type PartnerTypeOption,
} from "./PartnersDirectory";

const inputCls =
  "w-full rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/35 focus:border-[#D4AF37]/60 focus:outline-none";
const labelCls = "block text-sm font-medium text-white/75 mb-1.5";

export default function PartnershipForm({ types }: { types: PartnerTypeOption[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [type, setType] = useState("");
  const [audienceSize, setAudienceSize] = useState("");
  const [resources, setResources] = useState("");
  const [seeking, setSeeking] = useState("");
  const [proposal, setProposal] = useState("");
  const [opportunity, setOpportunity] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const onInterest = (e: Event) => {
      const detail = (e as CustomEvent<PartnerInterestDetail>).detail;
      if (!detail) return;
      setType(detail.type);
      setOpportunity(detail.opportunity);
      if (status === "sent") setStatus("idle");
    };
    window.addEventListener(PARTNER_INTEREST_EVENT, onInterest);
    return () => window.removeEventListener(PARTNER_INTEREST_EVENT, onInterest);
  }, [status]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          website,
          type,
          audienceSize,
          resources,
          seeking,
          proposal,
          opportunity: opportunity ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Something went wrong — please try again.");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-3xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] p-8 text-center" role="status">
        <p className="text-lg font-semibold text-white">Application received — thank you.</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/60">
          Every application is read by a person, not an autoresponder. If there&apos;s a potential
          fit — or we need one more detail — we&apos;ll reply to {email || "the email you gave"} to
          start the conversation. If you don&apos;t hear back, it means the fit isn&apos;t there
          right now; you&apos;re welcome to apply again when your project grows.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-5 text-sm font-medium text-[#D4AF37] hover:underline"
        >
          Submit another application
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate={false}>
      {opportunity && (
        <p className="rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.06] px-4 py-3 text-sm text-white/75">
          Applying about: <span className="font-medium text-white">{opportunity}</span>{" "}
          <button
            type="button"
            onClick={() => setOpportunity(null)}
            className="ml-2 text-[#D4AF37] hover:underline"
          >
            clear
          </button>
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="p-name" className={labelCls}>Your name *</label>
          <input id="p-name" required value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" className={inputCls} />
        </div>
        <div>
          <label htmlFor="p-email" className={labelCls}>Email *</label>
          <input id="p-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" className={inputCls} />
        </div>
        <div>
          <label htmlFor="p-company" className={labelCls}>Company / project *</label>
          <input id="p-company" required value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} autoComplete="organization" className={inputCls} />
        </div>
        <div>
          <label htmlFor="p-website" className={labelCls}>Website *</label>
          <input id="p-website" required value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={300} placeholder="example.com" className={inputCls} />
        </div>
        <div>
          <label htmlFor="p-type" className={labelCls}>Partnership type *</label>
          <select id="p-type" required value={type} onChange={(e) => setType(e.target.value)} className={`${inputCls} appearance-none [&>option]:bg-[#101014]`}>
            <option value="" disabled>Choose the closest fit…</option>
            {types.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-audience" className={labelCls}>Audience size <span className="text-white/40">(optional)</span></label>
          <input id="p-audience" value={audienceSize} onChange={(e) => setAudienceSize(e.target.value)} maxLength={80} placeholder="e.g. 50k monthly visitors, 12k subscribers" className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="p-resources" className={labelCls}>What can you contribute? *</label>
        <textarea id="p-resources" required value={resources} onChange={(e) => setResources(e.target.value)} rows={3} maxLength={2000} placeholder="Your audience, data, technology, distribution, content, cameras, expertise…" className={inputCls} />
      </div>
      <div>
        <label htmlFor="p-seeking" className={labelCls}>What are you looking for from WorldEye? *</label>
        <textarea id="p-seeking" required value={seeking} onChange={(e) => setSeeking(e.target.value)} rows={3} maxLength={2000} placeholder="Access, integration, exposure, content, revenue possibilities, a pilot…" className={inputCls} />
      </div>
      <div>
        <label htmlFor="p-proposal" className={labelCls}>Your collaboration proposal *</label>
        <textarea id="p-proposal" required value={proposal} onChange={(e) => setProposal(e.target.value)} rows={5} maxLength={5000} placeholder="Describe the partnership you have in mind: what we'd build or do together, and why it helps both audiences." className={inputCls} />
      </div>
      {status === "error" && (
        <p className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-full bg-[#D4AF37] px-8 py-3.5 font-semibold text-black transition hover:bg-[#e5c65c] disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Propose a Partnership"}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-white/40">
          Submitting stores your application so the WorldEye team can review it, and emails the
          team a notification. No account is created and nothing is published. Prefer email? Write
          to <a href="mailto:contact@worldeye.app" className="text-[#D4AF37] hover:underline">contact@worldeye.app</a>.
        </p>
      </div>
    </form>
  );
}
