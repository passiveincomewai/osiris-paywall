export type CountryFaq = { q: string; a: string };

export type CountryContent = {
  intro: string[]; // 2-4 short paragraphs
  blurb: string; // meta description, 140-160 chars, unique per country
  faqs: CountryFaq[]; // exactly 3
};

export const countryContentE: Record<string, CountryContent> = {
  indonesia: {
    intro: [
      "Indonesia's 197 cameras cluster on Java, the country's most populous island. Bandung leads with 43 feeds, followed by Yogyakarta (30) and Sleman (22), with smaller clusters in Gunungkidul, Bantul, and Gresik.",
      "These are working road cameras: toll-road exits like Serang Timur, busy junctions such as Riau Junction in Bandung and Simpang Empat Munggur in Yogyakarta, and the Serpong-Balaraja toll corridor near Jakarta.",
      "If you're driving in West or Central Java, the feeds show live traffic flow at the exact chokepoints that clog at rush hour. Every Indonesian camera streams free on WorldEye.",
    ],
    blurb:
      "Watch 197 live cameras across Indonesia on WorldEye - Java toll roads and junctions from Bandung to Yogyakarta, streaming free, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Indonesia?",
        a: "WorldEye lists 197 live cameras across 6 areas in Indonesia, concentrated on the island of Java.",
      },
      {
        q: "Which Indonesian areas have the most cameras?",
        a: "Bandung has the most with 43 cameras, followed by Yogyakarta (30) and Sleman (22). Gunungkidul, Bantul, and Gresik add further coverage.",
      },
      {
        q: "What do Indonesian cameras usually show?",
        a: "Mostly toll roads and junctions - feeds like the Serang Timur toll exit, Riau Junction in Bandung, and the Serpong-Balaraja toll road - useful for checking live traffic on Java.",
      },
    ],
  },
  vietnam: {
    intro: [
      "Vietnam's camera map is dominated by one city: Ho Chi Minh City holds 85 of the country's 160 feeds. Da Nang and several HCMC wards - Ben Nghe, An Phu, Tay Thanh - carry the rest.",
      "The feeds are street-level views named for the roads they watch: Hanoi Highway at An Phu, Le Duan and Pham Ngoc Thach in Ben Nghe ward, Tran Hung Dao in Co Giang. They capture the non-stop flow of Vietnam's busiest streets.",
      "For anyone navigating Ho Chi Minh City, these cameras show live conditions on the exact avenues you'll be riding. All Vietnamese feeds stream free on WorldEye.",
    ],
    blurb:
      "Stream 160 live cameras across Vietnam on WorldEye - Ho Chi Minh City streets and intersections, from Hanoi Highway to Ben Nghe ward, free live.",
    faqs: [
      {
        q: "How many live cameras are there in Vietnam?",
        a: "WorldEye lists 160 live cameras across 6 areas in Vietnam.",
      },
      {
        q: "Is most of Vietnam's camera coverage in Ho Chi Minh City?",
        a: "Yes - 85 of the 160 feeds are in Ho Chi Minh City. Da Nang and wards like Ben Nghe, An Phu, and Tay Thanh carry the remaining coverage.",
      },
      {
        q: "What do Vietnamese cameras show?",
        a: "Street-level views named for the roads they watch, such as Hanoi Highway at An Phu and Le Duan in Ben Nghe ward - live snapshots of Vietnam's busiest avenues.",
      },
    ],
  },
  russia: {
    intro: [
      "Russia's 152 cameras lean south and east. Sochi carries the biggest cluster with 46 feeds, while Mezhdurechensk (19) and Astrakhan (18) follow; Moscow has just 7.",
      "Many feeds are directional mountain cameras - ski trails near Elbrus, the Gornolyzhnaya runs, and passes around rural settlements - each fixed on a compass view like south-west or north-west.",
      "It's a network for watching weather and snow in the high country as much as city life. Every Russian feed streams free on WorldEye.",
    ],
    blurb:
      "Watch 152 live cameras across Russia on WorldEye - Sochi views plus mountain and ski-trail feeds with live snow conditions, streaming free, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Russia?",
        a: "WorldEye lists 152 live cameras across 6 areas in Russia.",
      },
      {
        q: "Are most Russian cameras in Moscow?",
        a: "No - Sochi leads with 46 feeds, ahead of Mezhdurechensk (19) and Astrakhan (18). Moscow has only 7 cameras in our directory.",
      },
      {
        q: "What do Russian cameras usually show?",
        a: "A mix of Sochi city views and directional mountain cameras - ski trails near Elbrus and high-country passes - each locked to a fixed compass view, handy for checking snow and weather.",
      },
    ],
  },
  poland: {
    intro: [
      "Poland's 73 cameras hide a surprise: falcon nests. Alongside town squares and crossroads, feeds watch peregrine falcon nesting platforms in Reda, Wejherowo, and Tczew - one camera even sits inside the Tczew nest.",
      "The geographic spread hugs the Baltic coast: Wejherowo (8), Władysławowo (7), Reda (5), plus Hel Peninsula spots like Chałupy and Jastarnia. Town views include Wejherowo's Jakub Wejher Square fountain.",
      "Part wildlife watch, part small-town window - a very different mix from the highway-heavy networks elsewhere. All Polish feeds are free on WorldEye.",
    ],
    blurb:
      "Explore 73 live cameras across Poland on WorldEye - Baltic coast towns plus rare peregrine falcon nest feeds, all streaming free, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Poland?",
        a: "WorldEye lists 73 live cameras across 6 areas in Poland.",
      },
      {
        q: "What are the falcon nest cameras in Poland?",
        a: "Peregrine falcon nesting platforms stream live from Reda, Wejherowo, and Tczew - one feed is mounted inside the Tczew nest itself, a rare wildlife watch.",
      },
      {
        q: "Which Polish areas have the most cameras?",
        a: "Wejherowo leads with 8 feeds, followed by Władysławowo (7) and Reda (5). Coverage hugs the Baltic coast, including Hel Peninsula towns like Chałupy and Jastarnia.",
      },
    ],
  },
  thailand: {
    intro: [
      "Thailand splits its 60 cameras between island escapes and capital traffic. Ko Samui leads with 18 feeds, Bangkok follows with 10, and Chachoengsao (4) plus Pattaya and Phuket add variety.",
      "In Bangkok the feeds watch toll ways like Don Muang-Vibhavadi and road junctions in Chachoengsao, while elsewhere cameras sit on bridges - Khlong Wang Kian and Wat Yang Khom in Nakhon Si Thammarat.",
      "Check the capital's traffic or preview an island day from the same directory. Every Thai feed streams free on WorldEye.",
    ],
    blurb:
      "Watch 60 live cameras across Thailand on WorldEye - Ko Samui island views and Bangkok toll-way traffic, streaming free, day and night, on any device.",
    faqs: [
      {
        q: "How many live cameras are there in Thailand?",
        a: "WorldEye lists 60 live cameras across 6 areas in Thailand.",
      },
      {
        q: "Which Thai areas have the most cameras?",
        a: "Ko Samui leads with 18 cameras, followed by Bangkok (10) and Chachoengsao (4). Pattaya, Phuket, and Nakhon Si Thammarat add further feeds.",
      },
      {
        q: "Can I see Thai islands live on WorldEye?",
        a: "Yes - Ko Samui carries the most feeds with 18, and Pattaya and Phuket add more coastal views, alongside Bangkok's traffic cameras.",
      },
    ],
  },
  norway: {
    intro: [
      "Norway's 48 cameras read like a postcard route. Geiranger (4) and Harstad (3) top the areas, with Bodo, Kristiansund, Lofoten, and Nordkapp carrying 2 each - fjords, straits, and the far north.",
      "Feeds frame the Geirangerfjord cruise port, the Saltstraumen strait, the Kråkenes lighthouse, and the Beitostølen ski area - working views of weather, sea, and snow rather than city streets.",
      "It's the directory's most scenic small network: check Arctic light, fjord weather, or ski conditions live. All Norwegian feeds are free on WorldEye.",
    ],
    blurb:
      "Explore 48 live cameras across Norway on WorldEye - Geirangerfjord, Lofoten, and Nordkapp scenic feeds with live Arctic weather, free to watch.",
    faqs: [
      {
        q: "How many live cameras are there in Norway?",
        a: "WorldEye lists 48 live cameras across 6 areas in Norway.",
      },
      {
        q: "What do Norwegian cameras show?",
        a: "Mostly scenery and nature: the Geirangerfjord cruise port, the Saltstraumen strait, the Kråkenes lighthouse, and the Beitostølen ski area - live weather, sea, and snow views.",
      },
      {
        q: "Which Norwegian areas have cameras?",
        a: "Geiranger has the most with 4 feeds, followed by Harstad (3). Bodo, Kristiansund, Lofoten, and Nordkapp each carry 2.",
      },
    ],
  },
  malta: {
    intro: [
      "Malta packs 42 cameras onto a tiny archipelago. Cirkewwa and Floriana lead with 5 each - the Gozo ferry terminal and the capital's edge - followed by Birzebbuga, Gzira, Mellieha, and Paola.",
      "The feeds are all about the water's edge: the Cirkewwa ferry boarding area, Pretty Bay and the water polo pitch at Birzebbuga, St. George's Beach in St. Julian's, plus Floriana's Saint Publius parish church.",
      "Watch ferries come and go or check beach weather before heading out. Every Maltese feed streams free on WorldEye.",
    ],
    blurb:
      "Watch 42 live cameras across Malta on WorldEye - Gozo ferry terminal, beaches, and harbors from Cirkewwa to St. Julian's, streaming free, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Malta?",
        a: "WorldEye lists 42 live cameras across 6 areas in Malta.",
      },
      {
        q: "Can I watch the Gozo ferry live?",
        a: "Yes - Cirkewwa has 5 feeds covering the ferry terminal boarding area and bus terminus, so you can watch ferries arrive and depart live.",
      },
      {
        q: "Which Maltese areas have the most cameras?",
        a: "Cirkewwa and Floriana lead with 5 each, followed by Birzebbuga, Gzira, Mellieha, and Paola with 3 apiece.",
      },
    ],
  },
  france: {
    intro: [
      "France keeps a light footprint in the directory: 40 cameras scattered from the Alps to Corsica. No single area dominates - Paris and Nice have 2 each, with single feeds in Marseille, Fréjus, La Rochelle, and Royan.",
      "What the network lacks in density it makes up for in scenery: the A40 at the Chamonix-Mont Blanc tunnel, the Promenade des Anglais in Nice, the Sancy summit at Le Mont-Dore, Lac du Bourget, and a Porto-Vecchio beach in Corsica.",
      "Think of it as a highlights reel - mountain passes, Riviera promenades, and one Corsican shoreline. All French feeds stream free on WorldEye.",
    ],
    blurb:
      "Explore 40 live cameras across France on WorldEye - Alpine passes, the Nice promenade, and a Corsican beach, all streaming free, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in France?",
        a: "WorldEye lists 40 live cameras across 6 areas in France.",
      },
      {
        q: "Which French areas have cameras?",
        a: "Coverage is spread thin: Paris and Nice have 2 feeds each, with single cameras in Marseille, Fréjus, La Rochelle, Royan, Chamonix, and Porto-Vecchio in Corsica.",
      },
      {
        q: "Are there beach cameras in France on WorldEye?",
        a: "Yes - the Promenade des Anglais in Nice and a Porto-Vecchio beach feed in Corsica show the Mediterranean coast live.",
      },
    ],
  },
  romania: {
    intro: [
      "Romania's 37 cameras head for the mountains. Brasov leads with 5 feeds and Predeal has 3 - both Carpathian resort towns - while Bucharest, Sacele, and Târgoviște trail behind.",
      "Expect historic squares like Brasov's Piața Sfatului, the Nemira ski slope at Slanic-Moldova, and Bucharest street views including the University of Economic Studies area.",
      "In winter these double as snow checks for the Prahova Valley resorts. Every Romanian feed streams free on WorldEye.",
    ],
    blurb:
      "Watch 37 live cameras across Romania on WorldEye - Carpathian resort towns like Brasov and Predeal plus Bucharest streets, free to watch, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Romania?",
        a: "WorldEye lists 37 live cameras across 6 areas in Romania.",
      },
      {
        q: "Which Romanian areas have the most cameras?",
        a: "Brasov leads with 5 feeds, followed by Predeal (3). Bucharest and Sacele have 2 each, with Târgoviște and Tei carrying one apiece.",
      },
      {
        q: "Can I check ski conditions in Romania on WorldEye?",
        a: "Yes - the Nemira ski slope feed at Slanic-Moldova shows live snow conditions, and the Brasov and Predeal cameras cover the main Carpathian resort towns.",
      },
    ],
  },
  brazil: {
    intro: [
      "Brazil's 36 cameras split between shoreline and landmarks. Balneario Camboriu and Rio de Janeiro have 4 each, Manaus 3, with Guaruja, Porto Seguro, and Santa Fe do Sul adding more sand.",
      "The standouts are iconic: Christ the Redeemer overlooking Rio, the Basilica of the National Shrine of Our Lady Aparecida, and a run of Santa Catarina beaches - Central Beach, Estaleiro, and Praia Brava.",
      "Check surf and weather on the coast or take in the landmarks from anywhere. All Brazilian feeds stream free on WorldEye.",
    ],
    blurb:
      "Explore 36 live cameras across Brazil on WorldEye - Rio's Christ the Redeemer, Santa Catarina beaches, and Manaus views, free to watch, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Brazil?",
        a: "WorldEye lists 36 live cameras across 6 areas in Brazil.",
      },
      {
        q: "Can I see Christ the Redeemer live?",
        a: "Yes - a Rio de Janeiro feed shows Christ the Redeemer live, one of the standout landmark cameras in our directory.",
      },
      {
        q: "Which Brazilian areas have the most cameras?",
        a: "Balneario Camboriu and Rio de Janeiro lead with 4 each, followed by Manaus (3). Guaruja, Porto Seguro, and Santa Fe do Sul add coastal coverage.",
      },
    ],
  },
  bulgaria: {
    intro: [
      "Bulgaria's 35 cameras face the Black Sea. Primorsko and Dimitrovgrad have 3 each, with Sofia, Burgas, Nesebar, and Kiten at 2 - the coast dominates the list.",
      "Feeds cover beach resorts end to end: Burgas Beach Arena, the Elegance beach hotel in Nesebar, Sunny Beach, and Primorsko's folklore festival grounds, plus an agriculture institute feed inland at Karnobat.",
      "It's a summer-holiday network - check sand, sea, and weather before booking the trip. Every Bulgarian feed streams free on WorldEye.",
    ],
    blurb:
      "Watch 35 live cameras across Bulgaria on WorldEye - Black Sea beach resorts from Sunny Beach to Primorsko, streaming free live, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Bulgaria?",
        a: "WorldEye lists 35 live cameras across 6 areas in Bulgaria.",
      },
      {
        q: "Can I check Bulgarian beach weather live?",
        a: "Yes - resort feeds at Burgas Beach Arena, Nesebar's Elegance beach hotel, Sunny Beach, and Primorsko show live sand, sea, and weather conditions.",
      },
      {
        q: "Which Bulgarian areas have the most cameras?",
        a: "Primorsko and Dimitrovgrad lead with 3 each, followed by Sofia, Burgas, Nesebar, and Kiten with 2 apiece.",
      },
    ],
  },
  croatia: {
    intro: [
      "Croatia closes our top-30 list with 29 cameras, nearly all of them on the Adriatic. Krk leads with 4, Split has 3, and Mali Losinj and Rabac have 2 each.",
      "The feeds are pure coastline: Veli Zal and Borik beaches on Mali Losinj, a panorama over Split, plus inland detours to the Marian shrine at Marija Bistrica and Mailáth Castle.",
      "Small in number, high in scenery - check the sea state before a sailing day. All Croatian feeds stream free on WorldEye.",
    ],
    blurb:
      "Explore 29 live cameras across Croatia on WorldEye - Adriatic island beaches, Split panoramas, and coastal views, free to watch, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Croatia?",
        a: "WorldEye lists 29 live cameras across 6 areas in Croatia.",
      },
      {
        q: "Are Croatian cameras on the coast?",
        a: "Nearly all of them - Krk, Mali Losinj, Rabac, and Split carry the coastal feeds, with a couple of inland detours to Marija Bistrica and Donji Miholjac.",
      },
      {
        q: "Which Croatian areas have the most cameras?",
        a: "Krk leads with 4 feeds, followed by Split (3), then Mali Losinj and Rabac with 2 each.",
      },
    ],
  },
};
