import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import { db } from "@/lib/db";
import PartnershipInbox, { type PartnershipApplicationView } from "./PartnershipInbox";
import AdminNav from "../AdminNav";
import { PARTNERSHIP_STATUSES, PARTNERSHIP_TYPES } from "@/lib/partners";

export const metadata = { title: "Partnerships — Admin" };
export const dynamic = "force-dynamic";

const PAGE_LIMIT = 200;

export default async function PartnershipsAdminPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) redirect("/admin/login");
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

  const [rows, total, fresh] = await Promise.all([
    db.partnershipApplication.findMany({ orderBy: { createdAt: "desc" }, take: PAGE_LIMIT }),
    db.partnershipApplication.count(),
    db.partnershipApplication.count({ where: { status: "new" } }),
  ]);

  const initial: PartnershipApplicationView[] = rows.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    company: a.company,
    website: a.website,
    type: a.type,
    audienceSize: a.audienceSize,
    resources: a.resources,
    seeking: a.seeking,
    proposal: a.proposal,
    opportunity: a.opportunity,
    status: a.status,
    adminNotes: a.adminNotes,
    nextFollowUpAt: a.nextFollowUpAt ? a.nextFollowUpAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <div className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white">Partnership applications</h1>
            <p className="text-sm text-white/45 mt-1 max-w-xl leading-relaxed">
              Proposals sent from the /partners form, newest first. {total} total
              {fresh > 0 ? <>, <span className="text-amber-300">{fresh} new</span></> : ", none new"}.
              {total > PAGE_LIMIT ? ` Showing the newest ${PAGE_LIMIT}.` : ""} Work each one with a
              status, private notes and a follow-up date — replying happens from your own inbox
              (the Reply button opens a mailto to the applicant).
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link href="/partners" className="inline-flex items-center px-4 py-2.5 rounded-lg border border-white/15 text-white/70 hover:text-white">View page</Link>
          </div>
        </div>

        <div className="mb-8">
          <AdminNav active="partnerships" />
        </div>

        <PartnershipInbox
          initial={initial}
          types={PARTNERSHIP_TYPES.map((t) => ({ value: t.value as string, label: t.label as string }))}
          statuses={PARTNERSHIP_STATUSES.map((s) => ({ value: s.value as string, label: s.label as string }))}
        />
      </div>
    </div>
  );
}
