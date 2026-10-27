// Render pins for the globe SearchBar. The search_performed analytics
// wiring (pick + settled zero-result effect) is client-interaction logic
// covered by the payload-builder tests in lib/analytics/search-event.test.ts;
// this pin covers what the house pattern can prove in Node: the bar renders
// its idle state (input, Try chips, no empty-state) without firing or
// showing anything query-dependent. Node-only renderToString harness, as
// everywhere here.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import SearchBar from "./SearchBar";

describe("SearchBar", () => {
  it("renders the idle search box with its Try chips and no result state", () => {
    const html = renderToString(createElement(SearchBar, { onLocate: vi.fn() }))
      .replace(/<!-- -->/g, "")
      .replace(/&#x27;/g, "'");
    expect(html).toContain('placeholder="Search places, cameras, addresses or coordinates"');
    expect(html).toContain('aria-label="Search places and cameras"');
    expect(html).toContain("Start here");
    expect(html).toContain("Eiffel Tower");
    expect(html).toContain("10 Downing Street");
    // Nothing typed yet: no empty-state, no results list content.
    expect(html).not.toContain("Nothing matches");
    expect(html).not.toContain("Cameras match");
  });

  it("renders embedded (drawer) mode without its own frame chrome", () => {
    const html = renderToString(createElement(SearchBar, { onLocate: vi.fn(), embedded: true }))
      .replace(/<!-- -->/g, "")
      .replace(/&#x27;/g, "'");
    expect(html).toContain('placeholder="Search places, cameras, addresses or coordinates"');
    expect(html).not.toContain("glass-panel");
  });
});
