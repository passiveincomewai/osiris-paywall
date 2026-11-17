import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import { db } from "@/lib/db";
import AdminNav from "../../AdminNav";
import CampaignDetail from "./CampaignDetail";

export const metadata = { title: "Campaign — Admin" };
export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) redirect(`/admin/login?callbackUrl=/admin/campaigns/${id}`);
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

  const campaign = await db.emailCampaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  const grouped = await db.campaignRecipient.groupBy({
    by: ["status"],
    where: { campaignId: id },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of grouped) {
    counts[row.status] = row._count._all;
    total += row._count._all;
  }
  const recipients = await db.campaignRecipient.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return (
    <div className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Link href="/admin/campaigns" className="text-sm text-cyan-300 hover:underline">
              ← All campaigns
            </Link>
            <h1 className="text-2xl font-bold text-white mt-1">{campaign.name}</h1>
            <p className="text-sm text-white/50 mt-1">
              From {campaign.fromName} &lt;{campaign.fromEmail}&gt; ·{" "}
              <Link href="/admin/campaigns/suppressions" className="text-cyan-300 hover:underline">
                Suppression list →
              </Link>
            </p>
          </div>
          <AdminNav active="campaigns" />
        </div>

        <CampaignDetail
          campaign={{
            id: campaign.id,
            name: campaign.name,
            subject: campaign.subject,
            bodyText: campaign.bodyText,
            bodyHtml: campaign.bodyHtml,
            fromName: campaign.fromName,
            fromEmail: campaign.fromEmail,
            status: campaign.status,
            dailyCap: campaign.dailyCap,
          }}
          counts={counts}
          total={total}
          recipients={recipients.map((r) => ({
            id: r.id,
            email: r.email,
            status: r.status,
            meta: (r.meta ?? {}) as Record<string, unknown>,
            error: r.error,
            sentAt: r.sentAt?.toISOString() ?? null,
          }))}
        />
      </div>
    </div>
  );
}
