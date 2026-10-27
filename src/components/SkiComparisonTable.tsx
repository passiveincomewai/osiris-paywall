"use client";

/**
 * The side-by-side comparison table shared by the interactive compare
 * tool and the static popular-pair pages. Client-rendered so the logo
 * tile gets the same onError monogram fallback as the resort directory;
 * all data arrives as props (it renders identically on the server for
 * the static pair pages).
 */
import { useState } from "react";
import Link from "next/link";
import { BedDouble, ExternalLink, Globe, Map as MapIcon, Ticket } from "lucide-react";
import type { SkiResortLogoMap } from "@/lib/ski-directory";
import { resortInitials } from "@/lib/ski-directory";
import {
  buildComparisonRows,
  type CompareResortData,
} from "@/lib/ski-compare";
import { SKI_LINK_LABELS, type SkiLinkKind } from "@/lib/ski-resort-links";

function LogoTile({ resort, logos }: { resort: CompareResortData; logos: SkiResortLogoMap }) {
  const [failed, setFailed] = useState(false);
  const logo = logos[resort.slug];
  if (logo && !failed) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo.src}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-sm font-bold tracking-wide text-[#D4AF37]"
    >
      {resortInitials(resort.name)}
    </span>
  );
}

const LINK_ICONS: Record<SkiLinkKind, typeof Ticket> = {
  tickets: Ticket,
  trailMap: MapIcon,
  lodging: BedDouble,
};

function ResortLinkButtons({ resort }: { resort: CompareResortData }) {
  const links = resort.links;
  const kinds = (["tickets", "trailMap", "lodging"] as SkiLinkKind[]).filter(
    k => links?.[k],
  );
  if (!resort.website && kinds.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {kinds.map(k => {
        const Icon = LINK_ICONS[k];
        return (
          <a
            key={k}
            href={links![k]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/5 transition"
          >
            <Icon className="w-3.5 h-3.5 text-[#D4AF37]" />
            {SKI_LINK_LABELS[k]}
            <ExternalLink className="w-3 h-3 text-white/35 ml-auto" />
          </a>
        );
      })}
      {resort.website && (
        <a
          href={resort.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/5 transition"
        >
          <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
          Official website
          <ExternalLink className="w-3 h-3 text-white/35 ml-auto" />
        </a>
      )}
    </div>
  );
}

function ResortHeader({
  resort,
  logos,
}: {
  resort: CompareResortData;
  logos: SkiResortLogoMap;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <LogoTile resort={resort} logos={logos} />
        <div className="min-w-0">
          <Link
            href={`/ski-webcams/${resort.slug}`}
            className="font-bold text-base md:text-lg leading-tight hover:text-[#D4AF37] transition block"
          >
            {resort.name}
          </Link>
          <div className="text-xs text-white/45 mt-0.5">
            {resort.town}, {resort.region} · {resort.country}
          </div>
        </div>
      </div>
      <ResortLinkButtons resort={resort} />
      <Link
        href={`/ski-webcams/${resort.slug}`}
        className="text-xs font-semibold text-[#00E5FF] hover:underline"
      >
        {resort.name} webcams &amp; resort page &rarr;
      </Link>
    </div>
  );
}

export default function SkiComparisonTable({
  a,
  b,
  logos,
}: {
  a: CompareResortData;
  b: CompareResortData;
  logos: SkiResortLogoMap;
}) {
  const rows = buildComparisonRows(a, b);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="grid grid-cols-2 gap-4 p-5 border-b border-white/10">
        <ResortHeader resort={a} logos={logos} />
        <ResortHeader resort={b} logos={logos} />
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.key} className={i % 2 ? "bg-white/[0.02]" : ""}>
              <td className="px-4 py-3 text-white/85 font-medium w-[34%] align-top">{row.a ?? "—"}</td>
              <td className="px-2 py-3 text-center text-[11px] uppercase tracking-wider text-white/40 align-top w-[32%]">
                {row.label}
              </td>
              <td className="px-4 py-3 text-white/85 font-medium text-right align-top w-[34%]">{row.b ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
