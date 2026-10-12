import { describe, it, expect } from "vitest";
import { appBaseUrl, PRODUCTION_APP_URL } from "./app-url";

describe("appBaseUrl", () => {
  it("prefers an explicit NEXT_PUBLIC_APP_URL over everything", () => {
    expect(
      appBaseUrl({
        NEXT_PUBLIC_APP_URL: "https://example.com",
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        VERCEL_URL: "osiris-lime.vercel.app",
      })
    ).toBe("https://example.com");
  });

  it("trims a trailing slash from the explicit override", () => {
    expect(appBaseUrl({ NEXT_PUBLIC_APP_URL: "https://example.com/" })).toBe(
      "https://example.com"
    );
  });

  it("treats an empty NEXT_PUBLIC_APP_URL as unset", () => {
    expect(
      appBaseUrl({ NEXT_PUBLIC_APP_URL: "", NODE_ENV: "production" })
    ).toBe(PRODUCTION_APP_URL);
  });

  /* Regression (2026-10-12): activation-email links pointed at
     osiris-lime.vercel.app because VERCEL_URL won over the custom domain.
     In production the custom domain must ALWAYS win over VERCEL_URL. */
  it("uses worldeye.app in production even when VERCEL_URL is set", () => {
    expect(
      appBaseUrl({
        NODE_ENV: "production",
        VERCEL_URL: "osiris-lime.vercel.app",
      })
    ).toBe("https://worldeye.app");
  });

  it("uses worldeye.app when only VERCEL_ENV marks production", () => {
    expect(
      appBaseUrl({
        VERCEL_ENV: "production",
        VERCEL_URL: "osiris-lime.vercel.app",
      })
    ).toBe("https://worldeye.app");
  });

  it("uses the deployment URL for preview deployments", () => {
    expect(
      appBaseUrl({
        VERCEL_ENV: "preview",
        VERCEL_URL: "osiris-git-branch.vercel.app",
      })
    ).toBe("https://osiris-git-branch.vercel.app");
  });

  it("falls back to localhost for local development", () => {
    expect(appBaseUrl({ NODE_ENV: "development" })).toBe(
      "http://localhost:3000"
    );
    expect(appBaseUrl({})).toBe("http://localhost:3000");
  });
});
