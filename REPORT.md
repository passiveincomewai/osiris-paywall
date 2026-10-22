# Invite-link fix — report

Branch `fix/invite-link` off production `e7c0285`. Not deployed, not pushed.

## The bug, as reported

In the "Invite a friend — get 15 more camera checks" section, the share
link read `https://worldeye.app/ref/test` — apparently a placeholder.
Owner: "when user clicks generate link it makes a test link — fix this
and make sure it tracks invites properly."

## Root cause (verified against the production DB)

The link was NOT a hardcoded placeholder — it was worse: it was a real,
working referral code that the system had generated *from the account
name*.

`POST /api/affiliate/join` minted referral codes with
`slugify(session.user.name || email local part)`. Testing on
2026-10-22 ~00:16 MDT, Jameson created an account named **"Test"**
(theboodirectory@gmail.com), tapped "Get my invite link", and was
issued the code **`test`** — stored in `AffiliateProfile.referralCode`
(created 2026-10-22 06:16:33 UTC, still there). Another profile,
"Test123", holds code `test123` by the same path. The invite UI
(`InviteFriendsSection` → `GET /api/cameras/invite`) faithfully
rendered the stored code, producing the screenshot.

Name-derived codes are broken beyond the cosmetics:

- indistinguishable from a test/placeholder link (this report);
- they leak the owner's name/email local part in every shared link;
- they are guessable and squattable — the first "Test" owns `/ref/test`
  permanently;
- collision suffixes were 3-digit numbers (`test` → `test483`), so the
  code space for common names was tiny.

## The fix

- **New `src/lib/affiliate/referral-code.ts`**: `referralCodeCandidate()`
  mints a random 10-character code from a 31-symbol unambiguous
  alphabet (no l/o/0/1) via `crypto.randomInt` — 31^10 ≈ 2^49.6 space.
  `mintReferralCode(isTaken)` retries on collision and throws rather
  than ever issuing a taken or malformed code.
- **`POST /api/affiliate/join`** now mints through it. The taken-check
  covers both profile code fields (`referralCode`, `customCode`) AND
  share-identity codes, since `/ref` resolves across both namespaces.
  Name/email are no longer inputs to code generation. `slugify` and the
  old `uniqueCode` are deleted. If minting ever exhausts retries the
  join fails honestly with a 500 + retry message instead of inventing a
  code.
- **Existing profiles are untouched** — codes already issued (including
  `test`) keep resolving, so links already shared keep working. Only
  new joins get random codes. (Whether to rotate the two name-derived
  codes already in the DB — `test`, `test123`, both the owner's test
  accounts — is an owner/data call, not made here.)

The invite UI itself needed no change: it already renders only the
server-returned real link, shows "Loading your invite link…" (no URL)
while resolving, and shows a sign-in prompt when signed out. A test pin
now locks that in (below).

## Chain audit — hop by hop

1. **Link generation/display** — FIXED (above). `/api/cameras/invite`
   returns `customCode ?? referralCode` for an *active* profile, null
   otherwise; the component's states are loading / signed-out prompt /
   "Get my invite link" (POSTs the join endpoint, then re-reads) /
   link + Share/Copy. HeaderProfileMenu reads the same code via
   `/api/affiliate/invite-status`. No placeholder exists in any state.
2. **`/ref/[code]` landing** — VERIFIED. Validates the code
   (`REF_CODE_RE`), records a `ReferralClick` (with per-day XP dedupe),
   sets the httpOnly `we_ref` cookie carrying the *canonical* code for
   the settings attribution window (30 days), redirects to the globe
   with deep-link params intact. Anonymous share codes take the
   parallel path (ShareClick + same cookie, pending until claimed).
3. **Signup attribution** — VERIFIED + now pinned by an integration
   test. `AffiliateAttributionSync` is mounted in the ROOT layout and
   fires `POST /api/affiliate/sync-signup` once per browser session for
   any signed-in user — so credentials, Google and magic-link signups
   all attribute identically (session-driven, not method-driven).
   Sync-signup resolves the cookie via `attributeUserToAffiliate` →
   `linkAttribution`: first-write-wins (unique `referredUserId`),
   self-referral refused, suspended/unknown codes ignored. Guest
   checkout is covered twice: the Stripe webhook's `invoice.
   payment_succeeded` handler links from subscription metadata (or the
   cookie fallback) and grants, and the claimed account's next
   signed-in page load runs the same sync.
4. **Invite count** — VERIFIED. `/api/affiliate/invite-status` counts
   `ReferralAttribution` rows for the profile — the same rows the sync
   creates, so what the tracker shows is what the bonus pays on.
5. **+15 camera-checks bonus** — VERIFIED, matches the UI copy.
   `grantInviteCameraBonus(invitee)` pays the inviter exactly once per
   invited friend (unique `CameraBonusGrant.inviteeUserId` ledger;
   balance in `CameraBonusAccount`). It fires at the moment attribution
   lands — i.e. when the friend JOINS, as the copy promises ("The bonus
   lands when a friend joins WorldEye with your link") — from
   sync-signup, from the share-claim flush, and as a self-heal from the
   webhook invoice handler for guest-checkout-created accounts. It is
   NOT gated on the friend paying; the webhook call is a backstop for
   accounts born at checkout, not the trigger.
6. **Commission attribution** — UNTOUCHED. `linkAttribution`'s
   first-write-wins rule and the webhook's metadata-first/cookie-
   fallback order are unchanged; this diff does not touch the webhook,
   attribution lib, or bonus lib at all.

## Tests added (all passing)

- `src/lib/affiliate/referral-code.test.ts` (5) — candidate format /
  alphabet / length / REF_CODE_RE validity; 200 candidates unique;
  minter returns first free candidate, skips taken ones, throws after
  maxTries instead of issuing a taken code.
- `src/app/api/affiliate/join/route.test.ts` (6) — 401 signed out;
  existing profile re-join is a no-op; **regression: a user named
  "Test" receives a random-format code that is not "test" and contains
  no name/email fragment**; profile-code and share-code collisions are
  skipped; an existing attribution is re-applied as `recruitedBy`.
- `src/app/api/affiliate/sync-signup/route.test.ts` (6) — the full hop
  against the REAL attribution + bonus libs over a fake DB: cookie →
  attribution row → inviter balance 15; re-fire is idempotent (one
  row, one grant, balance stays 15); self-referral and unknown/no
  cookie attribute and pay nothing.
- `src/components/InviteFriendsSection.test.ts` (+1 pin) — the loading
  shell contains no `/ref/` URL at all: no placeholder in any state.
- Pre-existing `src/lib/camera-bonus.test.ts` pins (pay-on-join,
  idempotent per invitee, stacking, no self-pay) all still pass.

## Gates

- `npx tsc --noEmit` — clean (exit 0).
- Targeted run (5 files, 29 tests) — all pass.
- Full suite — 3,025 passed / 2 failed / 23 skipped (3,050). The only
  failures are the two known baselines, byte-identical to every other
  tree: `src/lib/oi/context.test.ts` and
  `src/app/api/cctv/route.test.ts`.

## Files changed

- `src/lib/affiliate/referral-code.ts` (new)
- `src/lib/affiliate/referral-code.test.ts` (new)
- `src/app/api/affiliate/join/route.ts` (random minting; slugify deleted)
- `src/app/api/affiliate/join/route.test.ts` (new)
- `src/app/api/affiliate/sync-signup/route.test.ts` (new)
- `src/components/InviteFriendsSection.test.ts` (no-placeholder pin)

Untracked debris file `off` sits in the worktree root (not mine —
same stray file seen in sibling worktrees); left untracked and out of
the commit.
