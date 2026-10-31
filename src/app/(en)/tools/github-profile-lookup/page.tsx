import type { Metadata } from "next";
import { Terminal } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "github-profile-lookup",
  name: "GitHub Recon",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Terminal,
  h1: "GitHub Profile Lookup — Public Profile, Repos and Contact Surface",
  lede: "Look up a public GitHub profile in one view: account details, public repositories, and the contact surface the user themselves publishes — for hiring, vetting, and research.",
  description:
    "WorldEye's GitHub profile lookup gathers a public GitHub profile, its public repositories and its published contact surface in one view. Public data only — exactly what GitHub itself shows. Part of the RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Identity → GitHub Recon",
  honestyTitle: "What a GitHub lookup can and can't tell you",
  honesty: [
    "Public data only — exactly what GitHub itself shows any visitor. Private repositories, private email addresses, and unlisted activity are not visible to this lookup or to anyone else outside the account.",
    "A profile shows what its owner chose to publish: a listed website, company, or contact link is self-declared, not independently verified by GitHub or by WorldEye.",
    "Repository counts and activity describe public work. Many developers do most of their work in private or employer repositories, so a quiet public profile is not evidence of an inactive developer.",
    "A GitHub username is a handle, not a proven identity — accounts can share names with unrelated people, and the lookup does not claim a profile belongs to a specific real-world person.",
  ],
  intro: [
    "GitHub is the public workshop of the software world. For anyone who builds in the open, a GitHub profile is a working CV: the repositories they maintain, the languages they actually use, the projects they contribute to, and — if they choose — the website, company, and contact links where they can be reached. A GitHub profile lookup gathers that public record into one readable view, whether you are a hiring manager screening a candidate, a developer vetting a dependency's maintainer, or a researcher mapping who builds a project.",
    "WorldEye's GitHub Recon lives in the RECON board's Identity group, alongside the Username Search — and the two pair naturally: find a username across platforms in one tool, then open its GitHub presence in depth here. The lookup assembles the profile fields, the public repository list with languages and activity signals, and the contact surface the user publishes, so you are not paging through tabs to build the picture yourself.",
    "Everything it shows is what GitHub itself shows — no more, and presented with that boundary stated plainly. That makes the result safe to rely on for what it is: a faithful digest of someone's public presence. It cannot reach private work, it cannot verify that a self-declared employer or website is genuine, and it cannot prove a handle belongs to the person you have in mind. Within those lines, it is one of the most informative public records a technologist has.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose GitHub Recon in the Identity group.",
    "Enter the GitHub username you are researching.",
    "Run the lookup. WorldEye gathers the public profile, repository list, and published contact fields for that account.",
    "Read the picture: account age and bio, notable public repositories and their languages, and any website, company, or contact links the user lists.",
    "Extend the research in the same board — run the username through Username Search to see the same handle on other platforms.",
  ],
  faqTitle: "GitHub profile lookup questions",
  faqs: [
    {
      q: "What can I see in a GitHub profile lookup?",
      a: "The public record: display name and bio, account creation date, listed location, company and website if the user publishes them, follower and following counts, and the public repositories with their descriptions, primary languages, stars, and recent activity. It is the same information spread across the user's GitHub pages, assembled into one digest.",
    },
    {
      q: "Can the lookup see private repositories or a private email?",
      a: "No. Private repositories and private profile fields are invisible to everyone except the account owner and their collaborators, and no lookup can change that. If a profile lists a contact email or website, it is because the user chose to publish it on their profile — the lookup surfaces that public contact surface, nothing beyond it.",
    },
    {
      q: "Is a sparse GitHub profile a red flag for a developer?",
      a: "Not by itself. Developers employed on proprietary code often have nearly empty public profiles because their real work lives in private company repositories. Judge a sparse profile as no public evidence, and weigh it alongside everything else you know. Conversely, a busy profile does show sustained public work — that asymmetry is the honest way to read the data.",
    },
    {
      q: "How do I find the person behind a GitHub username?",
      a: "Start with what they publish: the profile's website, company, and social links are self-declared starting points, and commit and repository pages sometimes carry a public contact. WorldEye's Username Search checks the same handle across other platforms, which often connects a GitHub presence to a fuller public identity. What you should not expect is certainty — a handle is not proof of a real-world identity, and any tool claiming to unmask one reliably is overstating.",
    },
    {
      q: "Why use this instead of opening GitHub directly?",
      a: "Convenience and context. The lookup assembles profile, repositories, and contact surface into one view and sits inside the RECON board, where the same username can flow into cross-platform search and the email you find can be checked in the leak checker. GitHub remains the source — this is its public data, organised for investigation.",
    },
    {
      q: "What does it cost?",
      a: "GitHub Recon is a Pro module in WorldEye's RECON board, included with WorldEye Pro. The board also includes a free Data Leak Checker and a free Username Search on the Tools page, which run with no account at all.",
    },
  ],
  related: [
    { label: "Username Search — one handle across 100+ sites (free)", href: "/tools/username-search" },
    { label: "Data Leak Checker — is an email in a known breach? (free)", href: "/tools/data-leak-checker" },
    { label: "People Search — public profiles by name", href: "/tools/people-search" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function GithubProfileLookupPage() {
  return (
    <ToolLanding
      {...cfg}
    >
      <ReconExample
        targetLabel="TARGET — GITHUB USERNAME"
        placeholder="e.g. example-user"
        exampleTitle="Public GitHub profile of a sample account"
        rows={[
          { label: "Profile", value: "example-user — sample bio line — joined 2019" },
          { label: "Listed links", value: "example.com — published by the user on their profile" },
          { label: "Top repo", value: "example-project — TypeScript — public" },
          { label: "Languages", value: "TypeScript, Python, Go (public repositories)" },
          { label: "Scope", value: "public data only — exactly what GitHub itself shows" },
        ]}
        footnote="This is the shape of a real result, shown with an example username. The live lookup runs inside WorldEye's RECON board and is included with WorldEye Pro."
      />
    </ToolLanding>
  );
}
