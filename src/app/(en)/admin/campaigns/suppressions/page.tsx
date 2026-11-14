import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import { db } from "@/lib/db";
import AdminNav from "../../AdminNav";
import SuppressionAddForm from "./SuppressionAddForm";

/**
 * Campaign suppression list — addresses that must never receive
 * campaign email. Checked at bulk-add time and again at send time.
 */
export const metadata = { title: "Suppressions — Admin" };
export const dynamic = "force-dynamic";

export default async function SuppressionsAdminPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) redirect("/admin/login?callbackUrl=/admin/campaigns/suppressions");
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

  const suppressions = await db.emailSuppression.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Link href="/admin/campaigns" className="text-sm text-cyan-300 hover:underline">
              ← Email Campaigns
            </Link>
            <h1 className="text-2xl font-bold text-white mt-1">Suppression list</h1>
            <p className="text-sm text-white/50 mt-1">
              {suppressions.length} address{suppressions.length === 1 ? "" : "es"} — never emailed by any campaign.
            </p>
          </div>
          <AdminNav active="campaigns" />
        </div>

        <SuppressionAddForm />

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 mt-6">
          {suppressions.length === 0 ? (
            <p className="text-sm text-white/40">No suppressed addresses yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/40 border-b border-white/10">
                    <th className="py-2 pr-3 font-medium">Email</th>
                    <th className="py-2 pr-3 font-medium">Reason</th>
                    <th className="py-2 font-medium">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {suppressions.map((s) => (
                    <tr key={s.id} className="border-b border-white/5 text-white/70">
                      <td className="py-2 pr-3 font-mono text-xs">{s.email}</td>
                      <td className="py-2 pr-3">{s.reason || "—"}</td>
                      <td className="py-2 text-white/40">
                        {s.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
