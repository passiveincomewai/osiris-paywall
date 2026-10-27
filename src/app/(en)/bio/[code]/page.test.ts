// Bio page (/bio/[code]) contract tests:
//  - every CTA href is exactly /ref/<the affiliate's code> (attribution
//    rides the existing ref flow — no other outbound CTA is allowed)
//  - unknown codes 404 (notFound)
//  - showcase creations render only when the affiliate opted in
//  - no private data (email) ever reaches the rendered tree
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
    affiliateProfile: { findUnique: vi.fn() },
    studioCreation: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/affiliate/attribution", () => ({
  findAffiliateByCode: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import BioPage from "./page";
import { db } from "@/lib/db";
import { findAffiliateByCode } from "@/lib/affiliate/attribution";

const findByCode = findAffiliateByCode as unknown as ReturnType<typeof vi.fn>;
const userFind = db.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const profileFind = db.affiliateProfile.findUnique as unknown as ReturnType<typeof vi.fn>;
const creationFind = db.studioCreation.findMany as unknown as ReturnType<typeof vi.fn>;

/** Collect every href prop and every text node in a React element tree. */
function walk(node: unknown, hrefs: string[], texts: string[]): void {
  if (node == null || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    texts.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) walk(child, hrefs, texts);
    return;
  }
  if (typeof node === "object") {
    const el = node as { props?: Record<string, unknown> };
    if (el.props) {
      if (typeof el.props.href === "string") hrefs.push(el.props.href);
      walk(el.props.children, hrefs, texts);
    }
  }
}

async function renderBio(code: string) {
  const tree = await BioPage({ params: Promise.resolve({ code }) });
  const hrefs: string[] = [];
  const texts: string[] = [];
  walk(tree, hrefs, texts);
  return { tree, hrefs, texts };
}

beforeEach(() => {
  vi.clearAllMocks();
  findByCode.mockResolvedValue({ id: "prof1", userId: "user1" });
  userFind.mockResolvedValue({ name: "Test Creator", email: "secret@example.com" });
  profileFind.mockResolvedValue({
    showcaseEnabled: true,
    referralCode: "testcode",
    customCode: null,
  });
  creationFind.mockResolvedValue([
    {
      id: "c1",
      title: "My first ad",
      kind: "image",
      createdAt: new Date("2026-10-10T00:00:00Z"),
      template: { title: "Earth From Above" },
    },
  ]);
});

describe("bio page attribution routing", () => {
  it("routes every CTA through /ref/<code> and nothing else", async () => {
    const { hrefs } = await renderBio("testcode");
    expect(hrefs.length).toBe(2);
    for (const href of hrefs) expect(href).toBe("/ref/testcode");
  });

  it("uses the custom code in CTAs when the affiliate has one", async () => {
    profileFind.mockResolvedValue({
      showcaseEnabled: false,
      referralCode: "testcode",
      customCode: "custom1",
    });
    const { hrefs } = await renderBio("testcode");
    expect(hrefs).toEqual(["/ref/custom1", "/ref/custom1"]);
  });

  it("404s for unknown codes", async () => {
    findByCode.mockResolvedValue(null);
    await expect(renderBio("nope")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("bio page showcase + privacy", () => {
  it("shows featured creations only when the affiliate opted in", async () => {
    const on = await renderBio("testcode");
    expect(on.texts.join(" ")).toContain("My first ad");
    expect(creationFind).toHaveBeenCalledTimes(1);

    profileFind.mockResolvedValue({
      showcaseEnabled: false,
      referralCode: "testcode",
      customCode: null,
    });
    const off = await renderBio("testcode");
    expect(off.texts.join(" ")).not.toContain("My first ad");
    expect(creationFind).toHaveBeenCalledTimes(1); // not queried again
  });

  it("never renders private data (email) even when the row carries it", async () => {
    const { tree } = await renderBio("testcode");
    expect(JSON.stringify(tree)).not.toContain("secret@example.com");
  });
});
