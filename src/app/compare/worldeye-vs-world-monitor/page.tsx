import { permanentRedirect } from "next/navigation";

// The canonical head-to-head for World Monitor is the data-driven
// /compare/world-monitor page. This slug (linked from campaigns and
// roundups as "worldeye-vs-world-monitor") redirects there permanently so
// there is exactly one page targeting "WorldEye vs World Monitor" intent
// instead of two competing ones.
export default function WorldEyeVsWorldMonitorAlias() {
  permanentRedirect("/compare/world-monitor");
}
