/**
 * AEO "direct answers" block — plain-language question/answer pairs that
 * AI answer engines can lift verbatim. Each question renders as an <h2>
 * (directly under the page's single <h1>), followed by one short factual
 * paragraph. Answers must stay plain, specific and hype-free: verified
 * numbers only, no superlatives the site can't back up.
 */
export interface DirectAnswerItem {
  q: string;
  a: string;
}

export default function DirectAnswers({
  items,
  label = "Quick answers",
  className = "",
  headingClassName = "font-display text-xl md:text-2xl font-medium leading-snug",
}: {
  items: DirectAnswerItem[];
  label?: string;
  className?: string;
  headingClassName?: string;
}) {
  if (!items.length) return null;
  return (
    <section aria-label={label} className={className}>
      <p className="font-mono text-[11px] font-medium tracking-[0.3em] uppercase text-white/40">
        {label}
      </p>
      <div className="mt-5 space-y-7">
        {items.map((item) => (
          <div key={item.q}>
            <h2 className={headingClassName}>{item.q}</h2>
            <p className="mt-2 text-sm md:text-base text-white/60 leading-relaxed max-w-3xl">
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
