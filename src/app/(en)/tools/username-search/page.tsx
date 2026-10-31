import type { Metadata } from "next";
import { User } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "username-search",
  name: "Username Search",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: User,
  h1: "Username Search — Find a Handle Across Platforms",
  lede: "One handle, checked everywhere it might live: where the username is registered, where it's still free, and what the profiles behind it say — from a single search in the RECON board.",
  description:
    "Search a username across social, gaming, developer and community platforms to find where it's registered and where it's free. Part of WorldEye's RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Identity → Username",
  honestyTitle: "What a username check can and can't prove",
  honesty: [
    "A “found” result means a public profile exists under that exact handle on that platform — with a link, so you can open it and judge for yourself. It does not prove the profile belongs to a particular person; handles are reused and impersonated constantly.",
    "A “not found” means no public profile answered under that handle. It is not absolute proof the name is unused: private, renamed, or platform-blocked accounts can be invisible to a check.",
    "Availability cuts both ways: a handle shown free today can be registered by someone else tomorrow, and platforms may refuse names (trademarks, reserved words) that a checker sees as open. Confirm on the platform before you build a brand on it.",
    "This is a public-data tool for legitimate purposes — claiming your own name consistently, vetting a handle you're about to trust, or finding your own scattered accounts.",
  ],
  intro: [
    "A username is a small piece of identity that follows a person — or a brand — across the internet. The same handle tends to recur: the gamer tag becomes the GitHub name becomes the shop name. That recurrence is what makes a username search useful in both directions. Looking outward, it answers “where does this handle actually live?” — the first step in verifying that the person messaging you is the person they claim to be. Looking inward, it answers “where is my name still unclaimed?” — the first step in securing a brand before someone else squats it.",
    "WorldEye's Username Search runs that check from the RECON board: one handle in, and the board tests it against the platforms where identities actually accumulate — social networks, gaming and streaming services, developer hosts, marketplaces and communities — reporting registered versus not-found, platform by platform, with links to the profiles it finds.",
    "Because the search lives in the board, a hit is a beginning rather than an end. Found a handle's GitHub? Open the GitHub lookup. Found an email-shaped lead? Run the leak checker. The identity tools are designed to chain, each one examining the same thread from a different, public angle.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose Username in the Identity group.",
    "Enter the exact handle — spelling and underscores matter; platforms treat them as different names.",
    "Read the platform-by-platform result: registered (with a link to the public profile) or not found.",
    "Open the profiles before drawing conclusions — confirm they present the same public persona, not just the same string.",
    "If you're claiming a name, register the important platforms promptly and consistently; if you're vetting, chain into Fingerprint and the leak checker for the fuller public picture.",
  ],
  faqTitle: "Username search questions",
  faqs: [
    {
      q: "Why check a username across platforms at all?",
      a: "Two big reasons. Verification: when someone contacts you under a handle — a seller, a collaborator, a supposed official account — its footprint across platforms is the fastest credibility check there is; a name that exists nowhere else, created yesterday, is telling you something. And claiming: founders, creators and streamers need the same name everywhere, and discovering the one platform where it's taken is much better done before the launch than after.",
    },
    {
      q: "Does “found” mean the profile is the person I'm thinking of?",
      a: "It means a profile with that handle exists. Common names and short handles are registered by many different people across platforms, and impersonation is common on all of them. The search gives you the links precisely so you can compare the profiles themselves — photos, links, history — before attributing them to anyone.",
    },
    {
      q: "A platform says “not found”. Is the name available to register?",
      a: "Probably, but verify on the platform itself before relying on it. A check can miss private or recently renamed accounts, and platforms hold back reserved, trademarked and banned names that look free to a checker. Treat “not found” as a strong lead, and the platform's own signup form as the verdict.",
    },
    {
      q: "How is this different from Fingerprint?",
      a: "Username Search starts from a handle and maps its registrations. Fingerprint starts from any of a username, email or phone number and streams back the public profiles attached to it, with sources. They overlap by design — one is a registrar's-eye view, the other an investigator's — and investigators chain them.",
    },
    {
      q: "I'm being impersonated under my own handle. Can this help?",
      a: "It can map the problem: which platforms carry the impersonating profile and which don't. Report the fakes through each platform's impersonation process with the links as evidence, and register the still-free platforms under your name to stop the impersonator expanding. The search documents the landscape; enforcement is the platforms' job.",
    },
    {
      q: "What does it cost?",
      a: "Username Search is a Pro module in WorldEye's RECON board, included with WorldEye Pro. The board's free tools — the Data Leak Checker, the Shodan IoT Lookup — run with no account at all.",
    },
  ],
  related: [
    { label: "Fingerprint — public profile search by username, email or phone", href: "/tools/people-search" },
    { label: "GitHub Profile Lookup — a developer's public footprint", href: "/tools/github-profile-lookup" },
    { label: "Data Leak Checker — has an email been breached? (free)", href: "/tools/data-leak-checker" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function UsernameSearchPage() {
  return (
    <ToolLanding {...cfg}>
      <ReconExample
        targetLabel="USERNAME TO HUNT"
        placeholder="e.g. the exact handle, without the @"
        exampleTitle="Cross-platform check of a sample handle"
        rows={[
          { label: "github", value: "registered — public profile linked" },
          { label: "reddit", value: "registered — public profile linked" },
          { label: "twitch", value: "registered — public profile linked" },
          { label: "instagram", value: "not found under this handle" },
          { label: "tiktok", value: "not found under this handle" },
        ]}
        footnote="This is the shape of a result, shown with a sample handle. The live search runs inside WorldEye's RECON board and is included with WorldEye Pro. A found profile still needs your judgement — a shared handle is not proof of a shared owner."
      />
    </ToolLanding>
  );
}
