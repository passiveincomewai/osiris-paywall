"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { EmptyState, Pill, StatCard, fmtCents } from "@/components/affiliate/ui";

type TreeNode = {
  id: string;
  name: string;
  image: string | null;
  level: number; // 1-3
  joinedAt: string;
  converted: boolean;
  commissionsCents: number;
  children: TreeNode[];
};

const LEVEL_STYLE: Record<number, { color: string }> = {
  1: { color: "#22d3ee" },
  2: { color: "#a78bfa" },
  3: { color: "#fbbf24" },
};

function countNodes(nodes: TreeNode[]): number {
  return nodes.reduce((n, x) => n + 1 + countNodes(x.children ?? []), 0);
}
function sumCommissions(nodes: TreeNode[]): number {
  return nodes.reduce((n, x) => n + (x.commissionsCents ?? 0) + sumCommissions(x.children ?? []), 0);
}
function countConverted(nodes: TreeNode[]): number {
  return nodes.reduce((n, x) => n + (x.converted ? 1 : 0) + countConverted(x.children ?? []), 0);
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  if (image) {
    return <img src={image} alt={name} className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0" />;
  }
  return (
    <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-white border border-white/15"
      style={{ background: "radial-gradient(circle at 35% 30%, #1e3a5f, #0a1220)" }}>
      {initial}
    </div>
  );
}

function NodeRow({ node }: { node: TreeNode }) {
  const [open, setOpen] = useState(node.level === 1);
  const kids = node.children ?? [];
  const isCustomer = node.id.startsWith("customer:");
  const lv = LEVEL_STYLE[node.level] ?? LEVEL_STYLE[1];
  const joined = node.joinedAt ? new Date(node.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div>
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 hover:border-cyan-400/30 transition-colors">
        <Avatar name={node.name} image={node.image} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold truncate">{node.name}</span>
            <Pill color={lv.color}>L{node.level}</Pill>
            <Pill color={isCustomer ? "#94a3b8" : "#34d399"}>{isCustomer ? "customer" : "affiliate"}</Pill>
            {node.converted && <Pill color="#4ade80"><Check className="w-3 h-3 mr-1" strokeWidth={3.5} />paying</Pill>}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            joined {joined} · earned <span className="text-cyan-300">{fmtCents(node.commissionsCents ?? 0)}</span>
          </div>
        </div>
        {kids.length > 0 ? (
          <button
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 w-8 h-8 rounded-lg border border-white/15 text-cyan-300 hover:bg-white/5 transition-colors flex items-center justify-center"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="shrink-0 text-[11px] font-mono text-slate-500 pr-1">
            {kids.length === 0 && node.level < 3 ? "—" : ""}
          </span>
        )}
      </div>
      {open && kids.length > 0 && (
        <div className="ml-5 mt-2 space-y-2 border-l-2 border-cyan-400/20 pl-3">
          {kids.map((c) => (
            <NodeRow key={c.id} node={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NetworkClient() {
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [notAffiliate, setNotAffiliate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/affiliate/network", { cache: "no-store" });
        if (r.status === 404) {
          const j = await r.json().catch(() => ({}));
          if (j.join) { setNotAffiliate(true); return; }
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setTree(Array.isArray(j.tree) ? j.tree : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load network");
      }
    })();
  }, []);

  const stats = useMemo(() => {
    if (!tree) return null;
    return {
      size: countNodes(tree),
      commissions: sumCommissions(tree),
      paying: countConverted(tree),
    };
  }, [tree]);

  if (notAffiliate) {
    return (
      <EmptyState
        title="You're not an affiliate yet"
        body="Join the free program to get your referral link and start growing your network."
        cta={
          <Link href="/affiliates/dashboard"
            className="inline-block px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f]"
            style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" }}>
            Join free — get my link
          </Link>
        }
      />
    );
  }

  if (error) return <EmptyState title="Couldn't load your network" body={error} />;
  if (!tree || !stats) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-white/[0.04] border border-white/10 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <img src="/affiliate-icons/network.png" alt="Your network" className="w-12 h-12 md:w-14 md:h-14 object-contain shrink-0"
          style={{ filter: "drop-shadow(0 0 14px rgba(34,211,238,.45))" }} />
        <div>
          <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase">Network</div>
          <h1 className="text-2xl font-bold text-white">Your referral network</h1>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        <StatCard label="Network size" value={String(stats.size)} sub="referrals across 3 levels" accent="#22d3ee" />
        <StatCard label="Paying subscribers" value={String(stats.paying)} sub="converted in your network" accent="#4ade80" />
        <StatCard label="Network commissions" value={fmtCents(stats.commissions)} sub="earned from your network" accent="#fbbf24" />
      </div>

      {tree.length === 0 ? (
        <EmptyState
          title="No referrals yet"
          body="Share your link — every person who signs up through it lands here, with their own branches as they refer others."
          cta={
            <Link href="/affiliates/dashboard"
              className="inline-block px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f]"
              style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" }}>
              Get my referral link
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#22d3ee", boxShadow: "0 0 8px #22d3ee" }} /> L1 direct
            <span className="inline-block w-2 h-2 rounded-full ml-3" style={{ background: "#a78bfa", boxShadow: "0 0 8px #a78bfa" }} /> L2 override 5%
            <span className="inline-block w-2 h-2 rounded-full ml-3" style={{ background: "#fbbf24", boxShadow: "0 0 8px #fbbf24" }} /> L3 override 2%
          </div>
          {tree.map((n) => (
            <NodeRow key={n.id} node={n} />
          ))}
        </div>
      )}
    </div>
  );
}
