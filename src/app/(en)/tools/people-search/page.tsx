import type { Metadata } from "next";
import { Fingerprint } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "people-search",
  name: "Fingerprint — People Search",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Fingerprint,
  h1: "People Search — Find a Public Profile by Username, Email or Phone",
  lede: "Start from one handle, email address or phone number and watch the public profiles attached to it surface across platforms — streamed live, with every result linking to the public page it came from.",
  description:
    "WorldEye Fingerprint searches public profiles by username, email or phone and streams the matches with sources. Public data only — part of the RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Identity → Fingerprint",
  honestyTitle: "What this search deliberately does not do",
  honesty: [
    "Public profiles only. Fingerprint reads what platforms publish openly — the same pages anyone can open. It does not access private accounts, paywalled databases, or data-broker records.",
    "It will not give you someone's home address, private phone number, location, or anything behind a login. Any tool that promises that from a username is selling you someone else's leaked data.",
    "A match means a public profile uses that identifier — it does not prove the profile belongs to the person you mean. Common handles are reused by strangers; every result links to its source so you can verify before you conclude.",
    "Searching for a person isn't neutral. Use it for legitimate purposes: finding your own scattered accounts, verifying a public identity you're about to trust, or research you can stand behind.",
  ],
  intro: [
    "People leave a trail of public profiles: the same handle on a code host, a gaming network, a marketplace, a forum from 2016. Fingerprint is the RECON board's tool for gathering that trail. Give it a username, an email address or a phone number, and it searches the public web presence attached to that identifier — checking platform after platform and streaming each hit back as it lands, rather than making you wait for a single bundled report.",
    "The streaming matters more than it sounds. A profile search is really a dozen small lookups wearing a trenchcoat, and some platforms answer in milliseconds while others dawdle. Watching results arrive live tells you where the identifier has substance — a cluster of active, consistent profiles — and where it has none, which is itself a finding: a handle claimed in a message that exists nowhere public is a story that doesn't check out.",
    "Fingerprint also composes with the board around it. Its results feed the same investigation as the leak checker (has this email been breached?), the username hunt (where is this handle registered?), and the GitHub lookup — one identifier, examined from several honest angles, with sources shown for every claim.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose Fingerprint in the Identity group.",
    "Enter one identifier: a username, an email address, or a phone number.",
    "Watch the results stream in — each public profile found, with the platform it lives on and a link to the profile itself.",
    "Verify before you conclude: open the source profiles and check they describe the same public persona, not just the same string.",
    "Follow the threads with the board's other identity tools — Username Search for registrations, Data Leaks for breach exposure, GitHub Recon for developer profiles.",
  ],
  faqTitle: "People search questions",
  faqs: [
    {
      q: "What can Fingerprint actually find?",
      a: "Public profiles that use the identifier you gave it: social, gaming, developer, marketplace and community accounts that are visible to anyone with a browser. Each result names the platform and links to the live profile, so the evidence is always one click from the claim.",
    },
    {
      q: "What can it NOT find?",
      a: "Anything private. No home addresses, no personal phone numbers beyond the one you supplied, no private-account content, no location history, no data-broker dossiers. If a profile isn't public, it isn't in the results — deliberately, and without exception.",
    },
    {
      q: "Does a match prove the profile is the person I'm looking for?",
      a: "No. It proves a public profile uses that username, email or number. Handles get reused, impersonated and abandoned. Treat matches as leads: open them, compare the public details, and only trust the ones that corroborate each other.",
    },
    {
      q: "Is it legal and ethical to search for someone like this?",
      a: "Searching public information is what journalists, investigators, recruiters and fraud teams do every day, and checking your own footprint is basic hygiene. The line is purpose: verifying a public identity before trusting it is legitimate; assembling someone's life to harass or stalk them is not, and no search tool changes that. Know why you're searching before you start.",
    },
    {
      q: "Can I search for myself?",
      a: "Yes — and it's one of the best uses. Most people are surprised by at least one old, forgotten public profile, and forgotten profiles with old passwords are a real account-takeover risk. Run your own handle and email, close what you don't use, and rotate what you keep.",
    },
    {
      q: "What does it cost?",
      a: "Fingerprint is a Pro module in WorldEye's RECON board, included with WorldEye Pro. Several board tools — the leak checker and the Shodan device lookup among them — are free with no account.",
    },
  ],
  related: [
    { label: "Username Search — where is a handle registered?", href: "/tools/username-search" },
    { label: "Data Leak Checker — has an email been breached? (free)", href: "/tools/data-leak-checker" },
    { label: "GitHub Profile Lookup — a developer's public footprint", href: "/tools/github-profile-lookup" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function PeopleSearchPage() {
  return (
    <ToolLanding {...cfg}>
      <ReconExample
        targetLabel="IDENTIFIER — USERNAME, EMAIL OR PHONE"
        placeholder="e.g. a handle like @samplehandle"
        exampleTitle="Public-profile sweep for a sample handle"
        rows={[
          { label: "github", value: "public profile found — link in result" },
          { label: "reddit", value: "public profile found — link in result" },
          { label: "steam", value: "public profile found — link in result" },
          { label: "instagram", value: "no public profile under this handle" },
          { label: "tiktok", value: "no public profile under this handle" },
        ]}
        footnote="This is the shape of a result, shown with a fictional sample handle — live searches stream each platform's answer as it arrives. Fingerprint searches public profiles only; it never returns private data. The live tool runs in WorldEye's RECON board and is included with WorldEye Pro."
      />
    </ToolLanding>
  );
}
