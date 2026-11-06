import { describe, expect, it } from "vitest";
import { getPushConfig, getVapidPublicKey, pushConfigured } from "./config";

const envOf = (o: Record<string, string>): NodeJS.ProcessEnv =>
  o as unknown as NodeJS.ProcessEnv;

describe("getPushConfig", () => {
  it("is inert without VAPID keys", () => {
    expect(getPushConfig(envOf({}))).toBeNull();
    expect(pushConfigured(envOf({}))).toBe(false);
    expect(getVapidPublicKey(envOf({}))).toBeNull();
  });

  it("is inert with only one half of the pair", () => {
    expect(getPushConfig(envOf({ VAPID_PUBLIC_KEY: "pub" }))).toBeNull();
    expect(getPushConfig(envOf({ VAPID_PRIVATE_KEY: "priv" }))).toBeNull();
  });

  it("is inert with blank keys", () => {
    expect(
      getPushConfig(envOf({ VAPID_PUBLIC_KEY: "  ", VAPID_PRIVATE_KEY: "priv" })),
    ).toBeNull();
  });

  it("returns the pair with a default mailto subject", () => {
    const env = envOf({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" });
    expect(getPushConfig(env)).toEqual({
      publicKey: "pub",
      privateKey: "priv",
      subject: "mailto:contact@worldeye.app",
    });
    expect(pushConfigured(env)).toBe(true);
    expect(getVapidPublicKey(env)).toBe("pub");
  });

  it("honours an explicit VAPID_SUBJECT", () => {
    const env = envOf({
      VAPID_PUBLIC_KEY: "pub",
      VAPID_PRIVATE_KEY: "priv",
      VAPID_SUBJECT: "mailto:alerts@example.com",
    });
    expect(getPushConfig(env)?.subject).toBe("mailto:alerts@example.com");
  });
});
