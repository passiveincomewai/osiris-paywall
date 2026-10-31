import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Hero,
  Intro,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import {
  HREF_LABELS,
  VOICE_CATEGORIES,
  getVoiceQuestionsByCategory,
  voiceAnswerText,
  type VoiceQuestion,
} from "@/lib/voice-questions";

export const metadata: Metadata = {
  // R64 (site-audit Wave 3): no baked-in brand suffix — the root layout
  // template ("%s | WorldEye") adds it, so baking it in doubled it.
  // The OpenGraph title below keeps its single explicit suffix, as
  // social tags don't pass through the layout template.
  title: "Live Camera Questions, Answered",
  description:
    "Straight answers to the questions people ask about live cameras: how many there are, where to watch them, traffic and weather checks, flight tracking, and what WorldEye costs.",
  alternates: { canonical: `${BASE}/answers` },
  openGraph: {
    title: "Live Camera Questions, Answered | WorldEye",
    description:
      "The questions people ask about live cameras — answered in plain language, with the facts and the page that proves each one.",
    url: "/answers",
    type: "website",
  },
};

const CORE_QUESTIONS: VoiceQuestion[] = VOICE_CATEGORIES.flatMap((c) =>
  getVoiceQuestionsByCategory(c.id),
);

const faqJsonLdFaqs = CORE_QUESTIONS.map((q) => ({
  q: q.question,
  a: voiceAnswerText(q),
}));

const graphJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
        { "@type": "ListItem", position: 2, name: "Answers", item: `${BASE}/answers` },
      ],
    },
    {
      "@type": "WebPage",
      name: "Live Camera Questions, Answered",
      url: `${BASE}/answers`,
      description:
        "Plain-language answers to the questions people ask about live cameras, traffic, weather, tracking and WorldEye's plans.",
      isPartOf: { "@type": "WebSite", name: "WorldEye", url: BASE },
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: [".voice-answer-short"],
      },
    },
  ],
};

const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Live Camera Questions, Answered",
  description:
    "Answers to common questions about live public cameras, traffic cameras, weather cameras, flight tracking and WorldEye pricing.",
  url: `${BASE}/answers`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: BASE },
};

const INTRO = [
  "WorldEye puts 74,229 live public cameras from 109 countries on one free interactive globe — and these are the questions people ask about it, answered in plain language. Every answer leads with the fact itself, then the detail, then a link to the page that proves it.",
  "Ask a voice assistant how many live cameras there are in Japan, whether you can watch a hurricane live, or what WorldEye costs, and the answer it reads back should be one of these. If your question is not here, the FAQ and the camera directory cover the rest.",
];

function AnswerEntry({ q }: { q: VoiceQuestion }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="font-semibold text-white/90">{q.question}</h3>
      <p className="voice-answer-short mt-2 text-white/80 leading-relaxed">{q.shortAnswer}</p>
      <p className="mt-2 text-sm text-white/55 leading-relaxed">{q.longAnswer}</p>
      <Link
        href={q.href}
        className="text-xs text-[#00E5FF] hover:underline mt-3 inline-block"
      >
        {HREF_LABELS[q.href] ?? "Open on WorldEye"} →
      </Link>
    </article>
  );
}

export default function AnswersPage() {
  return (
    <PageShell>
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={graphJsonLd} />
      <FaqJsonLd faqs={faqJsonLdFaqs} />
      <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Answers" }]} />
      <Hero
        h1="Live Camera Questions, Answered"
        sub="Plain answers about live cameras, traffic, weather and tracking — each one leading with the fact, and linking to the page that proves it."
      />
      <Intro paragraphs={INTRO} />

      <nav aria-label="Answer categories" className="mt-10 flex flex-wrap gap-3">
        {VOICE_CATEGORIES.map((c) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            className="px-4 py-2 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
          >
            {c.title}
          </a>
        ))}
      </nav>

      {VOICE_CATEGORIES.map((c) => {
        const questions = getVoiceQuestionsByCategory(c.id);
        return (
          <section key={c.id} id={c.id} className="mt-12 scroll-mt-24">
            <h2 className="text-xl md:text-2xl font-bold mb-2">{c.title}</h2>
            <p className="text-sm text-white/45 mb-5">{c.blurb}</p>
            <div className="space-y-3">
              {questions.map((q) => (
                <AnswerEntry key={q.id} q={q} />
              ))}
            </div>
          </section>
        );
      })}

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "WorldEye FAQ", href: "/faq" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Cameras overview", href: "/cameras" },
          { label: "Plans and pricing", href: "/pricing" },
        ]}
      />

      <CtaRow backHref="/live-webcams" backLabel="All live webcams" />
    </PageShell>
  );
}
