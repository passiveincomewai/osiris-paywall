#!/usr/bin/env node
/**
 * IndexNow submission for worldeye.app.
 *
 * Reads every URL from the live sitemap and submits them to the IndexNow
 * API (api.indexnow.org), which fans out to Bing, Yandex, Seznam and
 * other participating engines — the fastest legitimate channel for
 * getting new/changed pages (e.g. the 109 country pages) in front of
 * Bing-family indexes that power Copilot and part of ChatGPT search.
 *
 * The key must match the key file served at
 * https://worldeye.app/<key>.txt (public/<key>.txt in this repo).
 * If the key is ever rotated: generate a new one, replace the public
 * key file, and update INDEXNOW_KEY below in the same commit.
 *
 * Usage: node scripts/indexnow-submit.mjs [--dry-run]
 *        node scripts/indexnow-submit.mjs --urls <url>[,<url>...] [--dry-run]
 *
 * The --urls mode is the publish-time hook: when a single page is
 * published, significantly updated or deleted (e.g. a WorldEye News
 * story on its blog URL), submit just that URL instead of the whole
 * sitemap. IndexNow treats a submitted URL that now returns 404/410
 * as a deletion notice, so the same command covers deletes: run it
 * with the removed URL after the deploy that removes the page.
 */
const HOST = "worldeye.app";
const SITE = `https://${HOST}`;
const INDEXNOW_KEY = "c1b802bbb4e2fb9f98136ea4c1212319";
const KEY_LOCATION = `${SITE}/${INDEXNOW_KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const BATCH = 10000; // IndexNow per-request URL cap

const dryRun = process.argv.includes("--dry-run");

async function sitemapUrls() {
  const res = await fetch(`${SITE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function submit(urls) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: urls,
    }),
  });
  const body = await res.text();
  // 200 = accepted; 202 = accepted, key validation pending.
  console.log(`IndexNow: HTTP ${res.status} for ${urls.length} URLs${body ? ` — ${body.slice(0, 200)}` : ""}`);
  return res.status;
}

const urlsArg = process.argv.find((a) => a.startsWith("--urls="));
const urlsInline = process.argv.includes("--urls")
  ? process.argv[process.argv.indexOf("--urls") + 1]
  : undefined;
const explicit = (urlsArg ? urlsArg.slice("--urls=".length) : urlsInline)
  ?.split(",")
  .map((u) => u.trim())
  .filter(Boolean);
if (explicit) {
  for (const u of explicit) {
    if (!u.startsWith(`${SITE}/`)) {
      throw new Error(`--urls entries must be ${SITE} URLs, got: ${u}`);
    }
  }
}
const urls = explicit ?? (await sitemapUrls());
console.log(
  explicit ? `Explicit: ${urls.length} URLs` : `Sitemap: ${urls.length} URLs`,
);
if (dryRun) {
  console.log("Dry run — nothing submitted.");
  process.exit(0);
}
let ok = true;
for (let i = 0; i < urls.length; i += BATCH) {
  const status = await submit(urls.slice(i, i + BATCH));
  if (status !== 200 && status !== 202) ok = false;
}
process.exit(ok ? 0 : 1);
