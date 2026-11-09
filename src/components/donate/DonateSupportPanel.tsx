"use client";

/**
 * Support WorldEye — the /support page's form host. The page renders
 * the same step-1 component as the popup; its Donate button hands the
 * chosen amount to the global popup at the checkout step (the page
 * itself has no dismiss, so no "Maybe later").
 */
import { getDonateCopy } from "@/i18n/dictionaries";
import { useLocale } from "@/i18n/LocaleProvider";
import DonateForm from "./DonateForm";
import { openDonate } from "./donate-client";

export default function DonateSupportPanel() {
  const copy = getDonateCopy(useLocale());
  return (
    <div className="overflow-hidden rounded-[26px] border border-cyan-300/[0.38] bg-[linear-gradient(180deg,#14171C,#0B0C10)] shadow-[0_0_60px_rgba(34,211,238,0.15)]">
      <DonateForm
        copy={copy}
        onDonate={(sel) =>
          openDonate({
            source: "support_page",
            amount: sel.amount,
            frequency: sel.frequency,
            checkout: true,
          })
        }
      />
    </div>
  );
}
