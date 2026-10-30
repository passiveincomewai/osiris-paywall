/**
 * Pin test for the Powder Pass popup's flag gating (#6): the gate
 * component is the ONLY path to the trigger, and it returns null
 * unless powderPassEnabled() is on — the popup cannot render, claim,
 * or emit while the launch flag is off.
 */
import { afterEach, describe, expect, it } from "vitest";
import PowderPassGate from "./PowderPassGate";
import PowderPassTrigger from "./PowderPassTrigger";

const ENV_KEY = "POWDER_PASS_ENABLED";
const saved = process.env[ENV_KEY];
afterEach(() => {
  if (saved === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = saved;
});

describe("PowderPassGate", () => {
  it("renders nothing while the flag is off (the shipped-dark state)", () => {
    delete process.env[ENV_KEY];
    expect(PowderPassGate()).toBeNull();
  });

  it("renders nothing for a falsey flag value", () => {
    process.env[ENV_KEY] = "0";
    expect(PowderPassGate()).toBeNull();
  });

  it("mounts the trigger with the real ski plan terms when the flag is on", () => {
    process.env[ENV_KEY] = "1";
    const el = PowderPassGate() as unknown as {
      type: unknown;
      props: {
        option: { price: string; per: string; trialLabel: string; cta: string };
      };
    } | null;
    expect(el).not.toBeNull();
    expect(el?.type).toBe(PowderPassTrigger);
    // Terms come straight from CHECKOUT_PLAN_SUMMARIES.ski — the same
    // summary PowderPassPromo renders from.
    expect(el?.props.option.price).toBe("$4.99");
    expect(el?.props.option.per).toBe("/month");
    expect(el?.props.option.trialLabel).toBe("10 days free");
    expect(el?.props.option.cta).toBe("Start 10-Day Free Trial");
  });
});
