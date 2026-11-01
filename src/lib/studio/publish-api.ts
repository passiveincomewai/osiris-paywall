// Direct API publishing status (spec §8) — SCAFFOLDING ONLY.
//
// Direct posting to Meta / YouTube / TikTok requires, per platform:
// an approved developer app, the content-publishing scopes granted
// through the platform's review, and per-affiliate OAuth tokens.
// None of that exists today, so every platform reports
// configured: false and the product uses the manual Publish & Share
// flow. This module is the single place that will flip when the
// owner completes a platform's approval: the env vars below are the
// contract, and `publishApiStatus()` is what the UI reads. Nothing
// anywhere may render an "auto-publish" affordance for a platform
// whose status is false.

export interface PublishApiPlatformStatus {
  id: string;
  label: string;
  configured: boolean;
  /** Env vars that must all be set for this platform to light up. */
  requiredEnv: string[];
  /** Exact owner steps (also in the Phase 4 record / final report). */
  ownerSteps: string[];
}

const META_STEPS = [
  "Create a Meta app at developers.facebook.com (type: Consumer or Business).",
  "Add the Instagram Graph API + Facebook Pages products; request instagram_content_publish and pages_manage_posts.",
  "Pass Meta App Review for those permissions (screencast of the Studio posting flow required).",
  "Set META_APP_ID, META_APP_SECRET and META_PUBLISH_REDIRECT_URI in Vercel Production, then connect accounts from the Studio.",
];
const YOUTUBE_STEPS = [
  "Create a Google Cloud project; enable the YouTube Data API v3.",
  "Configure an OAuth consent screen and request the youtube.upload scope.",
  "Pass Google's audit for unverified sensitive scopes (required before any channel can upload via the app).",
  "Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REDIRECT_URI in Vercel Production, then connect channels from the Studio.",
];
const TIKTOK_STEPS = [
  "Register an app at developers.tiktok.com and add the Content Posting API product.",
  "Request the video.publish (and video.upload) scopes and pass TikTok's app review.",
  "Until the app is audited, TikTok forces SELF_ONLY visibility on API posts — plan launch copy accordingly.",
  "Set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET and TIKTOK_REDIRECT_URI in Vercel Production, then connect accounts from the Studio.",
];

const DEFS: { id: string; label: string; requiredEnv: string[]; ownerSteps: string[] }[] = [
  { id: "meta", label: "Meta (Instagram + Facebook)", requiredEnv: ["META_APP_ID", "META_APP_SECRET", "META_PUBLISH_REDIRECT_URI"], ownerSteps: META_STEPS },
  { id: "youtube", label: "YouTube", requiredEnv: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REDIRECT_URI"], ownerSteps: YOUTUBE_STEPS },
  { id: "tiktok", label: "TikTok", requiredEnv: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI"], ownerSteps: TIKTOK_STEPS },
];

export function publishApiStatus(env: Record<string, string | undefined> = process.env): PublishApiPlatformStatus[] {
  return DEFS.map((d) => ({
    ...d,
    configured: d.requiredEnv.every((k) => typeof env[k] === "string" && env[k]!.length > 0),
  }));
}

/** True when NO platform is configured — the expected state today. */
export function anyApiPublishingConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return publishApiStatus(env).some((p) => p.configured);
}
