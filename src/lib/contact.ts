// ── Contact form: shared topics + submission validation ─────────────────
// Used by the public form component (src/components/contact/ContactForm),
// the public POST /api/contact route, and the admin inbox — one source of
// truth for the topic list and the field rules so the three can't drift.

import { isValidEmail, normalizeEmail } from "@/lib/password-auth";

export const CONTACT_TOPICS = [
  { value: "general", label: "General question" },
  { value: "account", label: "Account & sign-in help" },
  { value: "billing", label: "Billing, trials & the guarantee" },
  { value: "camera-report", label: "Report a camera or feed" },
  { value: "partnerships", label: "Partnerships" },
  { value: "press", label: "Press" },
  { value: "security", label: "Security report" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export const CONTACT_TOPIC_VALUES: readonly string[] = CONTACT_TOPICS.map((t) => t.value);

export function contactTopicLabel(value: string): string {
  return CONTACT_TOPICS.find((t) => t.value === value)?.label ?? "General question";
}

export const CONTACT_NAME_MAX = 100;
export const CONTACT_MESSAGE_MIN = 10;
export const CONTACT_MESSAGE_MAX = 5000;

export interface ContactSubmission {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
}

export type ContactParse =
  | { ok: true; data: ContactSubmission }
  | { ok: false; error: string };

/** Validate + normalize a raw contact-form body. Pure — safe to unit test. */
export function parseContactSubmission(body: unknown): ContactParse {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = String(b.name ?? "").trim().slice(0, CONTACT_NAME_MAX);
  const email = normalizeEmail(String(b.email ?? ""));
  const topic = String(b.topic ?? "general");
  const message = String(b.message ?? "").trim().slice(0, CONTACT_MESSAGE_MAX);

  if (name.length < 1) return { ok: false, error: "Enter your name." };
  if (!isValidEmail(email)) return { ok: false, error: "Enter a valid email address." };
  if (!CONTACT_TOPIC_VALUES.includes(topic)) {
    return { ok: false, error: "Choose a topic from the list." };
  }
  if (message.length < CONTACT_MESSAGE_MIN) {
    return { ok: false, error: `Your message is too short — add a little more detail (at least ${CONTACT_MESSAGE_MIN} characters).` };
  }
  return { ok: true, data: { name, email, topic: topic as ContactTopic, message } };
}
