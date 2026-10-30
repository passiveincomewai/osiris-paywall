"use client";

// White Label demo request form for /white-label. Posts to
// /api/white-label-demo, which stores the request as a ContactMessage
// (topic "white-label-demo") in the same pipeline as /contact — the
// success state shows only after the server confirms storage, and
// errors surface the server's own message. Styling mirrors
// src/components/contact/ContactForm so the two forms feel like one
// system.
import { useState } from "react";
import {
  WHITE_LABEL_ORG_TYPES,
  WHITE_LABEL_SCALES,
  WHITE_LABEL_MESSAGE_MAX,
} from "@/lib/white-label";
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";

type Phase = "idle" | "sending" | "sent" | "error";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 focus:bg-white/[0.05] transition";
const labelCls = "block text-sm font-medium text-white/70 mb-1.5";

export default function WhiteLabelDemoForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [orgType, setOrgType] = useState<string>("ski-resort");
  const [scale, setScale] = useState<string>("single");
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "sending") return;
    setPhase("sending");
    setError(null);
    try {
      const res = await fetch("/api/white-label-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, website, orgType, scale, message }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `Something went wrong (${res.status}).`);
      trackAnalyticsEvent("white_label_demo_submitted");
      setPhase("sent");
    } catch (err) {
      setPhase("error");
      setError(
        err instanceof Error && err.message
          ? err.message
          : "We couldn't send that just now. Check your connection and try again — or email us directly.",
      );
    }
  }

  if (phase === "sent") {
    return (
      <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 md:p-10 text-center">
        <div className="text-4xl mb-4" aria-hidden>✉️</div>
        <h3 className="text-xl font-bold">Request received</h3>
        <p className="text-sm text-white/55 mt-3 leading-relaxed max-w-md mx-auto">
          Thanks — your demo request is with the team. White Label is in
          pilot, so every request is reviewed personally; if there&apos;s a
          fit, we&apos;ll reply to the work email you gave with next steps
          and a scoping call.
        </p>
        <button
          onClick={() => {
            setName(""); setEmail(""); setCompany(""); setWebsite("");
            setOrgType("ski-resort"); setScale("single"); setMessage("");
            setPhase("idle"); setError(null);
          }}
          className="mt-6 px-6 py-2.5 rounded-xl border border-white/15 text-sm text-white/75 hover:text-white hover:border-white/30 transition"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8 text-left"
    >
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="wl-name" className={labelCls}>Your name</label>
          <input
            id="wl-name"
            type="text"
            autoComplete="name"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="wl-email" className={labelCls}>Work email</label>
          <input
            id="wl-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="wl-company" className={labelCls}>Company / organisation</label>
          <input
            id="wl-company"
            type="text"
            autoComplete="organization"
            required
            maxLength={150}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Example Resorts Group"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="wl-website" className={labelCls}>
            Website <span className="text-white/35 font-normal">(optional)</span>
          </label>
          <input
            id="wl-website"
            type="text"
            autoComplete="url"
            maxLength={300}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="wl-org-type" className={labelCls}>Organisation type</label>
          <select
            id="wl-org-type"
            value={orgType}
            onChange={(e) => setOrgType(e.target.value)}
            className={inputCls}
          >
            {WHITE_LABEL_ORG_TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#0b0e18]">
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="wl-scale" className={labelCls}>Expected scale</label>
          <select
            id="wl-scale"
            value={scale}
            onChange={(e) => setScale(e.target.value)}
            className={inputCls}
          >
            {WHITE_LABEL_SCALES.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#0b0e18]">
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-5">
        <label htmlFor="wl-message" className={labelCls}>What do you want to show?</label>
        <textarea
          id="wl-message"
          required
          rows={5}
          maxLength={WHITE_LABEL_MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Our slope and village cameras on our own site and app, under our brand, before this winter season…"
          className={`${inputCls} resize-y`}
        />
        <p className="text-xs text-white/35 mt-1.5">
          Places, properties, audiences, timing — anything that helps us scope the pilot.
        </p>
      </div>
      {phase === "error" && error && (
        <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={phase === "sending"}
        className="mt-6 w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-[15px] tracking-wide hover:brightness-110 active:scale-[0.99] transition shadow-[0_8px_32px_rgba(212,175,55,0.35)] disabled:opacity-60 disabled:cursor-wait"
      >
        {phase === "sending" ? "Sending…" : "Request a demo"}
      </button>
      <p className="text-xs text-white/35 mt-4">
        No spam, no obligation. Pilot places are limited and scoped one by one — we reply to every serious request.
      </p>
    </form>
  );
}
