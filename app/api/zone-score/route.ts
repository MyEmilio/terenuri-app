import { NextResponse } from "next/server";

export type ScoreFactor = {
  label: string;
  score: number;
  max: number;
  details: string[];
  icon: string;
};

export type ZoneScoreResult = {
  total: number;
  label: "RIDICAT" | "MEDIU" | "SCĂZUT";
  factors: ScoreFactor[];
  highlights: string[];
  city: string;
};

// ── Overpass API helper ──────────────────────────────────────────────
async function overpassCount(query: string): Promise<number> {
  const full = `[out:json][timeout:25];(${query});out count;`;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(full)}`,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return 0;
    const data = await res.json() as {
      elements?: Array<{ tags?: { total?: string } }>;
    };
    return parseInt(data.elements?.[0]?.tags?.total ?? "0", 10);
  } catch {
    return 0;
  }
}

// ── Reverse geocoding ────────────────────────────────────────────────
async function getCityName(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=ro`;
    const res = await fetch(url, {
      headers: { "User-Agent": "terenuri-app/1.0" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return "";
    const data = await res.json() as {
      address?: { city?: string; town?: string; village?: string; county?: string };
    };
    const a = data.address ?? {};
    return a.city ?? a.town ?? a.village ?? a.county ?? "";
  } catch {
    return "";
  }
}

// ── News scoring (0-25 pts) ──────────────────────────────────────────
async function getNewsScore(city: string): Promise<{
  score: number;
  details: string[];
  highlights: string[];
}> {
  if (!city) return { score: 0, details: [], highlights: [] };

  const HIGH = ["autostrada", "fabrica", "amazon", "dedean", "lidl", "kaufland",
    "parc logistic", "parc industrial", "zona industriala", "investitie", "logistics",
    "warehouse", "factory", "motorway", "industrial park", "centru comercial", "mall"];
  const MED  = ["constructie", "development", "urbanizare", "supermarket", "hala",
    "depozit", "construction", "shopping", "industrial zone", "PUZ", "PUG"];
  const LOW  = ["renovare", "autorizatie", "spatiu comercial", "building permit", "urbanization"];

  const q = `"${city}" (autostrada OR fabrica OR "parc industrial" OR constructie OR investitie OR industrial OR logistic OR mall)`;
  const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ro&gl=RO&ceid=RO:ro`;

  try {
    const res = await fetch(rss, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return { score: 0, details: [], highlights: [] };
    const xml = await res.text();

    const titles: string[] = [];
    for (const item of (xml.match(/<item>([\s\S]*?)<\/item>/g) ?? []).slice(0, 15)) {
      const t = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]
             ?? item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
      if (t) titles.push(t.replace(/<[^>]*>/g, "").toLowerCase());
    }

    let score = 0;
    const details: string[] = [];
    const highlights: string[] = [];

    for (const title of titles) {
      let pts = 0;
      let kw = "";
      for (const k of HIGH) { if (title.includes(k)) { pts = Math.max(pts, 8); kw = kw || k; } }
      for (const k of MED)  { if (title.includes(k)) { pts = Math.max(pts, 5); kw = kw || k; } }
      for (const k of LOW)  { if (title.includes(k)) { pts = Math.max(pts, 2); kw = kw || k; } }
      if (pts > 0) {
        score += pts;
        details.push(`+${pts} (${kw})`);
        if (highlights.length < 3) highlights.push(title.slice(0, 90));
      }
    }
    return { score: Math.min(25, score), details: details.slice(0, 5), highlights };
  } catch {
    return { score: 0, details: [], highlights: [] };
  }
}

// ── MAIN handler ─────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const neLat = parseFloat(searchParams.get("neLat") ?? "0");
  const neLng = parseFloat(searchParams.get("neLng") ?? "0");
  const swLat = parseFloat(searchParams.get("swLat") ?? "0");
  const swLng = parseFloat(searchParams.get("swLng") ?? "0");

  const cLat = (neLat + swLat) / 2;
  const cLng = (neLng + swLng) / 2;

  // bbox Overpass: south,west,north,east
  const bb  = `${swLat},${swLng},${neLat},${neLng}`;
  // bbox extins +0.12° pentru infrastructură (drumuri/CF pot fi imediat în afara zonei)
  const bbX = `${swLat - 0.12},${swLng - 0.12},${neLat + 0.12},${neLng + 0.12}`;

  const [city, construction, industrial, warehouse, commercial,
         motorway, primaryRoad, railway, newsRes] = await Promise.all([
    getCityName(cLat, cLng),
    overpassCount(`way["landuse"="construction"](${bb});node["landuse"="construction"](${bb});`),
    overpassCount(`way["landuse"="industrial"](${bb});relation["landuse"="industrial"](${bb});`),
    overpassCount(`way["building"~"warehouse|industrial|manufacture"](${bb});`),
    overpassCount(`node["shop"~"supermarket|mall|department_store|doityourself"](${bb});way["landuse"="commercial"](${bb});way["shop"~"supermarket|mall"](${bb});`),
    overpassCount(`way["highway"~"motorway|trunk|motorway_link|trunk_link"](${bbX});`),
    overpassCount(`way["highway"~"primary|secondary"](${bb});`),
    overpassCount(`way["railway"~"rail|light_rail"](${bbX});`),
    (async () => ({ score: 0, details: [] as string[], highlights: [] as string[] }))(), // placeholder, filled below
  ]);

  // News separat (nevoie de city)
  const newsResult = await getNewsScore(city);

  // ── Factor 1: Semnale media (0-25) ──────────────────────────────
  const newsScore = newsResult.score;

  // ── Factor 2: Construcții & industrie (0-35) ────────────────────
  const constPts  = Math.min(20, construction * 7);
  const industPts = Math.min(15, industrial * 4 + warehouse * 3);
  const buildScore = Math.min(35, constPts + industPts);
  const buildDetails: string[] = [];
  if (construction > 0) buildDetails.push(`${construction} șantier(e) activ(e) detectat(e)`);
  if (industrial  > 0) buildDetails.push(`${industrial} zonă(e) industrială(e)`);
  if (warehouse   > 0) buildDetails.push(`${warehouse} depozit(e) / hală(e)`);
  if (buildDetails.length === 0) buildDetails.push("Nicio activitate de construcție detectată");

  // ── Factor 3: Infrastructură (0-25) ────────────────────────────
  const motorwayPts = motorway     > 0 ? 15 : 0;
  const primaryPts  = primaryRoad  > 0 ?  5 : 0;
  const railPts     = railway      > 0 ?  5 : 0;
  const infraScore  = Math.min(25, motorwayPts + primaryPts + railPts);
  const infraDetails: string[] = [];
  if (motorway    > 0) infraDetails.push("Autostradă / drum rapid în apropiere");
  if (primaryRoad > 0) infraDetails.push("Drum național / județean în zonă");
  if (railway     > 0) infraDetails.push("Cale ferată în apropiere");
  if (infraDetails.length === 0) infraDetails.push("Fără infrastructură majoră detectată");

  // ── Factor 4: Activitate comercială (0-15) ─────────────────────
  const commScore   = Math.min(15, commercial * 3);
  const commDetails = commercial > 0
    ? [`${commercial} unitate(ăți) comerciale detectate`]
    : ["Fără activitate comercială majoră detectată"];

  // ── Total ──────────────────────────────────────────────────────
  const total = Math.min(100, Math.round(newsScore + buildScore + infraScore + commScore));
  const label: "RIDICAT" | "MEDIU" | "SCĂZUT" =
    total >= 65 ? "RIDICAT" : total >= 35 ? "MEDIU" : "SCĂZUT";

  const factors: ScoreFactor[] = [
    { label: "Semnale media",        score: newsScore,  max: 25, details: newsResult.details.length ? newsResult.details : ["Niciun articol relevant găsit"], icon: "📰" },
    { label: "Construcții & industrie", score: buildScore, max: 35, details: buildDetails, icon: "🏗️" },
    { label: "Infrastructură",       score: infraScore, max: 25, details: infraDetails, icon: "🛣️" },
    { label: "Activitate comercială",score: commScore,  max: 15, details: commDetails,  icon: "🏪" },
  ];

  const highlights = [
    ...newsResult.highlights.slice(0, 2),
    ...infraDetails.filter(d => !d.includes("Fără")).slice(0, 1),
    ...buildDetails.filter(d => !d.includes("Nicio")).slice(0, 1),
  ].filter(Boolean).slice(0, 4);

  return NextResponse.json({ total, label, factors, highlights, city } as ZoneScoreResult);
}
