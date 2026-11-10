import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import AdminNav from "../AdminNav";
import {
  getClarityInsights,
  CLARITY_DASHBOARD_URL,
  CLARITY_PROJECT_ID,
} from "@/lib/clarity/insights";

/**
 * Microsoft Clarity — admin view of the Clarity Data Export API.
 *
 * Gating mirrors the other admin pages (session + ADMIN_EMAILS). When
 * CLARITY_API_TOKEN is not configured the page renders a setup state
 * instead of calling the API; when it is configured, summaries come from
 * getClarityInsights(), which caches the rate-limited export API for 6h
 * server-side. The token never reaches the client.
 */
export const metadata = { title: "Clarity — Admin" };
export const dynamic = "force-dynamic";

function DashboardButton() {
  return (
    <a
      href={CLARITY_DASHBOARD_URL}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center px-5 py-3 rounded-lg bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 transition"
    >
      Open the Clarity dashboard ↗
    </a>
  );
}

export default async function ClarityAdminPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) redirect("/admin/login?callbackUrl=/admin/clarity");
  if (!adminEmails().includes(email)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#050810" }}>
        <div className="max-w-md text-center rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white">Admin access only</h1>
          <p className="text-sm text-white/50 mt-3 leading-relaxed">
            Signed in as <span className="text-white/80 font-mono">{email}</span>, which is not an admin.
          </p>
          <Link href="/" className="inline-block mt-6 text-sm text-cyan-300 hover:underline">← Back to site</Link>
        </div>
      </div>
    );
  }

  const insights = await getClarityInsights();

  return (
    <div className="docs-root min-h-screen p-4 md:p-8" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #0a1a33 0%, #050810 55%, #03040a 100%)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase">WorldEye Ops</div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Microsoft Clarity</h1>
            <p className="text-xs text-white/40 mt-1">
              Session-recording insights for project {CLARITY_PROJECT_ID} · Signed in as {email}
            </p>
          </div>
          <AdminNav active="clarity" />
        </div>

        {!insights.configured ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8 max-w-3xl">
            <h2 className="text-lg font-bold text-white">Connect the Clarity Data Export API</h2>
            <p className="text-sm text-white/60 mt-3 leading-relaxed">
              This page can show live Clarity summaries (sessions, rage clicks, dead clicks, scroll
              depth and more) once an API token is configured. Until then, everything Clarity
              collects is one click away in the dashboard.
            </p>
            <ol className="list-decimal list-inside text-sm text-white/70 mt-4 space-y-2 leading-relaxed">
              <li>
                In Clarity, open <span className="text-white">Settings → Data Export</span> and create
                an API token for project <span className="font-mono text-white">{CLARITY_PROJECT_ID}</span>.
              </li>
              <li>
                Add it in Vercel as the environment variable{" "}
                <span className="font-mono text-white">CLARITY_API_TOKEN</span> and redeploy.
              </li>
              <li>Reload this page — the summaries will appear here automatically.</li>
            </ol>
            <div className="mt-6">
              <DashboardButton />
            </div>
          </div>
        ) : !insights.ok ? (
          <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.05] p-6 md:p-8 max-w-3xl">
            <h2 className="text-lg font-bold text-white">Clarity API did not return data</h2>
            <p className="text-sm text-rose-100/70 mt-3 leading-relaxed">{insights.error}</p>
            <div className="mt-6">
              <DashboardButton />
            </div>
          </div>
        ) : (
          <>
            {insights.cards.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8 max-w-3xl">
                <h2 className="text-lg font-bold text-white">No metrics returned</h2>
                <p className="text-sm text-white/60 mt-3 leading-relaxed">
                  The Clarity API responded but carried no readable metrics for the last 3 days.
                  The dashboard has the full picture.
                </p>
                <div className="mt-6">
                  <DashboardButton />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {insights.cards.map((c) => (
                  <div key={c.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="text-[11px] font-bold tracking-[0.18em] text-white/50 uppercase">{c.label}</div>
                    <div className="mt-2 text-3xl font-extrabold text-white">{c.value}</div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-white/40 mt-6 leading-relaxed">
              Last 3 days, as returned by the Clarity Data Export API. Responses are cached for 6
              hours — the API allows only about 10 requests per day per project.
            </p>
            <div className="mt-4">
              <DashboardButton />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
