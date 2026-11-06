import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import { db } from "@/lib/db";
import { cameraRequestStatusLabel } from "@/lib/camera-requests";
import AdminNav from "../AdminNav";

export const metadata = { title: "Camera Requests — Admin" };
export const dynamic = "force-dynamic";

const PAGE_LIMIT = 200;

function fmtDate(d: Date): string {
  return d.toLocaleString("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function CameraRequestsAdminPage() {
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

  const [rows, total, newCount, topPlaces] = await Promise.all([
    db.cameraRequest.findMany({ orderBy: { createdAt: "desc" }, take: PAGE_LIMIT }),
    db.cameraRequest.count(),
    db.cameraRequest.count({ where: { status: "new" } }),
    db.cameraRequest.groupBy({
      by: ["placeText"],
      _count: { placeText: true },
      orderBy: { _count: { placeText: "desc" } },
      take: 15,
    }),
  ]);

  return (
    <div className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white">Camera requests</h1>
            <p className="text-sm text-white/45 mt-1 max-w-xl leading-relaxed">
              Places visitors searched for and couldn&rsquo;t find — captured by &ldquo;Request this
              camera&rdquo; in the search and directory empty states. {total} total
              {newCount > 0 ? <>, <span className="text-amber-300">{newCount} new</span></> : ", none new"}.
              {total > PAGE_LIMIT ? ` Showing the newest ${PAGE_LIMIT}.` : ""} This is the demand
              signal for camera-source expansion; visitors who instead have a feed live in Camera
              submissions.
            </p>
          </div>
        </div>

        <div className="mb-8">
          <AdminNav active="camera-requests" />
        </div>

        {topPlaces.length > 0 && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-semibold text-white/85">Most requested places (exact text)</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {topPlaces.map((t) => (
                <span key={t.placeText} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/75">
                  {t.placeText}
                  <span className="font-mono text-[#ecd27a]">{t._count.placeText}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="text-sm text-white/50">No camera requests yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.08em] text-white/40">
                  <th className="px-4 py-3 font-medium">Place</th>
                  <th className="px-4 py-3 font-medium">Searched for</th>
                  <th className="px-4 py-3 font-medium">Notify email</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Requested</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0 text-white/75">
                    <td className="px-4 py-3 font-medium text-white/90">{r.placeText}</td>
                    <td className="px-4 py-3 text-white/50">{r.query ?? "—"}</td>
                    <td className="px-4 py-3 text-white/50">{r.email ?? "—"}</td>
                    <td className="px-4 py-3 text-white/50">{r.userId ? "Signed in" : "Anonymous"}</td>
                    <td className="px-4 py-3 text-white/50">{cameraRequestStatusLabel(r.status)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-white/50">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
