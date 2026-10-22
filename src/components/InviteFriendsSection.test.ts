// Render pins for the popup's invite-a-friend section. The container's
// states resolve after a client fetch (signed-in state isn't knowable
// server-side), so the pins cover: the section shell with its honest
// heading + condition (what renders immediately), the signed-out
// prompt view, and the signed-in link view incl. the balance line.
// Grant/consume behavior is pinned in lib/camera-bonus.test.ts.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import InviteFriendsSection, {
  INVITE_CONDITION,
  INVITE_HEADING,
  InviteLinkBlock,
  InviteSignInPrompt,
} from "./InviteFriendsSection";

const normalize = (html: string) =>
  html.replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");

describe("InviteFriendsSection (shell)", () => {
  it("leads with the promise and its condition — never the bonus up front", () => {
    const html = normalize(renderToString(createElement(InviteFriendsSection)));
    expect(html).toContain("data-invite-friends");
    expect(html).toContain(INVITE_HEADING);
    expect(html).toContain("Invite a friend — get 15 more camera checks");
    expect(html).toContain(INVITE_CONDITION);
    expect(html).toContain("Loading your invite link…");
    // Nothing is promised as already-earned in the shell.
    expect(html).not.toContain("banked");
    // No placeholder link in ANY pre-resolution state: the shell must
    // never render a /ref/ URL before the server returns the real one.
    expect(html).not.toContain("/ref/");
  });
});

describe("InviteSignInPrompt", () => {
  it("explains the account requirement and routes to sign-in", () => {
    const html = normalize(renderToString(createElement(InviteSignInPrompt)));
    expect(html).toContain("Sign in to get your invite link");
    expect(html).toContain('href="/signin"');
  });
});

describe("InviteLinkBlock", () => {
  it("shows the /ref link with Share and Copy actions", () => {
    const html = normalize(
      renderToString(
        createElement(InviteLinkBlock, {
          link: "https://worldeye.app/ref/jameson",
          balance: 0,
        }),
      ),
    );
    expect(html).toContain("https://worldeye.app/ref/jameson");
    expect(html).toContain("Share");
    expect(html).toContain("Copy link");
    expect(html).not.toContain("banked");
  });

  it("shows the banked balance when the user has earned bonus checks", () => {
    const html = normalize(
      renderToString(
        createElement(InviteLinkBlock, {
          link: "https://worldeye.app/ref/jameson",
          balance: 30,
        }),
      ),
    );
    expect(html).toContain("You have 30 bonus camera checks banked.");
  });

  it("singularizes one banked check", () => {
    const html = normalize(
      renderToString(
        createElement(InviteLinkBlock, {
          link: "https://worldeye.app/ref/jameson",
          balance: 1,
        }),
      ),
    );
    expect(html).toContain("You have 1 bonus camera check banked.");
  });
});
