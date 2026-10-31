import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "ip-reputation-checker",
  name: "Threats",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: AlertTriangle,
  h1: "IP Reputation Checker — Is This IP Malicious?",
  lede: "Check an IP address, domain, or file hash against public threat feeds and blocklists, and see what the security community's sensors have reported about it.",
  description:
    "WorldEye's IP reputation checker looks up an IP, domain or hash across public threat feeds and blocklists. Feed-based reputation is a lead, not a verdict. Part of the RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Threat & Exposure → Threats",
  honestyTitle: "What a reputation result can and can't tell you",
  honesty: [
    "Reputation here is feed-based: it reports what public threat feeds and blocklists list about an address. A listing is a lead to investigate, not a verdict that the address — or its current user — did anything wrong.",
    "IP addresses change hands. An address listed for spam or scanning last month may now belong to a cloud customer or home user who had nothing to do with it.",
    "Absence from the feeds is not proof of innocence either: fresh infrastructure used in a new campaign may not be listed anywhere yet.",
    "Use a result to decide how much scrutiny something deserves — extra checks on a flagged sender, for example — not as the sole basis for accusing or blocking anyone.",
  ],
  intro: [
    "Your mail server, firewall, or inbox shows you an address you have never seen: a login attempt at 3am, a server your site suddenly talks to, a sender whose mail looks almost right. The first question is the oldest one in security — has anyone seen this address misbehave before? An IP reputation checker answers it by searching the public threat feeds and blocklists that security teams and sensor networks publish: spam sources, known scanners, botnet infrastructure, phishing domains, and malware hashes.",
    "WorldEye's Threats check lives in the RECON board's Threat & Exposure group, and it accepts the three identifiers investigations actually start with: an IP address, a domain, or a file hash. The result gathers what the feeds say into one place — which lists carry the identifier, what category they file it under, and when it was seen — alongside the board's other views of the same target, so you can pivot from a flagged IP to its device record, its open ports, or the network it sits in without starting over.",
    "The craft is in reading the result proportionately. One stale listing on one list, for an address that cloud providers recycle weekly, means very little. Fresh listings across several independent feeds, in categories that match what you observed, mean a great deal. The checker gives you the raw material for that judgement; it deliberately does not compress it into a single trustworthy-or-not score, because real reputation does not work that way.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose Threats in the Threat & Exposure group.",
    "Enter the IP address, domain, or file hash you are investigating.",
    "Run the check. WorldEye searches the public threat feeds and blocklists it tracks for that identifier.",
    "Read the listings feed by feed: which lists carry it, under what category, and how recently it was reported.",
    "Pursue the lead in the same board — open the address's device record, port scan, or subnet — and weigh the listings together with what you observed yourself.",
  ],
  faqTitle: "IP reputation questions",
  faqs: [
    {
      q: "How can I tell if an IP address is malicious?",
      a: "Start with reputation: check the address against threat feeds and blocklists, as this tool does, and look at the pattern — multiple independent, recent listings in categories like scanning, spam, or botnet activity are a strong signal. Then add context: what did the address actually do to you, whose network does it sit in, and is it a shared cloud address? Reputation plus your own observation is a judgement; either alone is a guess.",
    },
    {
      q: "An IP I use is listed. Does that mean I did something wrong?",
      a: "Usually not. Addresses are recycled constantly — your cloud instance, VPN exit, or home connection may have inherited an address a previous holder abused. Listings also expire and most feeds offer delisting once the activity stops. Treat a listing on your own address as housekeeping: check nothing on your side is compromised, then request delisting from the feed that carries it.",
    },
    {
      q: "Can I check a domain or a file hash too?",
      a: "Yes. The same check accepts domains — useful for phishing and malware-distribution lookups — and file hashes, which identify a specific known file such as a malware sample. A hash match is the most precise of the three: hashes identify exact bytes, whereas IP and domain reputation describe infrastructure that can be shared or sold.",
    },
    {
      q: "An address came back clean. Is it safe to trust?",
      a: "Clean means not listed in the feeds checked, at the time of the check. Brand-new malicious infrastructure often has no listings yet, and some campaigns deliberately use reputable cloud addresses. Use a clean result to lower concern, not to switch it off — normal authentication, authorisation, and monitoring still apply to every address.",
    },
    {
      q: "Should I block every listed IP automatically?",
      a: "Carefully. Automatic blocking on a single feed listing will eventually block innocent users who inherited recycled addresses, and can cut off shared services like VPN exits and cloud regions. Most teams weight listings by freshness, feed quality, and category, and block decisively only on strong, current, corroborated signals.",
    },
    {
      q: "What does it cost?",
      a: "Threats is a Pro module in WorldEye's RECON board, included with WorldEye Pro. The board also includes a free Data Leak Checker on the Tools page, which searches public breach data for an email address with no account at all.",
    },
  ],
  related: [
    { label: "Data Leak Checker — is an email in a known breach? (free)", href: "/tools/data-leak-checker" },
    { label: "Shodan IoT Lookup — the device record for any IP (free)", href: "/tools/ip-device-lookup" },
    { label: "Vulnerability Sweep — known CVEs on a host", href: "/tools/vulnerability-scanner" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function IpReputationCheckerPage() {
  return (
    <ToolLanding
      {...cfg}
    >
      <ReconExample
        targetLabel="TARGET — IP, DOMAIN OR FILE HASH"
        placeholder="e.g. 203.0.113.66 or a suspicious domain"
        exampleTitle="Reputation check of a sample address"
        rows={[
          { label: "Target", value: "203.0.113.66" },
          { label: "Feed A", value: "listed — category: port scanning — reported recently" },
          { label: "Feed B", value: "not listed" },
          { label: "Feed C", value: "listed — category: spam source — older report" },
          { label: "Reading", value: "2 listings — a lead to investigate, not a verdict" },
        ]}
        footnote="This is the shape of a real result, shown with a documentation-range example address; feed names are generalised here. The live check runs inside WorldEye's RECON board and is included with WorldEye Pro."
      />
    </ToolLanding>
  );
}
