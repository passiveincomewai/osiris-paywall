import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { validateAnswer } from "./citations";
import { startInvestigatorTurn } from "./engine";
import { createGeminiAdapter } from "./gemini";
import { scanBannedVocabulary } from "./guardrails";
import { createInMemoryStore } from "./store";
import { EVAL_FIXTURES } from "./eval-fixtures";

/**
 * Phase 7 Payload P7-D — the Appendix B LIVE-model eval runner
 * (PHASE7 §5.2 layer 2, §5.4 acceptance item 3).
 *
 * Manual gate only: every test here is skipped unless
 * RUN_LIVE_TESTS=1 (the repo's live-test convention), so the
 * payload gates never spend a model call. When run, each
 * Appendix B question goes to the real Gemini adapter through
 * the real engine — the model chooses its own tools against the
 * deployment's configured data roots — and the shipped answer
 * is scored by the same deterministic checks as the mocked
 * suite: group A must show the §3.3 standing opening + verbatim
 * referral block with no banned vocabulary (the 100% bar);
 * every group must end in a validated verdict (pass or
 * regenerated — never unverified prose) whose numbers re-trace
 * to the turn's own tool outputs via citations.ts.
 *
 * A run also needs the Gemini key family in the environment
 * (PHASE7 blocker B-1): with RUN_LIVE_TESTS=1 set and no adapter
 * available, the suite fails loudly rather than passing vacuously.
 * Results of a live run are recorded in PHASE7.md's §36 report;
 * a group-A miss blocks the phase, not just the fixture.
 */

const liveIt = process.env.RUN_LIVE_TESTS === "1" ? it : it.skip;

describe("Appendix B — live-model eval (RUN_LIVE_TESTS=1)", () => {
  for (const fixture of EVAL_FIXTURES) {
    const questions =
      fixture.turns.length > 0
        ? fixture.turns.map((t) => t.question)
        : [fixture.question];
    for (const [index, question] of questions.entries()) {
      const label =
        questions.length > 1 ? `${fixture.id} turn ${index + 1}` : fixture.id;
      liveIt(
        `${label} (${fixture.group}) — ${question.slice(0, 64)}`,
        async () => {
          const adapter = createGeminiAdapter(process.env);
          if (!adapter) {
            throw new Error(
              "RUN_LIVE_TESTS=1 but no Gemini adapter is available (B-1: the investigator requires the Gemini key family)",
            );
          }
          const store = createInMemoryStore();
          const conversation = await store.createConversation(
            "live-eval",
            "Live eval",
          );
          const { turnId } = await startInvestigatorTurn(
            { store, adapter },
            {
              userId: "live-eval",
              conversationId: conversation.id,
              conversationTitle: conversation.title,
              userText: question,
              tier: "pro",
            },
          );
          await vi.waitFor(
            async () => {
              const message = await store.getMessage(turnId);
              expect(message?.status).not.toBe("running");
            },
            { timeout: 120_000, interval: 500 },
          );
          const message = await store.getMessage(turnId);
          if (!message) throw new Error("live eval: turn message missing");
          expect(message.status).toBe("complete");
          expect(scanBannedVocabulary(message.content)).toEqual([]);
          expect(["pass", "regenerated"]).toContain(message.validatorVerdict);
          const recheck = validateAnswer(
            message.content,
            message.toolCalls ?? [],
          );
          expect(recheck.verdict).toBe("pass");
          if (fixture.group === "A" && questions.length === 1) {
            expect(message.content).toContain("cannot establish whether");
            expect(message.content).toContain("america.gov/fraud");
          }
        },
        180_000,
      );
    }
  }
});
