import Link from "next/link";

// Shared admin section nav. On phones it is a horizontally scrollable row
// pinned under the page header (each link is a >=40px tap target and never
// squashes); on large screens it sits inline at the right of the header.
// Every admin page renders this so all sections stay reachable from any
// admin screen — previously each sub-page hand-rolled its own links and
// some sections (Conversion, Contact) were unreachable from the others.
export type AdminSection = "dashboard" | "conversion" | "affiliates" | "competitor-seo" | "seo" | "contact" | "camera-submissions";

const SECTIONS: { key: AdminSection; href: string; label: string }[] = [
  { key: "dashboard", href: "/admin", label: "Dashboard" },
  { key: "conversion", href: "/admin/conversion", label: "Conversion" },
  { key: "affiliates", href: "/admin/affiliates", label: "Affiliates" },
  { key: "competitor-seo", href: "/admin/competitor-seo", label: "Competitor SEO" },
  { key: "seo", href: "/admin/seo", label: "SEO" },
  { key: "contact", href: "/admin/contact", label: "Contact inbox" },
  { key: "camera-submissions", href: "/admin/camera-submissions", label: "Camera submissions" },
];

export default function AdminNav({
  active,
  growthUrl,
}: {
  active: AdminSection;
  /** External Growth Engine dashboard URL, when configured (main page only). */
  growthUrl?: string | null;
}) {
  const linkCls = (isActive: boolean) =>
    `shrink-0 inline-flex items-center px-4 py-2.5 rounded-lg border transition ${
      isActive
        ? "border-cyan-400/50 text-cyan-200 bg-cyan-400/10"
        : "border-white/15 text-white/70 hover:text-white"
    }`;
  return (
    <nav
      aria-label="Admin sections"
      className="flex gap-2 text-sm overflow-x-auto -mx-4 px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0 lg:overflow-visible"
    >
      {growthUrl ? (
        <a
          href={growthUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 inline-flex items-center px-4 py-2.5 rounded-lg border border-cyan-400/30 text-cyan-300 hover:text-cyan-100"
        >
          Growth Engine ↗
        </a>
      ) : null}
      {SECTIONS.map((s) => (
        <Link key={s.key} href={s.href} className={linkCls(s.key === active)} aria-current={s.key === active ? "page" : undefined}>
          {s.label}
        </Link>
      ))}
      <Link href="/" className={linkCls(false)}>
        ← Site
      </Link>
    </nav>
  );
}
