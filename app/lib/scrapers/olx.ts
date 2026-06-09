import type { ScrapedItem } from "./types";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8",
};

const TYPE_SLUGS: Record<string, string> = {
  "teren-agricol":    "terenuri",
  "teren-industrial": "terenuri",
  "teren-intravilan": "terenuri",
  "casa":             "case-de-vanzare",
  "apartament":       "apartamente",
  "spatiu-comercial": "spatii-comerciale-industriale",
};

function parseRss(xml: string, locality: string, propertyType: string): ScrapedItem[] {
  const items: ScrapedItem[] = [];

  // Extrage blocuri <item>
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(xml)) !== null && items.length < 20) {
    const block = itemMatch[1];

    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ?? block.match(/<title>(.*?)<\/title>/))?.[1]?.trim();
    const link = block.match(/<link>(.*?)<\/link>/)?.[1]?.trim();
    const desc = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ?? block.match(/<description>([\s\S]*?)<\/description>/))?.[1];
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    const img = block.match(/<enclosure[^>]+url="([^"]+)"/)?.[1] ??
                block.match(/<media:content[^>]+url="([^"]+)"/)?.[1];

    if (!title || !link) continue;

    // Extrage preț din titlu sau descriere
    const priceMatch = (title + " " + (desc ?? "")).match(/(\d[\d\s.]+)\s*(EUR|RON|€|lei)/i);
    const priceRaw = priceMatch ? parseFloat(priceMatch[1].replace(/[\s.]/g, "")) : undefined;
    const currency = priceMatch?.[2]?.toLowerCase().includes("ron") || priceMatch?.[2]?.toLowerCase().includes("lei") ? "RON" : "EUR";

    // Extrage suprafață
    const areaMatch = (title + " " + (desc ?? "")).match(/(\d+(?:[.,]\d+)?)\s*(?:mp|m²|metri\s*pătrați)/i);
    const areaM2 = areaMatch ? parseFloat(areaMatch[1].replace(",", ".")) : undefined;

    items.push({
      source: "olx",
      title: title.replace(/<[^>]*>/g, ""),
      price: priceRaw,
      currency,
      locality,
      link,
      description: desc?.replace(/<[^>]*>/g, "").slice(0, 300),
      areaM2,
      propertyType,
      imageUrl: img,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : undefined,
    });
  }

  return items;
}

function parseNextData(html: string, locality: string, propertyType: string): ScrapedItem[] {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return [];

  try {
    const json = JSON.parse(match[1]);
    const ads: Record<string, unknown>[] =
      json?.props?.pageProps?.ads ??
      json?.props?.pageProps?.data?.ads ??
      json?.props?.pageProps?.listing?.ads ??
      [];

    return ads.slice(0, 20).map((ad) => {
      const price = ad.price as { value?: number; currency?: string } | null;
      const location = ad.location as { cityName?: string } | null;
      const photos = ad.photos as { uri?: string }[] | null;
      const params = (ad.params as { key?: string; value?: { key?: string; label?: string } }[] | null) ?? [];

      const areaParam = params.find((p) => p.key === "floor_size" || p.key === "surface" || p.key === "area");
      const areaRaw = areaParam?.value?.key ?? areaParam?.value?.label;
      const areaM2 = areaRaw ? parseFloat(String(areaRaw).replace(/[^0-9.]/g, "")) : undefined;

      return {
        source: "olx",
        externalId: String(ad.id ?? ""),
        title: String(ad.title ?? "Proprietate"),
        price: price?.value ?? undefined,
        currency: price?.currency ?? "EUR",
        locality: location?.cityName ?? locality,
        link: `https://www.olx.ro${String(ad.url ?? "")}`,
        description: String(ad.description ?? "").slice(0, 300),
        areaM2: Number.isFinite(areaM2) ? areaM2 : undefined,
        propertyType,
        imageUrl: photos?.[0]?.uri,
      } as ScrapedItem;
    });
  } catch {
    return [];
  }
}

export async function scrapeOlx(locality: string, propertyType: string): Promise<ScrapedItem[]> {
  const slug = TYPE_SLUGS[propertyType] ?? "imobiliare";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);

  try {
    // Încearcă RSS mai întâi (cel mai fiabil)
    const rssUrl = `https://www.olx.ro/imobiliare/${slug}/?search[city_name]=${encodeURIComponent(locality)}&rss=1`;
    const rssRes = await fetch(rssUrl, { headers: HEADERS, signal: controller.signal });
    if (rssRes.ok) {
      const xml = await rssRes.text();
      if (xml.includes("<item>")) {
        const results = parseRss(xml, locality, propertyType);
        if (results.length > 0) return results;
      }
    }
  } catch { /* trece la fallback */ }

  try {
    // Fallback: HTML cu __NEXT_DATA__
    const slug2 = TYPE_SLUGS[propertyType] ?? "imobiliare";
    const htmlUrl = `https://www.olx.ro/imobiliare/${slug2}/?search[city_name]=${encodeURIComponent(locality)}`;
    const htmlRes = await fetch(htmlUrl, { headers: HEADERS, signal: controller.signal });
    if (htmlRes.ok) {
      const html = await htmlRes.text();
      return parseNextData(html, locality, propertyType);
    }
  } catch { /* eșuat */ }

  clearTimeout(timer);
  return [];
}
