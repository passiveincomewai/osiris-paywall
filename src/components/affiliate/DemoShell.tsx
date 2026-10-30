"use client";
// ── Affiliate demo shell ─────────────────────────────────────────────────
// Wraps every /affiliates/demo/* route (mounted by the demo layout):
//  - a persistent DEMO bar + section sub-nav, so the demo badge is on
//    every demo surface;
//  - engagement tracking (sessionStorage): once a visitor has seen the
//    hub AND at least two demo sections, the affiliate terms modal is
//    offered once per session;
//  - the terms modal itself — the REAL program terms
//    (lib/affiliate/terms, the same source as /affiliates/terms).
//    Agreeing records acceptance server-side (POST
//    /api/affiliate/accept-terms) and enrols via the existing
//    POST /api/affiliate/join. Signed-out visitors keep their intent
//    through sign-in (localStorage + the ?join=1 callback) and confirm
//    on return. This modal is a standalone functional dialog — it is
//    NOT registered with the marketing popup manager (lib/popups), so
//    that system can never suppress or stack over it;
//  - click stewardship: join CTAs that point at sign-in open the terms
//    modal first; links to the six real surfaces are remapped to their
//    demo equivalents; deeper live-Studio links are inert in the demo.
import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  AFFILIATE_TERMS_SECTIONS, AFFILIATE_TERMS_INTRO, AFFILIATE_TERMS_NOTICE,
  AFFILIATE_TERMS_VERSION, AFFILIATE_TERMS_UPDATED_LABEL,
} from "@/lib/affiliate/terms";

const SECTIONS = [
  { key: "dashboard", label: "Dashboard", href: "/affiliates/demo" },
  { key: "studio", label: "Marketing Studio", href: "/affiliates/demo/studio" },
  { key: "missions", label: "Missions", href: "/affiliates/demo/missions" },
  { key: "network", label: "Network", href: "/affiliates/demo/network" },
  { key: "leaderboard", label: "Leaderboard", href: "/affiliates/demo/leaderboard" },
  { key: "resources", label: "Resources", href: "/affiliates/demo/resources" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

const REAL_TO_DEMO: Record<string, string> = {
  "/affiliates/dashboard": "/affiliates/demo",
  "/affiliates/studio": "/affiliates/demo/studio",
  "/affiliates/missions": "/affiliates/demo/missions",
  "/affiliates/network": "/affiliates/demo/network",
  "/affiliates/leaderboard": "/affiliates/demo/leaderboard",
  "/affiliates/resources": "/affiliates/demo/resources",
};

const SS_SECTIONS = "we-demo-sections";
const SS_HUB = "we-demo-hub";
const SS_PROMPTED = "we-demo-terms-prompted";
const LS_INTENT = "we-affiliate-join-intent";
const LS_AGREED = "we-affiliate-terms-agreed";

type Viewer = "unknown" | "anon" | "member" | "affiliate";

const DemoTermsContext = createContext<{ openTerms: () => void }>({ openTerms: () => {} });

/** A join/activate CTA for demo surfaces — always opens the terms modal. */
export function DemoJoinButton({
  children, className, style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { openTerms } = useContext(DemoTermsContext);
  return (
    <button onClick={openTerms} className={className} style={style}>
      {children}
    </button>
  );
}

/** Framing used by the demo section pages: floating badge + border,
 *  mirroring the dashboard demo section's treatment. */
export function DemoSectionFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-3 z-10 flex justify-center">
        <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.25em] text-pink-100 border border-pink-400/60 bg-pink-500/20 backdrop-blur">
          LIVE DEMO — SAMPLE FIGURES
        </span>
      </div>
      <div className="rounded-3xl border border-white/10 overflow-hidden p-4 md:p-6 pt-6">
        {children}
      </div>
    </div>
  );
}

function sectionForPath(pathname: string): SectionKey | null {
  if (pathname === "/affiliates/demo") return "dashboard";
  const rest = pathname.replace("/affiliates/demo/", "");
  const hit = SECTIONS.find((s) => s.key === rest);
  return hit ? hit.key : null;
}

function ssGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch { /* private mode */ }
}
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}
function lsDel(key: string) {
  try { localStorage.removeItem(key); } catch { /* private mode */ }
}

type JoinPhase = "terms" | "working" | "done" | "error";

export default function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [viewer, setViewer] = useState<Viewer>("unknown");
  const [modalOpen, setModalOpen] = useState(false);
  const [phase, setPhase] = useState<JoinPhase>("terms");
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState("");
  const promptedRef = useRef(false);
  const intentHandledRef = useRef(false);

  const openTerms = useCallback(() => {
    setPhase("terms");
    setErrorMsg("");
    setModalOpen(true);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 4200);
  }, []);

  // Resolve the viewer's relationship to the program.
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/affiliate/me", { cache: "no-store" });
        if (r.ok) setViewer("affiliate");
        else if (r.status === 404) setViewer("member");
        else setViewer("anon");
      } catch {
        setViewer("anon");
      }
    })();
  }, []);

  // Engagement tracking + the once-per-session terms prompt.
  useEffect(() => {
    if (!pathname) return;
    const section = sectionForPath(pathname);
    if (!section) return;
    let sections: string[] = [];
    try { sections = JSON.parse(ssGet(SS_SECTIONS) ?? "[]"); } catch { sections = []; }
    if (!sections.includes(section)) {
      sections.push(section);
      ssSet(SS_SECTIONS, JSON.stringify(sections));
    }
    if (section === "dashboard") ssSet(SS_HUB, "1");

    if (promptedRef.current) return;
    const hubSeen = ssGet(SS_HUB) === "1";
    const alreadyPrompted = ssGet(SS_PROMPTED) === "1";
    const agreed = lsGet(LS_AGREED) === AFFILIATE_TERMS_VERSION;
    if (hubSeen && sections.length >= 2 && !alreadyPrompted && !agreed && viewer !== "affiliate" && viewer !== "unknown") {
      promptedRef.current = true;
      ssSet(SS_PROMPTED, "1");
      const t = window.setTimeout(openTerms, 700);
      return () => window.clearTimeout(t);
    }
  }, [pathname, viewer, openTerms]);

  // Join intent returning from sign-in (?join=1 or a stored intent):
  // reopen the modal so the now-signed-in visitor can confirm.
  useEffect(() => {
    if (intentHandledRef.current || viewer === "unknown") return;
    const wantsJoin = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("join") === "1";
    const storedIntent = lsGet(LS_INTENT);
    if ((wantsJoin || storedIntent) && viewer === "member") {
      intentHandledRef.current = true;
      openTerms();
    } else if (wantsJoin && viewer === "affiliate") {
      intentHandledRef.current = true;
      lsDel(LS_INTENT);
    }
  }, [viewer, openTerms]);

  // Esc closes the modal.
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModalOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const agree = async () => {
    // Signed-out: preserve intent and route through sign-up/sign-in.
    if (viewer === "anon" || viewer === "unknown") {
      lsSet(LS_INTENT, JSON.stringify({ v: AFFILIATE_TERMS_VERSION, t: Date.now() }));
      window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent("/affiliates/demo?join=1")}`;
      return;
    }
    if (viewer === "affiliate") {
      setModalOpen(false);
      router.push("/affiliates/dashboard");
      return;
    }
    setPhase("working");
    setErrorMsg("");
    try {
      const acc = await fetch("/api/affiliate/accept-terms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version: AFFILIATE_TERMS_VERSION, source: "demo" }),
      });
      if (acc.status === 401) {
        lsSet(LS_INTENT, JSON.stringify({ v: AFFILIATE_TERMS_VERSION, t: Date.now() }));
        window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent("/affiliates/demo?join=1")}`;
        return;
      }
      if (!acc.ok) throw new Error("accept");
      const join = await fetch("/api/affiliate/join", { method: "POST" });
      if (!join.ok) {
        const j = await join.json().catch(() => ({}));
        throw new Error(typeof j.error === "string" ? j.error : "join");
      }
      lsSet(LS_AGREED, AFFILIATE_TERMS_VERSION);
      lsDel(LS_INTENT);
      setPhase("done");
    } catch (e) {
      setPhase("error");
      setErrorMsg(
        e instanceof Error && e.message !== "accept" && e.message !== "join"
          ? e.message
          : "Something interrupted activation — your terms acceptance is saved if it went through. Try again.",
      );
    }
  };

  // Click stewardship inside the demo (see header comment).
  const onClickCapture = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    const href = a.getAttribute("href") ?? "";
    if (href.startsWith("/api/auth/signin")) {
      e.preventDefault();
      openTerms();
      return;
    }
    if (REAL_TO_DEMO[href]) {
      e.preventDefault();
      router.push(REAL_TO_DEMO[href]);
      return;
    }
    if (href.startsWith("/affiliates/studio") || href.startsWith("/affiliates/campaigns")) {
      e.preventDefault();
      showToast("That tool is available in the live dashboard — the demo is read-only.");
    }
  };

  const activeSection = pathname ? sectionForPath(pathname) : null;

  return (
    <DemoTermsContext.Provider value={{ openTerms }}>
      <div onClickCapture={onClickCapture}>
        {/* Persistent demo bar */}
        <div className="mb-8 space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-pink-400/40 bg-pink-400/[0.07] px-4 py-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.25em] text-pink-100 border border-pink-400/60 bg-pink-500/20">
              ● LIVE DEMO
            </span>
            <span className="text-sm text-slate-300">
              The real affiliate suite on sample data — no real people, no real earnings.
            </span>
            <div className="ml-auto">
              {viewer === "affiliate" ? (
                <Link href="/affiliates/dashboard"
                  className="inline-block px-4 py-2 rounded-xl text-sm font-mono font-bold text-[#04121f]"
                  style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>
                  Go to your dashboard
                </Link>
              ) : (
                <button onClick={openTerms}
                  className="px-4 py-2 rounded-xl text-sm font-mono font-bold text-[#04121f]"
                  style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 18px rgba(0,150,255,.4)" }}>
                  Become an Affiliate — Free
                </button>
              )}
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Demo sections">
            {SECTIONS.map((s) => (
              <Link key={s.key} href={s.href}
                className={`px-4 py-2 rounded-xl text-sm font-mono font-bold whitespace-nowrap transition-all ${
                  activeSection === s.key
                    ? "text-[#04121f]"
                    : "text-slate-300 border border-white/15 hover:bg-white/5"
                }`}
                style={activeSection === s.key
                  ? { background: "linear-gradient(135deg,#f9a8d4,#ec4899)", boxShadow: "0 0 16px rgba(236,72,153,.4)" }
                  : undefined}>
                {s.label}
              </Link>
            ))}
          </nav>
        </div>

        {children}

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] max-w-md w-[calc(100%-2rem)] rounded-2xl border border-cyan-400/40 bg-[#071120]/95 backdrop-blur px-4 py-3 text-sm text-cyan-100 shadow-2xl text-center">
            {toast}
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-3 sm:p-6"
            role="dialog" aria-modal="true" aria-label="Affiliate program terms">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl border border-white/15 bg-[#070d1a] shadow-2xl overflow-hidden">
              <div className="flex items-start justify-between gap-4 px-5 md:px-7 pt-5 md:pt-6 pb-4 border-b border-white/10">
                <div>
                  <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">
                    {phase === "done" ? "You're in" : "Before you activate"}
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    {phase === "done" ? "Your affiliate account is active" : "Affiliate Program Terms"}
                  </h2>
                  {phase !== "done" && (
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Version {AFFILIATE_TERMS_VERSION} · Last updated: {AFFILIATE_TERMS_UPDATED_LABEL} ·{" "}
                      <Link href="/affiliates/terms" className="text-cyan-300 hover:text-cyan-200">read on the terms page</Link>
                    </p>
                  )}
                </div>
                <button onClick={() => setModalOpen(false)} aria-label="Close"
                  className="shrink-0 w-9 h-9 rounded-lg border border-white/15 text-slate-300 hover:bg-white/5 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {phase === "done" ? (
                <div className="px-5 md:px-7 py-6 space-y-4">
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                    Your terms acceptance is on record and your free affiliate account is active —
                    your referral link, discount code and dashboard are ready.
                  </p>
                  <Link href="/affiliates/dashboard"
                    className="inline-block px-6 py-3 rounded-2xl font-mono font-black text-[#04121f]"
                    style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 24px rgba(0,150,255,.45)" }}>
                    Open my dashboard
                  </Link>
                </div>
              ) : (
                <>
                  <div className="overflow-y-auto px-5 md:px-7 py-5 space-y-5">
                    <p className="text-sm text-slate-300 leading-relaxed">{AFFILIATE_TERMS_INTRO}</p>
                    <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4 text-[13px] text-amber-100/90 leading-relaxed">
                      <span className="font-mono font-bold text-amber-300">IMPORTANT — PLEASE READ: </span>
                      {AFFILIATE_TERMS_NOTICE}
                    </div>
                    {AFFILIATE_TERMS_SECTIONS.map((s) => (
                      <section key={s.n}>
                        <h3 className="text-[15px] font-bold text-white">
                          <span className="font-mono text-[#0096FF] mr-2">{s.n}.</span>
                          {s.title}
                        </h3>
                        <div className="mt-1.5 space-y-2">
                          {s.body.map((p, i) => (
                            <p key={i} className="text-[13px] text-slate-400 leading-relaxed">{p}</p>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                  <div className="px-5 md:px-7 py-4 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button onClick={agree} disabled={phase === "working"}
                      className="px-6 py-3 rounded-2xl font-mono font-black text-[#04121f] disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 24px rgba(0,150,255,.45)" }}>
                      {phase === "working"
                        ? "Activating…"
                        : viewer === "affiliate"
                          ? "Go to my dashboard"
                          : viewer === "anon"
                            ? "I agree — create my free account"
                            : "I agree — activate my free account"}
                    </button>
                    <button onClick={() => setModalOpen(false)}
                      className="px-5 py-3 rounded-2xl font-mono font-bold border border-white/20 text-slate-200 hover:bg-white/5">
                      Not now
                    </button>
                    {phase === "error" && <p className="text-sm text-red-300 sm:ml-2">{errorMsg}</p>}
                    {viewer === "anon" && phase !== "working" && (
                      <p className="text-xs text-slate-500 sm:ml-auto">
                        You'll sign in or create your WorldEye account first — your agreement is recorded right after.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </DemoTermsContext.Provider>
  );
}
