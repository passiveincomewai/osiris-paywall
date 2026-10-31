import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { publicApiEnabled } from "@/lib/developer/flag";
import { API_TIER_LIMITS, type ApiTier } from "@/lib/developer/limits";

/**
 * /developers — the public developer API reference.
 *
 * Dark with the platform: notFound() while PUBLIC_API_ENABLED is off,
 * and developerPublicPaths() keeps it out of the sitemap until then.
 * The rate-limit ladder below renders from API_TIER_LIMITS — the same
 * table the API enforces — so this page cannot drift from the truth.
 */

export const metadata: Metadata = {
  title: "WorldEye API for Developers",
  description:
    "Search the WorldEye live camera catalogue and earthquake feed from your own code or AI tools. Free keys, plan-based limits, REST and MCP.",
  alternates: { canonical: "/developers" },
};

const BASE = "https://worldeye.app";

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl bg-black/50 border border-white/10 px-4 py-3 text-[13px] leading-relaxed text-white/85">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({
  method,
  path,
  children,
}: {
  method: string;
  path: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="px-2 py-0.5 rounded-md bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-black tracking-wider">
          {method}
        </span>
        <code className="text-sm font-bold text-white">{path}</code>
      </div>
      <div className="mt-3 text-sm text-white/60 space-y-2">{children}</div>
    </div>
  );
}

const LADDER_ORDER: ApiTier[] = ["free", "lite", "pro", "ultra", "enterprise"];

export default function DevelopersPage() {
  if (!publicApiEnabled()) notFound();
  return (
    <div className="docs-root min-h-screen bg-[#05070d] text-white">
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <p className="text-[11px] font-black tracking-[0.2em] text-[#D4AF37]">
          WORLDEYE FOR DEVELOPERS
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">
          The live camera catalogue, as an API
        </h1>
        <p className="mt-4 text-base text-white/65 leading-relaxed">
          Search tens of thousands of public cameras — the ones cleared for
          redistribution, with the operating agency credited on every record —
          and the USGS earthquake feed, from your own code or from an AI agent
          over MCP. Read-only, key-authenticated, with a free tier you can
          start on in under a minute.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/settings/api-keys"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            Get an API key
          </Link>
          <a
            href="#mcp"
            className="px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
          >
            Connect an AI agent (MCP)
          </a>
        </div>

        <h2 className="mt-12 text-xl font-black">Quickstart</h2>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">
          1. Sign in and create a key in{" "}
          <Link href="/settings/api-keys" className="text-[#D4AF37] font-semibold hover:underline">
            Account Settings → API keys
          </Link>
          . The key (it starts <code className="text-white/85">wek_</code>) is shown once —
          store it somewhere safe. 2. Send it on every request, either as a
          bearer token or in the <code className="text-white/85">X-Api-Key</code> header:
        </p>
        <Code>{`curl "${BASE}/api/v1/cameras?country=Japan&limit=5" \\
  -H "Authorization: Bearer wek_YOUR_KEY"`}</Code>
        <p className="mt-3 text-sm text-white/60">
          Every response carries <code className="text-white/85">X-RateLimit-Limit</code>,{" "}
          <code className="text-white/85">X-RateLimit-Remaining</code> and{" "}
          <code className="text-white/85">X-RateLimit-Reset</code> headers for your plan&apos;s
          daily quota.
        </p>

        <h2 className="mt-12 text-xl font-black">Endpoints</h2>

        <Endpoint method="GET" path="/api/v1/cameras">
          <p>Search the redistribution-cleared camera catalogue.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><code className="text-white/85">q</code> — text match over name, city, country and source</li>
            <li><code className="text-white/85">country</code> — a full country name (&quot;Japan&quot;) or ISO alpha-2 code (&quot;JP&quot;)</li>
            <li><code className="text-white/85">kind</code> — <code className="text-white/85">video</code>, <code className="text-white/85">snapshot</code>, <code className="text-white/85">embed</code> or <code className="text-white/85">link</code></li>
            <li><code className="text-white/85">near=&lt;lat&gt;,&lt;lng&gt;</code> or <code className="text-white/85">place=&lt;name&gt;</code> — radius search, nearest first; <code className="text-white/85">radius_km</code> defaults to 50 (max 500)</li>
            <li><code className="text-white/85">limit</code> (default 20, max 100) and <code className="text-white/85">offset</code> paginate the filtered set</li>
          </ul>
        </Endpoint>

        <Endpoint method="GET" path="/api/v1/cameras/<id>">
          <p>
            One camera by id. A camera outside the cleared catalogue is a 404,
            exactly as if it didn&apos;t exist.
          </p>
        </Endpoint>

        <Endpoint method="GET" path="/api/v1/cameras/<id>/snapshot">
          <p>
            The camera&apos;s current still: a 302 redirect to the snapshot URL the
            detail payload carries. Stream-only cameras answer 404 with the reason.
          </p>
        </Endpoint>

        <Endpoint method="GET" path="/api/v1/earthquakes">
          <p>
            The site&apos;s earthquake layer: USGS magnitude 2.5+ events from the
            last 24 hours (US federal public-domain data).{" "}
            <code className="text-white/85">limit</code> caps the list (max 500).
          </p>
        </Endpoint>

        <Endpoint method="GET" path="/api/v1/usage">
          <p>
            Your key&apos;s plan tier, limits and today&apos;s usage. Checking usage
            does not consume quota.
          </p>
        </Endpoint>

        <h2 className="mt-12 text-xl font-black">The camera object</h2>
        <Code>{`{
  "id": "…",
  "name": "…",
  "city": "…",
  "country": "…",
  "lat": 35.681,
  "lng": 139.767,
  "snapshotUrl": "${BASE}/api/cctv/frame?id=…",   // null for stream-only cameras
  "watchUrl": "${BASE}/?camera=…",                // opens the camera on the globe
  "attribution": "… via WorldEye",                // credit this agency
  "source": "…"
}`}</Code>
        <p className="mt-3 text-sm text-white/60 leading-relaxed">
          The API serves metadata, snapshots and deep links — watching a camera
          live happens on WorldEye, through its <code className="text-white/85">watchUrl</code>.
          Every record carries the operating agency in{" "}
          <code className="text-white/85">attribution</code>; keep that credit wherever
          you display the data.
        </p>

        <h2 id="rate-limits" className="mt-12 text-xl font-black scroll-mt-24">
          Rate limits
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Limits follow the key owner&apos;s WorldEye plan and reset at UTC
          midnight. One ladder, enforced identically on REST and MCP:
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/45">
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Requests / day</th>
                <th className="px-5 py-3 font-semibold">Burst / minute</th>
              </tr>
            </thead>
            <tbody>
              {LADDER_ORDER.map((tier) => {
                const limits = API_TIER_LIMITS[tier];
                return (
                  <tr key={tier} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 font-bold">{limits.planLabel}</td>
                    <td className="px-5 py-3 text-white/70">
                      {limits.dailyRequests.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-white/70">{limits.requestsPerMinute}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-white/60">
          Over the daily quota the API answers{" "}
          <code className="text-white/85">429 daily_quota_exceeded</code>; over the burst
          limit, <code className="text-white/85">429 rate_limited</code> — both with a{" "}
          <code className="text-white/85">Retry-After</code> header. Errors everywhere share
          one shape: <code className="text-white/85">{`{ "error": { "code", "message" } }`}</code>.
        </p>

        <h2 id="mcp" className="mt-12 text-xl font-black scroll-mt-24">
          MCP — for AI agents
        </h2>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">
          The same catalogue is a Model Context Protocol server (Streamable
          HTTP) at <code className="text-white/85">{BASE}/api/v1/mcp</code>. Configure your
          MCP client with that URL and your key as a header — the key never
          travels as a tool argument:
        </p>
        <Code>{`{
  "mcpServers": {
    "worldeye": {
      "url": "${BASE}/api/v1/mcp",
      "headers": { "Authorization": "Bearer wek_YOUR_KEY" }
    }
  }
}`}</Code>
        <ul className="mt-4 list-disc pl-5 text-sm text-white/60 space-y-1">
          <li><code className="text-white/85">search_cameras</code> — text, country and kind search</li>
          <li><code className="text-white/85">get_camera</code> — one camera by id</li>
          <li><code className="text-white/85">cameras_near</code> — radius search around coordinates or a named place</li>
          <li><code className="text-white/85">latest_earthquakes</code> — the USGS M2.5+ feed, last 24 hours</li>
          <li><code className="text-white/85">get_usage</code> — the calling key&apos;s tier and remaining quota</li>
        </ul>

        <h2 className="mt-12 text-xl font-black">Fair use</h2>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">
          The catalogue only contains cameras whose operators clear them for
          redistribution, and a source can be withdrawn — when it is, its
          cameras leave the API at once. Credit each camera&apos;s listed source,
          don&apos;t re-present snapshots as a live video feed, and cache politely:
          responses are cacheable for a minute and snapshots change on the
          operator&apos;s schedule, not yours. Keys are per-user; a revoked key stops
          working immediately.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
