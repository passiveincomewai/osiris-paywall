// Render + validation pins for the /welcome claim form (scope E):
//  - the page shell carries .docs-root (viewport-lock release — without it
//    the submit button sits below the fold on a phone, unreachable);
//  - the claim form has a real, sticky, full-width submit button and
//    prints every field rule up front;
//  - validation is per-field and client-side (a password mismatch flags
//    the confirm field with no API round trip);
//  - the "what happens next" block renders the completion figures
//    (trial end, first charge, reminder promise, guarantee) as steps;
//  - an already-registered purchase email gets the honest existing-
//    account notice + sign-in path instead of a bare create form.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));

import WelcomeClient, {
  ClaimFormView,
  WelcomeNextSteps,
  validateClaimForm,
  type ClaimValues,
} from "./WelcomeClient";

const normalize = (html: string) =>
  html
    .replace(/<!-- -->/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&amp;/g, "&");

const VALID: ClaimValues = {
  username: "Jameson",
  phone: "+1 801 555 1234",
  password: "hunter2-hunter2",
  confirm: "hunter2-hunter2",
};

const noop = () => {};

function renderForm(overrides: Partial<Parameters<typeof ClaimFormView>[0]> = {}) {
  return normalize(
    renderToString(
      createElement(ClaimFormView, {
        existingAccount: false,
        hasPassword: false,
        values: VALID,
        errors: {},
        serverError: null,
        saving: false,
        onChange: noop,
        onSubmit: noop,
        ...overrides,
      }),
    ),
  );
}

describe("WelcomeClient shell", () => {
  it("renders inside a .docs-root shell so the page scrolls on mobile", () => {
    const html = normalize(renderToString(createElement(WelcomeClient)));
    expect(html).toContain("docs-root");
  });
});

describe("validateClaimForm", () => {
  it("accepts a fully valid form", () => {
    expect(validateClaimForm(VALID)).toEqual({});
  });

  it("flags a password mismatch on the CONFIRM field only", () => {
    const errors = validateClaimForm({ ...VALID, confirm: "hunter2-hunter3" });
    expect(errors.confirm).toBe("Passwords don't match.");
    expect(errors.password).toBeUndefined();
    expect(errors.username).toBeUndefined();
    expect(errors.phone).toBeUndefined();
  });

  it("flags each broken rule on its own field", () => {
    const errors = validateClaimForm({ username: "J", phone: "123", password: "short", confirm: "short" });
    expect(errors.username).toBe("Username must be at least 2 characters.");
    expect(errors.phone).toBe("Enter a valid phone number.");
    expect(errors.password).toBe("Password must be at least 8 characters.");
    expect(errors.confirm).toBeUndefined();
  });

  it("flags an over-long username and password", () => {
    const errors = validateClaimForm({
      ...VALID,
      username: "x".repeat(33),
      password: "y".repeat(129),
      confirm: "y".repeat(129),
    });
    expect(errors.username).toBe("Username must be under 32 characters.");
    expect(errors.password).toBe("Password must be under 128 characters.");
  });
});

describe("ClaimFormView", () => {
  it("has a real submit button — sticky, full-width, ≥48px — labeled for a new account", () => {
    const html = renderForm();
    expect(html).toContain('type="submit"');
    expect(html).toContain("Create my Pro account");
    expect(html).toContain("sticky");
    expect(html).toContain("min-h-[52px]");
    expect(html).toContain("w-full");
  });

  it("prints every field rule up front, before any error", () => {
    const html = renderForm();
    expect(html).toContain("Your display name across WorldEye — 2 to 32 characters.");
    expect(html).toContain("PHONE NUMBER");
    expect(html).toContain("(required)");
    expect(html).toContain("7–15 digits. Saved to your account profile");
    expect(html).toContain("At least 8 characters (up to 128).");
  });

  it("shows no existing-account notice for a brand-new buyer", () => {
    expect(renderForm()).not.toContain("already has a WorldEye account");
  });

  it("renders a field error inline with aria wiring on the confirm field", () => {
    const html = renderForm({ errors: { confirm: "Passwords don't match." } });
    expect(html).toContain("Passwords don't match.");
    expect(html).toContain('id="claim-confirm-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="claim-confirm-error"');
  });

  it("existing account with a password: notice, sign-in path, update-label button", () => {
    const html = renderForm({ existingAccount: true, hasPassword: true });
    expect(html).toContain("This email already has a WorldEye account");
    expect(html).toContain("Your purchase is already linked to that account");
    expect(html).toContain('href="/signin"');
    expect(html).toContain("Sign in instead");
    expect(html).toContain("Update my account & continue");
  });

  it("existing Google-only account: honest 'adds a password' wording", () => {
    const html = renderForm({ existingAccount: true, hasPassword: false });
    expect(html).toContain("you usually sign in with Google");
    expect(html).toContain("adds a password to your account");
    expect(html).toContain('href="/signin"');
  });
});

describe("WelcomeNextSteps", () => {
  it("trial: renders trial end, reminder promise, first charge and guarantee as steps", () => {
    const html = normalize(
      renderToString(
        createElement(WelcomeNextSteps, {
          email: "buyer@example.com",
          plan: "annual",
          trialEndsAt: "2026-10-23T12:00:00.000Z",
          chargeLabel: "$74.99/year",
        }),
      ),
    );
    expect(html).toContain("WHAT HAPPENS NEXT");
    expect(html).toContain("VIP Pro free trial is on");
    expect(html).toContain("no charge until");
    expect(html).toContain("We email you before the first charge");
    expect(html).toContain("First charge: $74.99/year");
    expect(html).toContain("7-day money-back guarantee");
  });

  it("non-trial: payment confirmed, one step left, guarantee still stated", () => {
    const html = normalize(
      renderToString(
        createElement(WelcomeNextSteps, {
          email: "buyer@example.com",
          plan: "annual",
          trialEndsAt: null,
          chargeLabel: "$74.99/year",
        }),
      ),
    );
    expect(html).toContain("Payment confirmed");
    expect(html).toContain("One step left");
    expect(html).toContain("7-day money-back guarantee");
    expect(html).not.toContain("free trial is on");
  });
});
