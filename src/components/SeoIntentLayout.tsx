// Shared scaffold for the SEO intent pages (/alternatives/*, /best-*, /free-osint-tools).
// Page content itself stays in each page.tsx; this only standardizes chrome:
// breadcrumbs + BreadcrumbList JSON-LD, reviewed stamp, CTAs, and the shell.
import Link from "next/link";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, CalendarCheck, ChevronRight } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";

export type Crumb = { label: string; href?: string };

const SITE = "https://worldeye.app";

export function webPageLd(name: string, description: string, path: string) {
  return {
    "@type": "WebPage",
    name,
    description,
    url: `${SITE}${path}`,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: SITE },
  };
}

export function itemListLd(items: { name: string; href: string; description?: string }[]) {
  return {
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.href.startsWith("http") ? it.href : `${SITE}${it.href}`,
      ...(it.description ? { description: it.description } : {}),
    })),
  };
}

export function IntentBreadcrumbs({ trail }: { trail: Crumb[] }) {
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, ...trail];
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${SITE}${c.href}` } : {}),
    })),
  };
  return (
    <>
      <JsonLd data={ld} />
      <nav aria-label="Breadcrumb" className="mb-10">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-white/45">
          {crumbs.map((c, i) => (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-white/25" aria-hidden />}
              {c.href && i < crumbs.length - 1 ? (
                <Link href={c.href} className="hover:text-[#0096FF] transition">
                  {c.label}
                </Link>
              ) : (
                <span
                  aria-current={i === crumbs.length - 1 ? "page" : undefined}
                  className="text-white/75"
                >
                  {c.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

export function ReviewedStamp() {
  return (
    <p className="mt-6 inline-flex items-center gap-2 text-xs text-white/40 border border-white/10 rounded-full px-4 py-1.5">
      <CalendarCheck className="w-3.5 h-3.5 text-[#0096FF]" />
      Last reviewed: October 2026
    </p>
  );
}

export function HeroCtas() {
  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#0096FF] text-white font-bold text-lg hover:bg-[#0077d6] transition shadow-[0_8px_32px_rgba(0,150,255,0.35)]"
      >
        Explore WorldEye <ArrowRight className="w-5 h-5" />
      </Link>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/15 text-white/85 font-semibold hover:border-[#0096FF]/50 hover:bg-white/5 transition"
      >
        Unlock WorldEye PRO
      </Link>
    </div>
  );
}

export function MidCta({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="mt-16 max-w-3xl mx-auto rounded-3xl border border-[#0096FF]/25 bg-[#0096FF]/[0.06] p-8 md:p-10 text-center">
      <h2 className="text-xl md:text-2xl font-bold">{heading}</h2>
      <p className="text-white/55 mt-3 mb-7 leading-relaxed">{body}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-[#0096FF] text-white font-bold hover:bg-[#0077d6] transition"
        >
          Explore WorldEye <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-white/15 text-white/85 font-semibold hover:border-[#0096FF]/50 hover:bg-white/5 transition"
        >
          Unlock WorldEye PRO
        </Link>
      </div>
    </div>
  );
}

export function IntentShell({ jsonLd, children }: { jsonLd: unknown; children: ReactNode }) {
  return (
    <main className="docs-root min-h-screen bg-[#050810] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#0096FF]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>
      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono tracking-[0.3em] text-[#0096FF]">
              WORLDEYE
            </span>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>
        {children}
      </div>
      <SiteFooter />
    </main>
  );
}
