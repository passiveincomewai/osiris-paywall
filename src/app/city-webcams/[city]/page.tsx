import type { Metadata } from "next";
import { notFound } from "next/navigation";
import directory from "@/data/camera-directory.json";
import {
  BASE,
  formatDate,
  JsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  Updated,
  Intro,
  SampleGrid,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Sample,
  type Faq,
} from "@/components/directory-page";

type CityCfg = {
  name: string;
  country: string;
  countrySlug: string;
  count: number;
  title: string;
  blurb: string;
  h1: string;
  sub: string;
  intro: string[];
  stats: { value: string; label: string }[];
  samples?: Sample[];
  sampleTitle?: string;
  howtoTitle: string;
  howto: string[];
  faqTitle: string;
  faqs: Faq[];
};

const CITIES: Record<string, CityCfg> = {
  london: {
    name: "London",
    country: "United Kingdom",
    countrySlug: "united-kingdom",
    count: 890,
    title: "London Live Webcams — 890 Street Cameras",
    blurb:
      "Watch 890 live London street cameras — North Circular, Blackwall Tunnel approaches and West End traffic views — free on the WorldEye map. No signup needed.",
    h1: "London Live Webcams",
    sub: "Watch 890 live London street cameras — free on the WorldEye globe.",
    intro: [
      "London accounts for 890 of the 899 cameras indexed in the United Kingdom — effectively the entire national feed is the capital's street and traffic camera grid. The views are working road cameras: the A406 North Circular, the A12 Blackwall Tunnel approaches, the A3 through Clapham, and junctions like Tottenham High Road and Stoke Newington Road.",
      "Several featured feeds sit around Westfield Stratford and the Olympic Park — Montfichet Road, Westfield Avenue, and the car parks — useful for checking event-day congestion. These are the same class of fixed road feeds Transport for London publishes for its network status.",
      "All 890 open free on the WorldEye map. Tap any marker across the capital to see current street conditions before you travel.",
      "The Blackwall Tunnel approaches are the feeds to watch when the river crossings jam. The A12 cameras on the northern approach show the queue building in real time — if the tunnel is the problem, you will see it here before the traffic reports catch up. The North Circular works the same way: the Telford Road and Bounds Green cameras show exactly where the ring seizes, junction by junction.",
      "Event days rewrite the pattern. When Westfield Stratford or the Olympic Park host something big, the Montfichet Road, Westfield Avenue and car park cameras show the surge building hours before it peaks — check them if you are heading to an event, or steer clear of the area based on what you see.",
      "Use these feeds the way they are meant to be used: a quick glance at your route's cameras before you leave. They are published for traffic monitoring, not sightseeing, and a two-minute check beats sitting in a queue on the North Circular that you could have avoided.",
    ],
    stats: [
      { value: "890", label: "live cameras" },
      { value: "#1", label: "of 10 UK areas" },
      { value: "99%", label: "of UK cameras" },
    ],
    samples: [
      { name: "A406 North Circular Rd/Telford Rd/Bounds Green Rd", city: "London" },
      { name: "A12 Blackwall Tunnel Nthern App/Gillender St", city: "London" },
      { name: "Westfield Ave/International Way/Car Park A", city: "London" },
      { name: "A3 Clapham Rd/Stockwell Rd/Landsdowne Way", city: "London" },
      { name: "Leyton Rd/Montfichet Rd/Penny Brookes St", city: "London" },
      { name: "Montfichet Rd/Hitchcock Lane/Car Park C", city: "London" },
      { name: "Tottenham High Road / Seven Sisters Rd", city: "London" },
      { name: "A10 Stoke Newington Rd/Millers Terrace", city: "London" },
      { name: "Montfichet Rd/Westfield Ave/Car Park B", city: "London" },
      { name: "A10 Stoke Newington Rd/Barretts Grove", city: "London" },
    ],
    sampleTitle: "Featured London street cameras",
    howtoTitle: "How to watch London street cameras",
    howto: [
      "Open the free WorldEye map — no account or download needed.",
      "Zoom to London; green camera markers cover the North Circular, the Thames crossings, and the West End.",
      "Tap any marker to open that street camera's live feed.",
      "For the river crossings, find the A12 markers near the Blackwall Tunnel northern approach — they show the queue before you commit.",
      "On event days, check the Montfichet Road and Westfield Avenue cameras around Stratford before heading out.",
      "Glance at the feeds on your route right before leaving; a two-minute check beats a long queue on the North Circular.",
    ],
    faqTitle: "London webcams — FAQ",
    faqs: [
      {
        q: "Are these the TfL traffic cameras?",
        a: "They are the same class of feed — fixed road cameras across London's street network, like the ones Transport for London publishes. Use them to check congestion before driving, not for sightseeing.",
      },
      {
        q: "Can I see central London landmarks on these cameras?",
        a: "No. These cameras watch roads and junctions, not tourist sights. For landmark and skyline views, browse the scenic cameras on the main WorldEye map.",
      },
      {
        q: "Do the cameras cover the congestion charge zone?",
        a: "Many feeds sit inside or near the charging zone — including the West End approaches. Check conditions before driving in during charging hours.",
      },
      {
        q: "Which roads have the most camera coverage?",
        a: "The A406 North Circular has the densest coverage — Telford Road, Bounds Green Road and the surrounding junctions — followed by the A12 Blackwall Tunnel approaches and the A3 through Clapham.",
      },
      {
        q: "Can I check the Blackwall Tunnel queue before driving?",
        a: "Yes. The A12 cameras on the northern approach, around Gillender Street, show the tunnel queue building. If you are choosing between the tunnel and another crossing, check the feed first.",
      },
      {
        q: "Are the cameras useful on event days at the Olympic Park?",
        a: "Very. The Montfichet Road, Westfield Avenue and car park cameras around Westfield Stratford show event-day congestion building. Check them before heading to an event — or avoid the area if the queues are already forming.",
      },
      {
        q: "Do these cameras show smooth live video?",
        a: "They are fixed road cameras of the class Transport for London publishes for network monitoring — regularly updating views of lanes and junctions, enough to judge whether traffic is moving and where it is blocked.",
      },
      {
        q: "When should I check the cameras?",
        a: "Weekday rush hours, when the North Circular and tunnel approaches are at their worst — and before any event at Stratford or the Olympic Park. A two-minute check of your route's cameras before leaving beats a long queue you could have avoided.",
      },
    ],
  },
  ottawa: {
    name: "Ottawa",
    country: "Canada",
    countrySlug: "canada",
    count: 428,
    title: "Ottawa Live Webcams — 428 Traffic Cameras",
    blurb:
      "See 428 live Ottawa traffic cameras across Canada's capital — check downtown road conditions and winter weather free on the WorldEye map. No signup needed.",
    h1: "Ottawa Live Webcams",
    sub: "See 428 live Ottawa traffic cameras across Canada's capital — free on the WorldEye globe.",
    intro: [
      "Ottawa is the single largest metro in Canada's camera index: 428 feeds, more than a quarter of the country's 1,509 cameras. The grid covers the capital's arterial network — the Queensway (Highway 417), downtown intersections, and the crossings to Gatineau.",
      "As the national capital in a snow-belt city, Ottawa's cameras earn their reputation in winter. Snow-clearing operations, freezing rain, and rush-hour collisions on the Queensway are all visible here — check the 417 feeds before a January commute, not during it.",
      "Every feed opens free on the WorldEye map. Zoom to Ottawa, tap a marker, and you are watching the same intersections the city's traffic center monitors.",
      "The Queensway is the spine of the whole grid. Highway 417 carries the east–west commuter load across the city, and the densest camera coverage follows it — which means the feeds sit exactly where the collisions, lane closures and winter pileups happen. If you only check one corridor, make it the 417.",
      "The Gatineau crossings deserve their own mention. The bridges over the Ottawa River are the interprovincial chokepoints, and the cameras on the approaches show the queues at each crossing before you commit to one. At peak hours the difference between bridges can be significant — check and pick the shorter queue.",
      "Winter is when this grid pays for itself. Ottawa's snow-clearing operations run around the clock in a storm, and the arterial cameras show plow progress, drifting snow and freezing-rain glaze in real time. Summer construction season is the other peak — lane closures on the Queensway show up here first.",
    ],
    stats: [
      { value: "428", label: "live cameras" },
      { value: "#1", label: "of 12 Canadian areas" },
      { value: "28%", label: "of Canada's cameras" },
    ],
    howtoTitle: "How to check Ottawa road conditions",
    howto: [
      "Launch the WorldEye map — it works on phone and desktop, free.",
      "Zoom to Ottawa and find the camera markers along the Queensway and downtown arterials.",
      "Select a marker to open that intersection camera's live feed.",
      "In winter, check the Queensway feeds for snow and ice before every commute — conditions change fast.",
      "For the Gatineau crossings, compare the bridge approach cameras and pick the shortest queue.",
      "During construction season, glance at the 417 cameras for lane closures before merging on.",
    ],
    faqTitle: "Ottawa webcams — FAQ",
    faqs: [
      {
        q: "Why does Ottawa have more cameras than Toronto in this index?",
        a: "The index reflects published municipal and provincial feeds. Ottawa's traffic-camera grid is the densest published network in the Canadian data at 428 feeds, ahead of Toronto's 339.",
      },
      {
        q: "Can I check winter road conditions in Ottawa?",
        a: "Yes — that is the best use of these feeds. The Queensway and arterial cameras show snowfall, plowing progress, and collisions in real time through the winter months.",
      },
      {
        q: "Are the bridges to Gatineau covered?",
        a: "Coverage focuses on Ottawa's arterial network, which includes the river crossings. Zoom to the Ottawa River on the live map to find the bridge cameras.",
      },
      {
        q: "Which highway has the most camera coverage?",
        a: "Highway 417 — the Queensway. The densest coverage follows the east–west commuter spine, where most collisions, lane closures and winter incidents happen.",
      },
      {
        q: "Can I see snowplows working during a storm?",
        a: "The arterial and Queensway cameras show snowfall, plow progress and road surface conditions in real time through winter storms — check before a January commute, not during it.",
      },
      {
        q: "Do the cameras show freezing rain?",
        a: "They show the results — glazed intersections, slow traffic and collisions on the arterials and the 417. If the cameras look icy, stay off the roads until conditions improve.",
      },
      {
        q: "Are downtown intersections covered?",
        a: "Yes. The grid covers downtown intersections as well as the highway network, so you can check surface-street conditions in the core before heading in.",
      },
      {
        q: "When is the best time to check the cameras?",
        a: "Weekday rush hours in winter are the peak use case. A quick check of the 417 feeds before leaving tells you whether it is a normal commute or a storm day.",
      },
    ],
  },
  toronto: {
    name: "Toronto",
    country: "Canada",
    countrySlug: "canada",
    count: 339,
    title: "Toronto Live Webcams — 339 Street Cameras",
    blurb:
      "Watch 339 live Toronto street and highway cameras — check 400-series highways and downtown traffic conditions free on the WorldEye map. No signup needed.",
    h1: "Toronto Live Webcams",
    sub: "Watch 339 live Toronto street and highway cameras — free on the WorldEye globe.",
    intro: [
      "Toronto's 339 cameras make it the second-largest metro in Canada's index, behind Ottawa. Coverage follows the 400-series highways — the 401 across the top of the city, the 427, the Gardiner Expressway, and the Don Valley Parkway — plus major downtown arterials.",
      "The 401 through Toronto is one of the widest and busiest highways in North America, and these feeds are how commuters check whether it is moving before merging on. Lake-effect snow in winter and construction season in summer both show up clearly on the highway cameras.",
      "All 339 feeds open free on the WorldEye map — no account needed.",
      "The 401 deserves its reputation. It is among the widest highways on the continent through Toronto, and when it seizes — which it does daily at rush hour — the camera grid shows which lanes are moving and which are parked. Check the 401 feeds at your on-ramp's segment, not just the highway in general; conditions change dramatically between interchanges.",
      "The Gardiner Expressway and Don Valley Parkway are the downtown lifelines, and both spend long stretches as construction zones. Lane reductions that last for months show up on these cameras every single day — the feeds are how locals learn which days the DVP is actually moving.",
      "Winter adds lake-effect snow to the mix and summer adds construction season. The highway cameras show both in real time: whiteouts on the 401's open stretches, and the slow crawl through work zones on the Gardiner. Check before you merge, every time.",
    ],
    stats: [
      { value: "339", label: "live cameras" },
      { value: "#2", label: "of 12 Canadian areas" },
      { value: "22%", label: "of Canada's cameras" },
    ],
    howtoTitle: "How to check Toronto highway conditions",
    howto: [
      "Head to the free WorldEye globe in your browser.",
      "Zoom to Toronto — camera markers line the 401, the Gardiner, and the DVP.",
      "Click a marker on your route to watch that highway camera's live feed.",
      "Check the cameras at your on-ramp's segment of the 401 — conditions vary a lot between interchanges.",
      "Before a downtown trip, glance at the Gardiner and DVP feeds for construction lane closures.",
      "In winter, check the highway cameras for snow and whiteouts before merging on.",
    ],
    faqTitle: "Toronto webcams — FAQ",
    faqs: [
      {
        q: "Is Highway 401 covered by these cameras?",
        a: "Yes. Toronto's 339-camera index concentrates on the 400-series highways, and the 401 — the busiest stretch through the city — has the densest coverage.",
      },
      {
        q: "Are downtown Toronto streets covered too?",
        a: "Coverage concentrates on highways and major arterials rather than every downtown side street. The Gardiner Expressway and DVP feeds cover the core commute routes.",
      },
      {
        q: "Can I see the CN Tower or harbourfront?",
        a: "No — these are traffic cameras aimed at roads. For Toronto skyline and harbour views, browse the scenic cameras on the main WorldEye map.",
      },
      {
        q: "Which part of Highway 401 is best covered?",
        a: "Coverage is densest on the 401 through the city — the busiest stretch. Check the cameras near your on-ramp's segment, since conditions change a lot between interchanges.",
      },
      {
        q: "Can I see construction zones on the Gardiner?",
        a: "Yes. The Gardiner Expressway cameras show the ongoing lane reductions and work zones — check them before a downtown trip, since the pattern shifts as work moves.",
      },
      {
        q: "Do the cameras show snowstorms?",
        a: "They show lake-effect snow on the 401's open stretches and plowing on the highways in real time. Check the feeds before winter driving, not during it.",
      },
      {
        q: "What is the difference between the DVP and Gardiner feeds?",
        a: "Both are downtown expressways: the Gardiner runs east–west along the lake, the DVP runs north–south through the valley. The cameras cover both corridors — pick the one on your route.",
      },
      {
        q: "When is Toronto highway traffic at its worst?",
        a: "Weekday rush hours on the 401, and most weekdays on the Gardiner and DVP during construction season. Check the highway cameras on your specific segment before leaving.",
      },
    ],
  },
  madrid: {
    name: "Madrid",
    country: "Spain",
    countrySlug: "spain",
    count: 370,
    title: "Madrid Live Webcams — 370 Traffic Cameras",
    blurb:
      "See 370 live Madrid traffic cameras — M-30 ring road, Gran Vía avenues and busy city street views — free on the WorldEye live map. No signup needed.",
    h1: "Madrid Live Webcams",
    sub: "See 370 live Madrid traffic cameras — free on the WorldEye globe.",
    intro: [
      "Madrid leads Spain's camera index with 370 feeds — the largest of 12 Spanish areas and nearly a fifth of the country's 1,997 cameras. The network watches the M-30 ring road, the radial autovías (A-1 through A-6), and major city arteries.",
      "Madrid's rush hours run later than in most European capitals — the morning peak builds from 8:00 and the evening one stretches past 20:00. These feeds show the M-30 tunnels and access points where congestion concentrates, so check before driving across town.",
      "Every feed opens free on the WorldEye map. These are traffic cameras, not tourist views — for Plaza Mayor and Gran Vía on foot, the city's street life is better seen in person.",
      "The M-30 is really two roads: the surface ring and the tunnel system underneath. The tunnels are where congestion concentrates — enclosed, limited exits, and the first place to jam when something goes wrong. The camera grid watches both, so check the tunnel feeds specifically if your route goes underground.",
      "The radial autovías, A-1 through A-6, are the commuter arteries into the city. The cameras along the radials show the inbound queue building in the morning and the outbound one in the evening — check your radial's feeds to time your entry or pick a different route in.",
      "Madrid's late schedule shapes everything. With the evening peak stretching past 20:00, the rush here runs longer than in most European capitals — which means the camera check is worth doing even for trips you would consider off-peak elsewhere.",
    ],
    stats: [
      { value: "370", label: "live cameras" },
      { value: "#1", label: "of 12 Spanish areas" },
      { value: "19%", label: "of Spain's cameras" },
    ],
    howtoTitle: "How to check Madrid traffic",
    howto: [
      "Open the WorldEye live map — no account or download needed.",
      "Zoom to Madrid and look for camera markers along the M-30 ring and radial highways.",
      "Tap any marker to open that Madrid traffic camera's live feed.",
      "If your route uses the M-30 tunnels, check those feeds specifically — they are the first to jam.",
      "For commutes, find your radial autovía (A-1 through A-6) and check the inbound or outbound queue.",
      "Remember the late evening peak — check the cameras even for trips after 20:00.",
    ],
    faqTitle: "Madrid webcams — FAQ",
    faqs: [
      {
        q: "Is the M-30 ring road covered?",
        a: "Yes. Madrid's 370-camera index concentrates on the M-30 ring road, its tunnels, and the radial autovías — the corridors where the city's congestion concentrates.",
      },
      {
        q: "Can tourists see Gran Vía or Plaza Mayor on these cameras?",
        a: "No — these are traffic cameras aimed at roads and junctions, not plazas or landmarks. They are for checking driving conditions.",
      },
      {
        q: "When is Madrid traffic at its worst?",
        a: "Weekday mornings from around 8:00 and evenings stretching past 20:00. Check the M-30 feeds before crossing town during those windows.",
      },
      {
        q: "Are the M-30 tunnels covered by cameras?",
        a: "Yes — the grid covers the M-30 ring road including its tunnels and access points, where the city's congestion concentrates. Check the tunnel feeds before driving across town.",
      },
      {
        q: "Which autovía should I check for my commute?",
        a: "The index covers the radial autovías A-1 through A-6. Find the cameras on your radial — they show the inbound morning queue and the outbound evening one.",
      },
      {
        q: "Why is Madrid traffic bad so late in the evening?",
        a: "Madrid's schedule runs later than most European capitals, with the evening peak stretching past 20:00. The M-30 and radial cameras show the congestion in real time — check even for trips you would consider off-peak elsewhere.",
      },
      {
        q: "Can I see Gran Vía traffic on these cameras?",
        a: "The index covers major city arteries, but these are traffic cameras aimed at roads and junctions for checking driving conditions — not for sightseeing.",
      },
      {
        q: "Do the cameras help for weekend trips out of Madrid?",
        a: "Yes. The radial autovía cameras show the outbound Friday-evening and return Sunday-evening traffic — the classic Madrid weekend pattern. Check your radial before leaving.",
      },
    ],
  },
  houston: {
    name: "Houston",
    country: "United States",
    countrySlug: "united-states",
    count: 1158,
    title: "Houston Live Webcams — 1158 Traffic Cameras",
    blurb:
      "Watch 1158 live Houston freeway and traffic cameras — check freeway congestion and storm conditions free on the WorldEye map. No signup needed.",
    h1: "Houston Live Webcams",
    sub: "Watch 1158 live Houston freeway and traffic cameras — free on the WorldEye globe.",
    intro: [
      "Houston's 1,158 cameras make it the third-largest metro grid in the United States index — behind Georgia's statewide network and Utah, and ahead of every other city. The grid is a working freeway-camera system covering the metro's sprawling freeway network: the corridors commuters use every day and the underpasses that flood first in a storm.",
      "Houston is a city where the camera grid doubles as weather infrastructure. Gulf downpours can drop inches of rain in an hour, and the freeway feeds show standing water, slow-moving traffic and ponding on low sections in real time — check the cameras on your route during a storm, not after you're in it. Hurricane season makes this habit worth building year-round.",
      "All 1,158 feeds open free on the WorldEye map. Zoom to Houston, tap a freeway marker, and you are watching the same corridors the region's traffic managers watch.",
      "The underpasses are the critical detail. Houston's freeway system dips under cross streets all over the metro, and those low sections are the first to pond in a downpour — sometimes while the elevated mainlanes are still dry. The camera grid shows the low sections directly, which is why checking the cameras on your exact route matters more than checking Houston traffic in general.",
      "Hurricane season rewrites the rules. When a tropical system approaches the Gulf, the freeway cameras become evacuation-route monitors — showing which corridors are moving and which are already jammed. Build the camera-check habit in ordinary rain so it is automatic when it matters.",
      "Construction is the year-round constant. Houston's freeways are perpetually being widened, and the lane closures move week to week. The camera feeds show the current work zones in real time — the closures on your corridor today may not be the ones from last week.",
    ],
    stats: [
      { value: "1158", label: "live cameras" },
      { value: "#3", label: "of 12 US areas" },
      { value: "5%", label: "of US cameras" },
    ],
    howtoTitle: "How to check Houston freeway conditions",
    howto: [
      "Open the WorldEye live map — no account or download needed.",
      "Zoom to Houston; camera markers line the metro's freeway corridors.",
      "Tap a marker on your route to open that freeway camera's live feed.",
      "During rain, check the cameras on your exact route — underpasses flood first.",
      "In hurricane season, use the feeds to see which corridors are moving before evacuating.",
      "Check for current construction closures on your corridor the day you drive.",
    ],
    faqTitle: "Houston webcams — FAQ",
    faqs: [
      {
        q: "Are these the TranStar freeway cameras?",
        a: "They are the same class of feed — fixed freeway and arterial cameras across the Houston metro, like the ones the region's traffic management publishes. Use them to check congestion and weather conditions before driving.",
      },
      {
        q: "Can I see flooding on these cameras?",
        a: "Yes — that is one of their best uses. During heavy rain, the freeway cameras show standing water, ponding on low sections and slow-moving traffic. Never drive through flooded roadway you see on a camera; turn around.",
      },
      {
        q: "When is Houston traffic at its worst?",
        a: "Weekday rush hours, roughly 7:00–9:00 and 16:30–19:00. Construction and rain extend both windows — check the freeway feeds before heading out.",
      },
      {
        q: "Which parts of the freeway flood first?",
        a: "The underpasses and low sections — they pond while the elevated mainlanes are still dry. Check the cameras on your exact route during rain, not just the general metro view.",
      },
      {
        q: "Can I use these cameras during hurricane evacuations?",
        a: "Yes — during tropical weather the freeway cameras show which evacuation corridors are moving and which are jammed. Check before you leave, and never drive through flooded roadway.",
      },
      {
        q: "Do the cameras show construction zones?",
        a: "They show the current lane closures and work zones in real time. Houston's freeway construction moves constantly, so check your corridor the day you drive it.",
      },
      {
        q: "Are the cameras live video or still images?",
        a: "They are fixed freeway cameras of the class the region's traffic management publishes — regularly updating views of lanes and conditions, enough to judge congestion, weather and standing water.",
      },
      {
        q: "What is the single most useful check?",
        a: "Your route's cameras during rain. Houston's weather changes fast, and a two-minute camera check before leaving can reroute you around ponding or a jammed corridor.",
      },
    ],
  },
  dallas: {
    name: "Dallas",
    country: "United States",
    countrySlug: "united-states",
    count: 845,
    title: "Dallas Live Webcams — 845 Traffic Cameras",
    blurb:
      "Watch 845 live Dallas freeway and traffic cameras — check DFW metro congestion, weather and road conditions free on the WorldEye map. No signup.",
    h1: "Dallas Live Webcams",
    sub: "Watch 845 live Dallas freeway and traffic cameras — free on the WorldEye globe.",
    intro: [
      "Dallas accounts for 845 of the 23,059 cameras indexed in the United States — the fourth-largest of 12 US areas, behind Georgia, Utah and Houston. The grid watches the Dallas–Fort Worth metro's freeway network, the corridors where the region's long commutes concentrate. Fort Worth is indexed separately with another 489 feeds, so the DFW metro's combined coverage is among the deepest in the country.",
      "DFW's commutes are long, its construction zones are constant, and its weather swings from ice storms to severe thunderstorms. The freeway cameras earn their keep in all three: check for ice on the elevated sections in winter, hail and high water in spring, and the ever-present construction slowdowns before you merge on.",
      "All 845 feeds open free on the WorldEye map. Zoom to Dallas–Fort Worth, find the markers on your corridor, and check conditions before you drive.",
      "The Fort Worth split matters for how you use the grid. Dallas's 845 feeds and Fort Worth's 489 are indexed separately, but on the live map they sit side by side — zoom out and the whole DFW metro's freeway network lights up. If your commute crosses between the two, check cameras on both sides of the metroplex.",
      "Ice is the DFW speciality, and it is the cameras' finest hour. North Texas ice storms glaze the elevated freeway sections while surface streets stay merely wet — and the elevated sections are exactly what the camera grid watches. When ice is forecast, the freeway cameras show the truth before your windshield does.",
      "Spring brings the severe thunderstorms: hail, high water and sudden corridor shutdowns. The cameras show standing water on low sections and the slowdowns around storm cells in real time. Combined with the year-round construction, there is never a season when the pre-drive check does not pay off.",
    ],
    stats: [
      { value: "845", label: "live cameras" },
      { value: "#4", label: "of 12 US areas" },
      { value: "4%", label: "of US cameras" },
    ],
    howtoTitle: "How to check Dallas freeway conditions",
    howto: [
      "Open the WorldEye live map — no account or download needed.",
      "Zoom to Dallas–Fort Worth; camera markers cover the metro's freeway corridors.",
      "Tap a marker on your route to open that freeway camera's live feed.",
      "If your commute crosses the metroplex, check cameras on both the Dallas and Fort Worth sides.",
      "When ice is forecast, check the elevated freeway sections — they freeze first.",
      "In spring storms, check for standing water and slowdowns before driving into a cell's path.",
    ],
    faqTitle: "Dallas webcams — FAQ",
    faqs: [
      {
        q: "Does this cover Fort Worth too?",
        a: "Fort Worth is indexed as its own area with 489 feeds. This index covers the 845 Dallas-area feeds — together they give the DFW metro some of the deepest freeway coverage in the country. Zoom out on the live map to see both grids.",
      },
      {
        q: "Can I check for ice on the roads in winter?",
        a: "Yes. During ice events, the elevated freeway sections are where problems start, and the camera grid shows conditions in real time. Check before driving — bridges and overpasses freeze first.",
      },
      {
        q: "When is Dallas traffic at its worst?",
        a: "Weekday mornings 7:00–9:00 and evenings 16:30–19:00, with construction zones congested at all hours. Spring storm season can shut corridors with little warning — check the feeds first.",
      },
      {
        q: "How do I see both Dallas and Fort Worth cameras?",
        a: "They are indexed separately — 845 Dallas feeds and 489 Fort Worth feeds — but on the live map they sit side by side. Zoom out to see the whole DFW metro grid, and check cameras on both sides if your commute crosses the metroplex.",
      },
      {
        q: "Can the cameras show icy conditions?",
        a: "They show the conditions where ice forms — glazed elevated sections, slow traffic and incidents during ice events. Bridges and overpasses freeze first, so check the elevated freeway cameras when ice is forecast.",
      },
      {
        q: "Do the cameras show severe thunderstorm conditions?",
        a: "They show storms in real time — standing water, slow traffic and corridor slowdowns around storm cells. Check before driving into a storm's path.",
      },
      {
        q: "Why does the construction never seem to end?",
        a: "DFW's freeway network is under near-constant expansion, and the work zones move. The cameras show the current closures on your corridor — check the day you drive, not last week's pattern.",
      },
      {
        q: "What is the best pre-drive routine?",
        a: "Check the cameras on your corridor for three things: construction closures, weather on the elevated sections, and the general rush-hour state. Two minutes before leaving covers all three.",
      },
    ],
  },
  tokyo: {
    name: "Tokyo",
    country: "Japan",
    countrySlug: "japan",
    count: 73,
    title: "Tokyo Live Webcams — 73 Street Cameras",
    blurb:
      "Watch 73 live Tokyo cameras — the largest camera grid in Japan — with expressway traffic and city views, free on the WorldEye map. No signup needed.",
    h1: "Tokyo Live Webcams",
    sub: "Watch 73 live Tokyo cameras — the largest grid in Japan — free on the WorldEye globe.",
    intro: [
      "Tokyo's 73 cameras make it the largest of 12 Japanese areas in the index and account for about 8% of Japan's 928 cameras. The grid is a mix of traffic and city feeds across the world's largest metro — expressways and arterial roads, with city views mixed in around the densest districts.",
      "Tokyo's cameras double as weather watchers. Typhoon season brings sudden downpours and high winds that show up on the road feeds, and the cameras around the bay and rivers give an early read on storm conditions. In a city this dense, a quick camera check before heading out can reroute your whole day.",
      "All 73 feeds open free on the WorldEye map. Zoom to Tokyo, tap a marker, and you are looking at the metro as it is right now.",
      "The expressway network is the backbone of the grid. Tokyo's elevated expressways carry enormous traffic through the densest districts, and the cameras follow them — which means the feeds show the city's circulatory system in real time. Morning and evening peaks are intense but predictable; the cameras show you exactly how intense today.",
      "The bay and river cameras are the weather sentinels. When typhoon season sends a system toward the region, the cameras around the bay and rivers show wind, rain and water levels before the storm's full force arrives. They are the reason to check the grid even when you are not driving.",
      "With 73 feeds across the world's largest metro, each camera covers a lot of ground — so use the map, not just this page. Zoom to your district on the live globe and the markers will show you which expressway or neighborhood each feed watches.",
    ],
    stats: [
      { value: "73", label: "live cameras" },
      { value: "#1", label: "of 12 Japanese areas" },
      { value: "8%", label: "of Japan's cameras" },
    ],
    howtoTitle: "How to watch Tokyo live cameras",
    howto: [
      "Open the WorldEye live map — no account or download needed.",
      "Zoom to Tokyo; camera markers cover the expressways and central districts.",
      "Tap any marker to open that Tokyo camera's live feed.",
      "Zoom to your district — with 73 feeds across the metro, the map shows which camera watches your area.",
      "In typhoon season, check the bay and river cameras for storm conditions.",
      "Before peak-hour trips, check the expressway cameras on your route.",
    ],
    faqTitle: "Tokyo webcams — FAQ",
    faqs: [
      {
        q: "Are these traffic cameras or city views?",
        a: "Both. Tokyo's 73-camera index mixes traffic and expressway feeds with city cameras around the densest districts — check the map markers to find the view you need.",
      },
      {
        q: "Can I check typhoon conditions in Tokyo?",
        a: "Yes. During typhoon season the road and bay-area cameras show rain, wind and standing water in real time — a useful check before traveling across the metro.",
      },
      {
        q: "Can I see Mount Fuji or the Skytree?",
        a: "These are mostly road and city feeds, not scenic overlooks. For landmark views, browse the scenic cameras on the main WorldEye map.",
      },
      {
        q: "Which expressways are covered?",
        a: "The index follows Tokyo's expressway and arterial network through the densest districts. Zoom to your area on the live map to find the cameras on your route.",
      },
      {
        q: "Can I check rain before heading out?",
        a: "Yes — especially in typhoon season. The road, bay and river cameras show rain, wind and water conditions in real time across the metro.",
      },
      {
        q: "Do I need Japanese to use the cameras?",
        a: "No. The feeds are video — no language needed. The WorldEye map lets you find cameras by location, so just zoom to your district and tap a marker.",
      },
      {
        q: "When is Tokyo traffic at its worst?",
        a: "Weekday morning and evening peaks on the expressways are intense. Check the cameras on your route before heading out — the peaks are predictable, but incidents are not.",
      },
      {
        q: "Can I see seasonal views like cherry blossoms?",
        a: "These are mainly road and city feeds, not scenic overlooks. For seasonal and landmark views, browse the scenic cameras on the main WorldEye map.",
      },
    ],
  },
  sydney: {
    name: "Sydney",
    country: "Australia",
    countrySlug: "australia",
    count: 186,
    title: "Sydney Live Webcams — 186 Traffic Cameras",
    blurb:
      "Watch 186 live Sydney metro traffic cameras — harbour crossings, freeways and beach routes — free on the WorldEye live map. No signup needed.",
    h1: "Sydney Live Webcams",
    sub: "Watch 186 live Sydney metro traffic cameras — free on the WorldEye globe.",
    intro: [
      "Sydney dominates Australia's camera index: 186 metro feeds across the central, north, west and south corridors — about 74% of the country's 250 cameras and the largest of 10 Australian areas. The grid watches the harbour crossings, the freeway network, and the routes that carry weekend traffic to the eastern beaches.",
      "The harbour bridges and tunnels are the city's natural chokepoints, and the camera grid shows them as they are right now: peak-hour queues, lane closures, and the beach-route crawl on a hot summer Saturday. Sudden downpours — Sydney gets its share — show up on the road feeds before they show up on your windshield.",
      "All 186 feeds open free on the WorldEye map. Zoom to Sydney, tap a marker on your route, and check conditions before you drive.",
      "The corridors tell the story. The grid is organized across central, north, west and south Sydney — and each corridor has its own rhythm. The northern routes carry the commuter load, the western freeways move the freight and the beach routes clog on summer weekends. Find your corridor's cameras and learn its pattern.",
      "The harbour crossings are Sydney's defining chokepoint. Trips between the north and the CBD funnel through a handful of bridges and tunnels, and the cameras on the approaches show the queues as they form. This is the highest-value camera check in the city — two minutes here can save thirty.",
      "Summer is the second rush hour. When the temperature spikes, the eastern beach routes clog from mid-morning, and the cameras show the crawl building in real time. The same feeds double as weather watchers — Sydney's sudden downpours show up on the road cameras before they hit your windshield.",
    ],
    stats: [
      { value: "186", label: "live cameras" },
      { value: "#1", label: "of 10 Australian areas" },
      { value: "74%", label: "of Australia's cameras" },
    ],
    howtoTitle: "How to check Sydney traffic conditions",
    howto: [
      "Open the WorldEye live map — no account or download needed.",
      "Zoom to Sydney; camera markers cover the harbour crossings, freeways and beach routes.",
      "Tap a marker on your route to open that Sydney camera's live feed.",
      "Learn your corridor — central, north, west or south — and find its cameras on the map.",
      "Before any harbour crossing at peak hours, check the bridge and tunnel approach feeds.",
      "On summer weekends, check the beach-route cameras early before the crawl builds.",
    ],
    faqTitle: "Sydney webcams — FAQ",
    faqs: [
      {
        q: "Do the cameras cover the Harbour Bridge?",
        a: "Coverage follows the metro's main corridors, including the harbour crossings and approaches. Zoom to the harbour on the live map to find the bridge and tunnel cameras.",
      },
      {
        q: "Can I check beach traffic on a summer weekend?",
        a: "Yes. The grid covers the routes to the eastern beaches, so you can see the weekend crawl before you join it — check Saturday morning before leaving.",
      },
      {
        q: "When is Sydney traffic at its worst?",
        a: "Weekday peak hours around the harbour crossings, and summer weekends on the beach routes. Check the cameras on your corridor before heading out.",
      },
      {
        q: "Which corridors have the most cameras?",
        a: "Coverage spans Sydney's central, north, west and south corridors — 186 metro feeds, the largest of 10 Australian areas. Find your corridor's cameras on the live map.",
      },
      {
        q: "Can I avoid the harbour crossing queues?",
        a: "The cameras on the bridge and tunnel approaches show the queues forming in real time — check before you commit to a crossing, especially at peak hours. Two minutes of checking can save thirty minutes of queuing.",
      },
      {
        q: "Do the cameras show the eastern beaches themselves?",
        a: "The grid covers the routes to the eastern beaches rather than the sand — use them to check the weekend crawl before you leave, not to watch the surf.",
      },
      {
        q: "Can I check for flash flooding?",
        a: "The road cameras show sudden downpours and ponding in real time. Sydney's storms arrive fast — check the feeds on your route when dark clouds build.",
      },
      {
        q: "Is there a best time to drive to the beaches?",
        a: "Early. On hot summer Saturdays the beach routes clog from mid-morning — check the corridor cameras before leaving, and the earlier the better.",
      },
    ],
  },
};

const RELATED: { label: string; href: string }[] = [
  { label: "London live webcams", href: "/city-webcams/london" },
  { label: "Ottawa live webcams", href: "/city-webcams/ottawa" },
  { label: "Toronto live webcams", href: "/city-webcams/toronto" },
  { label: "Madrid live webcams", href: "/city-webcams/madrid" },
  { label: "Houston live webcams", href: "/city-webcams/houston" },
  { label: "Dallas live webcams", href: "/city-webcams/dallas" },
  { label: "Tokyo live webcams", href: "/city-webcams/tokyo" },
  { label: "Sydney live webcams", href: "/city-webcams/sydney" },
  { label: "All world city webcams", href: "/world-city-webcams" },
];

export function generateStaticParams() {
  return Object.keys(CITIES).map((city) => ({ city }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const c = CITIES[slug];
  if (!c) return { title: "Not found" };
  const url = `/city-webcams/${slug}`;
  return {
    title: c.title,
    description: c.blurb,
    alternates: { canonical: `${BASE}${url}` },
    openGraph: {
      title: c.title,
      description: c.blurb,
      url,
      type: "website",
    },
  };
}

export default async function CityWebcamPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const c = CITIES[slug];
  if (!c) notFound();

  const canonical = `${BASE}/city-webcams/${slug}`;
  const updated = formatDate(directory.generatedAt);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: c.title,
    description: c.blurb,
    url: canonical,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: c.samples?.length ?? 0,
      itemListElement: (c.samples ?? []).map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: s.city ? `${s.name} — ${s.city}` : s.name,
        url: BASE,
      })),
    },
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={c.faqs} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Countries", href: "/cameras/countries" },
          { label: c.h1 },
        ]}
      />
      <Hero h1={c.h1} sub={c.sub} />
      <StatRow stats={c.stats} />
      <Updated date={updated} />
      <Intro paragraphs={c.intro} />
      {c.samples && <SampleGrid title={c.sampleTitle ?? "Featured live cameras"} samples={c.samples} />}
      <HowTo title={c.howtoTitle} steps={c.howto} />
      <FaqSection title={c.faqTitle} faqs={c.faqs} />
      <RelatedLinks
        title="More city webcam indexes"
        links={RELATED.filter((l) => l.href !== `/city-webcams/${slug}`)}
      />
      <RelatedLinks
        title="Guides"
        links={[
          { label: "Best live webcams in the world to watch right now", href: "/blog/best-live-webcams-world" },
          { label: "Using live cameras to plan travel", href: "/blog/using-live-cameras-to-plan-travel" },
        ]}
      />
      <CtaRow backHref={`/cameras/countries/${c.countrySlug}`} backLabel={`${c.country} cameras`} />
    </PageShell>
  );
}
