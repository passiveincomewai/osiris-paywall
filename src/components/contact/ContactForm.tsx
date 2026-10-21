"use client";

// Public contact form for /contact. Posts to /api/contact, which stores
// the message in the admin inbox (/admin/contact) — nothing is emailed.
// States are honest: success only shows after the server confirms the
// message was stored, and errors surface the server's own message.
import { useState } from "react";
import { CONTACT_TOPICS, CONTACT_MESSAGE_MAX } from "@/lib/contact";

type Phase = "idle" | "sending" | "sent" | "error";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 focus:bg-white/[0.05] transition";
const labelCls = "block text-sm font-medium text-white/70 mb-1.5";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<string>("general");
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "sending") return;
    setPhase("sending");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `Something went wrong (${res.status}).`);
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
        <h3 className="text-xl font-bold">Message sent</h3>
        <p className="text-sm text-white/55 mt-3 leading-relaxed max-w-md mx-auto">
          Thanks for writing — your message is with the team. Every message
          gets read; if it needs an answer, we&apos;ll reply to the email
          address you gave.
        </p>
        <button
          onClick={() => {
            setName(""); setEmail(""); setTopic("general"); setMessage("");
            setPhase("idle"); setError(null);
          }}
          className="mt-6 px-6 py-2.5 rounded-xl border border-white/15 text-sm text-white/75 hover:text-white hover:border-white/30 transition"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8 text-left"
      noValidate={false}
    >
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="contact-name" className={labelCls}>Your name</label>
          <input
            id="contact-name"
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
          <label htmlFor="contact-email" className={labelCls}>Email address</label>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="contact-topic" className={labelCls}>Topic</label>
        <select
          id="contact-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={`${inputCls} appearance-none [&>option]:bg-[#0b0e18]`}
        >
          {CONTACT_TOPICS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label htmlFor="contact-message" className={labelCls}>Message</label>
        <textarea
          id="contact-message"
          required
          rows={6}
          maxLength={CONTACT_MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's going on — the more specific, the faster we can help."
          className={`${inputCls} resize-y min-h-[140px]`}
        />
        <div className="mt-1.5 text-right text-xs text-white/30">
          {message.length}/{CONTACT_MESSAGE_MAX}
        </div>
      </div>

      {phase === "error" && error && (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={phase === "sending"}
        className="mt-6 w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 disabled:opacity-60 disabled:cursor-wait transition"
      >
        {phase === "sending" ? "Sending…" : "Send message"}
      </button>
      <p className="mt-4 text-xs text-white/35 leading-relaxed">
        This form goes to the WorldEye team inbox. For billing questions,
        writing from the email address on your account helps us find your
        subscription faster.
      </p>
    </form>
  );
}
