import type { Metadata } from "next";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Intro,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import { CircleDot } from "lucide-react";

export const metadata: Metadata = {
  title: "How to Record a Live Camera — Clips & Timelapse — WorldEye Tutorial",
  description:
    "Record any live camera on WorldEye: press REC in the viewer to save clips to your library on this device, record up to 20 cameras at once on Pro (40 on VIP Pro), and make timelapses from snapshot cameras. Recording is a Pro feature and timelapse is VIP Pro — stated up front.",
  alternates: { canonical: `${BASE}/tutorials/record-a-live-camera` },
  openGraph: {
    title: "How to Record a Live Camera — Clips & Timelapse — WorldEye Tutorial",
    description:
      "REC lives inside the camera viewer. Pro records; VIP Pro also timelapses. Every step, with the tiers named.",
    url: "/tutorials/record-a-live-camera",
    type: "article",
  },
};

const STEPS = [
  {
    name: "Open a live camera",
    text: "Find a camera on the globe or through the directories and open it in the viewer. The recording controls live in a strip inside the camera viewer — no separate app, no export step.",
  },
  {
    name: "Know your tier before you press anything",
    text: "Recording is a Pro feature. The Weekly Pass and Monthly plan are Pro; the Annual plan and Enterprise are VIP Pro. If you are not on a recording plan, the button is honest about it up front: it shows a PRO lock and the words “Recording is a Pro feature” instead of pretending to work.",
  },
  {
    name: "Press REC",
    text: "On Pro or VIP Pro, press the REC button. Its promise is literal: “Record this live stream — saved to your clips library on this device.” The clip is captured from the live stream while you watch and lands in your clips library on the device you are using.",
  },
  {
    name: "Record several cameras at once",
    text: "One camera is rarely the whole story — a storm front, a ski day, a harbour. Pro can record up to 20 cameras at once; VIP Pro raises the cap to 40.",
  },
  {
    name: "Or make it a timelapse (VIP Pro)",
    text: "Snapshot cameras in the viewer also carry a TIMELAPSE strip. Timelapse is a VIP Pro extra: the Annual plan and Enterprise include it. If you are on Pro, the panel says so in plain words — “Your Pro plan doesn't include timelapse — it's a VIP Pro extra” — and if you have no plan at all it reads “TIMELAPSE IS A VIP PRO FEATURE”.",
  },
  {
    name: "Find everything in Recording overview",
    text: "The Recording overview page gathers your recording studio in one place. If you visit it signed out, it asks first: “Sign in to use the recording studio” — your library is tied to you, not floating on the device for anyone who picks it up.",
  },
];

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to record a live camera on WorldEye",
  description:
    "Press REC inside the camera viewer to save clips to your library on this device — a Pro feature, up to 20 cameras at once (40 on VIP Pro) — and make timelapses from snapshot cameras on VIP Pro.",
  step: STEPS.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.name,
    text: s.text,
  })),
};

const INTRO = [
  "A live camera is easy to watch and easy to lose — the moment passes, the light changes, the storm rolls through. WorldEye's viewer can keep it: the REC button records the live stream into a clips library on your device, and snapshot cameras can be run as timelapses that compress hours of weather into seconds.",
  "The tier split is stated before anything else, because it decides what your buttons do. Recording clips is a Pro feature (Weekly Pass or Monthly). Timelapse is a VIP Pro extra (Annual or Enterprise). This guide walks both, and quotes the exact messages the locked buttons show, so there are no surprises mid-storm. This tutorial is text-only by design: the recording studio sits behind those plans, so there is no public screenshot of it to show you — we would rather describe it accurately than illustrate it with something staged.",
];

const FAQS = [
  {
    q: "Which plan do I need to record a camera?",
    a: "Pro for recording clips — that is the Weekly Pass or the Monthly plan. Timelapse needs VIP Pro — the Annual plan or Enterprise. The viewer labels each control with its tier, and locked controls say which feature and plan they belong to.",
  },
  {
    q: "Where do my recordings go?",
    a: "To your clips library on the device you recorded from, exactly as the REC button states. The Recording overview page is the studio door; it asks you to sign in, because the library belongs to your account.",
  },
  {
    q: "How many cameras can I record at once?",
    a: "Up to 20 cameras simultaneously on Pro, and up to 40 on VIP Pro — enough to cover a whole route, a resort, or every angle of an event as it happens.",
  },
  {
    q: "Can I timelapse any camera?",
    a: "Timelapse is offered on snapshot cameras — the ones that refresh as still frames — and it is a VIP Pro feature. Live-video cameras are what the REC button is for.",
  },
  {
    q: "I'm on Pro. Why does timelapse still say no?",
    a: "Because timelapse is deliberately a VIP Pro extra, not part of Pro. The panel tells Pro subscribers exactly that — “Your Pro plan doesn't include timelapse — it's a VIP Pro extra” — rather than letting the button fail silently. Upgrading to the Annual plan unlocks it.",
  },
];

export default function RecordCameraTutorialPage() {
  return (
    <PageShell>
      <JsonLd data={howToJsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Tutorials", href: "/tutorials" },
          { label: "Record a live camera" },
        ]}
      />

      <div className="mt-8 text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <CircleDot className="w-3.5 h-3.5" /> TUTORIAL · PRO FEATURE
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Record a live camera</h1>
        <p className="mt-4 text-white/55">
          Save the moment as a clip, record twenty cameras at once — or let a snapshot camera
          timelapse the whole day. Tiers named at every step.
        </p>
      </div>

      <Intro paragraphs={INTRO} />
      <HowTo title="Step by step" steps={STEPS.map((s) => s.text)} />
      <FaqSection title="Recording questions" faqs={FAQS} />
      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Recording overview", href: "/recording" },
          { label: "Plans and pricing", href: "/pricing" },
          { label: "Tutorial: search cameras like a pro", href: "/tutorials/search-cameras-like-a-pro" },
          { label: "Tutorial: check traffic on your route", href: "/tutorials/check-traffic-on-your-route" },
          { label: "All tutorials", href: "/tutorials" },
        ]}
      />
      <CtaRow backHref="/tutorials" backLabel="All tutorials" />
    </PageShell>
  );
}
