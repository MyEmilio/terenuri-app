export type ScoreFactor = {
  key: string;
  label: string;
  icon: string;
  score: number;
  max: number;
  details: string;
};

export type AiScoreResult = {
  total: number;
  label: "RIDICAT" | "MEDIU" | "SCĂZUT";
  factors: ScoreFactor[];
};

async function overpassCount(query: string): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: controller.signal,
    });
    if (!res.ok) return 0;
    const data = await res.json() as { elements?: { type?: string; tags?: { total?: string } }[] };
    const countEl = data.elements?.find((e) => e.type === "count");
    if (countEl?.tags?.total) return Number(countEl.tags.total);
    return data.elements?.length ?? 0;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

// ====== FACTORI ======

async function factorServices(lat: number, lng: number): Promise<ScoreFactor> {
  const q = `[out:json][timeout:9];(node["amenity"~"school|hospital|pharmacy|supermarket|bank|clinic|kindergarten"](around:1000,${lat},${lng}););out count;`;
  const count = await overpassCount(q);
  const score = Math.min(20, count * 2);
  return { key: "services", label: "Servicii în 1km", icon: "🏪", score, max: 20, details: `${count} amenajări găsite (școli, spitale, farmacii, bănci)` };
}

async function factorTransport(lat: number, lng: number): Promise<ScoreFactor> {
  const q = `[out:json][timeout:9];(node["highway"="bus_stop"](around:500,${lat},${lng});node["railway"~"station|halt|tram_stop|subway_entrance"](around:500,${lat},${lng}););out count;`;
  const count = await overpassCount(q);
  const score = Math.min(15, count * 3);
  return { key: "transport", label: "Transport în 500m", icon: "🚌", score, max: 15, details: `${count} stații transport în apropiere` };
}

async function factorRoads(lat: number, lng: number): Promise<ScoreFactor> {
  const q = `[out:json][timeout:9];(way["highway"~"^(primary|secondary|trunk|motorway)$"](around:2000,${lat},${lng}););out count;`;
  const count = await overpassCount(q);
  const score = Math.min(10, count * 2);
  return { key: "roads", label: "Infrastructură rutieră", icon: "🛣️", score, max: 10, details: `${count} drumuri principale în 2km` };
}

async function factorDevelopment(lat: number, lng: number): Promise<ScoreFactor> {
  const q = `[out:json][timeout:9];(way["landuse"~"^(construction|residential|commercial|industrial)$"](around:1500,${lat},${lng});node["building"~"."](around:1000,${lat},${lng}););out count;`;
  const count = await overpassCount(q);
  const score = Math.min(10, Math.ceil(count / 3));
  return { key: "development", label: "Activitate construcții", icon: "🏗️", score, max: 10, details: `${count} zone active în 1.5km (rezidențial, comercial, industrie)` };
}

function factorDiscount(negotiatedPrice?: number | null, marketPrice?: number | null): ScoreFactor {
  if (marketPrice && negotiatedPrice && marketPrice > 0 && negotiatedPrice > 0 && negotiatedPrice < marketPrice) {
    const pct = (marketPrice - negotiatedPrice) / marketPrice;
    const score = Math.min(20, Math.round(pct * 50));
    const pctDisplay = Math.round(pct * 100);
    return { key: "discount", label: "Discount față de piață", icon: "💸", score, max: 20, details: `${pctDisplay}% sub prețul pieței (${negotiatedPrice.toLocaleString("ro-RO")} vs ${marketPrice.toLocaleString("ro-RO")} €)` };
  }
  if (!marketPrice) return { key: "discount", label: "Discount față de piață", icon: "💸", score: 0, max: 20, details: "Preț piață necompletat — adaugă-l pentru punctaj maxim" };
  return { key: "discount", label: "Discount față de piață", icon: "💸", score: 0, max: 20, details: "Prețul negociat e egal sau mai mare decât piața" };
}

function factorPpm2(negotiatedPrice?: number | null, areaM2?: number | null): ScoreFactor {
  if (areaM2 && areaM2 > 0 && negotiatedPrice && negotiatedPrice > 0) {
    const ppm2 = negotiatedPrice / areaM2;
    // <50 €/m² = 15p, 500 = 10p, 2000 = 5p, >3000 = 0p
    const score = Math.max(0, Math.min(15, Math.round(15 - ppm2 / 200)));
    return { key: "ppm2", label: "Eficiență preț/m²", icon: "📐", score, max: 15, details: `${Math.round(ppm2).toLocaleString("ro-RO")} €/m² (suprafață ${areaM2.toLocaleString("ro-RO")} m²)` };
  }
  return { key: "ppm2", label: "Eficiență preț/m²", icon: "📐", score: 0, max: 15, details: "Completează suprafața și prețul pentru calcul" };
}

function factorConfirmed(confirmed: boolean): ScoreFactor {
  return {
    key: "confirmed", label: "Locație verificată pe teren", icon: "✅",
    score: confirmed ? 5 : 0, max: 5,
    details: confirmed ? "Locația a fost verificată și confirmată manual" : "Locația nu a fost confirmată — trage pinul și apasă Confirmă",
  };
}

function factorUserScore(userScore: number): ScoreFactor {
  const score = Math.round((Math.min(100, Math.max(0, userScore)) / 100) * 5);
  return {
    key: "user", label: "Evaluare personală", icon: "⭐",
    score, max: 5,
    details: `Scor manual setat: ${userScore}/100`,
  };
}

// ====== MOTOR PRINCIPAL ======
export async function computeAiScore(params: {
  lat: number;
  lng: number;
  propertyType: string;
  negotiatedPrice?: number | null;
  marketPrice?: number | null;
  areaM2?: number | null;
  confirmed: boolean;
  userScore: number;
}): Promise<AiScoreResult> {
  const { lat, lng, negotiatedPrice, marketPrice, areaM2, confirmed, userScore } = params;

  // Factori 1-4 necesită OSM — rulăm în paralel
  const [f1, f2, f3, f4] = await Promise.all([
    factorServices(lat, lng),
    factorTransport(lat, lng),
    factorRoads(lat, lng),
    factorDevelopment(lat, lng),
  ]);

  // Factori 5-8 calculați local
  const f5 = factorDiscount(negotiatedPrice, marketPrice);
  const f6 = factorPpm2(negotiatedPrice, areaM2);
  const f7 = factorConfirmed(confirmed);
  const f8 = factorUserScore(userScore);

  const factors = [f1, f2, f3, f4, f5, f6, f7, f8];
  const total = factors.reduce((sum, f) => sum + f.score, 0);
  const label: AiScoreResult["label"] = total >= 65 ? "RIDICAT" : total >= 35 ? "MEDIU" : "SCĂZUT";

  return { total, label, factors };
}
