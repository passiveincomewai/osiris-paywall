"use client";

/**
 * Support WorldEye — the footer strip (spec §6b), rendered by
 * SiteFooter directly above the newsletter block. Design per the
 * owner's reference: full-width dark bar, heart tile, the bold
 * "WorldEye is independent and ad-free." line, and the cyan gradient
 * "♥ Support WorldEye" button.
 *
 * Self-gating: free content pages only — never on /pricing,
 * /enterprise, team, checkout, account/billing, admin or auth pages,
 * and never for paid subscribers or known supporters. It renders
 * nothing until eligibility is confirmed client-side.
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { getDonateCopy } from "@/i18n/dictionaries";
import { useLocale } from "@/i18n/LocaleProvider";
import { readSessionIdentity } from "@/lib/premium-entitlement";
import { isDonateExcludedPath } from "@/lib/donate/config";
import { HeartTile } from "./DonateForm";
import { isDonateSupporterStamped, openDonate } from "./donate-client";

export default function DonateFooterStrip() {
  const pathname = usePathname() ?? "";
  const copy = getDonateCopy(useLocale());
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    let live = true;
    if (isDonateExcludedPath(pathname)) {
      setEligible(false);
      return;
    }
    if (isDonateSupporterStamped(Date.now())) {
      setEligible(false);
      return;
    }
    readSessionIdentity()
      .then((identity) => {
        if (!live) return;
        setEligible(
          identity.state !== "premium" && !identity.user?.supporter,
        );
      })
      .catch(() => {
        if (live) setEligible(true);
      });
    return () => {
      live = false;
    };
  }, [pathname]);

  if (!eligible) return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pt-10">
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#101319] px-5 py-4 max-sm:flex-wrap">
        <HeartTile size={44} />
        <p className="min-w-0 flex-1 text-[15px] leading-snug text-zinc-300">
          <strong className="font-semibold text-white">{copy.stripBold}</strong>{" "}
          {copy.stripRest}
        </p>
        <button
          type="button"
          onClick={() => openDonate({ source: "footer_strip" })}
          className="flex shrink-0 items-center gap-2 rounded-full bg-[linear-gradient(90deg,#8BEAFA,#22D3EE)] px-5 py-2.5 text-sm font-bold text-[#06202B] transition hover:brightness-105"
        >
          <Heart size={14} className="fill-[#06202B]" />
          {copy.stripCta}
        </button>
      </div>
    </div>
  );
}
