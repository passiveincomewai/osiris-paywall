import Link from "next/link";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { ArrowLeft, Camera, ChevronRight, MapPin } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import ViewOnGlobeButton from "@/components/ViewOnGlobeButton";

export const BASE = "https://worldeye.app";

export type Sample = { name: string; city?: string; id?: string };
export type AreaRow = { name: string; count: number; href?: string };
export type Faq = { q: string; a: string };
export type RelatedLink = { label: string; href: string };

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** FAQPage schema for rich-snippet eligibility. Pair with <FaqSection>. */
export function FaqJsonLd({ faqs }: { faqs: Faq[] }) {
  if (!faqs?.length) return null;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }}
    />
  );
}

export function Breadcrumb({
  trail,
  schema = true,
}: {
  trail: { label: string; href?: string }[];
  /** Pages that emit their own BreadcrumbList pass schema={false}. */
  schema?: boolean;
}) {
  return (
    <>
      {schema && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: trail.map((t, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: t.label,
              ...(t.href
                ? { item: t.href.startsWith("http") ? t.href : `${BASE}${t.href}` }
                : {}),
            })),
          }}
        />
      )}
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1.5 text-sm text-white/45 mb-10">
      {trail.map((t, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
          {t.href ? (
            <Link href={t.href} className="hover:text-white transition">{t.label}</Link>
          ) : (
            <span className="text-white/80">{t.label}</span>
          )}
        </span>
      ))}
      <span className="ml-auto -my-1">
        <LanguageHeaderControl variant="mobile" />
      </span>
    </nav>
    </>
  );
}

export function Hero({ h1, sub }: { h1: string; sub: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
        <Camera className="w-3.5 h-3.5" /> LIVE CAMERA NETWORK
      </p>
      <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{h1}</h1>
      <p className="mt-4 text-white/55">{sub}</p>
    </div>
  );
}

export function StatRow({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <div className="mt-10 grid grid-cols-3 gap-3 max-w-2xl mx-auto text-center">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-2xl md:text-3xl font-bold text-[#D4AF37]">{s.value}</div>
          <div className="text-xs text-white/45 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Updated({ date }: { date: string }) {
  return (
    <p className="text-center text-xs text-white/30 mt-4">Camera index last updated {date}.</p>
  );
}

export function Intro({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="mt-10 space-y-4 text-white/70 leading-relaxed max-w-3xl mx-auto">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export function AreaTable({ title, rows, note }: { title: string; rows: AreaRow[]; note?: string }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl md:text-2xl font-bold mb-5">{title}</h2>
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-white/40 border-b border-white/10 bg-white/[0.02]">
              <th className="px-5 py-3 font-semibold">Area</th>
              <th className="px-5 py-3 font-semibold text-right">Cameras</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.name} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="px-5 py-3">
                  {a.href ? (
                    <Link href={a.href} className="text-[#00E5FF] hover:underline">
                      {a.name}
                    </Link>
                  ) : (
                    a.name
                  )}
                </td>
                <td className="px-5 py-3 text-right font-mono text-[#D4AF37]">
                  {a.count.toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="text-xs text-white/35 mt-3">{note}</p>}
    </section>
  );
}

export function SampleGrid({ title, samples }: { title: string; samples: Sample[] }) {
  if (samples.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="text-xl md:text-2xl font-bold mb-5">{title}</h2>
      <ul className="grid sm:grid-cols-2 gap-3">
        {samples.map((s, i) => (
          <li key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-start gap-3">
            <MapPin className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{s.name}</div>
              {s.city && <div className="text-xs text-white/45">{s.city}</div>}
              {s.id ? (
                <div className="mt-1.5">
                  <ViewOnGlobeButton cameraId={s.id} cameraName={s.name} />
                </div>
              ) : (
                <a
                  href={BASE}
                  className="text-xs text-[#00E5FF] hover:underline mt-1 inline-block"
                >
                  View on the live map
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HowTo({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl md:text-2xl font-bold mb-5">{title}</h2>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-4 items-start rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <span className="w-7 h-7 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-sm flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <span className="text-white/70 text-sm pt-1">{s}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FaqSection({ title, faqs }: { title: string; faqs: Faq[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl md:text-2xl font-bold mb-5">{title}</h2>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <details
            key={i}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
          >
            <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 font-semibold text-sm hover:bg-white/[0.03]">
              {f.q}
              <span className="text-[#D4AF37] group-open:rotate-45 transition-transform text-xl leading-none shrink-0">+</span>
            </summary>
            <div className="px-5 pb-5 text-sm text-white/60 leading-relaxed">{f.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

export function RelatedLinks({ title, links }: { title: string; links: RelatedLink[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl md:text-2xl font-bold mb-5">{title}</h2>
      <div className="flex flex-wrap gap-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CtaRow({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div className="mt-12 flex flex-wrap gap-3">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
      >
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </Link>
      <a
        href={BASE}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
      >
        <Camera className="w-4 h-4" /> Open the live map
      </a>
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white">
      <div className="max-w-4xl mx-auto px-6 py-10 md:py-16">{children}</div>
      <SiteFooter />
    </main>
  );
}
