/* ------------------------------------------------------------------ */
/* Video styles lab — format breakdowns of real creator videos         */
/*                                                                     */
/* Each entry analyses the FORMAT of a published video (hook,          */
/* structure, pacing, on-screen/description text, CTA) from the        */
/* video's own published chapter list and description — the sources    */
/* are linked, and affiliates must watch the originals there. We       */
/* never download, rehost, or reuse any footage, audio, or script.     */
/*                                                                     */
/* Evidence rule: per-video view counts were NOT verifiable from the   */
/* public pages when checked (2026-10-30), so no view counts appear    */
/* anywhere in this data. Chapter counts and runtimes below come from  */
/* the published chapter lists themselves.                             */
/*                                                                     */
/* "promptPackage" is a self-contained brief the affiliate pastes      */
/* into their AI assistant to recreate the FORMAT with original        */
/* WorldEye content. {LINK} is replaced with the affiliate's own       */
/* referral link at copy time. All WorldEye claims inside stay within  */
/* the programme's truthful-claims rules.                              */
/* ------------------------------------------------------------------ */

export interface VideoStyle {
  id: string;
  /** Our label for the format. */
  name: string;
  sourceTitle: string;
  creator: string;
  url: string;
  /** Runtime + chapter count, from the published chapter list. */
  formatNote: string;
  hook: string;
  structure: string[];
  pacing: string;
  onScreenText: string;
  cta: string;
  promptPackage: string;
}

const WORLDEYE_FACTS =
  "WorldEye facts you may use (nothing else): a free 3D globe with 74,229 live public cameras — no signup to look around; " +
  "live flights and satellites tracked on the same globe; Pro (weekly or monthly plans, or VIP Pro billed yearly) unlocks an AI analyst, " +
  "satellite view, live traffic, advanced search filters, and the OSINT toolkit.";

const RULES =
  "Rules: write an ORIGINAL script — never copy the reference video's words, footage, or audio. " +
  "Every post must disclose the affiliate relationship: say #ad and that I earn a commission if someone subscribes through my link: {LINK}. " +
  "Never promise income or results.";

export const VIDEO_STYLES: VideoStyle[] = [
  {
    id: "style-feature-tour",
    name: "The Feature Tour",
    sourceTitle: "We Got Open Source God’s Eye Before GTA 6",
    creator: "Bilawal Sidhu (@bilawalsidhu)",
    url: "https://www.youtube.com/watch?v=GRJaKcXZS94",
    formatNote: "≈10 min · 12 chapters (published chapter list)",
    hook: "Lead with news, framed against something the audience already cares about — the title pairs the announcement with a pop-culture contrast (“…Before GTA 6”), and the video opens on the news itself at 0:00, no preamble.",
    structure: [
      "Cold open: the announcement, stated plainly (0:00).",
      "One-sentence framing: the whole planet, live, in one browser tab (0:40).",
      "One chapter per capability, each a single live demo on the globe — ask the planet a question (1:10), jump into a live cockpit (2:24), voice control (2:44), traffic + cameras (4:29), follow one helicopter (5:15), physical infrastructure (6:00), fires + ISS (6:50), radio (7:36), replay a rocket launch (8:39).",
      "Close by handing it to the audience: “The Code Is Yours” (9:09).",
    ],
    pacing: "A new capability roughly every 60–90 seconds; no chapter runs longer than about 2:45. The tour never lingers — breadth is the argument.",
    onScreenText: "The description does the proving: a one-line news summary, then a “WHAT'S INSIDE” bullet inventory of every data layer. The inventory itself is the credibility.",
    cta: "Get the code / contribute — repo, contributing guide, and issues linked in the description.",
    promptPackage:
      "Write me an original YouTube script in the FEATURE TOUR format for WorldEye. Format: open on a single news-style claim in the first 10 seconds, with a title that pairs the claim with something my audience already cares about. Then one short chapter per capability — each chapter is ONE live demo on the globe, 60–90 seconds each: open a live camera somewhere striking, track a flight, follow a satellite pass, check traffic cameras in a famous city, and finish with the Pro toolkit. Close by handing the viewer one clear action using my link. " +
      WORLDEYE_FACTS +
      " " +
      RULES,
  },
  {
    id: "style-event-reconstruction",
    name: "The Event Reconstruction",
    sourceTitle: "Ex-Google PM Builds God’s Eye to Monitor Iran in 4D",
    creator: "Bilawal Sidhu (@bilawalsidhu)",
    url: "https://www.youtube.com/watch?v=0p8o7AeHDzg",
    formatNote: "≈11 min · 15 chapters (published chapter list) · published 2026-03-03",
    hook: "Anchor the tool to a real event the audience is already watching, with personal stakes: “Then the Iran strikes happened, and I realized I was sitting on the perfect infrastructure to actually monitor it.”",
    structure: [
      "Intro: the event, and why this tool exists for it (0:00).",
      "Frame the replay mode — we are going to re-watch the event on the globe (0:59).",
      "Build signal by signal: GPS jamming (1:14), satellite surveillance passes (1:39), foreign military satellites (2:13).",
      "Replay the event chronologically, one beat per development — first strike (3:07), flights redirecting (4:25), airspace closures cascading (5:27), retaliation (5:49), a traffic time-lapse (6:16), holding patterns (6:50), the strait shutting down (7:15), then the full time-lapse replay (7:38).",
      "Reflective payoff: “What one person can see with public data” (8:27).",
      "Soft close: what's coming next (10:28).",
    ],
    pacing: "Chapters land every ~30–90 seconds through the event sequence — beat density rises with the story's tension — then the widest gap is saved for the reflective close.",
    onScreenText: "Credibility first: the description lists a “Data layers captured” inventory (satellite passes, ADS-B, GPS jamming, AIS, airspace closures, blackout monitoring) before the story begins.",
    cta: "Soft — a launch tease (“opens to the public in April. Stay tuned.”) plus a newsletter link. The video sells the idea, not a checkout.",
    promptPackage:
      "Write me an original YouTube script in the EVENT RECONSTRUCTION format for WorldEye. Pick a real, current event viewers can watch unfold on public data (a major storm, a rocket launch, a huge traffic day, a volcano). Format: open with the event and my personal reason for watching it on the globe; list the data layers I'll use up front (live cameras, flight tracking, satellite passes); then replay the event chronologically, one short chapter per development, ending with a reflective beat on what one person can see with public data, and a soft close pointing to my link. Build it only from things WorldEye genuinely shows — live public cameras, flights, and satellites; do not invent data layers. " +
      WORLDEYE_FACTS +
      " " +
      RULES,
  },
  {
    id: "style-community-changelog",
    name: "The Community Changelog",
    sourceTitle: "God’s Eye View Just Got a Massive Upgrade (Thanks To You!)",
    creator: "Bilawal Sidhu (@bilawalsidhu)",
    url: "https://www.youtube.com/watch?v=g3toZwkrQQE",
    formatNote: "≈25 min · 15 chapters (published chapter list)",
    hook: "Credit the audience in the title itself — “(Thanks To You!)” — and open with gratitude: “Look what y'all built” (0:00). The community is the headline, not the product.",
    structure: [
      "Gratitude cold open (0:00).",
      "One chapter per addition, in a steady march: weather + hurricane tracking (0:40), live buses + trains (3:06), more public CCTV (4:28), plate-reader locations (6:17), active fires (8:47), satellite before/after (10:26), satellite comparisons (11:34), tracking planes with an SDR antenna (14:38), reconstructing a flight in 3D (16:28), a radar display (17:56), draw + annotate (18:43), a Director Mode story (20:32), device fixes (23:19).",
      "Close on the community and the waitlist (24:07).",
    ],
    pacing: "Chapters run ~1:30–2:30 each. It's a completeness deep-dive for existing fans — length is the point, the opposite of a hook video.",
    onScreenText: "The description uses version framing (“What shipped in v0.2.0”) and states caveats plainly — the hosted version is a waitlist, some layers need API keys, plate markers show locations, not feeds. Honesty is part of the format.",
    cta: "One-click install + contribute + join the hosted waitlist — three doors, all in the description.",
    promptPackage:
      "Write me an original YouTube script in the COMMUNITY CHANGELOG format for WorldEye. Format: title credits the audience; open with genuine thanks and one line on what the community asked for; then one chapter per thing that's new or newly discovered on the globe (a camera network added, a layer people missed, a workflow viewers suggested), 90–150 seconds each, shown live; include one honest-caveats chapter (what's free, what Pro adds, what's still limited); close with thanks and one action through my link. Write it for existing fans, not cold traffic — completeness over hooks. " +
      WORLDEYE_FACTS +
      " " +
      RULES,
  },
];
