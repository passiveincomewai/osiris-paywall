// ── Device identity for sessions + sign-in history (items 3–4) ─────
// The browser mints a random device id once (localStorage we_device_id)
// and heartbeats it; the server derives a human label from the UA and
// an approximate location from the platform's geo headers when present
// (never a precise location, never the raw IP — only a hash).

export const DEVICE_ID_KEY = "we_device_id";

export function deviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "Browser";
  const os =
    /Windows/.test(ua) ? "Windows"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : "unknown system";
  return `${browser} on ${os}`;
}

/** "City, CC" from Vercel/Cloudflare geo headers when present, else null. */
export function approximateLocationFromHeaders(headers: Headers): string | null {
  const city = headers.get("x-vercel-ip-city");
  const country = headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry");
  if (city && country) {
    try {
      return `${decodeURIComponent(city)}, ${country}`;
    } catch {
      return `${city}, ${country}`;
    }
  }
  return country ?? null;
}
