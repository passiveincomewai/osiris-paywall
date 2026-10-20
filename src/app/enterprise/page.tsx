import Link from "next/link";
import { Check, Lock, ShieldCheck } from "lucide-react";
import { enterpriseAccess } from "@/lib/enterprise/access";
import {
  ENTERPRISE_OFFER_FEATURES,
  ENTERPRISE_GUARANTEE_LINE,
  ENTERPRISE_SUPPORT_LINE,
} from "@/lib/enterprise/offer";
import EnterpriseClient from "./EnterpriseClient";

export const metadata = {
  title: "Enterprise Camera Feed",
  description:
    "Build custom camera collections and publish them to your own site or platform: an embeddable live player, a private JSON data feed, and optional API keys.",
  alternates: { canonical: "https://worldeye.app/enterprise" },
};

export const dynamic = "force-dynamic";

function OfferList() {
  return (
    <ul className="mt-5 space-y-2">
      {ENTERPRISE_OFFER_FEATURES.map((f) => (
        <li key={f} className="flex items-center gap-2.5 text-sm text-white/85">
          <span className="w-5 h-5 rounded-full bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-[#00E5FF]" />
          </span>
          {f}
        </li>
      ))}
    </ul>
  );
}

export default async function EnterprisePage() {
  const a = await enterpriseAccess();
  return (
    <div className="docs-root min-h-screen bg-[#05070d] text-white">
      <div className="max-w-5xl mx-auto px-5 py-10 md:py-14">
        <p className="text-xs font-bold tracking-[0.25em] text-[#00E5FF]">ENTERPRISE</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2">
          Your cameras, on your platform
        </h1>
        <p className="text-white/55 mt-3 max-w-2xl leading-relaxed">
          Build collections from the WorldEye catalogue and publish them three ways: an
          embeddable live player for your website, a private data feed your platform can
          import, and — if you want it — API keys onto the same data.
        </p>

        {!a.ok ? (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <p className="flex items-center gap-2 text-white/85 font-medium">
              <Lock className="w-4 h-4 text-[#00E5FF]" /> Sign in to open your enterprise dashboard.
            </p>
            <OfferList />
            <Link
              href="/signin"
              className="inline-block mt-6 px-6 py-3 rounded-2xl bg-[#00E5FF] text-black font-bold text-sm hover:brightness-110 transition"
            >
              Sign in
            </Link>
            <p className="text-xs text-white/40 mt-4">{ENTERPRISE_SUPPORT_LINE}</p>
          </div>
        ) : !a.enterprise ? (
          <div className="mt-10 rounded-3xl border border-[#00E5FF]/25 bg-gradient-to-b from-[#00E5FF]/[0.06] to-white/[0.02] p-6 md:p-8">
            <p className="text-white/85 font-medium">
              The camera feed is part of the Enterprise plan ($999/year).
            </p>
            <OfferList />
            <Link
              href="/pricing"
              className="inline-block mt-6 px-6 py-3 rounded-2xl bg-[#00E5FF] text-black font-bold text-sm hover:brightness-110 transition"
            >
              Get Enterprise
            </Link>
            <p className="flex items-start gap-2 text-xs text-white/50 mt-5 max-w-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00E5FF]/80 shrink-0 mt-px" />
              <span>{ENTERPRISE_GUARANTEE_LINE}</span>
            </p>
            <p className="text-xs text-white/40 mt-3">{ENTERPRISE_SUPPORT_LINE}</p>
          </div>
        ) : (
          <EnterpriseClient />
        )}
      </div>
    </div>
  );
}
