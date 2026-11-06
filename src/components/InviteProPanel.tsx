"use client";

/**
 * The Settings panel for the invite-a-friend Pro-days reward
 * (lib/invite-pro). The rules as stated on the panel are the rules as
 * implemented — keep them in sync:
 *   • +7 days of Pro for each friend who joins through the link AND
 *     verifies their email (joining alone pays the camera bonus, in
 *     the camera popup's invite section; verification pays this one);
 *   • at most 5 rewarded friends per calendar month;
 *   • one reward per friend, ever;
 *   • the days are free Pro time added through the comp system —
 *     they never change a paid subscription. If the user has a paid
 *     plan when a reward lands, the days are BANKED and applied at a
 *     later sign-in once the paid plan is gone.
 *
 * The link is the affiliate program's own /ref/[code] link — the same
 * one the camera popup hands out (GET /api/invite/summary resolves
 * it); a user without an affiliate profile provisions one through
 * the program's own join endpoint, exactly like the popup section.
 */
import { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { InviteLinkBlock } from "./InviteFriendsSection";
import {
  INVITE_PRO_DAYS,
  INVITE_PRO_MONTHLY_CAP,
} from "@/lib/invite-pro-constants";

type InviteSummary = {
  link: string | null;
  joined: number;
  verified: number;
  daysEarned: number;
  daysBanked: number;
  rewardedThisMonth: number;
  monthlyCap: number;
  daysPerInvite: number;
};

type PanelState =
  | { kind: "loading" }
  | { kind: "ready"; summary: InviteSummary };

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-center">
      <p className="text-lg font-bold leading-none text-white">{value}</p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
        {label}
      </p>
    </div>
  );
}

export default function InviteProPanel() {
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/invite/summary");
      const j = await r.json().catch(() => null);
      if (r.ok && j) {
        setState({
          kind: "ready",
          summary: {
            link: j.link ?? null,
            joined: j.joined ?? 0,
            verified: j.verified ?? 0,
            daysEarned: j.daysEarned ?? 0,
            daysBanked: j.daysBanked ?? 0,
            rewardedThisMonth: j.rewardedThisMonth ?? 0,
            monthlyCap: j.monthlyCap ?? INVITE_PRO_MONTHLY_CAP,
            daysPerInvite: j.daysPerInvite ?? INVITE_PRO_DAYS,
          },
        });
      }
    } catch {
      /* leave the current state — the panel just stays quiet */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const provision = useCallback(async () => {
    setProvisioning(true);
    setError(null);
    try {
      // The affiliate program's own provisioning path — joining is
      // what creates the referral code the invite link needs.
      const r = await fetch("/api/affiliate/join", { method: "POST" });
      if (!r.ok) throw new Error("join failed");
      await load();
    } catch {
      setError("Couldn't create your link just now — try again in a moment.");
    } finally {
      setProvisioning(false);
    }
  }, [load]);

  const summary = state.kind === "ready" ? state.summary : null;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 md:p-7">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <UserPlus className="h-5 w-5 text-[#D4AF37]" />
        Invite friends — earn free Pro days
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/55">
        For each friend who joins WorldEye with your link{" "}
        <span className="text-white/80">and verifies their email</span>, you
        earn{" "}
        <span className="font-semibold text-white">
          +{summary?.daysPerInvite ?? INVITE_PRO_DAYS} days of Pro
        </span>
        , added to your account automatically. Up to{" "}
        {summary?.monthlyCap ?? INVITE_PRO_MONTHLY_CAP} rewarded friends per
        calendar month, one reward per friend. The days are free Pro time —
        they never change a paid subscription.
      </p>

      {summary && summary.daysBanked > 0 && (
        <p className="mt-3 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#e8cf7a]">
          You have {summary.daysBanked} Pro{" "}
          {summary.daysBanked === 1 ? "day" : "days"} banked. Banked days
          can&apos;t be added on top of a paid plan, so they&apos;re held and
          applied at a later sign-in once you no longer have an active paid
          subscription.
        </p>
      )}

      <div className="mt-5">
        {state.kind === "loading" && (
          <p className="text-sm text-white/35">Loading your invite link…</p>
        )}
        {summary && summary.link && (
          <>
            <InviteLinkBlock link={summary.link} balance={0} />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Friends joined" value={summary.joined} />
              <Stat label="Verified" value={summary.verified} />
              <Stat label="Pro days earned" value={summary.daysEarned} />
            </div>
            <p className="mt-3 text-[11px] leading-snug text-white/40">
              Rewards this month: {summary.rewardedThisMonth} of{" "}
              {summary.monthlyCap}. A friend counts when they verify their
              email — not just when they join.
            </p>
          </>
        )}
        {summary && !summary.link && (
          <div>
            <button
              type="button"
              onClick={provision}
              disabled={provisioning}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#D4AF37] px-4 text-sm font-bold text-black transition hover:brightness-110 active:brightness-95 disabled:opacity-60"
            >
              {provisioning ? "Creating your link…" : "Get my invite link"}
            </button>
            {error && (
              <p className="mt-2 text-[11px] leading-snug text-red-400">{error}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
