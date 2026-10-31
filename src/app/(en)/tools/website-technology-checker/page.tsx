import type { Metadata } from "next";
import { Code } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "website-technology-checker",
  name: "Tech Detect",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Code,
  h1: "Website Technology Checker — What Is This Website Built With?",
  lede: "Fingerprint a website's stack from its public responses — CMS, frameworks, servers, analytics and more — and get a structured answer to what is this website built with?",
  description:
    "WorldEye's website technology checker fingerprints a site's CMS, frameworks and stack from its public signals. Fingerprinting is inference — obfuscated stacks can mislead. Part of the RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Domain & Web → Tech Detect",
  honestyTitle: "What technology fingerprinting can and can't tell you",
  honesty: [
    "Fingerprinting is inference from public signals — headers, markup patterns, script names, cookie conventions. It reports what the evidence suggests, not what the server's owner has confirmed.",
    "Sites can hide or spoof these signals. A well-configured or deliberately obfuscated stack can mislead a fingerprint, and some detections will simply be wrong.",
    "Detecting a technology does not establish its version unless the site itself discloses one, and an old-looking fingerprint is not proof of an unpatched site — check before concluding anything about security.",
    "The checker only reads what the site publicly serves to any visitor. It does not log in, bypass anything, or see backend systems that leave no trace in the responses.",
  ],
  intro: [
    "What is this website built with? It is one of the most practical questions on the web — asked by developers scoping a rebuild, marketers sizing up a competitor, security teams taking inventory, and the simply curious. The answer is rarely stated outright, but most sites leak it constantly: in response headers, in the shape of their HTML, in generator tags, script file names, cookie names, and the fingerprints of the frameworks and content management systems that produced the pages.",
    "WorldEye's Tech Detect lives in the RECON board's Domain & Web group and gathers those signals in one pass. Enter a site and it categorises what it finds — CMS, front-end framework, web server, programming signals, analytics and marketing tools, CDN and hosting clues — so instead of poking through page source yourself, you get the stack as a readable list, next to the board's DNS, WHOIS, SSL, and header checks on the same domain.",
    "Used well, the result is a hypothesis with evidence attached. A detection tells you where to look next — the CMS's own version signals, the headers, the certificate record — and the honest detections carry their uncertainty openly. A site that has stripped its generator tags and proxied everything through a CDN may report very little, and that near-empty result is itself information: someone there has thought about disclosure.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose Tech Detect in the Domain & Web group.",
    "Enter the website's domain or URL.",
    "Run the check. WorldEye reads the site's public responses and matches them against known technology fingerprints.",
    "Read the stack by category: CMS, frameworks, server, analytics, CDN and hosting signals — with the strength of each detection in view.",
    "Corroborate in the same board: the Security Headers Checker, SSL Checker, and DNS Lookup often confirm or refine what the fingerprint suggests.",
  ],
  faqTitle: "Website technology checker questions",
  faqs: [
    {
      q: "How can you tell what a website is built with?",
      a: "By its traces. Content management systems emit generator meta tags and distinctive file paths; frameworks leave patterns in markup and JavaScript bundle names; servers announce themselves (or their proxies) in headers; analytics and payment tools load from recognisable domains. A technology checker collects these signals and matches them against a fingerprint library — the same evidence you could gather manually from page source and response headers, automated.",
    },
    {
      q: "How accurate is technology fingerprinting?",
      a: "Good for mainstream stacks that do not hide themselves — a standard WordPress, Shopify, or Next.js site is usually identified confidently and correctly. Accuracy drops when a site removes telltale signals, renames assets, or serves everything through an aggressively configured CDN. Treat each detection as a well-founded inference to corroborate, which is why Tech Detect shows categories and signals rather than absolute claims.",
    },
    {
      q: "Can it tell me a site's exact software versions?",
      a: "Only when the site discloses them — some do, in headers or generator tags, and many sensibly do not. Where no version is published, the checker reports the technology without inventing one. If you need a version for security purposes on your own site, verify it in your own admin or deployment records, not from an external fingerprint.",
    },
    {
      q: "Why does a site show almost no technologies?",
      a: "Either it is genuinely simple — hand-written static pages served plainly leave few fingerprints — or it has been deliberately hardened: headers stripped, assets renamed, origin hidden behind a proxy. Both are legitimate. An empty fingerprint is a true statement about what the site reveals, not a failure of the check.",
    },
    {
      q: "Is checking a website's technology allowed?",
      a: "The checker requests the site's public pages and headers exactly as any visitor's browser does, and analyses what comes back. It does not authenticate, exploit, or access anything non-public. Reading what a public site chooses to serve is the ordinary operation of the web.",
    },
    {
      q: "What does it cost?",
      a: "Tech Detect is a Pro module in WorldEye's RECON board, included with WorldEye Pro. The board's free tools — the Security Headers Checker, SSL Checker and others on the Tools page — run with no account at all.",
    },
  ],
  related: [
    { label: "Security Headers Checker — grade a site's HTTP headers (free)", href: "/tools/security-headers-checker" },
    { label: "SSL Checker — inspect a site's live certificate (free)", href: "/tools/ssl-checker" },
    { label: "WHOIS Lookup — who registered a domain (free)", href: "/tools/whois-lookup" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function WebsiteTechnologyCheckerPage() {
  return (
    <ToolLanding
      {...cfg}
    >
      <ReconExample
        targetLabel="TARGET — WEBSITE DOMAIN OR URL"
        placeholder="e.g. example.com"
        exampleTitle="Technology fingerprint of a sample site"
        rows={[
          { label: "CMS", value: "WordPress (generator tag + path patterns)" },
          { label: "Server", value: "nginx (response header)" },
          { label: "Front end", value: "React signals in page scripts" },
          { label: "Analytics", value: "analytics script detected" },
          { label: "CDN / hosting", value: "major CDN edge headers present" },
        ]}
        footnote="This is the shape of a real result, shown generically for a sample site; detections are inferences from public signals and can be wrong on obfuscated stacks. The live checker runs inside WorldEye's RECON board and is included with WorldEye Pro."
      />
    </ToolLanding>
  );
}
