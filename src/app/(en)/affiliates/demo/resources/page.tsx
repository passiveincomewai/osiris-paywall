// /affiliates/demo/resources — the CURRENT live Resources toolkit (the
// real ResourcesClient, no fork) with the sample DEMO referral link
// filled in, so captions, banners and templates read exactly as a live
// affiliate sees them — with a sample link instead of a personal one.
import ResourcesClient from "../../resources/ResourcesClient";
import { DemoSectionFrame } from "@/components/affiliate/DemoShell";
import { DEMO_CODE } from "@/lib/affiliate/demo-data";
import { referralLinkFor } from "@/lib/affiliate/brand";

export const metadata = {
  title: "Demo Resources — WorldEye Affiliates",
  description:
    "Tour the WorldEye affiliate marketing resources: banners, captions, video scripts, email templates, and QR codes — shown with a sample referral link.",
};

export default function DemoResourcesPage() {
  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Resource Center</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Marketing Resources</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Everything you need to promote WorldEye, shown with a sample referral link — join free and the
          same toolkit carries your own link and code. Use truthful claims only — and always disclose your
          affiliate relationship with <span className="font-mono text-cyan-300">#ad</span> wherever you post your link.
        </p>
      </div>
      <DemoSectionFrame>
        <ResourcesClient demo={{ link: referralLinkFor(DEMO_CODE), code: DEMO_CODE.toLowerCase() }} />
      </DemoSectionFrame>
    </div>
  );
}
