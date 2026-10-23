import Link from "next/link";
import {
  HREF_LABELS,
  getVoiceQuestionsByIds,
  type VoiceQuestion,
} from "@/lib/voice-questions";

/**
 * "Questions people ask" block, rendered from the canonical voice-question
 * dataset (src/lib/voice-questions.ts). Each entry shows the question as an
 * h3, the short answer first (a complete standalone answer of ≤30 words —
 * the text a voice assistant can read aloud, marked with the
 * `voice-answer-short` class for SpeakableSpecification), supporting detail
 * after it, and a deep link to the page that proves or serves the answer.
 *
 * Schema rule: this component emits NO JSON-LD of its own. A page may carry
 * exactly one FAQPage node, so host pages merge these entries into their
 * existing FAQPage via `voiceFaqs(ids)` alongside their template FAQs.
 */
export function VoiceQA({
  ids,
  entries,
  title = "Questions people ask",
}: {
  ids?: string[];
  /** Pre-resolved entries (e.g. data-bound generated blocks from
   *  src/lib/place-answers.ts). Takes precedence over `ids`. */
  entries?: VoiceQuestion[];
  title?: string;
}) {
  const questions = entries ?? (ids ? getVoiceQuestionsByIds(ids) : []);
  if (questions.length === 0) return null;
  return (
    <section className="mt-12" aria-label={title}>
      <h2 className="text-xl md:text-2xl font-bold mb-5">{title}</h2>
      <div className="space-y-3">
        {questions.map((q) => (
          <article
            key={q.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <h3 className="font-semibold text-white/90">{q.question}</h3>
            <p className="voice-answer-short mt-2 text-white/80 leading-relaxed">
              {q.shortAnswer}
            </p>
            <p className="mt-2 text-sm text-white/55 leading-relaxed">{q.longAnswer}</p>
            <Link
              href={q.href}
              className="text-xs text-[#00E5FF] hover:underline mt-3 inline-block"
            >
              {HREF_LABELS[q.href] ?? "Open on WorldEye"} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export default VoiceQA;
