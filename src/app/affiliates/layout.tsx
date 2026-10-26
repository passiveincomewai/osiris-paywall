import Link from "next/link";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { auth } from "@/auth";
import AffiliateSync from "@/components/affiliate/AffiliateSync";

export const metadata = {
  title: "WorldEye Affiliates — Turn Your Network Into Recurring Income",
  description:
    "Join WorldEye's free affiliate program. Earn 15%–30% recurring commissions, unlock ranks, complete missions, and earn overrides across your 3-level referral network.",
};

const NAV = [
  { href: "/affiliates", label: "Program" },
  { href: "/affiliates/demo", label: "Live Demo" },
  { href: "/affiliates/dashboard", label: "Dashboard" },
  { href: "/affiliates/studio", label: "Marketing Studio" },
  { href: "/affiliates/missions", label: "Missions" },
  { href: "/affiliates/network", label: "Network" },
  { href: "/affiliates/leaderboard", label: "Leaderboard" },
  { href: "/affiliates/resources", label: "Resources" },
];

export default async function AffiliatesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <div className="docs-root min-h-screen" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #0a1a33 0%, #050810 55%, #03040a 100%)" }}>
      <AffiliateSync />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050810]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/affiliates" className="flex items-center gap-2.5 shrink-0">
            <img src="/worldeye-eye.png" alt="WorldEye" width={600} height={432} className="h-8 w-auto" />
            <span className="font-wordmark text-white tracking-wide hidden sm:inline">
              World<span className="text-[#0096FF]">Eye</span>
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-cyan-400/40 text-cyan-300 tracking-[0.2em]">AFFILIATES</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 whitespace-nowrap transition-colors">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="shrink-0 flex items-center gap-3">
            <LanguageHeaderControl variant="mobile" />
            {session?.user ? (
              <Link href="/"
                className="px-4 py-2 rounded-xl text-sm font-mono font-bold text-[#04121f] whitespace-nowrap"
                style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 18px rgba(0,150,255,.4)" }}>
                ← Back to Globe
              </Link>
            ) : (
              <Link href="/api/auth/signin?callbackUrl=/affiliates"
                className="px-4 py-2 rounded-xl text-sm font-mono font-bold border border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 transition-colors">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">{children}</main>
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="font-mono">World<span className="text-[#0096FF]">Eye</span> Affiliates — free to join, paid on real sales.</div>
          <div className="flex gap-5">
            <Link href="/affiliates/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/" className="hover:text-white">← Back to WorldEye</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
