# Camera harvest sync

How the OpenCCTV harvest source (30,889 probe-verified cameras in five
regional shards, `src/app/api/cctv/opencctv-harvest.generated.ts`) is
refreshed, and how its health is watched. Built in expansion Stage E;
the pipeline itself is Stage B/C (`tools/harvest-opencctv.ts`,
`src/lib/camera-expansion/`), the audit is
`~/workspace/worldeye-camera-expansion/AUDIT.md`.

## Why a sync is a tool run, not a cron endpoint

Regeneration walks the full 137,080-id OpenCCTV index, dedupes every
candidate against the served catalogue, and probe-verifies each
surviving feed with per-host pacing. That takes far longer than any
Vercel function may run, and the working caches (fetched records, probe
verdicts — ~200 MB) live in the expansion workspace, not in git. The
repo's only scheduled-job convention is Vercel cron hitting
`/api/cron/*` endpoints (see `vercel.json`), which cannot do this work;
so the sync runs on the catalogue machine as
`tools/sync-cameras.ts`, and what reaches the deployed site is its
output: the regenerated source file (write mode) plus three committed
artifacts the admin dashboard reads:

| Artifact | Contents |
|---|---|
| `src/lib/camera-expansion/reports/harvest-latest-write.json` | The last write run's full reconciliation report |
| `src/lib/camera-expansion/reports/harvest-latest-dry-run.json` | The last dry run's report |
| `src/lib/camera-expansion/harvest-health.json` | Per-camera probe verdicts joined to the generation (per-shard verified timestamps + the oldest verifications) |
| `src/lib/camera-expansion/sync-status.json` | The last sync's time, mode, verdict, and counts |

## Running it

```sh
npm run build   # the baseline server needs a production build
npx esbuild tools/sync-cameras.ts --bundle --platform=node \
  --format=esm --alias:@=./src --outfile=node_modules/.cache/sync-cameras.mjs

node node_modules/.cache/sync-cameras.mjs --dry-run   # report only
node node_modules/.cache/sync-cameras.mjs --write     # regenerate + artifacts
node node_modules/.cache/sync-cameras.mjs --refresh-artifacts  # artifacts only
```

Then review `git diff` and commit the generated source + artifacts
together (Jameson's authorship). Rollback is a revert of that commit —
the catalogue's runtime behaviour is unchanged by construction.

### Baseline discipline (do not relax)

The harvest dedupes against a baseline catalogue. The repo's saved
snapshot (`.cache/cctv-catalog.json`) leaks harvest records past the
`OSIRIS_CCTV_OCC_HARVEST=off` flag, so a baseline captured from a normal
server silently contains the very records being regenerated (Stage C/D
found this the hard way — it is also what made the idempotency run
meaningful only after the fact). The wrapper therefore:

1. starts a throwaway `next start` with `OSIRIS_CCTV_OCC_HARVEST=off`
   and `OSIRIS_CCTV_SNAPSHOT` pointing at a **fresh temp file**,
2. waits for that instance to build a complete non-harvest catalogue,
3. deletes the harvest tool's 1-hour baseline cache so the capture is
   genuinely fresh, and
4. runs the harvest against that instance's `/api/cctv?region=all`.

`--baseline-url=<url>` skips the throwaway server; the refusal gates
assume the URL is a flag-off server, so only pass one you started the
same way.

### Probe-cache reuse

Verdicts are reused under TTLs (the harvest tool's own discipline,
passed explicitly by the wrapper): alive verdicts 168 h, dead verdicts
24 h. At the recommended weekly cadence, a weekly `--write` run
re-verifies everything alive from scratch, retries anything that read
dead within the last day, and never hammers a dead host more than once
per run.

### Refusal gates

A sync whose report trips a gate exits 2, writes **nothing** to the
generated source, and records the refusal in `sync-status.json`:

- the run's accounting does not reconcile;
- the Windy family produced verified-new records (Windy is structurally
  excluded on licensing grounds; any appearance means the family
  registry changed and a human must review it);
- the regenerated set shrinks the harvest by >5% (override:
  `--allow-shrink`) — a probe outage must not wipe the source;
- it grows by >50% (override: `--allow-growth`);
- the baseline came back partial and >10% smaller than the previous
  run's baseline.

Rules live in `src/lib/camera-expansion/sync-gate.ts` with unit tests.

## Schedule recommendation

**Weekly**, one `--write` run on the catalogue machine (with a
`--dry-run` first if the previous run was refused or the registry
changed). That cadence matches the data: agency indexes change over
weeks, alive probe verdicts expire at 7 days, and the admin dashboard's
verification-age bands (fresh ≤7d, aging 8–30d, stale >30d) are tuned
so a missed week reads as "aging", not "stale". There is deliberately
no external cron infrastructure for this: the trigger is the operator
(or a scheduled agent task on the catalogue machine) running the
command above — plus dashboard requests (next section).

## Dashboard dry-run requests

The admin Camera Network section has a "Request a dry-run sync"
button. It records a timestamped request in
`.cache/camera-sync/requests.json` — nothing more. It does not, and
cannot, run the harvest from the web tier. The runner checks that file
before every run; a pending request is satisfied by the run and stamped
in `sync-status.json`, and the run's report appears in the dashboard as
the latest dry run. (On a deployed Vercel instance the `.cache`
directory is instance-local and ephemeral; the runner acts on the copy
on the catalogue machine. The button's own copy states this.)

## Source health (what the dashboard watches)

Per-source status is computed in `src/lib/camera-expansion/health.ts`
from three real inputs: the source cache's observation registry
(`src/lib/sourceCache.ts` — every fetch outcome since boot), the
catalogue this instance currently holds (`cctvCatalogueState()` in the
cctv route), and the saved catalogue as baseline expectation.

- **Silent absence is DOWN.** A source (region or feed label inside a
  composite region) whose baseline holds cameras and which currently
  serves zero is down, never "healthy at zero" — the DriveBC failure
  shape, now caught mechanically at both region and label level.
- **Serving stale after a failed refresh is DEGRADED**, as is a >40%
  drop against baseline.
- **Gated sources** (deliberately switched off, reason on record in
  `GATED_SOURCES`) report as GATED, not down. Currently: the direct
  WSDOT fetcher — its endpoint (`data.wsdot.wa.gov/log/public/
  cameras.json`) answers 404 (verified from the sandbox and production,
  2026-10-18) and the file is retired. Washington coverage is carried
  by the harvest's wsdot family (1,174 probe-verified cameras).
  Re-enable with `OSIRIS_CCTV_WSDOT=on` if WSDOT republishes an
  endpoint — and re-verify before making that a default.
- **Harvest shards** are static between syncs, so their health is the
  per-camera verification age from `harvest-health.json`: a shard reads
  degraded when >10% of its cameras were last verified over 30 days
  ago — i.e. when a sync is overdue.
