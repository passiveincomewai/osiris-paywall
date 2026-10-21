// Render smoke check for the public contact form: the server-rendered
// markup must carry every field and every topic option (the client JS
// only adds submission behaviour on top of it).
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import ContactForm from "./ContactForm";
import { CONTACT_TOPICS } from "@/lib/contact";

describe("ContactForm", () => {
  const html = renderToString(createElement(ContactForm))
    .replace(/<!-- -->/g, "")
    .replace(/&amp;/g, "&");

  it("renders name, email, topic and message fields with a submit button", () => {
    expect(html).toContain("Your name");
    expect(html).toContain("Email address");
    expect(html).toContain("Topic");
    expect(html).toContain("Message");
    expect(html).toContain('type="email"');
    expect(html).toContain("<textarea");
    expect(html).toContain("Send message");
  });

  it("offers exactly the shared topic list", () => {
    for (const t of CONTACT_TOPICS) {
      expect(html).toContain(`value="${t.value}"`);
      expect(html).toContain(t.label);
    }
  });
});
