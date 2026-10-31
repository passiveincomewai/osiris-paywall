import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import LeakCheckTool from "@/components/LeakCheckTool";

const cfg: ToolLandingConfig = {
  slug: "data-leak-checker",
  name: "Data Leak Checker",
  eyebrow: "FREE TOOL",
  icon: ShieldAlert,
  h1: "Data Leak Checker — Has Your Email Been in a Breach?",
  lede: "Enter an email address and check it against the public record of known data breaches — live, free, and without your address ever touching WorldEye's servers.",
  description:
    "Check whether an email address appears in known data breaches, and what kinds of data were exposed. Free, no signup — your browser queries the XposedOrNot breach database directly.",
  freeTool: true,
  appPath: "RECON board → Threat & Exposure → Data Leaks",
  honestyTitle: "What this check can and can't tell you",
  honesty: [
    "The check searches breaches that were collected and indexed by XposedOrNot's public breach database. A breach that was never published, sold privately, or not yet indexed cannot appear — in this checker or any other.",
    "“No breaches found” means “not in the records searched.” It is good news, not a guarantee that the address was never exposed anywhere.",
    "A breach listing names the service that lost the data. It does not mean your account at that service is currently compromised — it means the data escaped at the time of that breach, and passwords from that era should be treated as burned.",
  ],
  intro: [
    "Every few weeks another service admits it lost its user database: names, email addresses, passwords, sometimes far more. Those databases do not disappear — they circulate, get indexed, and become the raw material for credential-stuffing attacks, where bots try the leaked email-and-password pairs against every other service you use. The single most useful thing you can do with that reality is know whether your address is in the pile, and if so, from where.",
    "This checker asks that question against XposedOrNot's public breach database, one of the established indexes in this field. The lookup runs from your browser directly to their API — the same call the WorldEye RECON board makes — so the address you type is never sent to or stored by WorldEye. The result names each breach the address appears in and the kinds of data those breaches exposed: passwords, phone numbers, dates of birth, and so on.",
    "If your address does appear, the response is boring and effective: anywhere you still use a password from a breached service, change it; turn on two-factor authentication for email, banking and social accounts; and expect phishing that references the breached service by name, because the attackers have the same list you just read.",
  ],
  steps: [
    "Enter the email address you want to check — your own, or one you are authorised to check.",
    "Your browser queries XposedOrNot's breach-analytics API directly; WorldEye's servers are not in the path.",
    "If the address appears in known breaches, you get the list of breached services and the data types exposed across them.",
    "If nothing is found, the result says so plainly — and the limits box below explains exactly what that does and doesn't prove.",
    "Act on a positive result: rotate reused passwords, enable two-factor authentication, and stay sceptical of mail that name-checks the breached services.",
  ],
  faqTitle: "Data leak questions",
  faqs: [
    {
      q: "Is it safe to type my email address into a breach checker?",
      a: "In this one, the address goes from your browser straight to XposedOrNot's API — WorldEye never receives or stores it. That is the right architecture for a tool like this, and the page states it openly so you can hold us to it. As a general rule, be wary of any checker that asks for your password: none is ever needed. A breach check needs an email address, nothing more.",
    },
    {
      q: "My address is in a breach. What should I actually do?",
      a: "Three things, in order. First, change the password at the breached service — and anywhere else you reused it, because reuse is what makes breaches dangerous. Second, turn on two-factor authentication for your important accounts, starting with email and banking. Third, treat future messages that mention the breached service with extra suspicion: attackers use breach lists to make phishing sound informed.",
    },
    {
      q: "The check found nothing. Am I safe?",
      a: "Safer, not certified safe. The check covers the breaches in one major public index. Breaches that were never disclosed, never leaked publicly, or happened last week may not be indexed yet — by anyone. Keep the habits that make breaches survivable anyway: unique passwords per service (a password manager makes this painless) and two-factor authentication on the accounts that matter.",
    },
    {
      q: "What kinds of data get exposed in breaches?",
      a: "It varies by service. Email addresses and passwords (sometimes hashed, sometimes not) are the most common; names, phone numbers, dates of birth, physical addresses and security questions all appear in larger breaches. The result lists the data classes recorded for the breaches your address was found in, which is what determines how seriously to take each one.",
    },
    {
      q: "Can I check an address that isn't mine?",
      a: "Check addresses you own or are authorised to check — a family member who asked you to, or your own work address. The tool exists so people can protect their own accounts.",
    },
    {
      q: "What does it cost?",
      a: "Nothing. The Data Leak Checker is one of WorldEye's free tools, in this page and in the RECON board, with no account required.",
    },
  ],
  related: [
    { label: "IP Reputation Checker — is an address or domain flagged?", href: "/tools/ip-reputation-checker" },
    { label: "Shodan IoT Lookup — what a device exposes (free)", href: "/tools/ip-device-lookup" },
    { label: "Fingerprint — public profile search", href: "/tools/people-search" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function DataLeakCheckerPage() {
  return (
    <ToolLanding {...cfg}>
      <LeakCheckTool />
    </ToolLanding>
  );
}
