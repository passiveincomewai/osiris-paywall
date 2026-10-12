// Public link-in-bio page for an affiliate: /bio/<code>.
// NO auth gate — this is the page affiliates put in their social bios.
// Privacy: only the affiliate's display name and (when they opt in via
// showcaseEnabled) their featured Studio creations are rendered. Never
// email, earnings, XP, or any other private field. Both CTAs go through
// /ref/<code> exactly, so attribution rides the existing ref flow.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { db } from "@/lib/db";
import { findAffiliateByCode } from "@/lib/affiliate/attribution";

export const runtime = "nodejs";

async function loadBio(code: string) {
  const affiliate = await findAffiliateByCode(code);
  if (!affiliate) return null;
  const [user, profile] = await Promise.all([
    db.user.findUnique({ where: { id: affiliate.userId }, select: { name: true } }),
    db.affiliateProfile.findUnique({
      where: { id: affiliate.id },
      select: { showcaseEnabled: true, referralCode: true, customCode: true },
    }),
  ]);
  if (!profile) return null;
  const name = user?.name?.trim() || "A WorldEye creator";
  const resolvedCode = profile.customCode ?? profile.referralCode;
  const creations = profile.showcaseEnabled
    ? await db.studioCreation.findMany({
        where: { affiliateProfileId: affiliate.id },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          kind: true,
          createdAt: true,
          template: { select: { title: true } },
        },
      })
    : [];
  return { name, resolvedCode, showcaseEnabled: profile.showcaseEnabled, creations };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const bio = await loadBio(code).catch(() => null);
  if (!bio) return { title: "WorldEye" };
  return { title: `${bio.name} · WorldEye` };
}

const btnPrimary =
  "inline-flex items-center justify-center px-6 py-3 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all w-full";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 24px rgba(0,150,255,.45)" };
const btnGhost =
  "inline-flex items-center justify-center px-6 py-3 rounded-xl font-mono text-sm border border-white/15 text-slate-100 hover:border-cyan-400/60 transition-colors w-full";

export default async function BioPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const bio = await loadBio(code);
  if (!bio) notFound();

  const refHref = `/ref/${bio.resolvedCode}`;

  return (
    <main className="min-h-screen bg-[#04121f] text-slate-100 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <header className="text-center space-y-4">
          <Image
            src="/worldeye-eye.png"
            alt="WorldEye"
            width={96}
            height={96}
            className="mx-auto h-24 w-24 object-contain"
            priority
          />
          <div>
            <div className="text-[11px] font-mono tracking-[0.3em] text-cyan-400 uppercase">WorldEye creator</div>
            <h1 className="text-3xl font-bold text-white mt-1">{bio.name}</h1>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            I share live views of Earth — 36,000+ public cameras, flights, weather and more on one 3D globe.
          </p>
        </header>

        <div className="space-y-3">
          <a href={refHref} className={btnPrimary} style={btnStyle}>
            Explore WorldEye free
          </a>
          <a href={refHref} className={btnGhost}>
            See WorldEye Pro
          </a>
        </div>

        {bio.showcaseEnabled && bio.creations.length > 0 && (
          <section>
            <h2 className="text-[11px] font-mono tracking-[0.25em] text-slate-400 uppercase mb-3 text-center">
              Featured creations
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {bio.creations.map((c) => (
                <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-sm font-bold text-white leading-snug">{c.title}</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    {c.template?.title ? `${c.template.title} · ` : ""}
                    {c.kind}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {new Date(c.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="text-center text-[11px] font-mono text-slate-500">
          Powered by WorldEye — the planet, live.
        </footer>
      </div>
    </main>
  );
}
