import type { Metadata } from "next";
import { Cpu } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "mac-address-lookup",
  name: "MAC Addr",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Cpu,
  h1: "MAC Address Lookup — Find the Vendor Behind a MAC Address",
  lede: "Enter a MAC address and identify the manufacturer of its network interface from the OUI prefix — the vendor half of the address that IEEE registration assigns.",
  description:
    "WorldEye's MAC address lookup identifies the vendor of a network interface from a MAC address's OUI prefix. It identifies the manufacturer only — not a device's owner or location. Part of the RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Network & Host → MAC Addr",
  honestyTitle: "What a MAC lookup can and can't tell you",
  honesty: [
    "A MAC lookup identifies the manufacturer of the network interface — the company registered for that address block. It does NOT identify the device's owner, and a MAC address carries no location information at all.",
    "Modern phones, tablets, and laptops randomise their MAC addresses on Wi-Fi networks by design. A randomised address matches no real vendor, and that privacy feature defeats this lookup — by intention.",
    "MAC addresses can also be changed in software (spoofed), so even a genuine-looking vendor result describes the address as presented, not hardware you can be certain about.",
    "A MAC address only exists on the local network segment. It never crosses the internet, so nobody can find, track, or contact a device elsewhere from its MAC alone.",
  ],
  intro: [
    "Every network interface — every Wi-Fi card, Ethernet port, and Bluetooth radio — carries a MAC address, a 48-bit identifier written as six pairs of hexadecimal digits. The first half is the interesting half: it is the OUI, the Organisationally Unique Identifier, assigned by the IEEE to the manufacturer that made the interface. Read those first three pairs against the public registry and you can answer a question network administrators ask constantly: I can see this device on my network, but what actually is it?",
    "WorldEye's MAC Addr lookup lives in the RECON board's Network & Host group and does exactly that one job cleanly: paste a MAC address in any common format and it returns the registered vendor for its OUI prefix, so an unknown entry in your router's device list becomes a network-interface maker, a smart-plug chipset vendor, or a printer manufacturer. Combined with a local IP sweep, it turns a bare list of addresses into a device inventory you can act on — approve the ones you recognise, investigate the ones you do not.",
    "Its limits are as important as its result, and they are good news for privacy: a MAC address is not an identity and not a location. It names a chip maker, nothing about the person holding the device, and modern phones deliberately broadcast randomised MACs on Wi-Fi so that even the chip maker cannot be read. The lookup tells you the truth about the one thing a MAC genuinely encodes — who made the interface — and claims nothing beyond it.",
  ],
  steps: [
    "Find the MAC address: in your router's connected-devices list, the device's own settings, or a local network scan.",
    "Open the RECON board on the WorldEye globe and choose MAC Addr in the Network & Host group.",
    "Paste the MAC address — colon, dash, or plain formats are all accepted.",
    "Run the lookup. WorldEye matches the address's OUI prefix (its first three pairs) against the IEEE vendor registry.",
    "Read the vendor and use it to identify the device on your network — and note the honesty box if the address turns out to be randomised, in which case no real vendor exists to find.",
  ],
  faqTitle: "MAC address lookup questions",
  faqs: [
    {
      q: "What does a MAC address lookup actually find?",
      a: "The manufacturer of the network interface. MAC addresses are allocated to makers in blocks, and the first half of the address — the OUI — is registered to a specific company. The lookup reads that registration. It can tell you a device on your network uses an interface made by a particular vendor, which usually narrows down what the device is.",
    },
    {
      q: "Can I find a device's owner or location from its MAC address?",
      a: "No — not from a MAC address, and honestly not from any lookup like this. MAC addresses are not registered to people or places; there is no database connecting them to owners or addresses, and a MAC never travels beyond the local network segment, so it cannot be located over the internet. Anyone selling a MAC-based owner or location lookup is selling something the underlying data cannot support.",
    },
    {
      q: "Why does my phone's MAC address find no vendor?",
      a: "Because your phone is protecting you. Modern iOS and Android devices present a randomised, locally administered MAC address on each Wi-Fi network instead of the hardware one, specifically so networks and observers cannot fingerprint the device. A randomised address has no registered OUI, so the lookup correctly finds no vendor — that is the privacy feature working, not an error.",
    },
    {
      q: "What formats does the lookup accept?",
      a: "The common writings of the same address: colon-separated (00:1B:44:11:3A:B7), dash-separated (00-1B-44-11-3A-B7), dotted, or twelve plain hex digits. They all encode the same 48 bits; the lookup normalises them before checking the OUI registry.",
    },
    {
      q: "Can a MAC address be faked?",
      a: "Yes — most operating systems let a user set a software MAC address, a practice called spoofing, used legitimately for testing and privacy and illegitimately to impersonate another device on a local network. That is why a vendor result describes the address as presented. For network security, treat a MAC as a hint about a device, never as proof of its identity.",
    },
    {
      q: "What does it cost?",
      a: "MAC Addr is a Pro module in WorldEye's RECON board, included with WorldEye Pro. The board's free tools — the Shodan device lookup, DNS and WHOIS lookups and others on the Tools page — run with no account at all.",
    },
  ],
  related: [
    { label: "IP Sweep — scan a whole subnet", href: "/tools/ip-sweep" },
    { label: "Shodan IoT Lookup — the device record for any IP (free)", href: "/tools/ip-device-lookup" },
    { label: "BGP Route — ASN and prefixes for an IP", href: "/tools/bgp-lookup" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function MacAddressLookupPage() {
  return (
    <ToolLanding
      {...cfg}
    >
      <ReconExample
        targetLabel="TARGET — MAC ADDRESS"
        placeholder="e.g. 00:1B:44:11:3A:B7"
        exampleTitle="Vendor lookup of a sample MAC address"
        rows={[
          { label: "MAC", value: "00:1B:44:11:3A:B7 (illustrative example)" },
          { label: "OUI prefix", value: "00:1B:44 — the vendor half of the address" },
          { label: "Vendor", value: "registered interface manufacturer shown here" },
          { label: "Scope", value: "manufacturer of the interface only — no owner, no location" },
          { label: "Note", value: "randomised MACs (modern phones) return no vendor, by design" },
        ]}
        footnote="This is the shape of a real result, shown with an illustrative example address. The live lookup runs inside WorldEye's RECON board and is included with WorldEye Pro."
      />
    </ToolLanding>
  );
}
