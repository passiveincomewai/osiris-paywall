import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { adminEmails } from "@/lib/affiliate/admin";
import { planNameByPriceId } from "@/lib/billing/plans";
import AdminNav from "../AdminNav";

export const metadata = { title: "Accounts — Admin" };
export const dynamic = "force-dynamic";

// Server-side pagination so every account stays reachable (the dashboard
// card only showed the total count, and its Users section the newest 8).
const PAGE_SIZE = 50;

/** planNameByPriceId values → admin display labels. Pro-grid prices resolve
 *  to bare period names ("weekly"), Lite/Ultra to PlanKeys ("lite_weekly"),
 *  standalone products to "enterprise" | "ambient" | "ski". */
function planLabel(raw: string | undefined): string {
  if (!raw) return "—";
  const standalone: Record<string, string> = {
    enterprise: "Enterprise",
    ambient: "Ambient",
    ski: "Powder Pass",
  };
  if (standalone[raw]) return standalone[raw];
  const tiers: Record<string, string> = { lite: "Lite", pro: "Pro", ultra: "Ultra" };
  const periods: Record<string, string> = { weekly: "Weekly", monthly: "Monthly", annual: "Annual" };
  if (periods[raw]) return `Pro · ${periods[raw]}`;
  const [tier, period] = raw.split("_");
  if (tier && period && tiers[tier] && periods[period]) return `${tiers[tier]} · ${periods[period]}`;
  return raw;
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function fmtDenver(d: Date): string {
  return d.toLocaleString("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDenverDay(d: Date): string {
  return d.toLocaleDateString("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
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

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const pageReq = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const total = await db.user.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageReq, pageCount);

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      emailOptOut: true,
      createdAt: true,
      subscription: {
        select: { status: true, stripePriceId: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
      },
    },
  });

  const priceNames = planNameByPriceId(process.env);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  const pageHref = (p: number) => `/admin/accounts?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) }).toString()}`;

  return (
    <div className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white">Accounts</h1>
            <p className="text-sm text-white/45 mt-1 max-w-xl leading-relaxed">
              Every WorldEye account, newest signup first. {total.toLocaleString("en-US")} total
              {q ? <> matching “{q}”</> : null}. Times in Denver time.
            </p>
          </div>
        </div>

        <div className="mb-8">
          <AdminNav active="accounts" />
        </div>

        {/* Search — plain GET form, no client JS. */}
        <form method="get" action="/admin/accounts" className="flex gap-2 mb-5">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name or email…"
            className="flex-1 min-w-0 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-cyan-400/50"
          />
          <button
            type="submit"
            className="shrink-0 inline-flex items-center px-4 py-3 rounded-lg border border-cyan-400/40 text-cyan-200 bg-cyan-400/10 text-sm hover:bg-cyan-400/20"
          >
            Search
          </button>
          {q ? (
            <Link
              href="/admin/accounts"
              className="shrink-0 inline-flex items-center px-4 py-3 rounded-lg border border-white/15 text-white/70 text-sm hover:text-white"
            >
              Clear
            </Link>
          ) : null}
        </form>

        <div className="space-y-3">
          {users.map((u) => {
            const sub = u.subscription;
            return (
              <div key={u.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0">
                    <div className="text-white font-semibold truncate">{u.name?.trim() || "—"}</div>
                    <div className="text-sm text-white/60 font-mono break-all">{u.email ?? "—"}</div>
                  </div>
                  {u.emailVerified ? (
                    <span className="shrink-0 text-[11px] font-bold tracking-wide uppercase rounded-full border border-emerald-400/30 text-emerald-300 px-2.5 py-1">
                      Verified
                    </span>
                  ) : (
                    <span className="shrink-0 text-[11px] font-bold tracking-wide uppercase rounded-full border border-amber-400/30 text-amber-300 px-2.5 py-1">
                      Unverified
                    </span>
                  )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-[11px] font-bold tracking-[0.14em] text-white/35 uppercase">Signed up</dt>
                    <dd className="text-white/75 mt-0.5">{fmtDenver(u.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold tracking-[0.14em] text-white/35 uppercase">Plan</dt>
                    <dd className="text-white/75 mt-0.5">{sub ? planLabel(priceNames[sub.stripePriceId]) : "Free"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold tracking-[0.14em] text-white/35 uppercase">Subscription</dt>
                    <dd className="text-white/75 mt-0.5 capitalize">{sub ? statusLabel(sub.status) : "none"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold tracking-[0.14em] text-white/35 uppercase">
                      {sub?.status === "trialing" ? "Trial ends" : "Period ends"}
                    </dt>
                    <dd className="text-white/75 mt-0.5">
                      {sub ? fmtDenverDay(sub.currentPeriodEnd) : "—"}
                      {sub?.cancelAtPeriodEnd ? <span className="text-amber-300/90"> · cancels</span> : null}
                    </dd>
                  </div>
                </dl>
                {u.emailOptOut ? (
                  <div className="mt-2 text-xs text-white/40">Opted out of marketing email</div>
                ) : null}
              </div>
            );
          })}
          {users.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/40">
              {q ? `No accounts match “${q}”.` : "No accounts yet."}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-white/40">
            {total === 0 ? "0 accounts" : `Showing ${from}–${to} of ${total.toLocaleString("en-US")}`} · Page {page} of {pageCount}
          </div>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="inline-flex items-center px-4 py-2.5 rounded-lg border border-white/15 text-white/75 hover:text-white">
                ← Prev
              </Link>
            ) : (
              <span className="inline-flex items-center px-4 py-2.5 rounded-lg border border-white/5 text-white/25">← Prev</span>
            )}
            {page < pageCount ? (
              <Link href={pageHref(page + 1)} className="inline-flex items-center px-4 py-2.5 rounded-lg border border-white/15 text-white/75 hover:text-white">
                Next →
              </Link>
            ) : (
              <span className="inline-flex items-center px-4 py-2.5 rounded-lg border border-white/5 text-white/25">Next →</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
