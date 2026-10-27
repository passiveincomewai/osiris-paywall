// Signup form newsletter opt-in pins: the checkbox exists, carries the
// agreed label, starts UNCHECKED, and its state rides the signup POST
// as newsletterOptIn (the route subscribes only when it arrives true).
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));

import SignupForm from "./SignupForm";

const html = renderToString(
  createElement(SignupForm, { callbackUrl: "/", googleEnabled: false }),
).replace(/<!-- -->/g, "");

describe("SignupForm — newsletter opt-in", () => {
  it("renders the opt-in checkbox with its label", () => {
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("Email me WorldEye updates — new cameras, features and offers");
  });

  it("starts unchecked — opting in is a deliberate tick", () => {
    const checkbox = html.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0] ?? "";
    expect(checkbox).not.toContain("checked");
  });

  it("sends the checkbox state as newsletterOptIn with the signup POST", () => {
    const source = readFileSync(join(process.cwd(), "src/app/(en)/signup/SignupForm.tsx"), "utf8");
    expect(source).toContain("newsletterOptIn");
    expect(source).toContain("JSON.stringify({ name, email, password, newsletterOptIn })");
    expect(source).toContain("useState(false)");
  });
});
