/**
 * ICAO type designator → full aircraft name.
 *
 * The live feeds report only the designator ("B738"), and for most
 * records that is all the identity we have until the registry lookup
 * returns. The popup used to print the bare code as the plane's
 * "model", which reads as no type at all. This table covers the types
 * that make up the overwhelming bulk of live traffic (airliners,
 * regionals, business jets, GA staples, helicopters, common military);
 * anything unlisted keeps showing its code, and the registry result
 * still wins when it arrives.
 */
const TYPE_NAMES: Record<string, string> = {
  // Boeing
  B712: "Boeing 717-200", B720: "Boeing 720", B721: "Boeing 727-100", B722: "Boeing 727-200",
  B731: "Boeing 737-100", B732: "Boeing 737-200", B733: "Boeing 737-300", B734: "Boeing 737-400",
  B735: "Boeing 737-500", B736: "Boeing 737-600", B737: "Boeing 737-700", B738: "Boeing 737-800",
  B739: "Boeing 737-900", B38M: "Boeing 737 MAX 8", B39M: "Boeing 737 MAX 9", B3XM: "Boeing 737 MAX 10",
  B37M: "Boeing 737 MAX 7", B741: "Boeing 747-100", B742: "Boeing 747-200", B743: "Boeing 747-300",
  B744: "Boeing 747-400", B748: "Boeing 747-8", B74S: "Boeing 747SP",
  B752: "Boeing 757-200", B753: "Boeing 757-300", B762: "Boeing 767-200", B763: "Boeing 767-300",
  B764: "Boeing 767-400", B772: "Boeing 777-200", B773: "Boeing 777-300", B77L: "Boeing 777-200LR",
  B77W: "Boeing 777-300ER", B778: "Boeing 777-8", B779: "Boeing 777-9",
  B788: "Boeing 787-8", B789: "Boeing 787-9", B78X: "Boeing 787-10",
  // Airbus
  A306: "Airbus A300", A310: "Airbus A310", A318: "Airbus A318", A319: "Airbus A319",
  A320: "Airbus A320", A321: "Airbus A321", A19N: "Airbus A319neo", A20N: "Airbus A320neo",
  A21N: "Airbus A321neo", A332: "Airbus A330-200", A333: "Airbus A330-300", A339: "Airbus A330-900neo",
  A338: "Airbus A330-800neo", A342: "Airbus A340-200", A343: "Airbus A340-300", A345: "Airbus A340-500",
  A346: "Airbus A340-600", A359: "Airbus A350-900", A35K: "Airbus A350-1000", A388: "Airbus A380-800",
  BCS1: "Airbus A220-100", BCS3: "Airbus A220-300", BLCF: "Airbus BelugaXL", A3ST: "Airbus Beluga",
  // Regional jets & turboprops
  CRJ1: "Bombardier CRJ-100", CRJ2: "Bombardier CRJ-200", CRJ7: "Bombardier CRJ-700",
  CRJ9: "Bombardier CRJ-900", CRJX: "Bombardier CRJ-1000",
  E135: "Embraer ERJ-135", E145: "Embraer ERJ-145", E45X: "Embraer ERJ-145XR",
  E170: "Embraer E170", E175: "Embraer E175", E75L: "Embraer E175", E75S: "Embraer E175",
  E190: "Embraer E190", E195: "Embraer E195", E290: "Embraer E190-E2", E295: "Embraer E195-E2",
  DH8A: "De Havilland Canada Dash 8-100", DH8B: "De Havilland Canada Dash 8-200",
  DH8C: "De Havilland Canada Dash 8-300", DH8D: "De Havilland Canada Dash 8 Q400",
  AT43: "ATR 42-300", AT45: "ATR 42-500", AT46: "ATR 42-600", AT72: "ATR 72", AT75: "ATR 72-500", AT76: "ATR 72-600",
  SF34: "Saab 340", SB20: "Saab 2000", J328: "Fairchild Dornier 328JET", D328: "Dornier 328",
  F70: "Fokker 70", F100: "Fokker 100", AN24: "Antonov An-24", AN26: "Antonov An-26",
  SU95: "Sukhoi Superjet 100", YK40: "Yakovlev Yak-40", T154: "Tupolev Tu-154", IL76: "Ilyushin Il-76",
  // Business jets
  GLF2: "Gulfstream GII", GLF3: "Gulfstream GIII", GLF4: "Gulfstream GIV", GLF5: "Gulfstream GV",
  GLF6: "Gulfstream G650", G150: "Gulfstream G150", G280: "Gulfstream G280", GALX: "Gulfstream G200",
  GLEX: "Bombardier Global Express", GL5T: "Bombardier Global 5000", GL7T: "Bombardier Global 7500",
  CL30: "Bombardier Challenger 300", CL35: "Bombardier Challenger 350", CL60: "Bombardier Challenger 600",
  CRJ0: "Bombardier Challenger 800", LJ31: "Learjet 31", LJ35: "Learjet 35", LJ40: "Learjet 40",
  LJ45: "Learjet 45", LJ60: "Learjet 60", LJ70: "Learjet 70", LJ75: "Learjet 75",
  C25A: "Cessna Citation CJ2", C25B: "Cessna Citation CJ3", C25C: "Cessna Citation CJ4",
  C500: "Cessna Citation I", C501: "Cessna Citation I/SP", C510: "Cessna Citation Mustang",
  C525: "Cessna Citation CJ", C526: "Cessna Citation", C550: "Cessna Citation II", C551: "Cessna Citation IISP",
  C560: "Cessna Citation V", C56X: "Cessna Citation Excel", C650: "Cessna Citation III",
  C680: "Cessna Citation Sovereign", C68A: "Cessna Citation Latitude", C700: "Cessna Citation Longitude",
  C750: "Cessna Citation X", E50P: "Embraer Phenom 100", E55P: "Embraer Phenom 300",
  E545: "Embraer Praetor 500", E550: "Embraer Praetor 600", EA50: "Eclipse 500",
  F900: "Dassault Falcon 900", F2LX: "Dassault Falcon 2000LX", FA7X: "Dassault Falcon 7X",
  FA8X: "Dassault Falcon 8X", FA50: "Dassault Falcon 50", F406: "Reims-Cessna F406",
  H25A: "Hawker 750", H25B: "Hawker 800", H25C: "Hawker 1000", HDJT: "Honda HA-420 HondaJet",
  PC24: "Pilatus PC-24", PRM1: "Beechcraft Premier I", BE40: "Beechcraft 400 Beechjet",
  // GA & utility
  C150: "Cessna 150", C152: "Cessna 152", C170: "Cessna 170", C172: "Cessna 172 Skyhawk",
  C72R: "Cessna R172", C175: "Cessna 175", C177: "Cessna 177 Cardinal", C180: "Cessna 180",
  C182: "Cessna 182 Skylane", C82T: "Cessna T182 Turbo Skylane", C185: "Cessna 185 Skywagon",
  C206: "Cessna 206 Stationair", C207: "Cessna 207", C208: "Cessna 208 Caravan", C210: "Cessna 210 Centurion",
  C310: "Cessna 310", C320: "Cessna 320", C337: "Cessna 337 Skymaster", C340: "Cessna 340",
  C402: "Cessna 402", C404: "Cessna 404 Titan", C414: "Cessna 414 Chancellor", C421: "Cessna 421",
  C425: "Cessna 425 Conquest I", C441: "Cessna 441 Conquest II",
  P28A: "Piper PA-28 Cherokee", P28B: "Piper PA-28 Dakota", P28R: "Piper PA-28R Arrow",
  PA32: "Piper PA-32 Cherokee Six", PA34: "Piper PA-34 Seneca", PA44: "Piper PA-44 Seminole",
  PA46: "Piper PA-46 Malibu", P46T: "Piper PA-46 JetPROP", M600: "Piper M600", PA18: "Piper PA-18 Super Cub",
  PA23: "Piper PA-23 Aztec", PA31: "Piper PA-31 Navajo", PA38: "Piper PA-38 Tomahawk",
  SR20: "Cirrus SR20", SR22: "Cirrus SR22", S22T: "Cirrus SR22T", SF50: "Cirrus Vision SF50",
  DA40: "Diamond DA40", DA42: "Diamond DA42 Twin Star", DA50: "Diamond DA50", DA62: "Diamond DA62",
  BE19: "Beechcraft Musketeer", BE23: "Beechcraft Sundowner", BE24: "Beechcraft Sierra",
  BE33: "Beechcraft Bonanza 33", BE35: "Beechcraft Bonanza 35", BE36: "Beechcraft Bonanza 36",
  BE55: "Beechcraft Baron 55", BE58: "Beechcraft Baron 58", BE76: "Beechcraft Duchess",
  BE20: "Beechcraft King Air 200", BE30: "Beechcraft King Air 300", B350: "Beechcraft King Air 350",
  BE99: "Beechcraft 99", BE9L: "Beechcraft King Air 90", B190: "Beechcraft 1900",
  PC12: "Pilatus PC-12", PC6: "Pilatus PC-6 Porter", TBM7: "Daher TBM 700", TBM8: "Daher TBM 850",
  TBM9: "Daher TBM 900", PA25: "Piper PA-25 Pawnee", AT3P: "Air Tractor AT-301", AT5T: "Air Tractor AT-502",
  AT6T: "Air Tractor AT-602", AT8T: "Air Tractor AT-802", DHC2: "De Havilland Canada Beaver",
  DHC3: "De Havilland Canada Otter", DHC6: "De Havilland Canada Twin Otter", AN2: "Antonov An-2",
  M20P: "Mooney M20", M20T: "Mooney M20 Turbo", AA5: "Grumman AA-5", C46: "Curtiss C-46 Commando",
  DC3: "Douglas DC-3", DC6: "Douglas DC-6", L188: "Lockheed L-188 Electra", CONI: "Lockheed Constellation",
  // Helicopters
  R22: "Robinson R22", R44: "Robinson R44", R66: "Robinson R66",
  B407: "Bell 407", B06: "Bell 206 JetRanger", B06T: "Bell 206L LongRanger", B212: "Bell 212",
  B222: "Bell 222", B230: "Bell 230", B412: "Bell 412", B427: "Bell 427", B429: "Bell 429",
  B505: "Bell 505", B525: "Bell 525", UH1: "Bell UH-1 Iroquois", UH1Y: "Bell UH-1Y Venom",
  AS50: "Airbus Helicopters H125 (AS350 Écureuil)", AS55: "Airbus Helicopters AS355 Écureuil 2",
  AS32: "Airbus Helicopters Super Puma", AS65: "Airbus Helicopters AS365 Dauphin",
  EC20: "Airbus Helicopters H120", EC25: "Airbus Helicopters H145 (EC145)", EC30: "Airbus Helicopters H130 (EC130)",
  EC35: "Airbus Helicopters H135 (EC135)", EC45: "Airbus Helicopters H145", EC55: "Airbus Helicopters H155",
  EC75: "Airbus Helicopters H175", EXPL: "MD Helicopters MD-900 Explorer", MD52: "MD Helicopters MD-520N",
  MD60: "MD Helicopters MD-600N", H500: "MD Helicopters MD-500", NOTA: "MD Helicopters NOTAR",
  S269: "Sikorsky S-300", S330: "Schweizer 330", S333: "Schweizer 333", EN48: "Enstrom 480",
  CABR: "Guimbal Cabri G2", A109: "Leonardo AW109", A119: "Leonardo AW119", A139: "Leonardo AW139",
  A149: "Leonardo AW149", A169: "Leonardo AW169", A189: "Leonardo AW189", W3: "PZL W-3 Sokół",
  MI8: "Mil Mi-8", MI17: "Mil Mi-17", MI24: "Mil Mi-24", MI26: "Mil Mi-26", KA32: "Kamov Ka-32",
  // Military staples
  H60: "Sikorsky H-60 (Black Hawk / Seahawk)", S61: "Sikorsky S-61 Sea King", S64: "Sikorsky S-64 Skycrane",
  S70: "Sikorsky S-70", S92: "Sikorsky S-92", CH47: "Boeing CH-47 Chinook", CH53: "Sikorsky CH-53",
  V22: "Bell Boeing V-22 Osprey", H47: "Boeing CH-47 Chinook", H53: "Sikorsky CH-53 Sea Stallion",
  H64: "Boeing AH-64 Apache", F16: "Lockheed Martin F-16 Fighting Falcon", F15: "Boeing F-15 Eagle",
  F18: "Boeing F/A-18 Hornet", F22: "Lockheed Martin F-22 Raptor", F35: "Lockheed Martin F-35 Lightning II",
  F5: "Northrop F-5", F4: "McDonnell Douglas F-4 Phantom II", A10: "Fairchild A-10 Thunderbolt II",
  B52: "Boeing B-52 Stratofortress", B1: "Rockwell B-1 Lancer", B2: "Northrop B-2 Spirit",
  C130: "Lockheed C-130 Hercules", C17: "Boeing C-17 Globemaster III", C5M: "Lockheed C-5M Super Galaxy",
  C30J: "Lockheed Martin C-130J Super Hercules", KC10: "McDonnell Douglas KC-10 Extender",
  KC35: "Boeing KC-135 Stratotanker", KC46: "Boeing KC-46 Pegasus", K35R: "Boeing KC-135R Stratotanker",
  E3CF: "Boeing E-3 Sentry", E3TF: "Boeing E-3 Sentry", E6: "Boeing E-6 Mercury", E8: "Boeing E-8 JSTARS",
  P8: "Boeing P-8 Poseidon", P3: "Lockheed P-3 Orion", RC35: "Boeing RC-135", U2: "Lockheed U-2",
  RQ4: "Northrop Grumman RQ-4 Global Hawk", Q9: "General Atomics MQ-9 Reaper",
  TEX2: "Beechcraft T-6 Texan II", T38: "Northrop T-38 Talon", T6: "Beechcraft T-6 Texan II",
  HAWK: "BAE Hawk", EUFI: "Eurofighter Typhoon", RAFL: "Dassault Rafale", SB39: "Saab JAS 39 Gripen",
  TOR: "Panavia Tornado", C135: "Boeing C-135 Stratolifter", A400: "Airbus A400M Atlas",
  C295: "Airbus C295", C27J: "Alenia C-27J Spartan", CN35: "CASA CN-235", V250: "Embraer KC-390",
};

/** Full aircraft name for an ICAO designator, or null when unlisted. */
export function aircraftTypeName(code: string | null | undefined): string | null {
  if (!code) return null;
  const key = String(code).trim().toUpperCase();
  if (!key || key === "UNKNOWN" || key === "GND") return null;
  return TYPE_NAMES[key] ?? null;
}
