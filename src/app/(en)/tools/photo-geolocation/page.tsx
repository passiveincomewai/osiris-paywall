import type { Metadata } from "next";
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
import PhotoGeolocationTool from "@/components/PhotoGeolocationTool";
import EmailCaptureCard from "@/components/EmailCaptureCard";
import { CheckCircle2, Crosshair, ShieldCheck, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Location Finder — Photo Geolocation Tool (Free Beta)",
  description:
    "WorldEye's free AI location finder: upload a photo and the tool checks its embedded GPS metadata (EXIF) first, then reads the visible clues — signs, landmarks, plates — matches named places against OpenStreetMap, and ranks each candidate with its evidence, its confidence, and a step-by-step evidence trail showing exactly how the result was reached. Processed in memory, never stored, no reverse image search.",
  alternates: { canonical: `${BASE}/tools/photo-geolocation` },
  openGraph: {
    title: "AI Location Finder — Photo Geolocation Tool (Free Beta)",
    description:
      "Free beta AI location finder: upload a photo and get ranked candidate locations from its metadata and visible clues, with the full evidence trail shown. Your photo is never stored.",
    url: "/tools/photo-geolocation",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "WorldEye AI Location Finder — Photo Geolocation Tool (Beta)",
  description:
    "A free beta AI location finder that estimates where a photo was taken from embedded GPS metadata and visible scene clues, ranking candidate places with evidence and an uncertainty radius.",
  url: `${BASE}/tools/photo-geolocation`,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const INTRO = [
  "Drop in a photo and this AI location finder works the way a careful human would. First it reads the file itself: many camera and phone photos carry GPS coordinates in their EXIF metadata, and when they do, that is the strongest evidence there is. Then it studies the scene for clues — readable signs and place names, named landmarks, licence-plate styles, the side of the road traffic drives on, vegetation and architecture — and matches the named places against OpenStreetMap.",
  "What you get back is not a confident-sounding guess. Every candidate is ranked by the evidence behind it, shown with the reasons for and against, a plain-language confidence level and an uncertainty radius. Sometimes the honest answer is \u201Cwe couldn't determine this one\u201D — when that happens the tool says so, shows the clues it did establish, and tells you what would help. It never invents a location.",
  "This is a beta, and it has real limits. It does not run reverse image searches, it does not compare your photo against street-level imagery, and photos whose metadata was stripped by a messaging or social app — most copies you have been sent — are much harder to place than originals from the camera.",
];

const STEPS = [
  "Upload. Choose or drop a photo (JPEG, PNG or WebP, up to 10 MB). It is processed in memory on the server and discarded when the analysis finishes — never written to disk, a database, or any photo-matching service.",
  "Stage 1 — the file itself (EXIF). The tool reads the photo's own metadata block: GPS coordinates if the camera embedded them, the camera make and model, the capture time, and — when the GPS block carries them — the altitude and the direction the camera was facing. File GPS is the strongest evidence there is, and it is still labelled \u201Cfrom photo metadata\u201D, because metadata can be edited or copied from another photo.",
  "Stage 2 — visual clues, and only clues. One pass by a vision model extracts a fixed set: text it can read, languages and scripts, named landmarks it can actually identify, place names read from signage, licence-plate style, which side of the road traffic drives on, vegetation and climate, architecture, road markings, and the scene type. The model is never asked where the photo was taken, and the reply is parsed through a whitelist — if a location or coordinates were smuggled into its answer, they are discarded here, before anything is ranked.",
  "Stage 3 — map matching. Each named landmark and place name — up to six per photo — is looked up in OpenStreetMap. A match becomes a candidate whose uncertainty is the size of that place's own mapped outline. A name with no match, a lookup that could not be completed, and a match so broad it is a whole country are each recorded in the result's evidence trail as exactly what they are; the whole-country kind is discarded, not presented as an answer.",
  "Stage 4 — evidence ranking. The ranking is deterministic arithmetic, not a second model's opinion, so the same photo always earns the same order: GPS from the file outranks a named-landmark match, which outranks a place-name match; OpenStreetMap's prominence for the matched place adds to the score, and a second, independent clue pointing at the same area (within 25 km) adds more and removes the uncorroborated caveat from its evidence against. Every candidate shows its ranking reason, its score and its confidence band.",
  "Stage 5 — the privacy clamp, applied last. The clamp can only ever loosen a result, never tighten it: no displayed radius is smaller than 250 m however precise the evidence is, and when the scene looks like a private home or private property the point is suppressed entirely — only a general area is shown. Nothing downstream of the analysis can undo this step.",
  "What you get. Ranked candidates — or an honest \u201Ccouldn't determine\u201D — each with its source clue, its ranking and radius explanations, and the full evidence for and against; the step-by-step evidence trail of your analysis; a panel showing your own file's format, dimensions and metadata; live cameras near a point result; and an \u201CExplore location in 3D\u201D jump onto the WorldEye globe.",
];

const FAQS = [
  {
    q: "How does photo geolocation work here?",
    a: "In layers. GPS coordinates embedded in the photo file (EXIF) come first — they are part of the file itself. Without them, the tool extracts visible clues (signage text, named landmarks, plate styles, driving side, architecture, vegetation), looks the named places up in OpenStreetMap, and ranks the matches by how much independent evidence supports each one. The ranking is deterministic: the same clues always produce the same order, and the evidence is shown so you can judge it yourself.",
  },
  {
    q: "Is my photo stored or shared?",
    a: "No. Your photo is processed in memory on the server and discarded when the analysis finishes. It is not saved to disk or a database, not used for training, and never sent to a reverse-image search or any third-party photo service. The only things that leave the server are text clues (for example a landmark name) sent to OpenStreetMap for place lookup, and — when visual analysis is enabled — the image itself, sent once to the AI provider that powers the clue pass. Nothing about your photo is kept afterwards.",
  },
  {
    q: "Why couldn't it determine my photo?",
    a: "Most often because the file has been through an app that strips metadata — WhatsApp, Instagram, Facebook and screenshots all remove GPS — and the scene itself shows no readable sign, landmark or place name. A photo of a beach, a forest or a generic street can be genuinely unplaceable from one frame. The original file straight from the camera or phone gives the tool far more to work with.",
  },
  {
    q: "How accurate is it?",
    a: "Every result carries its own uncertainty radius, and that radius is the honest answer: \u201Cwithin about 250 m\u201D means exactly that, and a wide radius means the match is broad. GPS found in the file is usually the strongest result; landmark and place-name matches vary with how distinctive the place is. This is a beta and matches can be wrong — which is why the evidence for and against each candidate is always shown. Results for homes and private property are deliberately shown as a general area only.",
  },
  {
    q: "Why is my result an area instead of a point?",
    a: "Two privacy rules. No result is ever displayed tighter than a 250 m radius. And when a photo looks like a private residence or private property, the exact point is suppressed entirely and only the general area is shown. That applies even when the underlying evidence is precise — other people's homes are not a puzzle to publish.",
  },
  {
    q: "Does it identify people in photos?",
    a: "No. The tool does not perform face recognition or identify individuals, and people in a photo are never used as clues.",
  },
  {
    q: "What does it cost?",
    a: "Nothing — it is a free beta with no signup. To keep it sustainable there is a limit of 3 analyses per day per visitor, and the visual clue pass has a daily budget; when that budget is used up the tool keeps working in metadata-only mode and tells you so.",
  },
  {
    q: "Which clues actually decide the result?",
    a: "Only two things can create a candidate: GPS coordinates embedded in the file, and a named landmark or place name that matches a place in OpenStreetMap. The rest of the clue set — plate style, driving side, vegetation, architecture, languages — is recorded and shown for transparency, but it never scores a match by itself. The one partial exception is scene type: it does not move a candidate, but it drives the privacy decision that turns a likely home into an area-only result.",
  },
  {
    q: "Why is the uncertainty radius different for every result?",
    a: "Because it is the matched place's own size, not a fixed error bar. A candidate inherits the radius of the place OpenStreetMap matched — roughly half the span of its mapped outline — so a station gets a tight circle and a city-sized match gets a wide one. Two rules then apply: the 250 m privacy floor (a smaller outline still displays as 250 m, and file GPS always displays at the floor), and residential suppression, which replaces the point with a general area. Each result explains which of these produced the radius you see.",
  },
  {
    q: "What do the confidence levels and the evidence score mean?",
    a: "Every candidate carries a numeric evidence score from the ranking step: file GPS sits at the top, landmark matches start above place-name matches, OpenStreetMap's prominence for the place adds to the score, and an independent second clue pointing at the same area adds more. The confidence band (high, medium, low) is just that score grouped into three bands. It is a measure of how much evidence backs the match — not a guarantee — which is why the score's reasoning and the evidence for and against are always shown beside it.",
  },
  {
    q: "Do you keep analytics about my photo or where it was taken?",
    a: "No. We count completed analyses so we can tell whether the beta is used, and a completed analysis records exactly one coarse token: whether the answer came from the file's metadata, from visual-clue matching, or could not be determined. No photo, no clue text, and no coordinates — not even the result's — are attached to that count. The photo itself is processed in memory and discarded, as the privacy notes on this page describe.",
  },
];

export default function PhotoGeolocationPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Tools" },
          { label: "Photo Geolocation (Beta)" },
        ]}
      />

      <div className="mt-8 text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <Crosshair className="w-3.5 h-3.5" /> FREE TOOL · BETA
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          AI Location Finder
        </h1>
        <p className="mt-4 text-white/55">
          Upload a photo to the photo geolocation tool. It reads the photo&apos;s metadata,
          studies the visible clues, and ranks the places it could be — with the evidence for
          and against each one, the reason for its ranking and its radius, a step-by-step
          evidence trail of the whole analysis, and an honest &ldquo;couldn&apos;t
          determine&rdquo; when the evidence is not there.
        </p>
      </div>

      <PhotoGeolocationTool />

      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-5 w-5 text-[#D4AF37]" /> Your photo stays yours
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-white/65">
          <li>Processed in memory and discarded when the analysis finishes — never stored, on any disk, anywhere.</li>
          <li>Never sent to a reverse-image search or any photo-matching third party.</li>
          <li>Place lookups send text clues only (a landmark or place name) to OpenStreetMap — never your image.</li>
          <li>No face recognition, ever. Results for homes are shown as a general area only, and no result is displayed tighter than 250 m.</li>
          <li>We count completed analyses by outcome type only — from metadata, from visual clues, or undetermined. The count never includes your photo, its clues, or any location, coarse or precise.</li>
        </ul>
      </div>

      <Intro paragraphs={INTRO} />
      <HowTo title="How it works — the five stages, in detail" steps={STEPS} />

      <section className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-xl md:text-2xl font-bold">What it can and can&apos;t do</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.03] p-5">
            <h3 className="flex items-center gap-2 font-semibold text-emerald-300">
              <CheckCircle2 className="h-5 w-5" /> It can place
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/65">
              <li>Original camera or phone photos that still carry GPS — usually the decisive case, and the result says the location came from the file.</li>
              <li>Famous landmarks the clue pass can actually identify in the frame, matched against OpenStreetMap.</li>
              <li>Signed places — stations, airports, venues, businesses — where a name can be read and matched.</li>
              <li>Scenes a second, independent clue corroborates: the score rises, and the result says why.</li>
              <li>Your own travel photos, when you want to know what a file still remembers: the results panel shows its format, dimensions, camera and capture time.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.03] p-5">
            <h3 className="flex items-center gap-2 font-semibold text-red-300">
              <XCircle className="h-5 w-5" /> It can&apos;t — or won&apos;t
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/65">
              <li>Screenshots: they carry no camera metadata, and a picture of a screen gives the clue pass little to work with.</li>
              <li>Copies that arrived through WhatsApp, Instagram, Facebook or similar apps: the metadata is stripped, so only scene clues remain — many such photos honestly end at &ldquo;couldn&apos;t determine&rdquo;.</li>
              <li>Generic scenes — a beach, a forest, a plain street, most interiors — with no readable text, sign or landmark: there may be nothing in one frame that picks one place over a thousand similar ones.</li>
              <li>Private homes, precisely: by design. A likely residence is shown as a general area even when the evidence is exact.</li>
              <li>People: the tool never identifies or locates individuals, and faces are never used as clues.</li>
              <li>Reverse image search or street-level photo matching: not run, by design — your photo is never sent to a service that could match it against other photos.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-xl md:text-2xl font-bold">A worked example — reading a result</h2>
        <div className="mt-5 space-y-4 leading-relaxed text-white/70">
          <p>
            <strong className="text-white">The station photo.</strong> Imagine an original phone
            photo of a station concourse whose file carries no GPS. The trail would show: no GPS in
            the metadata step; the clue pass reading the station&apos;s name from its signage and
            recording the architecture and the language on the boards; the name matched in
            OpenStreetMap to exactly one station; a second sign naming the same city matched within
            the same area, so that candidate&apos;s score rises and its &ldquo;uncorroborated&rdquo;
            caveat disappears. Its radius is the station&apos;s mapped outline, floored at 250 m —
            and the card says all of this, in that order.
          </p>
          <p>
            <strong className="text-white">The forwarded beach photo.</strong> Now the same scene
            after a messaging app has had it: the metadata step finds nothing (the app stripped it),
            the clue pass records vegetation and light but no readable text and no landmark, the
            map-matching step has no named clue to look up, and the honest result is &ldquo;couldn&apos;t
            determine&rdquo; — with the clues that <em>were</em> established, and a note that the
            original file would give the tool far more to work with. A wrong-but-confident pin
            would be worse than this answer, so this answer is the one the tool is built to give.
          </p>
          <p className="text-sm text-white/45">
            These are illustrative runs, simplified — a real result shows the same structure filled
            with your photo&apos;s actual evidence.
          </p>
        </div>
      </section>
      <FaqSection title="Photo geolocation questions" faqs={FAQS} />
      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Photo Geolocation (Beta): Where Was This Photo Taken? — how this tool was built", href: "/blog/photo-geolocation-where-was-this-photo-taken" },
          { label: "What is OSINT? — the field this tool borrows its discipline from", href: "/blog/what-is-osint" },
          { label: "Where was this photo taken? The full guide", href: "/where-was-this-photo-taken" },
          { label: "Photo Location Finder — for your own travel photos", href: "/photo-location-finder" },
          { label: "Random Camera Roulette — guess the country from a live camera", href: "/random" },
          { label: "Camera Distance Finder — how far is that camera from you?", href: "/tools/camera-distance" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "The WorldEye globe — flights, cameras, satellites and more", href: "/" },
        ]}
      />
      {/* Newsletter — end-of-page capture (the one list) */}
      <div className="mt-12">
        <EmailCaptureCard placement="page" variant="inline" />
      </div>
      <CtaRow backHref="/" backLabel="Back to the globe" />
    </PageShell>
  );
}
