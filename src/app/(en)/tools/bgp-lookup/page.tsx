import type { Metadata } from "next";
import { Globe } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "bgp-lookup",
  name: "BGP Route",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Globe,
  h1: "BGP Lookup — ASN Lookup for Any IP Address or Network",
  lede: "Find the autonomous system behind an IP address or ASN: who announces it, which prefixes it originates, and how it fits into the internet's routing map.",
  description:
    "WorldEye's BGP lookup finds the ASN and announced prefixes for an IP address or autonomous system number, in plain language. Part of the RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Network & Host → BGP Route",
  honestyTitle: "What a BGP lookup can and can't tell you",
  honesty: [
    "BGP data describes routing announcements — which autonomous system originates a prefix — not physical location or individual users. An ASN tells you the network operator, not where a person is.",
    "Routing changes constantly. Prefixes are announced, withdrawn, and re-routed daily, so a lookup is a snapshot of the routing table at check time.",
    "Registration records behind an ASN can lag reality: networks are bought, sold, and renumbered, and the listed organisation may be a parent, a subsidiary, or a legacy name.",
    "Seeing an unexpected ASN announcing a prefix is a lead, not proof of a hijack — legitimate transfers, anycast, and DDoS-mitigation re-announcements look similar at first glance.",
  ],
  intro: [
    "The internet is not one network. It is tens of thousands of independent networks — internet providers, cloud companies, universities, governments, large businesses — stitched together by BGP, the Border Gateway Protocol, which is how each network tells the others which IP addresses it can deliver traffic to. Each of those networks has an Autonomous System Number, an ASN: a unique ID that appears in every routing decision your traffic crosses. A BGP lookup answers the natural questions that follow: which ASN announces this IP address, who operates that network, and what other address ranges — prefixes — does it originate?",
    "For network engineers this is daily bread: verifying that a new prefix is propagating, checking who really announces a customer's address space, untangling why traffic takes a strange path, or spotting an announcement that should not exist. WorldEye's BGP Route puts that lookup in the RECON board, so the routing answer lands next to the geographic, device, and reputation views of the same address — the ASN often explains what the other tools show, like why a host's apparent organisation differs from its hosting provider.",
    "If you are new to this layer of the internet, the plain-language version is: an IP address lives inside a prefix, a prefix is announced by an ASN, and the ASN belongs to the organisation that runs that network. A lookup walks that chain in one step — address in, operator and address ranges out — and the RECON board keeps the jargon translated as it goes.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose BGP Route in the Network & Host group.",
    "Enter an IP address to find the network announcing it, or an ASN (for example AS13335) to inspect a network directly.",
    "Run the lookup. WorldEye consults the current routing data for the announcing autonomous system.",
    "Read the result: the ASN and operating organisation, the specific prefix covering your address, and the network's other announced prefixes.",
    "Cross-reference in the same board — geolocate the address, open its device record, or check its reputation — to build the full picture of the host.",
  ],
  faqTitle: "BGP and ASN lookup questions",
  faqs: [
    {
      q: "What is an ASN?",
      a: "An Autonomous System Number identifies one network — one organisation's routing domain — on the internet. Providers, clouds, and large organisations each have at least one. When networks exchange routes via BGP, they do so as autonomous systems, so the ASN behind an address tells you whose network originates it: for example, a major cloud's ASN on a server address tells you the hosting network, whoever rents the server itself.",
    },
    {
      q: "What is a prefix?",
      a: "A prefix is a contiguous block of IP addresses announced as a unit — written like 203.0.113.0/24, meaning 256 addresses starting at that point. Networks announce prefixes, not individual addresses, so a lookup shows you both the exact prefix covering your address and the other prefixes the same ASN originates.",
    },
    {
      q: "Why does the ASN owner differ from the website or company I expected?",
      a: "Because most organisations run on someone else's network. A company's website usually sits in a cloud or hosting provider's ASN, a home user sits in their ISP's ASN, and VPN users sit in the VPN provider's ASN. The ASN identifies the network carrying the address, which is frequently — and legitimately — a different organisation from the one using it.",
    },
    {
      q: "Can a BGP lookup locate a person or a precise address?",
      a: "No. It identifies the network operator and the routing block an address belongs to. It carries no information about an individual subscriber, a street address, or a device. Even IP geolocation, a separate technique, resolves at best to a city area — anyone claiming an IP lookup pinpoints a person is overstating what the data holds.",
    },
    {
      q: "What is a BGP hijack, and can this lookup spot one?",
      a: "A hijack is when a network announces prefixes it does not own, diverting traffic meant for someone else — by malice or, more often, by configuration error. A lookup contributes one check: whether the ASN announcing a prefix is the one you expect. An unexpected announcer is a reason to investigate against registration records and route history, not by itself proof of a hijack.",
    },
    {
      q: "What does it cost?",
      a: "BGP Route is a Pro module in WorldEye's RECON board, included with WorldEye Pro. The board's free tools — the Shodan device lookup, DNS and WHOIS lookups and others on the Tools page — run with no account at all.",
    },
  ],
  related: [
    { label: "Shodan IoT Lookup — the device record for any IP (free)", href: "/tools/ip-device-lookup" },
    { label: "WHOIS Lookup — who registered a domain (free)", href: "/tools/whois-lookup" },
    { label: "IP Sweep — scan a whole subnet", href: "/tools/ip-sweep" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function BgpLookupPage() {
  return (
    <ToolLanding
      {...cfg}
    >
      <ReconExample
        targetLabel="TARGET — IP ADDRESS OR ASN"
        placeholder="e.g. 203.0.113.10 or AS64500"
        exampleTitle="BGP lookup of a sample address"
        rows={[
          { label: "Address", value: "203.0.113.10" },
          { label: "Announced in", value: "203.0.113.0/24" },
          { label: "Origin ASN", value: "AS64500 — Example Networks (documentation ASN)" },
          { label: "Other prefixes", value: "203.0.113.0/24 plus further ranges listed in the full result" },
          { label: "Type", value: "routing snapshot at check time — announcements change daily" },
        ]}
        footnote="This is the shape of a real result, shown with documentation-range example addresses and a documentation ASN. The live lookup runs inside WorldEye's RECON board and is included with WorldEye Pro."
      />
    </ToolLanding>
  );
}
