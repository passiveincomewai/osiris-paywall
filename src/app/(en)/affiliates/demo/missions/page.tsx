// /affiliates/demo/missions — the real Missions screen on sample
// progress (mission definitions mirror the live seeded challenges).
import MissionsClient from "../../missions/MissionsClient";
import { DemoSectionFrame } from "@/components/affiliate/DemoShell";
import { buildDemoChallenges } from "@/lib/affiliate/demo-data";

export const metadata = {
  title: "Demo Missions — WorldEye Affiliates",
  description:
    "Tour WorldEye affiliate missions on sample progress: daily, weekly and monthly challenges that earn XP and unlock higher commission tiers.",
};

export default function DemoMissionsPage() {
  return (
    <DemoSectionFrame>
      <MissionsClient demo={{ challenges: buildDemoChallenges() }} />
    </DemoSectionFrame>
  );
}
