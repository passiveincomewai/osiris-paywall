import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import {
  AI_ENGINES,
  AI_ENGINE_BY_SLUG,
  AI_ENGINE_LIMITS,
  AI_ENGINE_QUOTAS,
  type AiEngine,
} from "@/lib/ai-engines";

/**
 * /ai/<engine> — per-AI-engine pages. One dynamic route over
 * lib/ai-engines; the content rules live with the registry (real
 * mechanisms only, staged submissions stated as staged, locked facts).
 */

export function generateStaticParams() {
  return AI_ENGINES.map((e) => ({ engine: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ engine: string }>;
}): Promise<Metadata> {
  const { engine } = await params;
  const e = AI_ENGINE_BY_SLUG[engine];
  if (!e) return {};
  return {
    title: e.title,
    description: e.description,
    alternates: { canonical: `/ai/${e.slug}` },
  };
}

function Code({ label, children }: { label?: string; children: string }) {
  return (
    <div className="mt-4">
      {label ? (
        <p className="text-xs font-bold tracking-wide text-white/45">{label}</p>
      ) : null}
      <pre className="mt-2 overflow-x-auto rounded-xl bg-black/50 border border-white/10 px-4 py-3 text-[13px] leading-relaxed text-white/85">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default async function AiEnginePage({
  params,
}: {
  params: Promise<{ engine: string }>;
}) {
  const { engine } = await params;
  const e: AiEngine | undefined = AI_ENGINE_BY_SLUG[engine];
  if (!e) notFound();

  const others = AI_ENGINES.filter((o) => o.slug !== e.slug);

  return (
    <div className="docs-root min-h-screen bg-[#05070d] text-white">
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <p className="text-[11px] font-black tracking-[0.2em] text-[#D4AF37]">
          <Link href="/ai" className="hover:underline">
            WORLDEYE × AI ASSISTANTS
          </Link>{" "}
          · {e.vendor.toUpperCase()}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">{e.h1}</h1>
        {e.intro.map((p, i) => (
          <p key={i} className="mt-4 text-base text-white/65 leading-relaxed">
            {p}
          </p>
        ))}
        <div className="mt-6 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.06] p-5">
          <p className="text-sm text-white/80 leading-relaxed">{e.statusLine}</p>
        </div>

        <h2 className="mt-12 text-xl font-black">{e.connectHeading}</h2>
        {e.connectBody.map((p, i) => (
          <p key={i} className="mt-3 text-sm text-white/60 leading-relaxed">
            {p}
          </p>
        ))}
        {e.connectSteps ? (
          <ol className="mt-4 list-decimal pl-5 text-sm text-white/70 space-y-2">
            {e.connectSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        ) : null}
        {e.connectCode ? <Code label={e.connectCodeLabel}>{e.connectCode}</Code> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/settings/api-keys"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            Get a free API key
          </Link>
          <Link
            href="/developers"
            className="px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
          >
            Developer docs (API + MCP)
          </Link>
        </div>

        <h2 className="mt-12 text-xl font-black">What {e.name} can do with WorldEye</h2>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">{e.capabilitiesIntro}</p>
        <ul className="mt-3 list-disc pl-5 text-sm text-white/60 space-y-1.5">
          {e.capabilities.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>

        <h2 className="mt-12 text-xl font-black">What it can't do — on any engine</h2>
        <ul className="mt-3 list-disc pl-5 text-sm text-white/60 space-y-1.5">
          {AI_ENGINE_LIMITS.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-white/60 leading-relaxed">{AI_ENGINE_QUOTAS}</p>

        <h2 className="mt-12 text-xl font-black">{e.promptsHeading}</h2>
        <div className="mt-4 space-y-2.5">
          {e.prompts.map((p, i) => (
            <p
              key={i}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/75"
            >
              “{p}”
            </p>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-black">Other assistants</h2>
        <p className="mt-3 text-sm text-white/60 leading-relaxed">
          {others.map((o, i) => (
            <span key={o.slug}>
              {i > 0 ? " · " : ""}
              <Link href={`/ai/${o.slug}`} className="text-[#D4AF37] hover:underline">
                {o.name}
              </Link>
            </span>
          ))}{" "}
          — or the{" "}
          <Link href="/ai" className="text-[#D4AF37] hover:underline">
            full index
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
