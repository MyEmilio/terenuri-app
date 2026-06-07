import { NextResponse } from "next/server";

type NewsItem = {
  title: string; link: string; pubDate: string; source: string; snippet: string;
};

// Cuvinte cheie per limbă pentru semnale de dezvoltare
const DEV_KEYWORDS: Record<string, string[]> = {
  ro: ["parc industrial", "fabrica", "supermarket", "autostrada", "investitie imobiliara", "urbanizare", "constructie", "mall"],
  de: ["Industriepark", "Fabrik", "Supermarkt", "Autobahn", "Immobilieninvestition", "Gewerbegebiet", "Neubau", "Einkaufszentrum"],
  fr: ["zone industrielle", "usine", "supermarché", "autoroute", "investissement immobilier", "urbanisation", "construction", "centre commercial"],
  it: ["zona industriale", "fabbrica", "supermercato", "autostrada", "investimento immobiliare", "urbanizzazione", "costruzione", "centro commerciale"],
  es: ["parque industrial", "fábrica", "supermercado", "autopista", "inversión inmobiliaria", "urbanización", "construcción", "centro comercial"],
  pt: ["parque industrial", "fábrica", "supermercado", "autoestrada", "investimento imobiliário", "urbanização", "construção", "centro comercial"],
  pl: ["park przemysłowy", "fabryka", "supermarket", "autostrada", "inwestycja nieruchomości", "urbanizacja", "budowa", "centrum handlowe"],
  hu: ["ipari park", "gyár", "szupermarket", "autópálya", "ingatlan befektetés", "bevásárlóközpont", "fejlesztés", "beruházás"],
  cs: ["průmyslový park", "továrna", "supermarket", "dálnice", "investice do nemovitostí", "urbanizace", "výstavba", "nákupní centrum"],
  nl: ["bedrijventerrein", "fabriek", "supermarkt", "snelweg", "vastgoedinvestering", "nieuwbouw", "winkelcentrum"],
  hr: ["industrijska zona", "tvornica", "supermarket", "autocesta", "nekretninska investicija", "gradnja", "trgovački centar"],
  el: ["βιομηχανική ζώνη", "εργοστάσιο", "σούπερ μάρκετ", "αυτοκινητόδρομος", "επένδυση ακινήτων"],
  bg: ["индустриален парк", "завод", "супермаркет", "магистрала", "инвестиции в имоти"],
  sk: ["priemyselný park", "továreň", "supermarket", "diaľnica", "investícia do nehnuteľností"],
  en: ["industrial park", "factory", "supermarket", "motorway", "real estate investment", "development", "construction", "shopping centre"],
};

const LANG_TO_GOOGLE: Record<string, { hl: string; gl: string; ceid: string }> = {
  ro: { hl: "ro", gl: "RO", ceid: "RO:ro" },
  de: { hl: "de", gl: "DE", ceid: "DE:de" },
  fr: { hl: "fr", gl: "FR", ceid: "FR:fr" },
  it: { hl: "it", gl: "IT", ceid: "IT:it" },
  es: { hl: "es", gl: "ES", ceid: "ES:es" },
  pt: { hl: "pt", gl: "PT", ceid: "PT:pt" },
  pl: { hl: "pl", gl: "PL", ceid: "PL:pl" },
  hu: { hl: "hu", gl: "HU", ceid: "HU:hu" },
  cs: { hl: "cs", gl: "CZ", ceid: "CZ:cs" },
  nl: { hl: "nl", gl: "NL", ceid: "NL:nl" },
  hr: { hl: "hr", gl: "HR", ceid: "HR:hr" },
  el: { hl: "el", gl: "GR", ceid: "GR:el" },
  bg: { hl: "bg", gl: "BG", ceid: "BG:bg" },
  sk: { hl: "sk", gl: "SK", ceid: "SK:sk" },
  en: { hl: "en", gl: "GB", ceid: "GB:en" },
};

function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  for (const item of itemMatches.slice(0, 12)) {
    const title = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ?? item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
    const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] ?? "";
    const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
    const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "Google News";
    const description = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ?? item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "";
    const cleanTitle = title.replace(/<[^>]*>/g, "").trim();
    if (cleanTitle.length > 3) {
      items.push({
        title: cleanTitle, link: link.trim(), pubDate: pubDate.trim(),
        source: source.trim(), snippet: description.replace(/<[^>]*>/g, "").trim().slice(0, 250),
      });
    }
  }
  return items;
}

async function getCityFromCoords(lat: number, lng: number): Promise<{ city: string; lang: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`;
    const res = await fetch(url, { headers: { "User-Agent": "terenuri-app/1.0" } });
    if (!res.ok) return { city: "city", lang: "ro" };
    const data = (await res.json()) as { address?: { city?: string; town?: string; village?: string; country_code?: string } };
    const addr = data.address ?? {};
    const city = addr.city ?? addr.town ?? addr.village ?? "city";

    // Mapare country_code -> limbă
    const countryToLang: Record<string, string> = {
      ro: "ro", de: "de", fr: "fr", it: "it", es: "es", pt: "pt",
      pl: "pl", hu: "hu", cz: "cs", nl: "nl", be: "fr", hr: "hr",
      gr: "el", bg: "bg", sk: "sk", gb: "en", ch: "de", at: "de",
    };
    const lang = countryToLang[addr.country_code ?? "ro"] ?? "en";
    return { city, lang };
  } catch {
    return { city: "city", lang: "ro" };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "45.75");
  const lng = parseFloat(searchParams.get("lng") ?? "21.22");
  const langOverride = searchParams.get("lang") ?? "";

  const { city, lang: detectedLang } = await getCityFromCoords(lat, lng);
  const lang = langOverride || detectedLang;

  const keywords = DEV_KEYWORDS[lang] ?? DEV_KEYWORDS["en"];
  const gNews = LANG_TO_GOOGLE[lang] ?? LANG_TO_GOOGLE["en"];

  // Primele 3 cuvinte cheie + numele orașului
  const query = keywords.slice(0, 3).map((kw) => `"${kw}" ${city}`).join(" OR ");
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${gNews.hl}&gl=${gNews.gl}&ceid=${gNews.ceid}`;

  try {
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return NextResponse.json({ items: [], city, lang });
    const xml = await res.text();
    const items = parseRSS(xml);

    // Filtrare articole relevante
    const allKeywords = (DEV_KEYWORDS[lang] ?? DEV_KEYWORDS["en"]).map((k) => k.toLowerCase());
    const filtered = items.filter((item) => {
      const text = (item.title + " " + item.snippet).toLowerCase();
      return allKeywords.some((kw) => text.includes(kw.toLowerCase()));
    });

    return NextResponse.json({ items: filtered.length > 0 ? filtered : items.slice(0, 5), city, lang });
  } catch (err) {
    return NextResponse.json({ items: [], city, lang, error: String(err) });
  }
}
