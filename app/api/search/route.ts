import { NextResponse } from "next/server";

// ====== CONFIGURAȚIE ȚĂRI ======
type CountrySites = {
  [siteName: string]: (citySlug: string, typeSlug: string) => string;
};

const COUNTRY_SITES: Record<string, CountrySites> = {
  RO: {
    "imobiliare.ro":  (city, type) => `https://www.imobiliare.ro/${type}/${city}`,
    "storia.ro":      (city, type) => `https://www.storia.ro/ro/rezultate/vanzare/${type}/${city}`,
    "olx.ro":         (city, type) => `https://www.olx.ro/${type}/`,
    "publi24.ro":     ()           => `https://www.publi24.ro/anunturi/imobiliare/`,
  },
  DE: {
    "immobilienscout24.de": (city, type) => `https://www.immobilienscout24.de/Suche/de/${city}/${type}`,
    "immowelt.de":          (city, type) => `https://www.immowelt.de/suche/${city}/${type}`,
    "kleinanzeigen.de":     ()           => `https://www.kleinanzeigen.de/s-immobilien/`,
  },
  FR: {
    "seloger.com":    (city, type) => `https://www.seloger.com/${type}/achat/${city}/`,
    "leboncoin.fr":   ()           => `https://www.leboncoin.fr/recherche?category=9`,
    "bienici.com":    (city, type) => `https://www.bienici.com/recherche/${type}/${city}`,
  },
  IT: {
    "immobiliare.it": (city, type) => `https://www.immobiliare.it/${type}/${city}/`,
    "casa.it":        (city, type) => `https://www.casa.it/${type}/${city}/`,
    "idealista.it":   (city, type) => `https://www.idealista.it/${type}/${city}/`,
  },
  ES: {
    "idealista.com":  (city, type) => `https://www.idealista.com/${type}/${city}/`,
    "fotocasa.es":    (city, type) => `https://www.fotocasa.es/${type}/${city}/`,
    "habitaclia.com": (city, type) => `https://www.habitaclia.com/${type}/${city}/`,
  },
  PT: {
    "idealista.pt":   (city, type) => `https://www.idealista.pt/${type}/${city}/`,
    "imovirtual.com": (city, type) => `https://www.imovirtual.com/${type}/${city}/`,
    "casa.sapo.pt":   ()           => `https://casa.sapo.pt/venda/`,
  },
  PL: {
    "otodom.pl":      (city, type) => `https://www.otodom.pl/pl/${type}/${city}`,
    "olx.pl":         ()           => `https://www.olx.pl/nieruchomosci/`,
    "domiporta.pl":   ()           => `https://www.domiporta.pl/`,
  },
  HU: {
    "ingatlan.com":   (city, type) => `https://ingatlan.com/${type}/${city}`,
    "otthonterkep.hu":(city)       => `https://www.otthonterkep.hu/terkep?city=${city}`,
    "jofogas.hu":     ()           => `https://www.jofogas.hu/ingatlan`,
  },
  BG: {
    "imot.bg":        ()           => `https://www.imot.bg/`,
    "homes.bg":       ()           => `https://www.homes.bg/`,
    "alo.bg":         ()           => `https://www.alo.bg/obiavi/imoti/`,
  },
  AT: {
    "willhaben.at":   (city, type) => `https://www.willhaben.at/iad/immobilien/${type}/${city}/`,
    "immowelt.at":    (city, type) => `https://www.immowelt.at/suche/${city}/${type}`,
    "immosuche.at":   ()           => `https://www.immosuche.at/`,
  },
  NL: {
    "funda.nl":       (city, type) => `https://www.funda.nl/${type}/${city}/`,
    "pararius.nl":    (city, type) => `https://www.pararius.nl/${type}/${city}`,
    "jaap.nl":        ()           => `https://www.jaap.nl/koophuizen/`,
  },
  BE: {
    "immoweb.be":     (city, type) => `https://www.immoweb.be/ro/cautare/${type}/vanzare?countries=BE&cities=${city}`,
    "zimmo.be":       ()           => `https://www.zimmo.be/fr/`,
    "logic-immo.be":  ()           => `https://www.logic-immo.be/`,
  },
  CZ: {
    "sreality.cz":    (city, type) => `https://www.sreality.cz/hledani/prodej/${type}/${city}`,
    "bezrealitky.cz": ()           => `https://www.bezrealitky.cz/`,
    "reality.cz":     ()           => `https://reality.cz/`,
  },
  SK: {
    "nehnutelnosti.sk": ()         => `https://www.nehnutelnosti.sk/`,
    "reality.sk":       ()         => `https://www.reality.sk/`,
    "bazos.sk":         ()         => `https://reality.bazos.sk/`,
  },
  HR: {
    "njuskalo.hr":    (city, type) => `https://www.njuskalo.hr/${type}/${city}`,
    "index.hr":       ()           => `https://www.index.hr/oglasi/nekretnine/`,
    "crozilla.com":   ()           => `https://www.crozilla.com/`,
  },
  GR: {
    "spitogatos.gr":  (city, type) => `https://www.spitogatos.gr/${type}/${city}/`,
    "xe.gr":          ()           => `https://www.xe.gr/property/`,
    "tospitimou.gr":  ()           => `https://www.tospitimou.gr/`,
  },
  GB: {
    "rightmove.co.uk":  (city)     => `https://www.rightmove.co.uk/property-for-sale/search.html?searchLocation=${city}`,
    "zoopla.co.uk":     (city)     => `https://www.zoopla.co.uk/for-sale/property/${city}/`,
    "onthemarket.com":  (city)     => `https://www.onthemarket.com/for-sale/${city}/`,
  },
  CH: {
    "homegate.ch":    (city, type) => `https://www.homegate.ch/${type}/${city}`,
    "immoscout24.ch": (city, type) => `https://www.immoscout24.ch/${type}/${city}`,
    "comparis.ch":    ()           => `https://en.comparis.ch/immobilien/default`,
  },
};

// Sluguri per tip proprietate per țară
const TYPE_SLUGS: Record<string, Record<string, string>> = {
  RO: { "teren-agricol": "vanzare-terenuri", "teren-industrial": "vanzare-terenuri", "teren-intravilan": "vanzare-terenuri", "casa": "vanzare-case", "apartament": "vanzare-apartamente", "spatiu-comercial": "vanzare-spatii-comerciale" },
  DE: { "teren-agricol": "grundstuecke-kaufen", "teren-industrial": "grundstuecke-kaufen", "teren-intravilan": "grundstuecke-kaufen", "casa": "haeuser-kaufen", "apartament": "wohnungen-kaufen", "spatiu-comercial": "gewerbe-kaufen" },
  FR: { "teren-agricol": "terrains", "teren-industrial": "terrains", "teren-intravilan": "terrains", "casa": "maisons", "apartament": "appartements", "spatiu-comercial": "commerces" },
  IT: { "teren-agricol": "vendita-terreni", "teren-industrial": "vendita-terreni", "teren-intravilan": "vendita-terreni", "casa": "vendita-case", "apartament": "vendita-appartamenti", "spatiu-comercial": "vendita-negozi" },
  ES: { "teren-agricol": "venta-terrenos", "teren-industrial": "venta-terrenos", "teren-intravilan": "venta-terrenos", "casa": "venta-casas", "apartament": "venta-pisos", "spatiu-comercial": "venta-locales-comerciales" },
  PT: { "teren-agricol": "venda-terrenos", "teren-industrial": "venda-terrenos", "teren-intravilan": "venda-terrenos", "casa": "venda-casas", "apartament": "venda-apartamentos", "spatiu-comercial": "venda-lojas" },
  PL: { "teren-agricol": "sprzedaz/dzialki", "teren-industrial": "sprzedaz/dzialki", "teren-intravilan": "sprzedaz/dzialki", "casa": "sprzedaz/domy", "apartament": "sprzedaz/mieszkania", "spatiu-comercial": "sprzedaz/lokale" },
  HU: { "teren-agricol": "elado+telek", "teren-industrial": "elado+telek", "teren-intravilan": "elado+telek", "casa": "elado+haz", "apartament": "elado+lakas", "spatiu-comercial": "elado+uzlethelyiseg" },
  BG: { "teren-agricol": "zemi", "teren-industrial": "zemi", "teren-intravilan": "zemi", "casa": "kshti", "apartament": "apartamenti", "spatiu-comercial": "magazini" },
  AT: { "teren-agricol": "grundstuecke", "teren-industrial": "grundstuecke", "teren-intravilan": "grundstuecke", "casa": "haeuser", "apartament": "wohnungen", "spatiu-comercial": "gewerbe" },
  NL: { "teren-agricol": "koop", "teren-industrial": "koop", "teren-intravilan": "koop", "casa": "koop", "apartament": "koop", "spatiu-comercial": "koop" },
  BE: { "teren-agricol": "teren", "teren-industrial": "teren", "teren-intravilan": "teren", "casa": "casa", "apartament": "apartament", "spatiu-comercial": "spatiu-comercial" },
  CZ: { "teren-agricol": "pozemky", "teren-industrial": "pozemky", "teren-intravilan": "pozemky", "casa": "domy", "apartament": "byty", "spatiu-comercial": "komercni" },
  SK: { "teren-agricol": "pozemky", "teren-industrial": "pozemky", "teren-intravilan": "pozemky", "casa": "domy", "apartament": "byty", "spatiu-comercial": "komercne" },
  HR: { "teren-agricol": "zemljista", "teren-industrial": "zemljista", "teren-intravilan": "zemljista", "casa": "kuce", "apartament": "stanovi", "spatiu-comercial": "poslovni-prostori" },
  GR: { "teren-agricol": "oikopeda-pros-polisi", "teren-industrial": "oikopeda-pros-polisi", "teren-intravilan": "oikopeda-pros-polisi", "casa": "katoikies-pros-polisi", "apartament": "diamerismata-pros-polisi", "spatiu-comercial": "epaggelmatikoi-choroi-pros-polisi" },
  GB: { "teren-agricol": "land", "teren-industrial": "land", "teren-intravilan": "land", "casa": "houses", "apartament": "flats", "spatiu-comercial": "commercial" },
  CH: { "teren-agricol": "kaufen/grundstuecke", "teren-industrial": "kaufen/grundstuecke", "teren-intravilan": "kaufen/grundstuecke", "casa": "kaufen/haeuser", "apartament": "kaufen/wohnungen", "spatiu-comercial": "kaufen/gewerbe" },
};

function cityToSlug(city: string): string {
  return city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

async function getCityFromCoords(lat: number, lng: number): Promise<{ city: string; countryCode: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`;
    const res = await fetch(url, { headers: { "User-Agent": "terenuri-app/1.0" } });
    if (!res.ok) return { city: "city", countryCode: "RO" };
    const data = (await res.json()) as { address?: { city?: string; town?: string; village?: string; county?: string; country_code?: string } };
    const addr = data.address ?? {};
    const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "city";
    const countryCode = (addr.country_code ?? "ro").toUpperCase();
    return { city, countryCode };
  } catch {
    return { city: "city", countryCode: "RO" };
  }
}

type ExternalListing = {
  id: string; title: string; price: number; currency: string;
  locality: string; link: string; source: string; areaM2?: number;
};

async function tryScrapeSite(url: string, sourceName: string): Promise<ExternalListing[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml", "Accept-Language": "ro,en;q=0.9",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results: ExternalListing[] = [];
    const jsonLdBlocks = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) ?? [];
    for (const block of jsonLdBlocks) {
      try {
        const json = JSON.parse(block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "").trim());
        if (json["@type"] === "ItemList" && Array.isArray(json.itemListElement)) {
          for (const el of json.itemListElement.slice(0, 8)) {
            const item = el.item ?? el;
            if (item?.name) {
              results.push({
                id: String(item.url ?? Math.random()),
                title: String(item.name),
                price: Number(item.offers?.price ?? 0),
                currency: String(item.offers?.priceCurrency ?? "EUR"),
                locality: String(item.address?.addressLocality ?? ""),
                link: String(item.url ?? url),
                source: sourceName,
              });
            }
          }
          if (results.length > 0) return results;
        }
      } catch { continue; }
    }
    return results;
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "45.75");
  const lng = parseFloat(searchParams.get("lng") ?? "21.22");
  const propertyType = searchParams.get("type") ?? "teren-intravilan";
  const countryOverride = searchParams.get("country") ?? "";

  const { city, countryCode } = await getCityFromCoords(lat, lng);
  const country = countryOverride || countryCode;
  const citySlug = cityToSlug(city);
  const typeSlug = (TYPE_SLUGS[country] ?? TYPE_SLUGS["RO"])[propertyType] ?? "property";
  const sitesConfig = COUNTRY_SITES[country] ?? COUNTRY_SITES["RO"];

  // Construiește URL-urile pentru toate site-urile țării
  const urls: Record<string, string> = {};
  for (const [siteName, urlFn] of Object.entries(sitesConfig)) {
    try { urls[siteName] = urlFn(citySlug, typeSlug); } catch { /* skip */ }
  }

  // Încearcă scraping pe primul site
  let results: ExternalListing[] = [];
  const firstEntry = Object.entries(sitesConfig)[0];
  if (firstEntry) {
    const [siteName, urlFn] = firstEntry;
    try {
      results = await tryScrapeSite(urlFn(citySlug, typeSlug), siteName);
    } catch { /* fallback */ }
  }

  return NextResponse.json({ results, urls, city, country });
}
