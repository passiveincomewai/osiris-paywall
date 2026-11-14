import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import { db } from "@/lib/db";
import AdminNav from "../AdminNav";
import CampaignCreateForm from "./CampaignCreateForm";

/**
 * Email Campaigns — owner-run outreach campaigns (bulk recipients,
 * batched Resend sending via the tick cron). Gating mirrors the other
 * admin pages (session + ADMIN_EMAILS).
 */
export const metadata = { title: "Email Campaigns — Admin" };
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  draft: "border-white/20 text-white/60",
  sending: "border-emerald-400/40 text-emerald-300 bg-emerald-400/10",
  paused: "border-amber-400/40 text-amber-300 bg-amber-400/10",
  stopped: "border-red-400/40 text-red-300 bg-red-400/10",
  completed: "border-cyan-400/40 text-cyan-200 bg-cyan-400/10",
};

export default async function CampaignsAdminPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) redirect("/admin/login?callbackUrl=/admin/campaigns");
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

  const campaigns = await db.emailCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { recipients: true } } },
  });
  const grouped = await db.campaignRecipient.groupBy({
    by: ["campaignId", "status"],
    _count: { _all: true },
  });
  const countsByCampaign = new Map<string, Record<string, number>>();
  for (const row of grouped) {
    const entry = countsByCampaign.get(row.campaignId) ?? {};
    entry[row.status] = row._count._all;
    countsByCampaign.set(row.campaignId, entry);
  }

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Email Campaigns</h1>
            <p className="text-sm text-white/50 mt-1">
              Bulk outreach from <span className="font-mono text-white/70">hello@outreach.worldeye.app</span>, sent in
              small batches by the tick cron under the warm-up ramp.{" "}
              <Link href="/admin/campaigns/suppressions" className="text-cyan-300 hover:underline">
                Suppression list →
              </Link>
            </p>
          </div>
          <AdminNav active="campaigns" />
        </div>

        <div className="grid gap-4 mb-10">
          {campaigns.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/50 text-sm">
              No campaigns yet — create the first one below.
            </div>
          )}
          {campaigns.map((c) => {
            const counts = countsByCampaign.get(c.id) ?? {};
            return (
              <Link
                key={c.id}
                href={`/admin/campaigns/${c.id}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-cyan-400/40 transition"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-white font-semibold">{c.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[c.status] ?? STATUS_STYLES.draft}`}
                  >
                    {c.status}
                  </span>
                  <span className="text-xs text-white/40 ml-auto">
                    {c.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div className="text-sm text-white/50 mt-1 truncate">{c.subject || "(no subject)"}</div>
                <div className="text-xs text-white/40 mt-2">
                  {c._count.recipients} recipients · {counts.sent ?? 0} sent · {counts.pending ?? 0} pending ·{" "}
                  {counts.failed ?? 0} failed · {counts.suppressed ?? 0} suppressed
                  {c.dailyCap ? ` · cap ${c.dailyCap}/day` : " · ramp cap"}
                </div>
              </Link>
            );
          })}
        </div>

        <CampaignCreateForm />
      </div>
    </div>
  );
}
