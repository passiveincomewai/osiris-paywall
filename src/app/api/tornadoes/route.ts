import { NextResponse } from "next/server";
import {
  fetchRecentSpcReports,
  getNwsTornadoAlerts,
} from "@/lib/events/tornadoes";

/**
 * OSIRIS — Tornadoes: live NWS tornado warnings/watches plus the SPC's
 * preliminary tornado reports for the last three days. Both sources are
 * NOAA, keyless, and cached server-side (alerts 3 min, reports 30 min)
 * in lib/events/tornadoes. A failed source degrades to an empty list —
 * never an error page — so the tornado tracker always renders.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const [alerts, reports] = await Promise.allSettled([
    getNwsTornadoAlerts(),
    fetchRecentSpcReports(),
  ]);
  return NextResponse.json(
    {
      alerts: alerts.status === "fulfilled" ? alerts.value : [],
      reports: reports.status === "fulfilled" ? reports.value : [],
      sources: {
        alerts: "NOAA / National Weather Service",
        reports: "NOAA / Storm Prediction Center",
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=240",
      },
    },
  );
}
