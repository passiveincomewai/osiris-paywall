import { permanentRedirect } from "next/navigation";

// force-dynamic so the redirect is served as a real 308 response at
// request time instead of a prerendered meta-refresh stub.
export const dynamic = "force-dynamic";

// The canonical head-to-head for World Monitor is the data-driven
// /compare/world-monitor page. This slug (linked from campaigns and
// roundups as "worldeye-vs-world-monitor") redirects there permanently so
// there is exactly one page targeting "WorldEye vs World Monitor" intent
// instead of two competing ones.
export default function WorldEyeVsWorldMonitorAlias() {
  permanentRedirect("/compare/world-monitor");
}
