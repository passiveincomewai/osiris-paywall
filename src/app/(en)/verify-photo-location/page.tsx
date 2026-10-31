import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Intro,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import { Newspaper, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Verify a Photo's Location — Check a Claimed Location Against the Evidence",
  description:
    "How journalists and fact-checkers verify where a photo was really taken: preserve the original, test the claimed location against metadata and scene clues, weigh contradicting evidence — with a free tool that shows its reasoning. Limits stated plainly.",
  alternates: { canonical: `${BASE}/verify-photo-location` },
  openGraph: {
    title: "Verify a Photo's Location — Check a Claimed Location Against the Evidence",
    description:
      "An evidence-based workflow for checking claimed photo locations, and a free beta tool that ranks candidates with the evidence for and against. Area-level, public places, no shortcuts claimed.",
    url: "/verify-photo-location",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Verify a Photo's Location — Check a Claimed Location Against the Evidence",
  description:
    "A verification workflow for claimed photo locations: original files and metadata as claims to test, scene-clue extraction, map matching, contradicting evidence, and the plain limits of an area-level, public-places beta tool.",
  url: `${BASE}/verify-photo-location`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const INTRO = [
  "The most common way a false photo spreads is not a fake image — it is a real image with a false caption. A genuine photograph of one city, one protest, one flood, relabelled as another, will outrun any correction. Checking a claimed location is how that gets caught: not by asking whether the photo \u201Clooks right\u201D, but by testing whether the evidence in and around the file is consistent with the place it claims to be.",
  "Location verification is a consistency exercise. A photo can be consistent with its claimed location, inconsistent with it, or — very often — simply unverifiable from what is visible. Each of those is a legitimate finding, and confusing the third for either of the first two is how verification itself goes wrong. The workflow below is the one open-source investigators use, and the free tool on this page automates the metadata and clue stages of it — with its reasoning on display, and its limits stated in the open.",
  "Those limits, up front: the tool returns areas, not pinpoint addresses — never tighter than a 250 m radius. It works on public places, and suppresses results for homes and private property to a general area. It does not run reverse image searches and does not compare photos against street-level imagery. It is one stage of a verification, not a verdict — and it is not a surveillance tool: it analyses a photo you provide, identifies no people, and performs no face recognition.",
];

const STEPS = [
  "Preserve the best copy you can get. Ask the source for the original file: screenshots and app-forwarded copies have had their metadata stripped before you ever see them.",
  "Form the claim precisely. \u201CThis photo shows place X\u201D is testable; note who is claiming it and what would follow if it were wrong.",
  "Run the photo through the Photo Geolocation tool. It reads any EXIF GPS in the file and extracts the scene's visible clues — signage, landmarks, plates, driving side, scene type.",
  "Compare the ranked candidates with the claim. A candidate that matches the claimed place, backed by independent clues, supports it. Note the confidence level and radius — a broad area match is weaker support than a tight one.",
  "Hunt for contradictions. One strong inconsistency — traffic driving on the other side, signage in the wrong language or script, a named landmark that is somewhere else — can outweigh several weak agreements.",
  "Corroborate before you conclude. Cross-check with live cameras near the candidate on WorldEye, contemporaneous reporting, and other primary sources. If the evidence stays thin, publish the honest finding: unverified.",
];

const FAQS = [
  {
    q: "Can the tool prove a photo was taken where it claims?",
    a: "No tool can prove that from a single image, and you should distrust any that says otherwise. What this one does is test consistency: it surfaces the metadata in the file and the evidence in the scene, ranks the places they support, and shows the reasoning. A strong, tight match with independent clues is real support for a claim. It is still support, not proof — corroborate with independent sources before you rely on it, especially before publishing.",
  },
  {
    q: "Can EXIF GPS be faked?",
    a: "Yes. EXIF metadata, including GPS coordinates and timestamps, can be edited with free tools in seconds, so metadata in a file is a claim to be tested, not ground truth. Test it against the scene: do the visible clues — language, plates, driving side, landmarks — agree with where the coordinates point? Forged metadata usually fails that cross-check, which is why the tool shows metadata results and clue-based candidates side by side rather than treating the file as gospel.",
  },
  {
    q: "Why won't it pinpoint the exact spot — or a house?",
    a: "By design, for safety. No result is displayed tighter than a 250 m radius, and when a photo appears to show a private residence or private property, the point is suppressed entirely and only the general area is returned. Verification of news imagery is about public places and public claims; a tool that pinpointed homes would be a tool for exposing private people, and this one is built so it cannot be used that way.",
  },
  {
    q: "Does it search the internet for other copies of the photo?",
    a: "No. The tool never uploads your photo to a reverse-image search or any photo-matching service, and it does not compare it against street-level imagery. It works from two evidence sources only: the file's own metadata, and the visible clues in the scene, matched against OpenStreetMap place data. Finding earlier copies of an image is a different verification technique — a valuable one, but one you will need a separate tool for.",
  },
  {
    q: "The tool said \u201Ccouldn't determine\u201D. Is that a failed verification?",
    a: "It is an honest one. It means the file carried no usable GPS and the scene held no readable sign, landmark or place name strong enough to rank — the normal outcome for generic streets, interiors, crowds and landscapes. For a verifier, \u201Ccouldn't determine\u201D is a finding: the photo's location is unverified, and any caption asserting one is going beyond the evidence. Report it that way rather than filling the gap with a guess.",
  },
  {
    q: "Is a match enough to publish?",
    a: "Treat it as one input. The tool is a beta; matches can be wrong, which is exactly why every candidate arrives with its evidence for and against, a confidence level and an uncertainty radius. Before publishing a location claim, weigh the contradicting evidence as carefully as the supporting evidence, and corroborate with sources independent of the photo itself — live cameras, local reporting, official records. If the claim matters and the evidence is thin, the publishable conclusion is that it could not be verified.",
  },
];

export default function VerifyPhotoLocationPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Photo Geolocation", href: "/tools/photo-geolocation" },
          { label: "Verify a Photo's Location" },
        ]}
      />

      <div className="mt-8 text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <Newspaper className="w-3.5 h-3.5" /> VERIFICATION · JOURNALISM &amp; OSINT
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          Verify a photo&apos;s location
        </h1>
        <p className="mt-4 text-white/55">
          A claimed location is a testable claim. Here is the evidence workflow for testing
          it — and a free tool that runs the metadata and clue stages with its reasoning on
          show.
        </p>
      </div>

      <Intro paragraphs={INTRO} />

      <section className="mt-12 max-w-3xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-5">What verification can — and cannot — establish</h2>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            Location verification answers a narrow question: <em>is the visible and embedded
            evidence consistent with this photo having been taken at the claimed place?</em>{" "}
            It cannot establish when the photo was taken (an old photo of the right place is
            the classic recycling trick), who took it, or whether the event it supposedly
            documents happened as described. Those are separate checks, with separate
            evidence.
          </p>
          <p>
            Keep the three outcomes distinct in your notes and in your copy.{" "}
            <strong className="text-white/85">Consistent:</strong> independent clues support
            the claimed location and none contradict it.{" "}
            <strong className="text-white/85">Inconsistent:</strong> at least one strong clue
            contradicts the claim — the photo is somewhere else, whatever its caption says.{" "}
            <strong className="text-white/85">Unverifiable:</strong> the file and the frame
            between them do not carry enough location evidence to test the claim at all. Most
            viral imagery, handled honestly, lands in the third bucket — and saying so is a
            service, not a shrug.
          </p>
        </div>
      </section>

      <section className="mt-12 max-w-3xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-5">The evidence workflow</h2>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            <strong className="text-white/85">1. Preserve the original.</strong> Every hop
            through a messaging or social app strips metadata. The file your source&apos;s
            phone produced is evidence; the screenshot of it in a group chat is a picture of
            evidence. Ask for the original, as a file, before you analyse anything.
          </p>
          <p>
            <strong className="text-white/85">2. Read the metadata as a claim.</strong> EXIF
            GPS and capture time are the first things to check — and the first things a
            motivated faker edits. Note what the file asserts, then hold it to the same
            standard as the caption: it has to survive cross-examination by the scene.
          </p>
          <p>
            <strong className="text-white/85">3. Extract the scene&apos;s clues.</strong>{" "}
            Signage and its language and script, named landmarks, licence-plate formats,
            driving side, road markings, architecture, vegetation. This is the stage the tool
            automates: its visual pass extracts clues only and never names the answer itself,
            so the ranking that follows is a deterministic product of the evidence, not a
            model&apos;s hunch.
          </p>
          <p>
            <strong className="text-white/85">4. Match against map data.</strong> Named
            places are looked up in OpenStreetMap and every candidate is scored on how much
            independent evidence supports it — and what speaks against it. Both columns are
            shown. In verification, the &ldquo;against&rdquo; column is the one that keeps you
            honest.
          </p>
          <p>
            <strong className="text-white/85">5. Check the place itself.</strong> A result on
            WorldEye links onward to{" "}
            <Link href="/live-webcams" className="text-[#D4AF37] hover:underline">
              live cameras near the candidate location
            </Link>{" "}
            and an <em>Explore location in 3D</em> view on the globe. Cameras show the place
            as it is now, not as it was when the photo was taken — but terrain, street layout
            and permanent landmarks change slowly, and a scene that cannot exist at the
            claimed location is a decisive contradiction.
          </p>
        </div>
      </section>

      <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-6 md:p-8 text-center">
        <h2 className="text-xl md:text-2xl font-bold">Run the check on a photo</h2>
        <p className="mt-3 text-white/60 leading-relaxed">
          Upload the best copy you have. You get the metadata findings, ranked candidate
          locations with the evidence for and against each, a confidence level and an
          uncertainty radius — or an honest &ldquo;couldn&apos;t determine&rdquo;. Free beta,
          no signup, and the photo is processed in memory and never stored.
        </p>
        <Link
          href="/tools/photo-geolocation"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
        >
          <Newspaper className="w-4 h-4" /> Open the Photo Geolocation tool
        </Link>
        <p className="mt-4 text-xs text-white/40">
          Free beta · 3 analyses a day · Evidence shown for every candidate
        </p>
      </div>

      <HowTo title="How to check a claimed location" steps={STEPS} />

      <section className="mt-12 max-w-3xl mx-auto">
        <h2 className="flex items-center gap-2 text-xl md:text-2xl font-bold mb-5">
          <ShieldAlert className="h-5 w-5 text-[#D4AF37]" /> Limits, stated plainly
        </h2>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            This is a beta, and verification is exactly the field where overstated tools do
            damage, so here is the whole list. Results are areas with an uncertainty radius,
            never displayed tighter than 250 m. Coverage is public places: results for homes
            and private property are suppressed to a general area, always. There is no
            reverse image search and no matching against street-level imagery, so the tool
            cannot find earlier copies of a photo or confirm a scene against ground-level
            reference photos. The visual pass reads clues; the ranking is deterministic — the
            same evidence always produces the same order — but clue extraction can miss
            things a human would catch, and can misread. When the daily visual-analysis
            budget is used up, the tool continues in metadata-only mode and tells you so.
          </p>
          <p>
            And a boundary that is not about accuracy: this tool analyses imagery of places.
            It does not identify people, performs no face recognition, and must not be used
            to locate private individuals. Verifying a public claim about a public place is
            journalism; tracking a person is not, and the area-level, public-places design is
            what keeps the tool on the right side of that line. For the wider craft, see{" "}
            <Link href="/blog/osint-for-journalists" className="text-[#D4AF37] hover:underline">
              OSINT for journalists
            </Link>{" "}
            and our walkthrough of{" "}
            <Link href="/blog/verify-breaking-news-footage" className="text-[#D4AF37] hover:underline">
              verifying breaking-news footage
            </Link>
            . If your need is the everyday version of this question — your own photos, your
            own trips —{" "}
            <Link href="/where-was-this-photo-taken" className="text-[#D4AF37] hover:underline">
              where was this photo taken
            </Link>{" "}
            explains the metadata side from the beginning and frames the same tool for
            travellers.
          </p>
        </div>
      </section>

      <FaqSection title="Photo location verification — questions" faqs={FAQS} />
      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Photo Geolocation tool (free beta)", href: "/tools/photo-geolocation" },
          { label: "OSINT for journalists", href: "/blog/osint-for-journalists" },
          { label: "How to verify breaking-news footage", href: "/blog/verify-breaking-news-footage" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Where was this photo taken? The full guide", href: "/where-was-this-photo-taken" },
        ]}
      />
      <CtaRow backHref="/tools/photo-geolocation" backLabel="Open the tool" />
    </PageShell>
  );
}
