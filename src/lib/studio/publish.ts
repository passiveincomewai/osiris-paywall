// Publish & Share matrix (spec §8). Per-platform preparation guidance
// for a variation: the recommended format, how the post text should be
// shaped, and the REAL destination for posting (upload page or the
// platform home with steps). Nothing here publishes anything — direct
// API posting exists only where OAuth + platform approval are
// genuinely configured (see publish-api.ts), and this matrix is the
// manual-share path done properly.
//
// Guidance is framed as recommendations based on each platform's
// well-known surfaces (Reels/TikTok/Shorts are vertical-first), never
// as invented platform "rules".

import type { Aspect } from "./repurpose";

export interface PlatformPublishSpec {
  id: string;
  label: string;
  /** Preferred aspect for this surface. */
  preferredAspect: Aspect;
  /** Rule-of-thumb length guidance, labelled as a recommendation. */
  lengthNote: string;
  /** Where the tracked link goes for this platform. */
  linkPlacement: "caption" | "first_comment" | "bio";
  linkNote: string;
  /** Real URL that opens the posting flow (or the platform home). */
  openUrl: string;
  openLabel: string;
  /** Commercial-content label the platform expects. */
  disclosureLabel: string;
  hashtags: string[];
}

export const PUBLISH_PLATFORMS: PlatformPublishSpec[] = [
  {
    id: "tiktok",
    label: "TikTok",
    preferredAspect: "9:16",
    lengthNote: "Vertical 9:16. Short and punchy travels furthest; the hook lands in the first 2 seconds.",
    linkPlacement: "bio",
    linkNote: "TikTok captions don't make links clickable — put your link in your profile bio and say so on screen.",
    openUrl: "https://www.tiktok.com/upload",
    openLabel: "Open TikTok upload",
    disclosureLabel: "Turn on TikTok's “Branded content” toggle for this post.",
    hashtags: ["#traveltiktok", "#livecam", "#worldtour"],
  },
  {
    id: "instagram",
    label: "Instagram Reels",
    preferredAspect: "9:16",
    lengthNote: "Vertical 9:16 for Reels. Keep the caption's first line hooky — it's the preview text.",
    linkPlacement: "bio",
    linkNote: "Instagram captions don't make links clickable — link in bio; hashtags work best in the first comment.",
    openUrl: "https://www.instagram.com/",
    openLabel: "Open Instagram (＋ → Reel)",
    disclosureLabel: "Use Instagram's “Paid partnership” label for this post.",
    hashtags: ["#travelgram", "#liveview", "#explore"],
  },
  {
    id: "youtube",
    label: "YouTube Shorts",
    preferredAspect: "9:16",
    lengthNote: "Vertical for Shorts (up to 3 minutes). Title under ~60 characters reads fully in the Shorts feed.",
    linkPlacement: "caption",
    linkNote: "Links are clickable in the description — the tracked link goes right in it.",
    openUrl: "https://www.youtube.com/upload",
    openLabel: "Open YouTube upload",
    disclosureLabel: "In YouTube Studio, check “My video contains paid promotion” for this upload.",
    hashtags: ["#shorts", "#travel", "#livecam"],
  },
  {
    id: "facebook",
    label: "Facebook Reels",
    preferredAspect: "9:16",
    lengthNote: "Vertical 9:16 for Reels; the same render also works as a feed video at 4:5.",
    linkPlacement: "caption",
    linkNote: "Links are clickable in the caption — include the tracked link.",
    openUrl: "https://www.facebook.com/",
    openLabel: "Open Facebook (Create → Reel)",
    disclosureLabel: "Use Facebook's “Paid partnership” label (Branded Content) for this post.",
    hashtags: ["#travel", "#livecam"],
  },
  {
    id: "x",
    label: "X (Twitter)",
    preferredAspect: "16:9",
    lengthNote: "Landscape or square reads best in the feed; keep the post text tight.",
    linkPlacement: "caption",
    linkNote: "Links are clickable — include the tracked link in the post.",
    openUrl: "https://x.com/compose/post",
    openLabel: "Open X composer",
    disclosureLabel: "Include #ad in the post text.",
    hashtags: ["#travel", "#livecam"],
  },
  {
    id: "threads",
    label: "Threads",
    preferredAspect: "9:16",
    lengthNote: "Vertical video works well; conversational first line.",
    linkPlacement: "caption",
    linkNote: "Links are clickable — include the tracked link in the post.",
    openUrl: "https://www.threads.net/",
    openLabel: "Open Threads",
    disclosureLabel: "Include #ad in the post text.",
    hashtags: ["#travel", "#livecam"],
  },
];

export function publishSpec(id: string): PlatformPublishSpec {
  return PUBLISH_PLATFORMS.find((p) => p.id === id) ?? PUBLISH_PLATFORMS[0];
}

export interface PreparedPost {
  /** Main post text (caption/description) for the platform. */
  caption: string;
  /** First comment text, when the platform pattern uses one. */
  firstComment: string | null;
  /** True when the variation's aspect matches the platform preference. */
  aspectMatches: boolean;
  aspectNote: string | null;
}

/**
 * Shape a variation's stored post text for one platform: hashtags and
 * link placement per the platform pattern. The tracked creative URL
 * (utm_content=<creativeId>) is always what travels — never a bare
 * untracked link.
 */
export function preparePostText(opts: {
  hookText: string;
  storedText: string | null;
  trackedUrl: string;
  aspect: Aspect;
  spec: PlatformPublishSpec;
}): PreparedPost {
  const spec = opts.spec;
  const base = (opts.storedText ?? "").trim();
  const hookLine = opts.hookText.trim();
  const hashtags = spec.hashtags.join(" ");

  let caption: string;
  let firstComment: string | null = null;

  if (spec.linkPlacement === "caption") {
    caption = base || [hookLine, "", opts.trackedUrl, "", hashtags, "#ad"].join("\n");
    if (base && !base.includes(opts.trackedUrl)) caption = `${base}\n\n${opts.trackedUrl}`;
    if (!caption.includes("#ad")) caption += "\n#ad";
    if (!spec.hashtags.some((h) => caption.includes(h))) caption += `\n${hashtags}`;
  } else if (spec.linkPlacement === "first_comment") {
    caption = base ? base.replace(opts.trackedUrl, "").trim() : hookLine;
    if (!caption.includes("#ad")) caption += "\n#ad";
    firstComment = `${opts.trackedUrl}\n${hashtags}`;
  } else {
    // bio: the caption carries the hook + a spoken pointer to the bio link.
    caption = base ? base.replace(opts.trackedUrl, "").trim() : hookLine;
    if (!/link in bio/i.test(caption)) caption += "\nLink in bio 👆";
    if (!caption.includes("#ad")) caption += "\n#ad";
    firstComment = hashtags;
  }

  const aspectMatches = opts.aspect === spec.preferredAspect;
  return {
    caption,
    firstComment,
    aspectMatches,
    aspectNote: aspectMatches
      ? null
      : `This variation is ${opts.aspect}; ${spec.label} usually performs best at ${spec.preferredAspect}. Regenerate or edit the format if you want the platform-preferred cut.`,
  };
}
