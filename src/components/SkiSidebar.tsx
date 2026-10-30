import Link from "next/link";
import PowderPassPromo from "@/components/PowderPassPromo";
import type { SkiResort } from "@/lib/ski-resorts";
import {
  groupSkiResortsByRegion,
  skiPassCounts,
} from "@/lib/ski-directory";

/**
 * The ski sidebar: one server-rendered navigation rail shared by the
 * /ski-webcams hub and every resort page, in the globe sidebar's
 * design language (dark panel, gold accents). Browse links, the pass
 * programmes with documented affiliations only, state / region links
 * into the hub directory, and — behind the same launch flag as every
 * other ski surface — the Powder Pass promo as the rail's conversion
 * block. Exactly one instance renders per page.
 *
 * On small screens the rail stacks above the content as a compact
 * panel (region list scrolls internally); on large screens it sticks
 * beside the content.
 */
export default function SkiSidebar({
  resorts,
  showPowder,
  variant = "hub",
}: {
  resorts: SkiResort[];
  /** Render the Powder Pass block (callers pass powderPassEnabled). */
  showPowder: boolean;
  /** Resort pages add on-this-page anchor links to the browse group. */
  variant?: "hub" | "resort";
}) {
  const passCounts = skiPassCounts(resorts);
  const regions = groupSkiResortsByRegion(resorts);

  return (
    <aside aria-label="Ski section navigation" className="lg:sticky lg:top-6">
      <nav className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">Browse</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/ski-webcams" className="text-white/75 transition hover:text-white">
              Ski webcam hub
            </Link>
          </li>
          <li>
            <Link
              href="/ski-webcams/compare"
              className="text-white/75 transition hover:text-white"
            >
              Compare resorts side by side
            </Link>
          </li>
          <li>
            <Link
              href="/ski-webcams/my"
              className="text-white/75 transition hover:text-white"
            >
              My Powder — followed resorts
            </Link>
          </li>
          {variant === "resort" && (
            <>
              <li>
                <a href="#drive" className="text-white/75 transition hover:text-white">
                  Plan the drive up
                </a>
              </li>
              <li>
                <a href="#conditions" className="text-white/75 transition hover:text-white">
                  Conditions &amp; alerts
                </a>
              </li>
              <li>
                <a href="#cameras" className="text-white/75 transition hover:text-white">
                  Resort cameras
                </a>
              </li>
            </>
          )}
        </ul>

        <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
          By pass
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          {passCounts.passes.map(({ pass, count }) => (
            <li key={pass}>
              <Link
                href={`/ski-webcams?pass=${encodeURIComponent(pass)}`}
                className="text-white/75 transition hover:text-white"
              >
                {pass} <span className="text-white/35">{count}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/ski-webcams?pass=none"
              className="text-white/75 transition hover:text-white"
            >
              Independent / no listed pass{" "}
              <span className="text-white/35">{passCounts.none}</span>
            </Link>
          </li>
        </ul>

        <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
          By state / region
        </h3>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1 text-sm lg:max-h-96">
          {regions.map(({ key, label, resorts: list }) => {
            const region = key.split("::")[1] ?? label;
            return (
              <li key={key}>
                <Link
                  href={`/ski-webcams?search=${encodeURIComponent(region)}`}
                  className="text-white/75 transition hover:text-white"
                >
                  {label} <span className="text-white/35">{list.length}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {showPowder && <PowderPassPromo className="mt-6" />}
    </aside>
  );
}
