// ── Lifecycle email dry run ──────────────────────────────────────────
// Renders every lifecycle email that is DUE right now — real recipients,
// real copy — and sends NOTHING and logs NOTHING. Each render is written
// as an .html file so the owner can read the exact emails before the
// system ever sends one, plus a summary.json with the run's decisions.
//
// Run (from the repo root), bundling the way the other ops tools do:
//   npx esbuild tools/lifecycle-dry-run.ts --bundle --platform=node \
//     --outfile=/tmp/lifecycle-dry-run.mjs --external:@prisma/client --external:stripe
//   node /tmp/lifecycle-dry-run.mjs <output-dir>
// Requires DATABASE_URL (+ AUTH_RESEND_KEY is NOT needed; nothing sends).

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runLifecycleEmails } from "../src/lib/lifecycle/engine";
import { sendWeeklyDigest } from "../src/lib/lifecycle/digest";

async function main() {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error("usage: lifecycle-dry-run <output-dir>");
    process.exit(2);
  }
  await mkdir(outDir, { recursive: true });
  const summary = await runLifecycleEmails({ dryRun: true });
  let i = 0;
  for (const rec of summary.sent) {
    i++;
    const file = `${String(i).padStart(2, "0")}-${rec.template}-${rec.userId}.html`;
    await writeFile(join(outDir, file), rec.html ?? "", "utf8");
  }
  // The weekly digest, same treatment: this issue's real content,
  // rendered once, with the eligible-recipient count. Sends nothing.
  const digest = await sendWeeklyDigest({ dryRun: true });
  if (digest.sampleHtml) {
    await writeFile(join(outDir, "digest.html"), digest.sampleHtml, "utf8");
  }
  await writeFile(
    join(outDir, "summary.json"),
    JSON.stringify(
      {
        dryRun: true,
        evaluated: summary.evaluated,
        wouldSend: summary.sent.map(({ template, userId, email, subject, kind }) => ({
          template,
          userId,
          email,
          subject,
          kind,
        })),
        skipped: summary.skipped,
        errors: summary.errors,
        digest: {
          issueKey: digest.issueKey,
          hasContent: digest.hasContent,
          recipients: digest.recipients,
          wouldSend: digest.sent,
          skipped: digest.skipped,
          sampleSubject: digest.sampleSubject ?? null,
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(
    `dry run: ${summary.sent.length} email(s) would send, ${summary.evaluated} evaluated, ` +
      `${summary.errors.length} section error(s). Renders in ${outDir}`,
  );
  if (summary.errors.length > 0) {
    console.error(summary.errors.join("\n"));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
