import Link from "next/link";
import { Fragment } from "react";
import { localizedPath, type LocaleCode } from "@/i18n/config";
import { isPublished } from "@/i18n/manifest";
import type { RichText as RichTextSegments } from "@/i18n/dictionaries/types";

/**
 * Renders a dictionary RichText value (segment list) to JSX. Link
 * segments carry a page slug, resolved here: the localized URL when
 * that page is published in the current locale, the English URL
 * otherwise — so a translation can never link to a localized page
 * that doesn't exist. Styling hooks match the classes the pre-i18n
 * pages used inline; callers on differently-styled pages can pass
 * their own.
 */
export default function RichText({
  segments,
  locale,
  linkClassName = "text-[#D4AF37] hover:underline",
  strongClassName = "text-white font-semibold",
  accentClassName = "text-[#D4AF37]",
}: {
  segments: RichTextSegments;
  locale: LocaleCode;
  linkClassName?: string;
  strongClassName?: string;
  accentClassName?: string;
}) {
  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.t) {
          case "text":
            return <Fragment key={i}>{seg.text}</Fragment>;
          case "strong":
            return (
              <strong key={i} className={strongClassName}>
                {seg.text}
              </strong>
            );
          case "accent":
            return (
              <span key={i} className={accentClassName}>
                {seg.text}
              </span>
            );
          case "link": {
            const href = isPublished(seg.slug, locale)
              ? localizedPath(seg.slug, locale)
              : `/${seg.slug}`;
            return (
              <Link key={i} href={href} className={linkClassName}>
                {seg.text}
              </Link>
            );
          }
        }
      })}
    </>
  );
}
