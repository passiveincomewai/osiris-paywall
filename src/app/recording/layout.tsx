import Link from "next/link";
import RecordingOnboarding from "@/components/onboarding/RecordingOnboarding";

export const metadata = {
  title: "WorldEye Recording Studio — Personal Camera Recording",
  description: "Save cameras, watch them live, and record clips with WorldEye Pro.",
};

const NAV = [
  { href: "/recording", label: "Overview", icon: "◈" },
  { href: "/recording/cameras", label: "My Cameras", icon: "▣" },
  { href: "/recording/live", label: "Live", icon: "●" },
  { href: "/recording/clips", label: "Clips", icon: "▸" },
];

export default function RecordingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050810]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/recording" className="flex items-center gap-2.5 shrink-0">
            <img src="/worldeye-eye.png" alt="WorldEye" width={600} height={432} className="h-8 w-auto" />
            <span className="font-wordmark text-white tracking-wide hidden sm:inline">
              World<span className="text-[#0096FF]">Eye</span>
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-red-400/40 text-red-300 tracking-[0.2em] font-mono">REC</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 whitespace-nowrap transition-colors">
                <span className="mr-1.5 text-cyan-300">{n.icon}</span>{n.label}
              </Link>
            ))}
          </nav>
          <Link href="/" className="shrink-0 text-sm text-slate-400 hover:text-white font-mono">
            ← Globe
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      {/* Onboarding (Build A): first-visit Recording Studio guide; client-only, renders nothing after first dismissal. */}
      <RecordingOnboarding />
    </div>
  );
}
