// Visible breadcrumb nav + matching BreadcrumbList JSON-LD, from the same
// trail — the schema can never drift from what the reader sees. Used by the
// standalone docs-style pages (trackers, blog, country traffic pages) that
// don't go through SeoIntentLayout or directory-page, whose breadcrumb
// components carry their own LD. "Home" is prepended here, matching both of
// those components' conventions.
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import JsonLd from "@/components/JsonLd";

const SITE = "https://worldeye.app";

export type BreadcrumbCrumb = { label: string; href?: string };

export default function BreadcrumbLd({
  trail,
  className = "mb-10",
}: {
  /** Trail after Home; the last crumb is the current page (no href). */
  trail: BreadcrumbCrumb[];
  className?: string;
}) {
  const crumbs: BreadcrumbCrumb[] = [{ label: "Home", href: "/" }, ...trail];
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${SITE}${c.href}` } : {}),
    })),
  };
  return (
    <>
      <JsonLd data={ld} />
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-white/45">
          {crumbs.map((c, i) => (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-white/25" aria-hidden />
              )}
              {c.href && i < crumbs.length - 1 ? (
                <Link href={c.href} className="hover:text-white transition">
                  {c.label}
                </Link>
              ) : (
                <span
                  aria-current={i === crumbs.length - 1 ? "page" : undefined}
                  className="text-white/75"
                >
                  {c.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
