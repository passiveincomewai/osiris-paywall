import type { Metadata } from "next";
import VipShell from "@/components/vip/VipShell";
import VipAlertsClient from "./VipAlertsClient";

export const metadata: Metadata = {
  title: "Event alerts — WorldEye VIP Pro",
  description:
    "VIP Pro event alerts: earthquakes at your magnitude near your places, launch reminders, and ISS passes over your sky.",
};

export default function VipAlertsPage() {
  return (
    <VipShell
      title="Event alerts"
      blurb="Camera alerts watch your cameras; event alerts watch the planet. WorldEye checks every ~15 minutes and tells you — by email and in the inbox here — when an earthquake hits your threshold, a launch enters your reminder window, or the ISS is about to cross your sky."
    >
      <VipAlertsClient />
    </VipShell>
  );
}
