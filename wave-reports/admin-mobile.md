# Admin panel overhaul — audit, conversion merge, mobile optimization

Branch: `feature/admin-mobile` (base e7c0285, production master at time of work).
Owner brief: "The admin panel needs improving, make it optimized for mobile.
There's a lot I've asked you to integrate into it but I don't see any changes
made."

## 1. Audit — every admin surface, classified

### Live in production master (e7c0285)

| Surface | Route | What it does |
|---|---|---|
| Main dashboard | `/admin` | Live traffic + per-visit strip, KPI cards, 30d funnel, acquisition, trends charts, subscription health, checkout funnel (7d), traffic, users, system health; embeds the sections below |
| Contact inbox | `/admin/contact` | Contact-form messages, unread/read/resolved workflow (`ContactMessage` model) |
| Affiliate command | `/admin/affiliates` | Overview, affiliate list + status/XP actions, payouts, commission ledger, fraud signals, program settings, audit log (7 tabs) |
| Competitor SEO | `/admin/competitor-seo` | First-party performance of competitor-intent pages, honest GSC-not-connected state |
| Creator applications | section on `/admin` | Free-Pro-for-creators review queue (approve grants 12-month comp Pro) — built Oct 12, live |
| Onboarding & Activation | section on `/admin` | Tour funnel, steps, A/B variants, from real PageView events |
| Team Subscriptions | section on `/admin` | Team metrics, org list, suspend, seat-pricing admin (Stripe price rotation) |
| Flight Coverage | section on `/admin` | /api/flights diagnostics from the route's own payload |
| Camera Network | section on `/admin` | Catalogue totals, per-source health, harvest sync + dry-run request |
| Marketing Studio + Credits + Campaigns + Ambassadors + Drops + Report | sections on `/admin` | Template library, credit pricing/cost controls, campaigns, ambassador queue, daily drops, studio report |
| Competitor Manager | section on `/admin` | DB-backed competitor comparison pages (edit/publish/seed) |
| Newsletter broadcast | section on `/admin` | Broadcast to verified subscribers |
| Admin login | `/admin/login` | Dedicated admin sign-in (credentials + Google), allowlist-gated |

Admin API routes (all allowlist-gated server-side): affiliates (list/detail/
manage/payouts), cameras (+ sync-request), competitors (+ seed), contact
[item], creators [item], newsletter broadcast, onboarding, studio
(ambassadors, campaigns, credits, drops, participations, report, templates
+ seed), teams (list, config, suspend).

Auth model (unchanged by this work): every page checks the session email
against `ADMIN_EMAILS` via `adminEmails()`; non-admins get a redirect to
/admin/login or the "Admin access only" panel. No gating semantics were
touched.

### Built but NOT deployed — the "I don't see any changes" gap

| Surface | Where it sat | Status after this branch |
|---|---|---|
| **Conversion dashboard** `/admin/conversion` | branch `admin-conversion` (f6716ad data layer + 6d7f8a1 page/nav), gated + adjudicated Oct 21, never merged | **MERGED (see §2)** |
| Affiliate dashboard polish | branch `affiliate-dashboard` (61db2a7) | Not merged here — it is primarily the affiliate-*facing* dashboard (`/affiliates/dashboard`) plus admin API trims; separate workstream, left for its own deploy decision |
| Conversion dashboard, enterprise admin, admin-conversion follow-ups in the queued deploy stack (seo/consistency/aeo/voice/index/enterprise/adminconv/pagesexp/perf) | assorted branches | Unchanged; this branch merges only `admin-conversion` as instructed |

### Missing / never built

- No user/subscription *management* UI exists beyond what the dashboard
  shows (no per-user lookup, no comp/refund actions in the UI — Stripe
  dashboard is still the tool for those). Not built here: out of the
  brief's scope, flagged for the owner.
- No mobile layout pass had ever been done on any admin page (this branch).

## 2. The conversion merge

Merged `admin-conversion` (f6716ad + 6d7f8a1) into this branch as merge
commit `005d2ab`. One content conflict, in `src/app/admin/page.tsx`: both
lines had added a header nav link in the same slot (Contact inbox on
master, Conversion on the branch). Resolved by keeping **both** links —
and the resolution was written directly in the new mobile header form
(see §3), later replaced by the shared `AdminNav` component.

Drift verification against current master (the branch was built on
baf7a7c, two waves behind e7c0285):

- Funnel site stages read PageView rows with `event IS NULL` /
  `globe_reached` / `camera_open`. Both emitters verified still live in
  current master: `globe_reached` in `src/components/AnalyticsTracker.tsx`,
  `camera_open` in `src/app/page.tsx` + `CountryCameraExplorer.tsx`.
- PageView columns used (`path`, `sessionId`, `userId`, `referrer`,
  `event`, `utmSource`, `device`) all exist in the current Prisma schema.
- `CheckoutAttempt` model exists (schema line ~467); Subscription
  `stripeSubscriptionId` / `stripeCustomerId` fields exist.
- Funnel definitions untouched: owner-email exclusion from the money
  stages (checkout/trial/first/renewal) is intact in the data layer and
  still labeled on the page ("owner accounts excluded" on each money
  stage + the honesty strip). No stage definitions were altered.
- The branch's own tests (`src/lib/conversion-analytics.test.ts`, 20
  tests) pass against the merged tree; `tsc` was clean immediately after
  the merge, before any mobile edit.

## 3. Mobile optimization (≈390px) — what changed per page

Patterns applied consistently with the existing design system:

- **Shared nav**: new `src/app/admin/AdminNav.tsx` renders all five admin
  sections + "← Site" (+ the Growth Engine external link on the dashboard)
  as ≥40px pills in a horizontally scrollable row on phones, inline on
  large screens, with `aria-current="page"` on the active section. Before
  this, each sub-page hand-rolled its own links: /admin/affiliates had no
  link back to the dashboard at all, and Conversion was unreachable from
  every other admin page.
- **Tables**: every data table now sits in an `overflow-x-auto` region;
  wide tables got a deliberate `min-w-[…]` so columns keep readable widths
  and scroll *inside the card* instead of pushing the page sideways.
- **Tap targets**: nav links, tabs, filter/range pills raised to
  py-2.5 (≈40px); row action buttons (approve/reject/suspend/save/verify…)
  given `min-h-10`; small in-table toggle pills raised to `min-h-9`
  (36px — the one deliberate exception, noted honestly: they sit inside
  horizontally scrolling dense tables where 40px rows would double the
  table height).
- **Shells**: sub-page containers went from `px-6 py-10` to
  `px-4 py-6 sm:px-6 sm:py-10`, and section cards from `p-6` to
  `p-4 sm:p-6`, returning ~16px of content width on phones. Desktop
  rendering is unchanged (all changes are base/`sm:`/`lg:` scoped).

| Page / section | Mobile changes |
|---|---|
| `/admin` (dashboard) | Header stacks on mobile (title block, then AdminNav scroll row) — previously a 5-link row squeezed beside the title and overflowed. Acquisition, Recent subscriptions, Past-due, Top referrers, Top pages, Recent signups tables wrapped in scroll regions (wide ones min-w-[430px]). Visit-strip header wraps. KPI/funnel grids were already 2-up on mobile — unchanged. |
| `/admin/conversion` (new) | AdminNav added (page previously only linked back to /admin). Range pills (24h/7d/30d) → 40px targets. Funnel stage rows stack label-over-stats on phones (the stats line previously could not fit beside the label at 390px). Shell/card padding tightened on mobile. Segment tables were already scroll-wrapped with min-w-[680px]. |
| `/admin/affiliates` | Page header rebuilt on the shared pattern with AdminNav (previously just a "← Site" link). Tab bar buttons → shrink-0, py-2.5 (40px) in their existing scroll row. Shared small-button class → `min-h-10`; search/form inputs → py-2.5. Ledger table already scroll-wrapped (min-w-[640px]). |
| `/admin/competitor-seo` | AdminNav added; day-range presets → 40px targets; shell + card padding tightened on mobile. Per-page table already scroll-wrapped (min-w-[640px]); KPI grid already stacks. |
| `/admin/contact` | AdminNav added (kept the "View form" shortcut, now 40px). Inbox filter pills → py-2.5; message action buttons (Reply / Mark read / Mark resolved / Reopen / Delete) → min-h-10. Message rows are full-width cards — already phone-friendly. Shell padding tightened on mobile. |
| `/admin/login` | No changes needed: already a centered max-w-sm card with py-3 (44px) buttons and full-width inputs. |
| Onboarding & Activation | Filter selects/inputs → py-2.5. The two previously unwrapped tables (session duration, pricing by status) wrapped in scroll regions. Stat grids already 2-up mobile. |
| Team Subscriptions | Filter inputs → py-2.5; organizations table min-w-[780px] inside its scroll region (8 columns had no deliberate width); Suspend/Unsuspend + Save pricing buttons → min-h-10. |
| Creator Applications | Table min-w-[640px] in its scroll region; Approve/Reject → min-h-10. |
| Studio Ambassadors | Table min-w-[700px]; Approve/Reject → min-h-10. |
| Studio Campaigns | Form inputs → py-2.5; participations table min-w-[560px]; status select → min-h-10; Verify/Flag/Create → min-h-10. |
| Studio Drops | Form inputs → py-2.5; drops table min-w-[520px]; Publish → min-h-10. |
| Studio Credits | Pricing table min-w-[640px] in its scroll region (its five columns incl. three numeric inputs had no floor width); checkboxes 16px → 20px; Save → min-h-10. |
| Marketing Studio | Section header wraps (title + counts + Seed button collided on phones). Templates table min-w-[720px]; Active/Featured toggle pills → min-h-9; Edit / New template / Seed / Save / Create → min-h-10; sort input taller. |
| Competitor Manager | Seed button → min-h-10; Edit/Publish text actions got real padding (py-2.5); modal close button got a padded target. Table already scroll-wrapped (min-w-[560px]); edit modal is w-full with p-4 gutters — already OK. |
| Camera Network | Section header wraps (long title + timestamp collided). Source-health table min-w-[560px] inside its scroll card (the "Why" column crushed everything else on phones). Stat/label grids already stack. |
| Flight Coverage | Section header wraps. Providers table already scroll-wrapped (min-w-[520px]). |
| Camera Sync Control | Request button → min-h-10. |
| Newsletter Broadcast | No changes needed: full-width inputs and a py-2.5 send button already meet the targets. |
| Studio Report | No changes needed: key/value lists and 1-col-on-mobile grids already stack cleanly. |

### Verification method (honest)

Class-level audit of every admin route + embedded component (all files
read in full), plus render tests (below). This environment has no
headless-browser screenshot tooling wired for the admin pages, so the
mobile claims rest on the class audit + SSR render tests, not on device
screenshots. The pre-existing `admin-graph.test.ts` (which renders the
real dashboard server-side) still passes, confirming the main page's
structure survived the header/table changes.

### Tests added

- `src/app/admin/AdminNav.test.ts` (3 tests): every section reachable
  from every page's nav, exactly one `aria-current="page"`, scroll-row /
  40px classes present, Growth link only when configured.
- `src/app/admin/conversion/page.test.ts` (7 tests): renders with a
  fabricated `ConversionReport`; all 8 funnel stages in order inside the
  funnel section; ≥4 "owner accounts excluded" labels + the honesty
  strip; biggest-drop-off flag; range links use the real keys; the three
  segment tables render their rows; shared nav reaches all sections.
- Existing `src/lib/conversion-analytics.test.ts` (20 tests, from the
  merged branch) and `src/app/admin/admin-graph.test.ts` (3 tests) pass.

## 4. Gate results

All run on the final tree (merge + mobile work + new tests):

- `npx tsc --noEmit` — **clean, exit 0** (also clean immediately after
  the merge, before any mobile edit).
- Full vitest suite — **3,038 passed, 23 skipped, exactly 2 failed**,
  and the 2 failures are precisely the known baselines
  (`src/lib/oi/context.test.ts`, `src/app/api/cctv/route.test.ts`).
  Baseline-exact. New tests included in that run: conversion lib (20),
  conversion page render (7), AdminNav (3), admin graph (3).
- `npm run build` — **exit 0**; route table contains every admin route:
  `/admin`, `/admin/affiliates`, `/admin/competitor-seo`, `/admin/contact`,
  `/admin/conversion` (new), `/admin/login`, and all `/api/admin/*`
  routes.

Commits on `feature/admin-mobile`:

- `005d2ab` — Merge branch 'admin-conversion' into feature/admin-mobile
  (conflict in the dashboard header nav resolved keeping both the
  Contact inbox and Conversion links).
- The mobile overhaul + AdminNav + tests + this report (see git log).

Not deployed, not pushed — adjudication and deploy stay with Cosmo.
Suggested verification after deploy: open /admin and /admin/conversion on
a phone — the header nav should scroll sideways without pushing the page,
and every table should scroll inside its card.
