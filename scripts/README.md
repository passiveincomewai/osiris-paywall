# scripts/

## IndexNow — post-push step (SEO #10)

`indexnow-submit.mjs` submits every URL in the **live** sitemap to the
IndexNow API (api.indexnow.org), which fans out to Bing, Yandex, Seznam
and the other participating engines — the fastest legitimate channel for
getting new or changed pages in front of the Bing-family indexes that
power Copilot and part of ChatGPT search. Bing is WorldEye's #3 referrer,
so this is not a formality.

### When to run it

**After every production ship, once the deploy is verified live** (the
script reads the live `https://worldeye.app/sitemap.xml`, so running it
before the deploy lands would submit the old URL set). This step is run
by the parent agent as part of the post-push verification — it is
deliberately **not** wired into CI or the push helper.

### How

```sh
npm run seo:indexnow:dry   # fetch the live sitemap, submit nothing
npm run seo:indexnow       # submit all live sitemap URLs
```

Expected output: `IndexNow: HTTP 200` (or `202` while a rotated key is
still being validated) with the submitted URL count. Any other status is
a failure — report it, don't retry in a loop.

### Key rotation

The submission key must match the key file served at
`https://worldeye.app/<key>.txt` (`public/<key>.txt` in this repo). If
the key is ever rotated: generate a new one, replace the public key
file, and update `INDEXNOW_KEY` in `indexnow-submit.mjs` in the same
commit.
