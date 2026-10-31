import type { Metadata } from "next";
import { Code } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "security-headers-checker",
  name: "Security Headers Checker",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Code,
  h1: "Security Headers Checker — Audit Any Site's HTTP Headers",
  lede: "Fetch a URL and audit the security headers it answers with — the browser instructions that decide whether a site can be framed, sniffed, downgraded or injected into.",
  description:
    "Check any website's HTTP security headers — HSTS, Content-Security-Policy, X-Frame-Options and more — with WorldEye's Headers audit. Part of the RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Domain & Web → Headers",
  honestyTitle: "What a headers audit can and can't tell you",
  honesty: [
    "Headers are the site's declared browser policy, read from its live response. They are real, checkable facts — but they are the beginning of a security review, not the whole of one. A site can have perfect headers and a broken application behind them.",
    "A missing header is a missing protection, not proof of an exploitable hole. Most header findings mean “this class of attack is not blocked by the browser layer”, and the fix is usually one line of server configuration.",
    "The audit reads the URL you give it, as an ordinary visitor's browser would receive it. Pages behind logins, or that vary headers by path, can differ — check the specific URLs that matter.",
  ],
  intro: [
    "Every HTTP response carries a set of instructions most visitors never see: headers that tell the browser whether this site may be embedded in someone else's frame (clickjacking), whether connections may ever fall back to unencrypted HTTP (downgrade attacks), which origins may supply its scripts (the main line of defence against injected content), and whether the browser should guess at content types (an old but real sniffing trick). Set well, they close whole categories of attack for free. Set badly — or, as on most sites, never set at all — those categories stay open.",
    "WorldEye's Headers audit fetches a URL from the RECON board and reports its security headers as they actually arrive: which protections are present, how they're configured, and which are missing. It is the same check security teams run first on their own sites, because the results are unambiguous — a header is there and correct, there and sloppy, or not there.",
    "Run it on your own site before you run it on anyone else's. The typical first result is educational: one or two headers present, a Content-Security-Policy missing entirely, and a fifteen-minute fix standing between the site and a materially better posture.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose Headers in the Domain & Web group.",
    "Enter the full URL to audit — the exact page, since headers can vary by path.",
    "Run the audit: the board fetches the response and reads its security headers as a browser receives them.",
    "Read the report header by header: present and well-formed, present with issues, or missing.",
    "Fix what's missing in your server or framework config — most headers are a single line — then re-run to verify.",
  ],
  faqTitle: "Security headers questions",
  faqs: [
    {
      q: "Which headers matter most?",
      a: "The core set: Strict-Transport-Security (forces HTTPS), Content-Security-Policy (controls where scripts and resources may load from — the heaviest lifter), X-Content-Type-Options: nosniff (stops MIME guessing), a frame policy (X-Frame-Options or CSP frame-ancestors, against clickjacking), Referrer-Policy, and Permissions-Policy. The audit reports the ones a URL actually sends and flags the gaps in that set.",
    },
    {
      q: "My site has no security headers. Is it hacked?",
      a: "No — it's ordinary. Most sites ship without several of them, because frameworks historically didn't set them by default. Missing headers mean specific browser-enforced protections aren't switched on; it's a posture problem with a cheap fix, not a breach. Add them, verify with a re-scan, and move on to the rest of your security list.",
    },
    {
      q: "Why is Content-Security-Policy the one everyone stresses?",
      a: "Because it governs the browser's trust decisions about code. A well-built CSP means that even if an attacker manages to inject markup into your page, the browser refuses to execute their script or phone home with stolen data. It's also the easiest header to break a site with — which is why the audit shows you the live policy to read, not just a grade.",
    },
    {
      q: "Can headers differ between pages on the same site?",
      a: "Yes. Applications often set headers per route, and a CDN or proxy can add or strip them at the edge. Audit the URLs that matter — the login page, the checkout, the app itself — not just the homepage, and re-check after infrastructure changes.",
    },
    {
      q: "Is checking another site's headers allowed?",
      a: "Reading a public page's response headers is what every browser does on every visit; it's public information by design. As with all recon, the etiquette is intent: checking your own sites, or a site you're evaluating as a user or partner, is normal practice.",
    },
    {
      q: "What does it cost?",
      a: "Headers is a Pro module in WorldEye's RECON board, included with WorldEye Pro. The board also carries free tools — the Data Leak Checker and the Shodan IoT Lookup among them — that need no account.",
    },
  ],
  related: [
    { label: "SSL Checker — certificate and cipher health", href: "/tools/ssl-checker" },
    { label: "Website Technology Checker — what is a site built with?", href: "/tools/website-technology-checker" },
    { label: "Subdomain Finder — enumerate a domain's surface", href: "/tools/subdomain-finder" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function SecurityHeadersCheckerPage() {
  return (
    <ToolLanding {...cfg}>
      <ReconExample
        targetLabel="URL TO AUDIT"
        placeholder="e.g. https://example.com"
        exampleTitle="Header audit of a sample site"
        rows={[
          { label: "strict-transport-security", value: "present — max-age set" },
          { label: "content-security-policy", value: "missing" },
          { label: "x-content-type-options", value: "present — nosniff" },
          { label: "x-frame-options", value: "present — SAMEORIGIN" },
          { label: "referrer-policy", value: "missing" },
        ]}
        footnote="This is the shape of a result, shown for the documentation site example.com. The live audit runs inside WorldEye's RECON board and is included with WorldEye Pro — create a free account to explore the board and its free tools."
      />
    </ToolLanding>
  );
}
