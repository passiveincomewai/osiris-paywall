// ── Public clip shares: watch + platform links ───────────────────────
// Pure builders for the share dialog. The watch URL is the one link a
// share ever produces — platform intents all point at it, so every
// view lands on worldeye.app (branding + referral attribution ride
// along on the watch page itself).

import { appBaseUrl } from "@/lib/app-url";

export function watchPath(slug: string): string {
  return `/watch/${slug}`;
}

export function watchUrl(slug: string, env: Record<string, string | undefined> = process.env): string {
  return `${appBaseUrl(env)}${watchPath(slug)}`;
}

export interface PlatformShareLinks {
  x: string;
  facebook: string;
  whatsapp: string;
  telegram: string;
  reddit: string;
  email: string;
}

/** Share-intent URLs for the major platforms, built from the watch URL. */
export function platformShareLinks(url: string, title: string): PlatformShareLinks {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    reddit: `https://www.reddit.com/submit?url=${u}&title=${t}`,
    email: `mailto:?subject=${t}&body=${encodeURIComponent(`${title}\n\nWatch it on WorldEye: ${url}`)}`,
  };
}
