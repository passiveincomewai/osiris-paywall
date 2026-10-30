// /affiliates/demo/network — the real Network screen on a sample
// 3-level tree. Every person shown is fictional and labelled "(sample)".
import NetworkClient from "../../network/NetworkClient";
import { DemoSectionFrame } from "@/components/affiliate/DemoShell";
import { buildDemoNetworkTree } from "@/lib/affiliate/demo-data";

export const metadata = {
  title: "Demo Network — WorldEye Affiliates",
  description:
    "Tour the WorldEye affiliate 3-level referral network on a sample tree: referrals, override levels, and commissions. All people shown are samples.",
};

export default function DemoNetworkPage() {
  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Referral Network</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Your Network</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Three levels deep. You earn your rank rate on direct referrals, plus 5% overrides on level 2
          and 2% on level 3 — paid only on real subscription sales, never on recruitment.
          This demo tree is entirely sample people with illustrative figures.
        </p>
      </div>
      <DemoSectionFrame>
        <NetworkClient demo={{ tree: buildDemoNetworkTree() }} />
      </DemoSectionFrame>
    </div>
  );
}
