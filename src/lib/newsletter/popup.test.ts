import { describe, it, expect } from "vitest";
import {
  NEWSLETTER_POPUP_STORAGE_KEY,
  NEWSLETTER_SUBSCRIBED_EVENT,
  POPUP_SHOWN_EVENT,
  POPUP_GOOGLE_CLICKED_EVENT,
  POPUP_DISMISSED_EVENT,
  POPUP_SIGNUP_EVENT,
  ACQUISITION_COOKIE,
  NEWSLETTER_POPUP_SOURCE,
  readPopupSeen,
  markPopupSeen,
  shouldOfferPopup,
  popupDetailFor,
  buildAcquisitionCookie,
  type StorageLike,
} from "./popup";
import { parseEventDetail } from "@/lib/analytics/ingest-fields";

/** In-memory Storage stub (the rules take the storage as an argument). */
function stubStorage(initial: Record<string, string> = {}): StorageLike & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
  };
}

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("popup seen flag (per-session)", () => {
  it("starts unseen, round-trips through markPopupSeen", () => {
    const s = stubStorage();
    expect(readPopupSeen(s)).toBe(false);
    expect(markPopupSeen(s)).toBe(true);
    expect(readPopupSeen(s)).toBe(true);
    expect(s.map.get(NEWSLETTER_POPUP_STORAGE_KEY)).toBe("shown");
  });

  it("treats a foreign value as unseen", () => {
    expect(readPopupSeen(stubStorage({ [NEWSLETTER_POPUP_STORAGE_KEY]: "1" }))).toBe(false);
  });

  it("survives storage that throws or is absent (popup simply may offer again)", () => {
    expect(readPopupSeen(throwingStorage)).toBe(false);
    expect(markPopupSeen(throwingStorage)).toBe(false);
    expect(readPopupSeen(null)).toBe(false);
    expect(markPopupSeen(null)).toBe(false);
  });
});

describe("show decision", () => {
  it("offers only to signed-out visitors who have not seen it this session", () => {
    expect(shouldOfferPopup({ seen: false, signedIn: false })).toBe(true);
    expect(shouldOfferPopup({ seen: true, signedIn: false })).toBe(false);
    expect(shouldOfferPopup({ seen: false, signedIn: true })).toBe(false);
    expect(shouldOfferPopup({ seen: true, signedIn: true })).toBe(false);
  });
});

describe("surface detail tokens", () => {
  it("maps every real NewsletterForm source to its token", () => {
    expect(popupDetailFor("footer")).toBe("footer");
    expect(popupDetailFor("camera-first-open")).toBe("camera");
    expect(popupDetailFor("pricing-recovery")).toBe("pricing");
    expect(popupDetailFor("ladder-email-unlock")).toBe("ladder");
    expect(popupDetailFor("page-inline")).toBe("page");
  });

  it("sanitizes unknown sources into an ingest-safe token, defaulting to 'site'", () => {
    expect(popupDetailFor(undefined)).toBe("site");
    expect(popupDetailFor(null)).toBe("site");
    expect(popupDetailFor("Some Future-Source!")).toBe("somefuturesource");
  });

  it("every token passes the ingest detail parser unchanged", () => {
    for (const src of ["footer", "camera-first-open", "pricing-recovery", "ladder-email-unlock", "page-inline", undefined]) {
      expect(parseEventDetail(popupDetailFor(src))).toBe(popupDetailFor(src));
    }
  });
});

describe("event names + attribution constants", () => {
  it("uses event names the ingest accepts verbatim", () => {
    for (const name of [POPUP_SHOWN_EVENT, POPUP_GOOGLE_CLICKED_EVENT, POPUP_DISMISSED_EVENT, POPUP_SIGNUP_EVENT]) {
      expect(name).toMatch(/^[a-z0-9_]+$/);
      expect(name.length).toBeLessThanOrEqual(80);
    }
    expect(NEWSLETTER_SUBSCRIBED_EVENT).toContain("newsletter");
  });

  it("builds the acquisition cookie the auth callback reads", () => {
    const cookie = buildAcquisitionCookie();
    expect(cookie).toContain(`${ACQUISITION_COOKIE}=${NEWSLETTER_POPUP_SOURCE}`);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=1800");
  });
});
