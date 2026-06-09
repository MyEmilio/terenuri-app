import type { ScrapedItem } from "./types";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ro-RO,ro;q=0.9",
};

const CATEGORY_SLUGS: Record<string, string> = {
  "teren-agricol":    "vanzare-terenuri",
  "teren-industrial": "vanzare-terenuri",
  "teren-intravilan": "vanzare-terenuri",
  "casa":             "vanzare-case",
  "apartament":       "vanzare-apartamente",
  "spatiu-comercial": "vanzare-spatii-comerciale",
};

interface JsonLdOffer {
  "@type"?: string;
  price?: string | number;
  priceCurrency?: string;
}

interface JsonLdItem {
  "@type"?: string;
  name?: string;
  description?: string;
  url?: string;
  offers?: JsonLdOffer | JsonLdOffer[];
  image?: string | string[];
  floorSize?: { value?: string | number; unitCode?: string };
  numberOfRooms?: string | number;
  address?: { addressLocality?: string };
  datePosted?: string;
  identifier?: string | { value?: string };
}

function parseJsonLd(html: string, locality: string, propertyType: string): ScrapedItem[] {
  const scripts = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
  const results: ScrapedItem[] = [];

  for (const m of scripts) {
    try {
      const raw = JSON.parse(m[1]);
      const items: JsonLdItem[] = Array.isArray(raw)
        ? raw
        : raw?.["@graph"] ?? (raw?.["@type"] ? [raw] : []);

      for (const item of items) {
        if (!item?.name) continue;
        const t = item["@type"] ?? "";
        if (!String(t).match(/product|realestate|offer|apartment|house|land/i)) continue;

        const offerRaw = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        const priceStr = String(offerRaw?.price ?? "").replace(/[^\d.]/g, "");
        const price = priceStr ? parseFloat(priceStr) : undefined;
        const currency = offerRaw?.priceCurrency ?? "EUR";

        const floorVal = item.floorSize?.value;
        const areaM2 = floorVal ? parseFloat(String(floorVal)) : undefined;

        const imgs = Array.isArray(item.image) ? item.image : (item.image ? [item.image] : []);
        const extId = typeof item.identifier === "string" ? item.identifier : item.identifier?.value;

        results.push({
          source: "imobiliare",
          externalId: extId ?? undefined,
          title: item.name,
          price: Number.isFinite(price) ? price : undefined,
          currency,
          locality: item.address?.addressLocality ?? locality,
          link: item.url ?? "",
          description: item.description?.slice(0, 300),
          areaM2: Number.isFinite(areaM2) ? areaM2 : undefined,
          rooms: item.numberOfRooms ? parseInt(String(item.numberOfRooms)) : undefined,
          propertyType,
          imageUrl: imgs[0],
          publishedAt: item.datePosted,
        });

        if (results.length >= 20) return results;
      }
    } catch { /* skip bad JSON-LD */ }
  }

  return results;
}

function parseHtmlCards(html: string, locality: string, propertyType: string): ScrapedItem[] {
  const results: ScrapedItem[] = [];

  // Caută carduri de anunț prin class imobiliare
  const cardRegex = /<article[^>]*class="[^"]*card[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
  let match;

  while ((match = cardRegex.exec(html)) !== null && results.length < 20) {
    const block = match[1];

    const titleMatch = block.match(/<[^>]+class="[^"]*title[^"]*"[^>]*>([^<]+)</i) ??
                       block.match(/<h[1-6][^>]*>([^<]+)</);
    const title = titleMatch?.[1]?.trim();
    if (!title || title.length < 5) continue;

    const linkMatch = block.match(/href="(https?:\/\/[^"]*imobiliare[^"]+)"/);
    const link = linkMatch?.[1] ?? "";

    const priceMatch = block.match(/(\d[\d\s.]+)\s*(?:EUR|€|RON|lei)/i);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/[\s.]/g, "")) : undefined;
    const currency = priceMatch?.[0]?.toLowerCase().includes("ron") || priceMatch?.[0]?.toLowerCase().includes("lei") ? "RON" : "EUR";

    const areaMatch = block.match(/(\d+(?:[.,]\d+)?)\s*(?:mp|m²)/i);
    const areaM2 = areaMatch ? parseFloat(areaMatch[1].replace(",", ".")) : undefined;

    const imgMatch = block.match(/src="([^"]*(?:imgimobiliare|img\.imobiliare)[^"]+)"/);

    results.push({
      source: "imobiliare",
      title,
      price,
      currency,
      locality,
      link,
      areaM2: Number.isFinite(areaM2) ? areaM2 : undefined,
      propertyType,
      imageUrl: imgMatch?.[1],
    });
  }

  return results;
}

export async function scrapeImobiliare(locality: string, propertyType: string): Promise<ScrapedItem[]> {
  const category = CATEGORY_SLUGS[propertyType] ?? "vanzare-terenuri";
  const localitySlug = locality.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const url = `https://www.imobiliare.ro/${category}/${localitySlug}/`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);

  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return [];
    const html = await res.text();

    // Încearcă JSON-LD mai întâi
    const jsonLd = parseJsonLd(html, locality, propertyType);
    if (jsonLd.length > 0) return jsonLd;

    // Fallback: parsare HTML
    return parseHtmlCards(html, locality, propertyType);
  } catch {
    clearTimeout(timer);
    return [];
  }
}
