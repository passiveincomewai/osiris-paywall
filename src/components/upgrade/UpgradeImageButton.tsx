"use client";

/**
 * The /upgrade-to-pro.png image CTA as a popup opener. Content pages
 * (about, use-cases) used to wrap this image in a Link to /pricing;
 * since 2026-11-09 every "Upgrade to PRO" button opens the upgrade
 * popup on step 1 in place instead of navigating away. Server pages
 * render this client leaf wherever the image CTA appears.
 */

import { openUpgradePopup } from "@/lib/upgrade-popup";

export default function UpgradeImageButton({
  className = "h-12 w-auto",
  alt = "Upgrade to Pro",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <button
      type="button"
      aria-label="Upgrade to PRO"
      onClick={() => openUpgradePopup({ step: 1, trigger: "upgrade_button" })}
      className="inline-block transition hover:brightness-110"
    >
      <img
        src="/upgrade-to-pro.png"
        alt={alt}
        width={1072}
        height={262}
        draggable={false}
        className={className}
      />
    </button>
  );
}
