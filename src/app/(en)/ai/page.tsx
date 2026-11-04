import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { AI_ENGINES } from "@/lib/ai-engines";

/**
 * /ai — hub for the per-engine pages. Two honest groups: assistants a
 * user can connect WorldEye's MCP server to today, and answer engines
 * where WorldEye is a cited source (there is no integration programme
 * to join — the pages say so rather than implying one).
 */

export const metadata: Metadata = {
  title: "WorldEye in AI assistants — ChatGPT, Claude, Perplexity & more",
  description:
    "How WorldEye works with each major AI assistant and answer engine: where you can connect the live camera catalogue over MCP today, and where WorldEye is a cited source. Status stated plainly per engine.",
  alternates: { canonical: "/ai" },
};

const connect = AI_ENGINES.filter((e) => e.group === "connect");
const ask = AI_ENGINES.filter((e) => e.group === "ask");

function EngineCard({ slug, name, vendor, blurb }: { slug: string; name: string; vendor: string; blurb: string }) {
  return (
    <Link
      href={`/ai/${slug}`}
      className="block rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:bg-white/[0.05] transition"
    >
      <p className="text-base font-black text-white">{name}</p>
      <p className="text-xs font-semibold text-white/40">{vendor}</p>
      <p className="mt-2 text-sm text-white/60 leading-relaxed">{blurb}</p>
    </Link>
  );
}

const BLURBS: Record<string, string> = {
  mistral:
    "The one major assistant whose custom connectors take an API-token header — WorldEye's key format. Connectable today, step by step.",
  claude:
    "MCP is Anthropic's own protocol. Connect via Claude Code, Claude Desktop or a custom connector now; the directory listing is staged.",
  chatgpt:
    "ChatGPT already finds and cites WorldEye in web search — measured weekly (5 of 28 standard questions, Nov 2 2026). The app-directory route is staged, and the page says why.",
  perplexity:
    "No connector programme exists — Perplexity is a citation game. How WorldEye's pages earn the citation.",
  gemini:
    "Google's AI grounds on the Search index. No integration to join; the work is being the page worth citing.",
  copilot:
    "Copilot grounds on Bing, where WorldEye ranks top-5 for “god's eye view” in our own Webmaster data.",
  grok: "Grok searches the live web at question time. Fresh, sourced event coverage is the whole strategy.",
  "meta-ai": "No third-party programme exists. Visibility through web-sourced answers, in the apps people already use.",
  duckduckgo: "A private answer front-end over search results. The index is the entire relationship — and the fit is good.",
  brave: "Brave's index is independent of Google and Bing. Young sites are judged on the page, which suits us.",
  "you-com": "The most agent-native answer engine. No inbound listing — but our llms.txt and registry-listed MCP server are built for its ecosystem.",
};

export default function AiHubPage() {
  return (
    <div className="docs-root min-h-screen bg-[#05070d] text-white">
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <p className="text-[11px] font-black tracking-[0.2em] text-[#D4AF37]">
          WORLDEYE × AI ASSISTANTS
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">
          WorldEye in the AI assistants
        </h1>
        <p className="mt-4 text-base text-white/65 leading-relaxed">
          People increasingly meet WorldEye through an assistant rather than a
          search box. What that assistant can actually do with WorldEye differs
          sharply by engine — some can call our live camera tools directly,
          most can only cite our pages — and these pages refuse to blur the
          line. One page per engine: the real mechanism, the honest status,
          and the questions worth asking.
        </p>
        <p className="mt-4 text-base text-white/65 leading-relaxed">
          Underneath all of it sits one machine-readable surface: a read-only{" "}
          <Link href="/developers" className="text-[#D4AF37] font-semibold hover:underline">
            MCP server and developer API
          </Link>{" "}
          over the redistribution-cleared slice of the 74,229-camera globe —
          metadata, snapshots and watch links, never stream URLs or user data —
          listed in the official MCP Registry since November 4, 2026.
        </p>

        <h2 className="mt-12 text-xl font-black">Connect WorldEye today</h2>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">
          These assistants can call WorldEye's tools directly, with a free API
          key — no partnership, no approval, no listing required.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {connect.map((e) => (
            <EngineCard key={e.slug} slug={e.slug} name={e.name} vendor={e.vendor} blurb={BLURBS[e.slug]} />
          ))}
        </div>

        <h2 className="mt-12 text-xl font-black">Ask, and check the citations</h2>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">
          These engines run no third-party integration programme. WorldEye's
          route into their answers is being the source worth citing — each
          page explains that engine's version of the game, with our own
          measured numbers where we have them.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {ask.map((e) => (
            <EngineCard key={e.slug} slug={e.slug} name={e.name} vendor={e.vendor} blurb={BLURBS[e.slug]} />
          ))}
        </div>

        <h2 className="mt-12 text-xl font-black">One truth for every engine</h2>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">
          Whichever assistant you use: browsing worldeye.app is free, no
          account needed to look around; unlimited camera opens need an
          upgrade (Lite $8.99/mo · Pro $13.99/mo · Ultra $24.99/mo on monthly
          billing). The API's free key is separate from all of that — 100
          requests a day, created in Account Settings → API keys.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
