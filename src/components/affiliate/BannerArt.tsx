"use client";
import { useMemo } from "react";
import { bannerBySlug, type BannerDesign } from "@/lib/affiliate/banners";

/* ------------------------------------------------------------------ */
/* BannerArt — renders a banner design from src/lib/affiliate/         */
/* banners.ts inline (shared by the resources page; the Marketing      */
/* Studio builds its embed tooling on the same BANNER_DESIGNS data).   */
/*                                                                     */
/* Props: { slug: string; className?: string }                         */
/* The SVG scales to the container width and keeps its native aspect.  */
/* ------------------------------------------------------------------ */

export function BannerArt({ slug, className }: { slug: string; className?: string }) {
  const design = bannerBySlug(slug);
  const html = useMemo(() => (design ? design.svg() : ""), [design]);
  if (!design) return null;
  return (
    <div
      className={className}
      style={{ aspectRatio: `${design.width} / ${design.height}` }}
      role="img"
      aria-label={design.name}
      dangerouslySetInnerHTML={{ __html: html.replace(
        /<svg([^>]*?)width="\d+" height="\d+"/,
        '<svg$1width="100%" height="100%" style="display:block"',
      ) }}
    />
  );
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Download the banner artwork as a standalone .svg file. */
export function downloadBannerSvg(design: BannerDesign) {
  saveBlob(new Blob([design.svg()], { type: "image/svg+xml" }), `worldeye-banner-${design.slug}.svg`);
}

/** Download the banner artwork rasterized as a .png at native size. */
export function downloadBannerPng(design: BannerDesign) {
  const svgUrl = URL.createObjectURL(new Blob([design.svg()], { type: "image/svg+xml" }));
  const img = new Image();
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = design.width;
      canvas.height = design.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, design.width, design.height);
      canvas.toBlob((blob) => {
        if (blob) saveBlob(blob, `worldeye-banner-${design.slug}.png`);
      }, "image/png");
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };
  img.src = svgUrl;
}

/** Copy-ready embed snippet: the affiliate's referral link wrapped
 *  around the hosted banner artwork (the link carries the referral;
 *  the artwork itself never contains referral data). */
export function bannerEmbedHtml(design: BannerDesign, referralLink: string): string {
  return `<a href="${referralLink}" target="_blank" rel="noopener sponsored"><img src="https://worldeye.app/affiliate-banners/${design.slug}.svg" alt="WorldEye — ${design.name}" width="${design.width}" height="${design.height}" style="max-width:100%;height:auto;border-radius:12px" /></a>`;
}
