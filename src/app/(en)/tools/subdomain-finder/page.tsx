import type { Metadata } from "next";
import { Layers } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "subdomain-finder",
  name: "Subdomain Finder",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Layers,
  h1: "Subdomain Finder — Enumerate a Domain's Subdomains",
  lede: "Give it a domain and get back the subdomains the public internet knows about — the forgotten dev boxes, staging servers and test panels that make up most of a domain's real attack surface.",
  description:
    "WorldEye's Subdomain Finder enumerates a domain's publicly visible subdomains from certificate logs and DNS data. Part of the RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Domain & Web → Subdomains",
  honestyTitle: "What enumeration can and can't find",
  honesty: [
    "Enumeration works from public traces — certificates issued, DNS records published, names observed. A subdomain that was never certificated, never published and never seen will not appear. No enumerator finds everything; this one shows its results as the public record, not the complete truth.",
    "A listed subdomain is a name that resolves or once resolved. It is not proof the host behind it is alive today, or vulnerable — it is an inventory to verify, which is exactly what defenders need.",
    "Enumerate domains you own or are authorised to assess. Listing public DNS data is legal research; probing what you find, beyond your authorisation, is a different matter.",
  ],
  intro: [
    "Ask a company about its web presence and it will name its homepage. Ask its DNS and you get the truth: mail., vpn., dev., staging., an old campaign microsite, a test panel someone spun up in 2022 and never took down. Attackers know this — subdomain enumeration is the first move of almost every external assessment, because the forgotten subdomain is where the unpatched software lives.",
    "WorldEye's Subdomain Finder does that first move inside the RECON board: enter a domain, and it assembles the subdomains visible in public records — certificate-transparency data, DNS and observed names — into a single inventory. Because it sits in the board, every name it returns is one click from the follow-ups that give it meaning: resolve its DNS, read its certificate history, check its headers and stack, scan its host.",
    "For defenders this is housekeeping with teeth: you cannot patch what you don't know you run. For researchers it is the fastest way to understand how an organisation is actually built — which is usually a very different shape from the brochure site.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose Subdomains in the Domain & Web group.",
    "Enter the root domain you own or are authorised to assess — example.com, not a full URL.",
    "Run the enumeration and read the inventory of subdomains returned from public records.",
    "Sort the surprises first: dev, staging, test, admin and old-looking names are where the risk concentrates.",
    "Work the list in the same board — DNS, Certs, Headers, Tech Detect and Port Scan each take a name straight from your results.",
  ],
  faqTitle: "Subdomain enumeration questions",
  faqs: [
    {
      q: "Where does the subdomain list come from?",
      a: "From the public traces subdomains inevitably leave: certificates issued for them (certificate-transparency logs are public by design), published DNS, and names observed in public data. That is why enumeration works at all — hiding a public service's name is nearly impossible once it has a certificate, and the same transparency that protects the web's trust model makes inventories like this possible.",
    },
    {
      q: "Will it find every subdomain?",
      a: "No tool can promise that. A name with no certificate, no public DNS record and no appearances in observed data leaves no trace to find. What enumeration gives you is the publicly knowable surface — which, in practice, is the surface an attacker can also find, and therefore the surface that matters most to secure.",
    },
    {
      q: "Why do companies have subdomains they don't know about?",
      a: "Because creating one takes five minutes and retiring one takes a decision. Campaigns end, vendors change, developers move on — the DNS record and the server stay. Shadow IT and forgotten staging environments are the normal state of large domains, not a scandal; the scandal is only in never looking.",
    },
    {
      q: "Is subdomain enumeration legal?",
      a: "Compiling public records about a domain is research. The line is what you do next: testing the hosts you find — scanning, probing, logging in — needs the owner's authorisation. Enumerate your own domains freely; treat other people's results as reading, not an invitation.",
    },
    {
      q: "What should I do with a risky subdomain I find on my own domain?",
      a: "Decide, in order: does it still exist, does it still need to, and is what runs there maintained? Most findings resolve into one of three actions — take it down, patch it, or formally accept it. The worst outcome is the fourth: writing it down and forgetting it again.",
    },
    {
      q: "What does it cost?",
      a: "Subdomain Finder is a Pro module in WorldEye's RECON board, included with WorldEye Pro. The board's free tools — including the Data Leak Checker and Shodan IoT Lookup — need no account.",
    },
  ],
  related: [
    { label: "Certificate Transparency Search — a domain's cert history", href: "/tools/certificate-transparency-search" },
    { label: "DNS Lookup — every record for a domain", href: "/tools/dns-lookup" },
    { label: "Security Headers Checker — audit a site's headers", href: "/tools/security-headers-checker" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function SubdomainFinderPage() {
  return (
    <ToolLanding {...cfg}>
      <ReconExample
        targetLabel="DOMAIN TO ENUMERATE"
        placeholder="e.g. example.com"
        exampleTitle="Enumeration of a sample domain"
        rows={[
          { label: "www", value: "www.example.com — resolves" },
          { label: "mail", value: "mail.example.com — resolves" },
          { label: "dev", value: "dev.example.com — resolves" },
          { label: "staging", value: "staging.example.com — resolves" },
          { label: "legacy", value: "legacy.example.com — in cert logs, no current DNS" },
        ]}
        footnote="This is the shape of a result, shown for the documentation domain example.com. The live finder runs inside WorldEye's RECON board and is included with WorldEye Pro. Only enumerate domains you own or are authorised to assess."
      />
    </ToolLanding>
  );
}
