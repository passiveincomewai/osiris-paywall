import { describe, it, expect } from "vitest";
import linksData from "@/data/ski-resort-links.json";
import logosData from "@/data/ski-logos.json";
import { SKI_RESORTS } from "./ski-resorts";
import {
  EXTRA_VERIFIED_DOMAINS,
  getVerifiedResortDomain,
  urlHostMatchesDomain,
  type SkiLinkKind,
  type SkiResortLinks,
} from "./ski-resort-links";

/**
 * Domain exceptions: stored links whose host is NOT the resort's
 * verified domain. Each entry is a case where the resort's own official
 * site sends its visitors to that host for that purpose — the URL was
 * reached by a redirect from, or a direct link on, the verified domain,
 * and the target's title/content confirmed the resort and the purpose
 * (evidence in the build report's audit table). An exception that no
 * stored link uses any more fails the suite, so this list cannot rot.
 */
const EXCEPTIONS: Record<string, Partial<Record<SkiLinkKind, { host: string; reason: string }>>> = {
  levi: {
    tickets: {
      host: "levi.skiperformance.com",
      reason:
        "Levi's own site links 'Osta hissiliput' (buy lift tickets) to its SkiPerformance webshop; the shop's title welcomes visitors to the Levi Ski Resort store.",
    },
  },
  cerler: {
    tickets: {
      host: "www.aramon.com",
      reason:
        "Cerler is an Aramón group station; cerler.com links 'Tarifas forfait' to the group's Cerler station page on aramon.com.",
    },
    lodging: {
      host: "www.aramon.com",
      reason:
        "cerler.com links 'Alojamientos' to the Aramón group's Cerler hotels page on aramon.com.",
    },
    trailMap: {
      host: "www.aramon.com",
      reason:
        "cerler.com redirects to aramon.com/cerler, whose 'Mapa y ficha técnica' anchor leads to the Aramón page fetched as 'Mapa de Pistas y Ficha Técnica de Cerler'.",
    },
  },
  zermatt: {
    tickets: {
      host: "zermatt.swiss",
      reason:
        "The verified domain zermatt.ch serves its booking pages on its sister domain zermatt.swiss; the link was taken from zermatt.ch's own homepage anchors and the page title confirms Zermatt lift tickets.",
    },
    lodging: {
      host: "zermatt.swiss",
      reason:
        "Same official-site domain pair as the tickets link; the page is zermatt.ch's own accommodation booking index on zermatt.swiss.",
    },
    trailMap: {
      host: "zermatt.swiss",
      reason:
        "Same official-site domain pair as the tickets link; zermatt.swiss/karte was fetched as 'Panoramakarte' and its maps navigation offers the Zermatt Pistenplan.",
    },
  },
  "myoko-kogen": {
    lodging: {
      host: "joetsu-myoko.com",
      reason:
        "Myoko's official tourism site (myoko.jp) links visitors staying in Akakura Onsen — Myoko Kogen's base village — to the Joetsu-Myoko tourism portal's accommodation index.",
    },
  },
  "sugar-bowl": {
    lodging: {
      host: "digital-assets.net",
      reason:
        "sugarbowl.com's own lodging page is hosted on the resort's digital-assets.net domain; the fetched page title is 'Sugar Bowl | Lodging'.",
    },
  },
  "cannon-mountain": {
    tickets: {
      host: "shop.skinh.com",
      reason:
        "cannonmt.com's own shop redirects to the NH state-parks storefront shop.skinh.com, which sells the Cannon-branded ticket products; verified by following the resort's own shop link.",
    },
  },
  stowe: {
    trailMap: {
      host: "scene7.vailresorts.com",
      reason:
        "Stowe's official winter trail-map PDF is served from Vail Resorts' Scene7 asset CDN (scene7.vailresorts.com); the indexed document is the 'Stowe Trail Map' PDF itself.",
    },
  },
  hafjell: {
    tickets: {
      host: "www.alpinco.com",
      reason:
        "Hafjell's official pages (linked from hafjell.no) are served on the Alpinco operator platform; the fetched section names Hafjell ('Kjøp dagskort ... i Hafjell').",
    },
    trailMap: {
      host: "www.alpinco.com",
      reason:
        "Same operator platform as the tickets link; the fetched page is Hafjell's own piste map on alpinco.com.",
    },
    lodging: {
      host: "www.alpinco.com",
      reason:
        "Same operator platform as the tickets link; the fetched page is Hafjell's own accommodation index on alpinco.com.",
    },
  },
  kvitfjell: {
    tickets: {
      host: "www.alpinco.com",
      reason:
        "Kvitfjell's official pages are served on the Alpinco operator platform; the fetched section names Kvitfjell day passes.",
    },
    trailMap: {
      host: "www.alpinco.com",
      reason:
        "Same operator platform as the tickets link; the fetched page is Kvitfjell's own piste map on alpinco.com.",
    },
    lodging: {
      host: "www.alpinco.com",
      reason:
        "Same operator platform as the tickets link; the fetched page is Kvitfjell's own accommodation index on alpinco.com.",
    },
  },
  oppdal: {
    tickets: {
      host: "www.alpinco.com",
      reason:
        "Oppdal's official pages are served on the Alpinco operator platform; the fetched section names Oppdal day passes.",
    },
    trailMap: {
      host: "www.alpinco.com",
      reason:
        "Same operator platform as the tickets link; the fetched page is Oppdal's own piste map on alpinco.com.",
    },
  },
  salen: {
    tickets: {
      host: "www.skistar.com",
      reason:
        "Sälen is a SkiStar resort; salen.se's own links lead to SkiStar's Sälen lift-pass shop, whose fetched page names Sälen.",
    },
    trailMap: {
      host: "www.skistar.com",
      reason:
        "Same operator relationship as the tickets link; the fetched page is SkiStar's Sälen piste-map page.",
    },
    lodging: {
      host: "www.skistar.com",
      reason:
        "Same operator relationship as the tickets link; the fetched page is SkiStar's Sälen lodging page.",
    },
  },
  hemsedal: {
    tickets: {
      host: "www.skistar.com",
      reason:
        "Hemsedal is a SkiStar resort; the fetched shop page is titled 'SkiPass Hemsedal – buy lift pass online at SkiStar'.",
    },
  },
  "st-anton-am-arlberg": {
    tickets: {
      host: "www.skiarlberg.at",
      reason:
        "Ski Arlberg is the lift operator for St. Anton am Arlberg; stantonamarlberg.com's own ticket links point to the Ski Arlberg webshop, whose fetched page is titled 'Buy ski ticket online – Ski Arlberg'.",
    },
    trailMap: {
      host: "www.skiarlberg.at",
      reason:
        "Same operator relationship as the tickets link; the fetched page is Ski Arlberg's 'Interaktive Karte & Navigation | St. Anton am Arlberg' piste map.",
    },
  },
  "lech-am-arlberg": {
    trailMap: {
      host: "www.skiarlberg.at",
      reason:
        "Ski Arlberg operates Lech Zürs; the fetched page is its 'Interaktive Karte | Lech Zürs' piste map, linked from lechzuers.com.",
    },
  },
  "andermatt-sedrun": {
    tickets: {
      host: "www.andermatt-sedrun-disentis.ch",
      reason:
        "The verified domain andermatt.swiss 302-redirects into the Andermatt-Sedrun-Disentis operator domain (redirect re-verified by curl); the fetched page is 'Tickets | ASD' covering Andermatt+Sedrun+Disentis day passes.",
    },
    lodging: {
      host: "www.andermatt-sedrun-disentis.ch",
      reason:
        "Same operator-domain redirect as the tickets link; the fetched page is 'Unterkünfte | Andermatt-Urserntal Tourismus'.",
    },
  },
  oberstdorf: {
    tickets: {
      host: "www.ok-bergbahnen.com",
      reason:
        "ok-bergbahnen.com is the Oberstdorf Kleinwalsertal lift operator, linked from oberstdorf.de; the fetched page is its day-skipass prices page for Oberstdorf-Kleinwalsertal.",
    },
  },
  "poiana-brasov": {
    tickets: {
      host: "www.discoverpoiana.ro",
      reason:
        "The verified brand domain poianabrasov.com is parked and unusable; the lift operator Ana Teleferic's official site is discoverpoiana.ro (anateleferic.ro 302-redirects there, re-verified by curl), and its fetched 'Cartele' page sells/recharges the resort's skipass cards.",
    },
    trailMap: {
      host: "www.discoverpoiana.ro",
      reason:
        "Same operator site as the tickets link; its fetched 'Pârtii' page carries the piste-map legend for Poiana Brașov's lifts and pistes.",
    },
    lodging: {
      host: "www.discoverpoiana.ro",
      reason:
        "Same operator site as the tickets link; its fetched 'Cazare' page is the operator's official accommodation page for Poiana Brașov.",
    },
  },
  formigal: {
    tickets: {
      host: "www.aramon.com",
      reason:
        "Aramón operates Formigal-Panticosa; formigal.com's ticket entry redirects to the group's Formigal-Panticosa station page on aramon.com, where its passes are sold (same operator exception as the resort's lodging link).",
    },
    lodging: {
      host: "www.aramon.com",
      reason:
        "Aramón operates Formigal-Panticosa and hosts its official pages (including the resort's hotel index) on aramon.com; formigal.com's own lodging links lead there.",
    },
  },
  "grindelwald-wengen": {
    trailMap: {
      host: "jungfrauregion.swiss",
      reason:
        "Jungfrauregion.swiss is the official Jungfrau Region tourism site; wengen.swiss's own footer links its interactive winter map there, and the fetched page is 'Jungfrau Region Winter Maps: Trails, Runs & More'.",
    },
  },
};

const LINKS = linksData as Record<string, SkiResortLinks>;
const LOGOS = logosData as Record<string, { domain: string }>;
const KINDS: SkiLinkKind[] = ["tickets", "trailMap", "lodging"];
const RESORT_SLUGS = new Set(SKI_RESORTS.map(r => r.slug));

function hostOf(url: string): string {
  return new URL(url).hostname.toLowerCase();
}

describe("ski-resort-links.json integrity", () => {
  it("every key is a resort that has a page", () => {
    for (const slug of Object.keys(LINKS)) {
      expect(RESORT_SLUGS.has(slug), slug).toBe(true);
    }
  });

  it("every resort with links has a verified domain on record", () => {
    for (const slug of Object.keys(LINKS)) {
      expect(getVerifiedResortDomain(slug), slug).not.toBeNull();
    }
  });

  it("entries hold only the three link kinds, at least one present", () => {
    for (const [slug, entry] of Object.entries(LINKS)) {
      const keys = Object.keys(entry);
      expect(keys.length, slug).toBeGreaterThan(0);
      for (const k of keys) {
        expect(KINDS, `${slug}.${k}`).toContain(k);
      }
    }
  });

  it("every stored URL is a well-formed https URL", () => {
    for (const [slug, entry] of Object.entries(LINKS)) {
      for (const kind of KINDS) {
        const url = entry[kind];
        if (!url) continue;
        const parsed = new URL(url);
        expect(parsed.protocol, `${slug}.${kind}`).toBe("https:");
      }
    }
  });

  it("every URL sits on the resort's verified domain or a documented exception", () => {
    for (const [slug, entry] of Object.entries(LINKS)) {
      const domain = getVerifiedResortDomain(slug)!;
      for (const kind of KINDS) {
        const url = entry[kind];
        if (!url) continue;
        if (urlHostMatchesDomain(url, domain)) continue;
        const ex = EXCEPTIONS[slug]?.[kind];
        expect(
          ex,
          `${slug}.${kind} → ${url} is off-domain (${domain}) with no exception`,
        ).toBeDefined();
        expect(hostOf(url), `${slug}.${kind} exception host`).toBe(ex!.host);
      }
    }
  });

  it("every documented exception is used by a stored link (no stale exceptions)", () => {
    for (const [slug, kinds] of Object.entries(EXCEPTIONS)) {
      for (const [kind, ex] of Object.entries(kinds)) {
        const url = LINKS[slug]?.[kind as SkiLinkKind];
        expect(url, `stale exception ${slug}.${kind}`).toBeDefined();
        expect(hostOf(url!), `stale exception ${slug}.${kind}`).toBe(ex.host);
        const domain = getVerifiedResortDomain(slug);
        expect(domain, slug).not.toBeNull();
        expect(
          urlHostMatchesDomain(url!, domain!),
          `exception ${slug}.${kind} is actually on-domain — remove it`,
        ).toBe(false);
      }
    }
  });

  it("logo domains and extra domains never disagree", () => {
    for (const [slug, domain] of Object.entries(EXTRA_VERIFIED_DOMAINS)) {
      if (LOGOS[slug]) {
        expect(LOGOS[slug].domain, slug).toBe(domain);
      }
    }
  });
});
