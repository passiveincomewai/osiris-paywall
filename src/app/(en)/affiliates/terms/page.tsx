// WorldEye Affiliate Program — Terms & Conditions (server component).
// Content lives in lib/affiliate/terms (single source of truth, shared
// with the demo join modal); this page is presentation only.
import {
  AFFILIATE_TERMS_SECTIONS,
  AFFILIATE_TERMS_INTRO,
  AFFILIATE_TERMS_NOTICE,
  AFFILIATE_TERMS_UPDATED_LABEL,
} from "@/lib/affiliate/terms";

export const metadata = {
  title: "Affiliate Terms & Conditions",
  description: "Terms and conditions for the WorldEye affiliate program.",
  // Self-canonical: without this, the page inherits the root layout's
  // canonical (the homepage) and Google treats it as a copy of /.
  alternates: { canonical: "https://worldeye.app/affiliates/terms" },
};

export default function AffiliateTerms() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Real H1 (SectionTitle renders an h2): mirrors its markup/classes. */}
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Legal</div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Affiliate Terms &amp; Conditions</h1>
        </div>
      </div>
      <p className="text-sm text-slate-400 font-mono mb-8">Last updated: {AFFILIATE_TERMS_UPDATED_LABEL}</p>

      <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-8">
        {AFFILIATE_TERMS_INTRO}
      </p>

      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] backdrop-blur-md p-5 mb-8 text-sm text-amber-100/90 leading-relaxed">
        <span className="font-mono font-bold text-amber-300">IMPORTANT — PLEASE READ: </span>
        {AFFILIATE_TERMS_NOTICE}
      </div>

      <div className="space-y-6">
        {AFFILIATE_TERMS_SECTIONS.map((s) => (
          <section key={s.n}
            className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 md:p-6"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)" }}>
            <h2 className="text-lg font-bold text-white">
              <span className="font-mono text-[#0096FF] mr-2">{s.n}.</span>
              {s.title}
            </h2>
            <div className="mt-3 space-y-3">
              {s.body.map((p, i) => (
                <p key={i} className="text-sm text-slate-300 leading-relaxed">{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs text-slate-500 font-mono leading-relaxed">
        {"// Questions about these terms? Contact the WorldEye team before promoting. "}
        Participation in the Program constitutes acceptance of these terms.
      </p>
    </div>
  );
}
