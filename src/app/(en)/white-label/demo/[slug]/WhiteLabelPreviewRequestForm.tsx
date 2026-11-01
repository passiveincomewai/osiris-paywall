"use client";

// The qualified demo request on a generated preview page. Same
// pipeline as the /white-label form — POST /api/white-label-demo into
// the ContactMessage lead store (topic "white-label-demo") — extended
// with the generator's qualification fields (locations of interest,
// camera interests) and the preview's own path, so the lead in the
// admin inbox links straight back to what the prospect saw. Company
// and locations arrive prefilled from the preview; everything is
// editable. The success state shows only after the server confirms
// storage, and mirrors the /white-label form's pilot-honest wording.
import { useState } from "react";
import {
  WHITE_LABEL_ORG_TYPES,
  WHITE_LABEL_SCALES,
  WHITE_LABEL_MESSAGE_MAX,
  WHITE_LABEL_LOCATIONS_MAX,
  WHITE_LABEL_CAMERA_INTERESTS_MAX,
} from "@/lib/white-label";
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";

type Phase = "idle" | "sending" | "sent" | "error";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 focus:bg-white/[0.05] transition";
const labelCls = "block text-sm font-medium text-white/70 mb-1.5";

export default function WhiteLabelPreviewRequestForm({
  orgName,
  locationLabel,
  previewPath,
}: {
  orgName: string;
  locationLabel: string;
  previewPath: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(orgName);
  const [website, setWebsite] = useState("");
  const [orgType, setOrgType] = useState<string>("ski-resort");
  const [scale, setScale] = useState<string>("single");
  const [locations, setLocations] = useState(locationLabel);
  const [cameraInterests, setCameraInterests] = useState("");
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
        body: JSON.stringify({
          name,
          email,
          company,
          website,
          orgType,
          scale,
          locations,
          cameraInterests,
          message,
          previewPath,
        }),
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
          Thanks — your demo request is with the team, linked to this preview.
          White Label is in pilot, so every request is reviewed personally;
          if there&apos;s a fit, we&apos;ll reply to the work email you gave
          with next steps and a scoping call.
        </p>
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
          <label htmlFor="wlp-name" className={labelCls}>Your name</label>
          <input
            id="wlp-name"
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
          <label htmlFor="wlp-email" className={labelCls}>Work email</label>
          <input
            id="wlp-email"
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
          <label htmlFor="wlp-company" className={labelCls}>Company / organisation</label>
          <input
            id="wlp-company"
            type="text"
            autoComplete="organization"
            required
            maxLength={150}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="wlp-website" className={labelCls}>
            Website <span className="text-white/35 font-normal">(optional)</span>
          </label>
          <input
            id="wlp-website"
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
          <label htmlFor="wlp-org-type" className={labelCls}>Organisation type</label>
          <select
            id="wlp-org-type"
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
          <label htmlFor="wlp-scale" className={labelCls}>Expected scale</label>
          <select
            id="wlp-scale"
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
        <div>
          <label htmlFor="wlp-locations" className={labelCls}>Locations of interest</label>
          <input
            id="wlp-locations"
            type="text"
            maxLength={WHITE_LABEL_LOCATIONS_MAX}
            value={locations}
            onChange={(e) => setLocations(e.target.value)}
            placeholder="e.g. Park City, plus our Deer Valley base"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="wlp-interests" className={labelCls}>
            Camera interests <span className="text-white/35 font-normal">(optional)</span>
          </label>
          <input
            id="wlp-interests"
            type="text"
            maxLength={WHITE_LABEL_CAMERA_INTERESTS_MAX}
            value={cameraInterests}
            onChange={(e) => setCameraInterests(e.target.value)}
            placeholder="e.g. Slopes and village streets, about a dozen cameras"
            className={inputCls}
          />
        </div>
      </div>
      <div className="mt-5">
        <label htmlFor="wlp-message" className={labelCls}>What do you want to show?</label>
        <textarea
          id="wlp-message"
          required
          rows={5}
          maxLength={WHITE_LABEL_MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Our slope and village cameras on our own site and app, under our brand, before this winter season…"
          className={`${inputCls} resize-y`}
        />
        <p className="text-xs text-white/35 mt-1.5">
          Properties, audiences, timing — anything that helps us scope the pilot.
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
        {phase === "sending" ? "Sending…" : "Request this for your organisation"}
      </button>
      <p className="text-xs text-white/35 mt-4">
        No spam, no obligation. This request is stored with a link to this
        preview, so we can see exactly what you saw.
      </p>
    </form>
  );
}
