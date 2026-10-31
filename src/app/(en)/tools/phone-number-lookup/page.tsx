import type { Metadata } from "next";
import { Phone } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "phone-number-lookup",
  name: "Phone Intel",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Phone,
  h1: "Phone Number Lookup — Carrier, Region and Line Type",
  lede: "Look up a phone number's carrier, region, and line type — mobile, landline, or VoIP — from its numbering-plan data. What the number's structure legitimately tells you, and nothing it can't.",
  description:
    "WorldEye's phone number lookup reports a number's carrier, region and line type from numbering-plan data. It does NOT identify a number's owner — no name lookup is offered or possible from this data. Part of the RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Identity → Phone Intel",
  honestyTitle: "What a phone lookup can and can't tell you",
  honesty: [
    "This lookup does NOT identify the owner of a phone number. It returns carrier, region, and line type — never a name or address — and any service promising a subscriber's name from a bare number is claiming data that numbering records do not contain.",
    "Carrier and region describe the number's original allocation. People keep numbers when they move and when they switch carriers, so the current carrier and the owner's actual location may both differ from the allocation on record.",
    "Line type — mobile, landline, VoIP, toll-free — is the most reliable field, and it is a property of the number range, not a statement about who is calling you.",
    "A lookup analyses the number itself. It does not contact the phone, alert its holder, or reveal anything the holder has not already shared by using the number.",
  ],
  intro: [
    "An unknown number called, texted, or appeared in a log — and before you call back, engage, or investigate further, you want to know what kind of number it even is. That narrower question is one a phone number lookup can answer honestly. Telephone numbers are issued in structured blocks: the country and area codes place a number in a numbering plan, the block identifies the carrier it was allocated to, and the range determines its line type — a mobile, a landline, a VoIP service, or a toll-free line. Each of those facts is genuinely useful, and each is public numbering data.",
    "WorldEye's Phone Intel lives in the RECON board's Identity group and returns exactly that picture: country and region for the number, its allocated carrier, and its line type, formatted and validated so a malformed or impossible number is flagged as such. In fraud and spam work, line type alone carries real signal — a supposed bank calling from a disposable VoIP range, or a local business whose number is allocated overseas, deserves the extra scrutiny that knowing it prompts.",
    "What this tool will not do is the thing many lookup sites advertise: put a name to the number. Subscriber names are not part of numbering-plan data, carriers do not publish them for lookup, and WorldEye does not offer a reverse phone lookup that promises an owner's identity — in the honesty box, in the FAQs, and in the product itself. If a name is what you need, the legitimate routes are the ones where the person published it themselves: a business listing, a public profile, or your own records of prior contact.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose Phone Intel in the Identity group.",
    "Enter the phone number, including the country code if it is outside your own country.",
    "Run the lookup. WorldEye validates the number against the numbering plan and reads its allocation data.",
    "Read the result: country and region, allocated carrier, and line type — mobile, landline, VoIP, or toll-free.",
    "Use it proportionately: factor the line type and region into your judgement of the call or message, and combine it with the board's other identity tools where a public profile or breach record is relevant.",
  ],
  faqTitle: "Phone number lookup questions",
  faqs: [
    {
      q: "Can I find out who owns a phone number with this lookup?",
      a: "No — and be wary of any tool that says yes. This lookup reports carrier, region, and line type from public numbering-plan data, which contains no subscriber names or addresses. There is no legitimate database that turns a bare mobile number into its owner's name; sites claiming one typically deliver recycled directory scraps, guesses, or a paywall. If the owner has published the number themselves — a business listing, a public profile — that public source is the honest route to a name.",
    },
    {
      q: "What does line type tell me?",
      a: "Whether a number belongs to a mobile, a landline, a VoIP (internet phone) service, or a toll-free range. It is one of the most useful signals in screening unknown contacts: legitimate institutions rarely call from consumer VoIP ranges, disposable VoIP numbers are a favourite of spam and fraud operations, and a landline allocation tells you the number is fixed to premises. It is a property of the number, not proof about the caller — but it shapes sensible questions.",
    },
    {
      q: "Is the carrier and region always current?",
      a: "Not necessarily, and the result should be read as allocation, not biography. Number portability lets people keep a number when they change carriers, and people move regions without changing numbers. The carrier shown is the one the number was allocated to or last recorded with, and the region is the one its area code serves — both are useful context, neither is a live statement about the holder today.",
    },
    {
      q: "Can this tell me where a caller is located?",
      a: "Only in the loosest sense: the region its area code was issued for. Mobile numbers routinely live nowhere near their area code's region — people move and keep numbers for decades. The lookup cannot locate a phone, track its holder, or narrow anything to an address, and no numbering data can.",
    },
    {
      q: "Does looking up a number notify the person?",
      a: "No. The lookup analyses numbering-plan data about the number itself; it never calls, texts, or pings the phone. The holder receives no signal that their number was checked.",
    },
    {
      q: "What does it cost?",
      a: "Phone Intel is a Pro module in WorldEye's RECON board, included with WorldEye Pro. The board's free tools — the Username Search, the Data Leak Checker and others on the Tools page — run with no account at all.",
    },
  ],
  related: [
    { label: "Username Search — one handle across 100+ sites (free)", href: "/tools/username-search" },
    { label: "People Search — public profiles by name", href: "/tools/people-search" },
    { label: "Data Leak Checker — is an email in a known breach? (free)", href: "/tools/data-leak-checker" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function PhoneNumberLookupPage() {
  return (
    <ToolLanding
      {...cfg}
    >
      <ReconExample
        targetLabel="TARGET — PHONE NUMBER"
        placeholder="e.g. +1 415 555 0132"
        exampleTitle="Numbering data for a sample number"
        rows={[
          { label: "Number", value: "+1 415 555 0132 — valid format (555 range is reserved for examples)" },
          { label: "Country / region", value: "United States — California numbering area" },
          { label: "Carrier", value: "allocated carrier shown here" },
          { label: "Line type", value: "mobile / landline / VoIP / toll-free as allocated" },
          { label: "Owner", value: "not identified — numbering data contains no subscriber name" },
        ]}
        footnote="This is the shape of a real result, shown with a reserved example number from the 555 range. The live lookup runs inside WorldEye's RECON board and is included with WorldEye Pro."
      />
    </ToolLanding>
  );
}
