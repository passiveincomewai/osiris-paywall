import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import { db } from "@/lib/db";
import { CAMERA_SUBMISSION_STATUSES } from "@/lib/camera-submissions";
import SubmissionsQueue, { type CameraSubmissionView } from "./SubmissionsQueue";
import AdminNav from "../AdminNav";

export const metadata = { title: "Camera Submissions — Admin" };
export const dynamic = "force-dynamic";

const PAGE_LIMIT = 200;
// Filter values are exactly the model's statuses, plus "all" — derived
// from the shared list so the two can't drift apart.
const FILTERS = [...CAMERA_SUBMISSION_STATUSES, "all"] as const;
type Filter = (typeof FILTERS)[number];

export default async function CameraSubmissionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
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

  const { status } = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(status ?? "")
    ? (status as Filter)
    : "pending";
  const where = filter === "all" ? {} : { status: filter };

  // A failed queue read (transient database trouble) must not 500 the
  // page: render the empty queue under a banner that says the read
  // failed, so the operator refreshes instead of debugging a crash.
  type Row = Awaited<ReturnType<typeof db.cameraSubmission.findMany>>[number];
  let rows: Row[] = [];
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let queueReadFailed = false;
  try {
    [rows, pending, approved, rejected] = await Promise.all([
      db.cameraSubmission.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE_LIMIT }),
      db.cameraSubmission.count({ where: { status: "pending" } }),
      db.cameraSubmission.count({ where: { status: "approved" } }),
      db.cameraSubmission.count({ where: { status: "rejected" } }),
    ]);
  } catch {
    queueReadFailed = true;
  }
  const counts: Record<Filter, number> = {
    pending,
    approved,
    rejected,
    all: pending + approved + rejected,
  };

  const initial: CameraSubmissionView[] = rows.map((s) => ({
    id: s.id,
    kind: s.kind,
    cameraName: s.cameraName,
    url: s.url,
    category: s.category,
    city: s.city,
    country: s.country,
    lat: s.lat,
    lng: s.lng,
    notes: s.notes,
    submitterName: s.submitterName,
    submitterEmail: s.submitterEmail,
    status: s.status,
    probeStatus: s.probeStatus,
    probeDetail: s.probeDetail,
    reviewerNotes: s.reviewerNotes,
    reviewedBy: s.reviewedBy,
    createdAt: s.createdAt.toISOString(),
    reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
    receiptEmailedAt: s.receiptEmailedAt ? s.receiptEmailedAt.toISOString() : null,
    decisionEmailedAt: s.decisionEmailedAt ? s.decisionEmailedAt.toISOString() : null,
  }));

  const tabCls = (f: Filter) =>
    `shrink-0 inline-flex items-center px-4 py-2.5 rounded-lg border text-sm transition ${
      filter === f
        ? "border-cyan-400/50 text-cyan-200 bg-cyan-400/10"
        : "border-white/15 text-white/70 hover:text-white"
    }`;

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white">Camera submissions</h1>
            <p className="text-sm text-white/45 mt-1 max-w-xl leading-relaxed">
              Cameras sent in from the /submit-camera form, newest first.{" "}
              {pending > 0 ? <span className="text-amber-300">{pending} waiting for review</span> : "None waiting for review"}.
              Approving a submission marks it <span className="text-white/70">cleared for import</span> — it does
              not add the camera to the map by itself; catalogue imports run as a separate step.
              {rows.length >= PAGE_LIMIT ? ` Showing the newest ${PAGE_LIMIT}.` : ""}
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link href="/submit-camera" className="inline-flex items-center px-4 py-2.5 rounded-lg border border-white/15 text-white/70 hover:text-white">View form</Link>
          </div>
        </div>

        <div className="mb-5">
          <AdminNav active="camera-submissions" />
        </div>

        {queueReadFailed && (
          <div className="mb-8 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-5 text-sm leading-relaxed text-amber-100/85">
            <strong className="text-amber-200">Couldn&apos;t read the submission queue.</strong>{" "}
            The database read failed just now, so the counts and list below are
            empty rather than current. Submissions are still being accepted on
            the public form — refresh in a moment to try the read again.
          </div>
        )}

        <nav aria-label="Filter by status" className="flex gap-2 mb-8 overflow-x-auto -mx-4 px-4 pb-1">
          {FILTERS.map((f) => (
            <Link key={f} href={f === "pending" ? "/admin/camera-submissions" : `/admin/camera-submissions?status=${f}`} className={tabCls(f)}>
              {f === "all" ? "All" : f[0].toUpperCase() + f.slice(1)} · {counts[f]}
            </Link>
          ))}
        </nav>

        <SubmissionsQueue initial={initial} filter={filter} />
      </div>
    </div>
  );
}
