export type CountryFaq = { q: string; a: string };

export type CountryContent = {
  intro: string[]; // 5 substantial paragraphs
  blurb: string; // meta description, 140-160 chars, unique per country
  faqs: CountryFaq[]; // 6-7
};

export const countryContentE: Record<string, CountryContent> = {
  indonesia: {
    intro: [
      "Indonesia's 197 cameras cluster on Java, the country's most populous island. Bandung leads with 43 feeds, followed by Yogyakarta (30) and Sleman (22), with smaller clusters in Gunungkidul, Bantul, and Gresik.",
      "These are working road cameras: toll-road exits like Serang Timur, busy junctions such as Riau Junction in Bandung and Simpang Empat Munggur in Yogyakarta, and the Serpong-Balaraja toll corridor near Jakarta.",
      "If you're driving in West or Central Java, the feeds show live traffic flow at the exact chokepoints that clog at rush hour. Every Indonesian camera streams free on WorldEye.",
      "Bandung's 43 feeds make it the city to learn first: Riau Junction and the surrounding corridors show the chokepoints that clog at rush hour. Yogyakarta's 30 and Sleman's 22 cover the Central Java side, including Simpang Empat Munggur.",
      "The toll roads are the practical core — Serang Timur's exit, the Serpong-Balaraja corridor near Jakarta. Toll traffic moves fast until it doesn't; a camera check before merging on is the whole point of the network.",
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
      {
        q: "Can I check Bandung traffic before leaving?",
        a: "Yes — Bandung's 43 feeds cover junctions like Riau Junction and the surrounding corridors, showing live traffic at the city's chokepoints.",
      },
      {
        q: "Are Jakarta toll roads covered?",
        a: "The Serpong-Balaraja toll corridor near Jakarta is covered, along with toll exits like Serang Timur.",
      },
      {
        q: "Is coverage only on Java?",
        a: "Essentially yes — all 197 feeds across the 6 areas sit on Java, the country's most populous island.",
      },
    ],
  },
  vietnam: {
    intro: [
      "Vietnam's camera map is dominated by one city: Ho Chi Minh City holds 85 of the country's 160 feeds. Da Nang and several HCMC wards - Ben Nghe, An Phu, Tay Thanh - carry the rest.",
      "The feeds are street-level views named for the roads they watch: Hanoi Highway at An Phu, Le Duan and Pham Ngoc Thach in Ben Nghe ward, Tran Hung Dao in Co Giang. They capture the non-stop flow of Vietnam's busiest streets.",
      "For anyone navigating Ho Chi Minh City, these cameras show live conditions on the exact avenues you'll be riding. All Vietnamese feeds stream free on WorldEye.",
      "Ho Chi Minh City's 85 feeds are the network: learn the ward names and you can navigate by camera. Ben Nghe's Le Duan and Pham Ngoc Thach, An Phu's Hanoi Highway stretch, Co Giang's Tran Hung Dao — each feed is named for the road it watches.",
      "Da Nang and the Tay Thanh ward add variety beyond the southern capital, but HCMC is where the action is. The feeds are street-level and always on — check your avenue before braving the motorbike flow.",
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
      {
        q: "Can I check Hanoi Highway traffic live?",
        a: "Yes — the An Phu feeds watch Hanoi Highway live, along with surrounding HCMC corridors.",
      },
      {
        q: "What do the ward names in feed titles mean?",
        a: "Feeds are labeled by ward and road — Ben Nghe, An Phu, Tay Thanh, Co Giang — so the title tells you exactly which junction or avenue you are watching.",
      },
      {
        q: "Is there coverage outside Ho Chi Minh City?",
        a: "Some — Da Nang carries feeds beyond the capital, but 85 of the 160 are in HCMC itself.",
      },
    ],
  },
  russia: {
    intro: [
      "Russia's 152 cameras lean south and east. Sochi carries the biggest cluster with 46 feeds, while Mezhdurechensk (19) and Astrakhan (18) follow; Moscow has just 7.",
      "Many feeds are directional mountain cameras - ski trails near Elbrus, the Gornolyzhnaya runs, and passes around rural settlements - each fixed on a compass view like south-west or north-west.",
      "It's a network for watching weather and snow in the high country as much as city life. Every Russian feed streams free on WorldEye.",
      "Sochi's 46 feeds are the urban anchor — the Black Sea resort city carries nearly a third of the network. Mezhdurechensk's 19 and Astrakhan's 18 add Siberian and Caspian coverage, while Moscow's 7 are a reminder that this network looks outward, not at the capital.",
      "The mountain cameras are the distinctive part: ski trails near Elbrus, the Gornolyzhnaya runs, each locked to a fixed compass view. They are weather instruments as much as cameras — check snow and conditions in the high country live.",
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
      {
        q: "Can I check Elbrus ski conditions live?",
        a: "Yes — the mountain feeds watch ski trails near Elbrus and the Gornolyzhnaya runs, each fixed on a compass view, showing live snow and weather.",
      },
      {
        q: "What does 'directional' mean for these cameras?",
        a: "Many mountain feeds are labeled by compass direction — south-west, north-west — because each camera is fixed on one view of the slopes and passes.",
      },
      {
        q: "Is Moscow well covered?",
        a: "No — Moscow has just 7 feeds. Sochi (46), Mezhdurechensk (19), and Astrakhan (18) carry the bulk of the network.",
      },
    ],
  },
  poland: {
    intro: [
      "Poland's 73 cameras hide a surprise: falcon nests. Alongside town squares and crossroads, feeds watch peregrine falcon nesting platforms in Reda, Wejherowo, and Tczew - one camera even sits inside the Tczew nest.",
      "The geographic spread hugs the Baltic coast: Wejherowo (8), Władysławowo (7), Reda (5), plus Hel Peninsula spots like Chałupy and Jastarnia. Town views include Wejherowo's Jakub Wejher Square fountain.",
      "Part wildlife watch, part small-town window - a very different mix from the highway-heavy networks elsewhere. All Polish feeds are free on WorldEye.",
      "The falcon nests are the reason to bookmark Poland: peregrine platforms in Reda, Wejherowo, and Tczew, with one camera mounted inside the Tczew nest itself. Nesting season is the time to watch — the rest of the year the platforms sit quiet.",
      "The coastal half is classic Baltic: Wejherowo's 8 feeds and Władysławowo's 7, the Hel Peninsula towns of Chałupy and Jastarnia, and town views like the Jakub Wejher Square fountain. Small-town Poland, live and free.",
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
      {
        q: "When is the best time to watch the falcon nests?",
        a: "During nesting season, when the peregrine platforms in Reda, Wejherowo, and Tczew are active — including the camera inside the Tczew nest.",
      },
      {
        q: "Can I see the Hel Peninsula live?",
        a: "Yes — Chałupy and Jastarnia carry feeds on the peninsula, alongside Wejherowo (8) and Władysławowo (7) on the Baltic coast.",
      },
      {
        q: "Are there town square views in Poland?",
        a: "Yes — including the Jakub Wejher Square fountain in Wejherowo, mixed in with the coastal and wildlife feeds.",
      },
    ],
  },
  thailand: {
    intro: [
      "Thailand splits its 60 cameras between island escapes and capital traffic. Ko Samui leads with 18 feeds, Bangkok follows with 10, and Chachoengsao (4) plus Pattaya and Phuket add variety.",
      "In Bangkok the feeds watch toll ways like Don Muang-Vibhavadi and road junctions in Chachoengsao, while elsewhere cameras sit on bridges - Khlong Wang Kian and Wat Yang Khom in Nakhon Si Thammarat.",
      "Check the capital's traffic or preview an island day from the same directory. Every Thai feed streams free on WorldEye.",
      "Ko Samui's 18 feeds are the island half: check the day before you go, not from the beach. Bangkok's 10 are the working half — the Don Muang-Vibhavadi toll way and Chachoengsao junctions show the capital's traffic as it happens.",
      "The bridge cameras are the quiet surprise: Khlong Wang Kian and Wat Yang Khom in Nakhon Si Thammarat watch the waterways. Pattaya and Phuket add coastal variety to round out the six areas.",
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
      {
        q: "Can I preview Ko Samui before traveling?",
        a: "Yes — 18 feeds cover the island, the most in Thailand's network. Check conditions before you book or fly.",
      },
      {
        q: "Can I check Bangkok toll traffic live?",
        a: "Yes — feeds watch the Don Muang-Vibhavadi toll way and junctions in Chachoengsao, showing live capital traffic.",
      },
      {
        q: "What are the bridge cameras?",
        a: "Feeds on bridges like Khlong Wang Kian and Wat Yang Khom in Nakhon Si Thammarat, watching the waterways live.",
      },
    ],
  },
  norway: {
    intro: [
      "Norway's 48 cameras read like a postcard route. Geiranger (4) and Harstad (3) top the areas, with Bodo, Kristiansund, Lofoten, and Nordkapp carrying 2 each - fjords, straits, and the far north.",
      "Feeds frame the Geirangerfjord cruise port, the Saltstraumen strait, the Kråkenes lighthouse, and the Beitostølen ski area - working views of weather, sea, and snow rather than city streets.",
      "It's the directory's most scenic small network: check Arctic light, fjord weather, or ski conditions live. All Norwegian feeds are free on WorldEye.",
      "Geiranger's 4 feeds are the ones cruise travelers check: the fjord and the cruise port, live. Harstad's 3 and the pairs at Bodo, Kristiansund, Lofoten, and Nordkapp trace the coast north — each a weather window onto the Norwegian Sea.",
      "This is a network for watching light and weather, not traffic. The Saltstraumen strait, Kråkenes lighthouse, Beitostølen's ski slopes — check Arctic conditions live, or just watch the far north do what it does.",
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
      {
        q: "Can I watch the Geirangerfjord live?",
        a: "Yes — Geiranger's 4 feeds frame the fjord and cruise port, the most in any Norwegian area.",
      },
      {
        q: "Can I check Lofoten or Nordkapp weather?",
        a: "Yes — both carry 2 feeds each, showing live Arctic weather and light at the far north.",
      },
      {
        q: "Are there ski cameras in Norway?",
        a: "Yes — the Beitostølen ski area feed shows live snow conditions.",
      },
    ],
  },
  malta: {
    intro: [
      "Malta packs 42 cameras onto a tiny archipelago. Cirkewwa and Floriana lead with 5 each - the Gozo ferry terminal and the capital's edge - followed by Birzebbuga, Gzira, Mellieha, and Paola.",
      "The feeds are all about the water's edge: the Cirkewwa ferry boarding area, Pretty Bay and the water polo pitch at Birzebbuga, St. George's Beach in St. Julian's, plus Floriana's Saint Publius parish church.",
      "Watch ferries come and go or check beach weather before heading out. Every Maltese feed streams free on WorldEye.",
      "Cirkewwa's 5 feeds are the practical core: the Gozo ferry terminal boarding area and the bus terminus, so you can time the crossing. Floriana's 5 watch the capital's edge, including the Saint Publius parish church.",
      "The rest is coastline: Pretty Bay and the water polo pitch at Birzebbuga, St. George's Beach in St. Julian's, Mellieha and Paola and Gzira with 3 each. Check beach weather before heading out — the island is small enough that one glance covers it.",
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
      {
        q: "Can I time the Gozo ferry with these cameras?",
        a: "Yes — Cirkewwa's 5 feeds cover the ferry boarding area and bus terminus, so you can watch ferries arrive and depart live.",
      },
      {
        q: "Can I check Malta's beaches live?",
        a: "Yes — Pretty Bay at Birzebbuga, St. George's Beach in St. Julian's, and Mellieha's feeds show live beach conditions.",
      },
      {
        q: "Is Valletta itself covered?",
        a: "Floriana's 5 feeds sit at the capital's edge, including the Saint Publius parish church — the closest coverage to Valletta.",
      },
    ],
  },
  france: {
    intro: [
      "France keeps a light footprint in the directory: 40 cameras scattered from the Alps to Corsica. No single area dominates - Paris and Nice have 2 each, with single feeds in Marseille, Fréjus, La Rochelle, and Royan.",
      "What the network lacks in density it makes up for in scenery: the A40 at the Chamonix-Mont Blanc tunnel, the Promenade des Anglais in Nice, the Sancy summit at Le Mont-Dore, Lac du Bourget, and a Porto-Vecchio beach in Corsica.",
      "Think of it as a highlights reel - mountain passes, Riviera promenades, and one Corsican shoreline. All French feeds stream free on WorldEye.",
      "The mountain feeds are the most useful: the A40 at the Chamonix-Mont Blanc tunnel for cross-border traffic, the Sancy summit at Le Mont-Dore for snow. Check before a ski trip or an Alpine crossing.",
      "The rest is a highlights reel — the Promenade des Anglais in Nice, Lac du Bourget, a Porto-Vecchio beach in Corsica, single feeds in Marseille, Fréjus, La Rochelle, and Royan. Small network, high scenery per camera.",
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
      {
        q: "Can I check the Mont Blanc tunnel approach?",
        a: "Yes — the A40 feed at Chamonix covers the tunnel approach, useful before a cross-border drive.",
      },
      {
        q: "Are there mountain/snow cameras in France?",
        a: "Yes — the Sancy summit at Le Mont-Dore shows live mountain conditions.",
      },
      {
        q: "Is Paris well covered?",
        a: "No — Paris has just 2 feeds. This is a thin, scenic network: 40 cameras spread across 6 areas from the Alps to Corsica.",
      },
    ],
  },
  romania: {
    intro: [
      "Romania's 37 cameras head for the mountains. Brasov leads with 5 feeds and Predeal has 3 - both Carpathian resort towns - while Bucharest, Sacele, and Târgoviște trail behind.",
      "Expect historic squares like Brasov's Piața Sfatului, the Nemira ski slope at Slanic-Moldova, and Bucharest street views including the University of Economic Studies area.",
      "In winter these double as snow checks for the Prahova Valley resorts. Every Romanian feed streams free on WorldEye.",
      "Brasov's 5 feeds are the ones to learn: Piața Sfatului square and the surrounding old town, live. Predeal's 3 cover the resort itself — and in winter, both double as snow checks for the Prahova Valley.",
      "The Nemira ski slope feed at Slanic-Moldova is the dedicated snow camera; Bucharest's pair (including the University of Economic Studies area), Sacele's 2, and the singles at Târgoviște and Tei round out the 37.",
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
      {
        q: "Can I check Prahova Valley snow live?",
        a: "Yes — the Nemira ski slope feed at Slanic-Moldova shows live snow, and the Brasov (5) and Predeal (3) cameras cover the main resort towns.",
      },
      {
        q: "What does Brasov's square look like right now?",
        a: "Check the Piața Sfatului feeds — Brasov's historic square streams live among the city's 5 cameras.",
      },
      {
        q: "Is Bucharest covered?",
        a: "Lightly — 2 feeds, including the University of Economic Studies area. The mountain towns carry most of the network.",
      },
    ],
  },
  brazil: {
    intro: [
      "Brazil's 36 cameras split between shoreline and landmarks. Balneario Camboriu and Rio de Janeiro have 4 each, Manaus 3, with Guaruja, Porto Seguro, and Santa Fe do Sul adding more sand.",
      "The standouts are iconic: Christ the Redeemer overlooking Rio, the Basilica of the National Shrine of Our Lady Aparecida, and a run of Santa Catarina beaches - Central Beach, Estaleiro, and Praia Brava.",
      "Check surf and weather on the coast or take in the landmarks from anywhere. All Brazilian feeds stream free on WorldEye.",
      "Rio's 4 feeds include the big one: Christ the Redeemer overlooking the city, live. It is the landmark camera of the whole Brazilian network — check the famous view in real weather, not postcard weather.",
      "The Santa Catarina beaches are the practical half: Central Beach, Estaleiro, and Praia Brava, plus Balneario Camboriu's 4, Guaruja, and Porto Seguro. Check surf and sand before heading out; Manaus's 3 add an Amazon counterpoint.",
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
      {
        q: "Can I really see Christ the Redeemer live?",
        a: "Yes — a Rio feed shows the statue live, with real weather over the city. It is one of the standout landmark cameras in the directory.",
      },
      {
        q: "Which beaches can I check in Brazil?",
        a: "Central Beach, Estaleiro, and Praia Brava in Santa Catarina, plus Balneario Camboriu (4 feeds), Guaruja, and Porto Seguro.",
      },
      {
        q: "Is there anything beyond Rio and the beaches?",
        a: "Yes — Manaus has 3 feeds in the Amazon, and the Basilica of the National Shrine of Our Lady Aparecida is another landmark feed.",
      },
    ],
  },
  bulgaria: {
    intro: [
      "Bulgaria's 35 cameras face the Black Sea. Primorsko and Dimitrovgrad have 3 each, with Sofia, Burgas, Nesebar, and Kiten at 2 - the coast dominates the list.",
      "Feeds cover beach resorts end to end: Burgas Beach Arena, the Elegance beach hotel in Nesebar, Sunny Beach, and Primorsko's folklore festival grounds, plus an agriculture institute feed inland at Karnobat.",
      "It's a summer-holiday network - check sand, sea, and weather before booking the trip. Every Bulgarian feed streams free on WorldEye.",
      "Primorsko's 3 feeds are the summer core: beach, sea, and the folklore festival grounds when events run. Burgas Beach Arena, the Elegance beach hotel in Nesebar, and Sunny Beach complete the resort strip — check sand and weather before booking.",
      "Inland, Dimitrovgrad's 3 and the Karnobat agriculture institute feed are the non-beach exceptions; Sofia and Kiten add 2 each. But this is a summer-holiday network first — the Black Sea is the point.",
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
      {
        q: "Can I check Sunny Beach live before booking?",
        a: "Yes — Sunny Beach, Burgas Beach Arena, and the Elegance beach hotel in Nesebar all stream live sea and sand conditions.",
      },
      {
        q: "What is the folklore festival grounds feed?",
        a: "One of Primorsko's 3 cameras watches the folklore festival grounds — worth checking when summer events are on.",
      },
      {
        q: "Is there anything inland?",
        a: "A little — Dimitrovgrad (3), Sofia (2), and an agriculture institute feed at Karnobat. The coast dominates, though.",
      },
    ],
  },
  croatia: {
    intro: [
      "Croatia closes our top-30 list with 29 cameras, nearly all of them on the Adriatic. Krk leads with 4, Split has 3, and Mali Losinj and Rabac have 2 each.",
      "The feeds are pure coastline: Veli Zal and Borik beaches on Mali Losinj, a panorama over Split, plus inland detours to the Marian shrine at Marija Bistrica and Mailáth Castle.",
      "Small in number, high in scenery - check the sea state before a sailing day. All Croatian feeds stream free on WorldEye.",
      "Krk's 4 feeds lead the island coverage; Split's 3 include a panorama over the city and coast. Mali Losinj's pair watches Veli Zal and Borik beaches — check the sea before a sailing day.",
      "The inland detours are worth the click: the Marian shrine at Marija Bistrica and Mailáth Castle, plus Donji Miholjac. Small network, high scenery per camera — all 29 free.",
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
      {
        q: "Can I check the sea before sailing in Croatia?",
        a: "Yes — the coastal feeds at Krk, Mali Losinj (Veli Zal and Borik beaches), Rabac, and Split show live sea conditions.",
      },
      {
        q: "Is there a Split panorama camera?",
        a: "Yes — Split's 3 feeds include a panorama over the city and the Adriatic coast.",
      },
      {
        q: "Anything inland?",
        a: "A couple of detours: the Marian shrine at Marija Bistrica and Mailáth Castle, plus Donji Miholjac.",
      },
    ],
  },
};
