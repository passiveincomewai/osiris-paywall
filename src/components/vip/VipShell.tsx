import Link from "next/link";
import type { ReactNode } from "react";
import { VipBadge } from "./VipLock";

/** Shared page shell for the /vip surfaces (dark, mobile-first). */
export default function VipShell({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <div className="docs-root min-h-screen bg-[#050b14] text-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <nav className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono">
          <Link href="/vip" className="text-cyan-300 hover:text-cyan-200">
            ← VIP hub
          </Link>
          <Link href="/vip/alerts" className="text-slate-400 hover:text-slate-200">
            Event alerts
          </Link>
          <Link href="/vip/brief" className="text-slate-400 hover:text-slate-200">
            Personal brief
          </Link>
          <Link href="/vip/views" className="text-slate-400 hover:text-slate-200">
            Saved views
          </Link>
          <Link href="/" className="text-slate-400 hover:text-slate-200">
            Live map
          </Link>
        </nav>
        <div className="mb-2">
          <VipBadge />
        </div>
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400 max-w-xl">{blurb}</p>
        <div className="mt-8 space-y-8">{children}</div>
      </div>
    </div>
  );
}
