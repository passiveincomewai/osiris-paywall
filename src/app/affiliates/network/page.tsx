import { redirect } from "next/navigation";
import { auth } from "@/auth";
import NetworkClient from "./NetworkClient";

export const metadata = {
  title: "Your Network — WorldEye Affiliates",
  description: "Your 3-level referral network: see every referral, override level, and commission earned.",
};

export default async function NetworkPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/network");
  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Referral Network</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Your Network</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Three levels deep. You earn your rank rate on direct referrals, plus 5% overrides on level 2
          and 2% on level 3 — paid only on real subscription sales, never on recruitment.
        </p>
      </div>
      <NetworkClient />
    </div>
  );
}
