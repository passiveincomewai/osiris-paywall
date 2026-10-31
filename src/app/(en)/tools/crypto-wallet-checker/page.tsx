import type { Metadata } from "next";
import { Bitcoin } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "crypto-wallet-checker",
  name: "Chain Intel",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Bitcoin,
  h1: "Crypto Wallet Checker — Bitcoin, Ethereum and Solana Wallet Lookup",
  lede: "Check a BTC, ETH, or SOL wallet address against the public ledger: balance, transaction history, first and last activity, and the flows that connect it to the rest of the chain.",
  description:
    "WorldEye's crypto wallet checker analyses Bitcoin, Ethereum and Solana addresses from public on-chain data. An address is not a person's identity — owner identification is never claimed. Part of the RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Blockchain → Chain Intel",
  honestyTitle: "What wallet forensics can and can't tell you",
  honesty: [
    "Everything here is public ledger data — blockchains publish every transaction by design. The checker organises what anyone can read on-chain; it accesses nothing private.",
    "An address is not a person's identity. The checker never claims to identify a wallet's owner: at most, public labels (an exchange hot wallet, a known protocol contract) describe an address's role, not a named individual.",
    "Balance and history are read at check time and change with every new block. Figures for tokens and NFTs depend on the token contracts involved and can include worthless or spam assets airdropped to the address.",
    "Transaction flows show movement between addresses, not intent. An address sending funds toward an exchange, a mixer-labelled address, or a flagged cluster is a research lead — not proof of wrongdoing by whoever controls it.",
  ],
  intro: [
    "Blockchains are the most transparent financial systems ever built: every Bitcoin, Ethereum, and Solana transaction is published to a permanent public ledger that anyone can audit. A crypto wallet checker is how you read one address's place in that ledger — its current balance, the full arc of its transaction history, when it first appeared and last moved, and which other addresses and labelled services it interacts with. Journalists tracing a ransomware payment, investigators following stolen funds, and ordinary holders verifying a counterparty all start with the same lookup.",
    "WorldEye's Chain Intel lives in the RECON board's Blockchain group and covers BTC, ETH, and SOL addresses in one workflow. Paste an address and it assembles the on-chain picture: balances, transaction counts and history, counterparties, and known public labels for the services an address touches. The board's Daily Brief view carries the same chain lens at market level — a daily digest of notable on-chain movement and labelled flows — so a specific wallet you are tracing and the day's wider chain activity live in the same place, each giving the other context.",
    "The discipline of wallet forensics is separating what the ledger proves from what it merely suggests. It proves amounts, times, and paths between addresses with cryptographic certainty. It does not prove who holds the keys, why a payment was made, or what happened off-chain — and a professional reading says so at every step. Chain Intel is built to that standard: complete on the public record, explicit about the line where the record ends.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose Chain Intel in the Blockchain group — or open the board's Daily Brief view for today's notable on-chain movement first.",
    "Paste the wallet address and its chain — Bitcoin, Ethereum, or Solana. Address format is validated before the lookup runs.",
    "Run the check. WorldEye reads the public ledger for that address: balance, transaction history, and activity dates.",
    "Read the forensics: first-seen and last-active dates, major counterparties, and any public labels for services the address interacts with.",
    "Follow the flows: open linked addresses in the same view to trace a payment path step by step, and record what the ledger proves at each hop versus what remains unknown.",
  ],
  faqTitle: "Crypto wallet checker questions",
  faqs: [
    {
      q: "What can I learn from a Bitcoin wallet lookup?",
      a: "Everything the Bitcoin ledger publishes about that address: its balance, every transaction it has sent or received with amounts and times, the addresses it transacts with, and its first and latest activity. The same applies to Ethereum — plus token balances and contract interactions — and to Solana. What no lookup can add is the identity of whoever holds the keys; that information is not on-chain.",
    },
    {
      q: "Can this checker identify who owns a wallet?",
      a: "No, and it never claims to. A wallet address is a pseudonymous identifier: the ledger records its behaviour, not a name. Some addresses carry public labels because their operators identified themselves — major exchanges, protocol contracts, sanctioned-address lists — and Chain Intel surfaces those labels as role information. Connecting an unlabelled address to a person requires off-chain evidence that a ledger lookup does not have.",
    },
    {
      q: "Is it legal and safe to look up someone else's wallet?",
      a: "Yes. Blockchains are public ledgers by design; reading an address's history is the system's intended transparency, and the lookup is entirely passive — it cannot move funds, contact the holder, or signal that the address was viewed. Only the holder of the private key can spend from a wallet, and no checker can change that.",
    },
    {
      q: "Why does an Ethereum wallet show tokens I didn't expect?",
      a: "Anyone can send tokens to any address, and projects — plus spammers and scammers — airdrop tokens widely. An unexpected token usually means the address was included in a distribution or a dusting campaign, not that the holder bought it. Some airdropped tokens are designed to lure holders to malicious sites, so treat unknown assets as untrusted and never follow instructions printed in a token's name.",
    },
    {
      q: "What is the Daily Brief mentioned on this page?",
      a: "The Daily Brief is a view in the RECON board that summarises the day's notable on-chain activity — large movements, labelled-entity flows, and addresses in the news — as a starting point for research. Where Chain Intel examines one address in depth, the Daily Brief surveys the whole chain landscape for the day, and the two are designed to be used together.",
    },
    {
      q: "What does it cost?",
      a: "Chain Intel is a Pro module in WorldEye's RECON board, included with WorldEye Pro. The board's free tools — the Data Leak Checker, Username Search and others on the Tools page — run with no account at all.",
    },
  ],
  related: [
    { label: "Threats — reputation of an IP, domain or hash", href: "/tools/ip-reputation-checker" },
    { label: "Data Leak Checker — is an email in a known breach? (free)", href: "/tools/data-leak-checker" },
    { label: "GitHub Recon — public GitHub profile lookup", href: "/tools/github-profile-lookup" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function CryptoWalletCheckerPage() {
  return (
    <ToolLanding
      {...cfg}
    >
      <ReconExample
        targetLabel="TARGET — WALLET ADDRESS (BTC / ETH / SOL)"
        placeholder="e.g. a Bitcoin, Ethereum or Solana address"
        exampleTitle="On-chain record for a sample address"
        rows={[
          { label: "Chain / address", value: "Ethereum — 0x…example address (truncated for display)" },
          { label: "Balance", value: "native balance plus token balances at check time" },
          { label: "Activity", value: "first seen / last active dates from the public ledger" },
          { label: "Transactions", value: "count and recent transfers with counterparties" },
          { label: "Labels", value: "public service labels where known — an address is not an identity" },
        ]}
        footnote="This is the shape of a real result, shown in generic format terms rather than a real wallet's data. The live checker runs inside WorldEye's RECON board and is included with WorldEye Pro."
      />
    </ToolLanding>
  );
}
