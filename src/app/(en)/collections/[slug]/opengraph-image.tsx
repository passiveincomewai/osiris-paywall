import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { resolvePublicCollection } from "@/lib/collections/shared";

/**
 * Social preview for a public collection: a branded card with the
 * collection title and stills ONLY from cameras the rights registry
 * clears for embedding (feedEligibility — default-exclude). When no
 * camera in the collection is cleared (or a still can't be loaded),
 * the card is branded graphics + title only. Never uses a still from
 * a non-cleared camera, and never a stock image.
 */
export const runtime = "nodejs";
export const alt = "A WorldEye camera collection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#05070d";
const GOLD = "#D4AF37";

function BrandedCard({
  title,
  subtitle,
  stills,
}: {
  title: string;
  subtitle: string;
  stills: string[];
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: BG,
        padding: 56,
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 26, letterSpacing: 8, color: GOLD, fontWeight: 700 }}>WORLDEYE</div>
        <div
          style={{
            fontSize: 18,
            letterSpacing: 3,
            color: "#9fb3c8",
            border: "1px solid rgba(212,175,55,0.4)",
            borderRadius: 999,
            padding: "8px 18px",
          }}
        >
          CAMERA COLLECTION
        </div>
      </div>
      <div
        style={{
          fontSize: title.length > 42 ? 52 : 64,
          fontWeight: 800,
          lineHeight: 1.1,
          marginTop: 36,
          maxWidth: 1000,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 26, color: "#9fb3c8", marginTop: 16 }}>{subtitle}</div>
      {stills.length > 0 && (
        <div style={{ display: "flex", gap: 16, marginTop: 36 }}>
          {stills.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              width={330}
              height={186}
              style={{ borderRadius: 14, objectFit: "cover", border: "1px solid rgba(255,255,255,0.15)" }}
              alt=""
            />
          ))}
        </div>
      )}
      <div style={{ marginTop: "auto", fontSize: 20, color: "#5b7186" }}>worldeye.app</div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "worldeye.app";
    const proto = h.get("x-forwarded-proto") ?? "https";
    const origin = `${proto}://${host}`;
    const col = await resolvePublicCollection(slug, origin);
    if (!col) throw new Error("not found");
    const count = col.cameras.length;
    const subtitle =
      (col.ownerName ? `Collected by ${col.ownerName} · ` : "") +
      `${count} live ${count === 1 ? "camera" : "cameras"}`;
    // Stills only from registry-cleared cameras (embed non-null).
    const stills = col.cameras
      .map((c) => c.embed?.snapshotUrl ?? null)
      .filter((u): u is string => !!u)
      .slice(0, 3);
    // Verify each still actually loads; drop the ones that don't.
    const checked = (
      await Promise.all(
        stills.map(async (u) => {
          try {
            const r = await fetch(u, { method: "GET" });
            return r.ok ? u : null;
          } catch {
            return null;
          }
        }),
      )
    ).filter((u): u is string => !!u);
    return new ImageResponse(<BrandedCard title={col.title} subtitle={subtitle} stills={checked} />, size);
  } catch {
    return new ImageResponse(
      <BrandedCard title="Camera Collections" subtitle="Live cameras, grouped and shared on WorldEye" stills={[]} />,
      size,
    );
  }
}
