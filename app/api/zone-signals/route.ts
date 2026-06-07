import { NextResponse } from "next/server";

type ZoneSignal = {
  id: string;
  category: string;
  title: string;
  description: string;
  count: number;
  impact: string;
};

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
    const data = (await res.json()) as { elements?: Array<{ tags?: { total?: string } }> };
    return parseInt(data.elements?.[0]?.tags?.total ?? "0", 10);
  } catch {
    return 0;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const neLat = parseFloat(searchParams.get("neLat") ?? "0");
  const neLng = parseFloat(searchParams.get("neLng") ?? "0");
  const swLat = parseFloat(searchParams.get("swLat") ?? "0");
  const swLng = parseFloat(searchParams.get("swLng") ?? "0");

  const bb = `${swLat},${swLng},${neLat},${neLng}`;
  const bbX = `${swLat - 0.12},${swLng - 0.12},${neLat + 0.12},${neLng + 0.12}`;

  const [construction, industrial, logistics, commercial, motorway, newRoad, railway] = await Promise.all([
    overpassCount(`way["landuse"="construction"](${bb});node["landuse"="construction"](${bb});way["building"="construction"](${bb});node["construction"="road"](${bb});`),
    overpassCount(`way["landuse"="industrial"](${bb});relation["landuse"="industrial"](${bb});`),
    overpassCount(`way["building"~"warehouse|industrial|manufacture"](${bb});node["building"~"warehouse|industrial|manufacture"](${bb});`),
    overpassCount(`node["shop"~"supermarket|mall|department_store|doityourself"](${bb});way["landuse"="commercial"](${bb});way["shop"~"supermarket|mall|department_store|doityourself"](${bb});`),
    overpassCount(`way["highway"~"motorway|trunk|motorway_link|trunk_link"](${bbX});`),
    overpassCount(`way["highway"="construction"](${bb});way["construction"="road"](${bb});`),
    overpassCount(`way["railway"~"rail|light_rail"](${bbX});`),
  ]);

  const signals: ZoneSignal[] = [];
  if (construction > 0) {
    signals.push({
      id: "construction",
      category: "Șantier",
      title: "Șantiere și construcții active",
      description: "Proiecte active sau terenuri în lucru detectate în zonă.",
      count: construction,
      impact: "Impact ridicat pentru investiții viitoare",
    });
  }
  if (industrial > 0) {
    signals.push({
      id: "industrial",
      category: "Industrial",
      title: "Zone industriale / depozite",
      description: "Activitate industrială și depozite / hale logisitice în vecinătate.",
      count: industrial,
      impact: "Creează potențial pentru terenuri logistice și industriale",
    });
  }
  if (logistics > 0) {
    signals.push({
      id: "logistics",
      category: "Logistică",
      title: "Hale, depozite și logistică",
      description: "Clădiri specifice logisticii și depozitării detectate în zonă.",
      count: logistics,
      impact: "Semnal bun pentru investiții în terenuri cu acces comercial",
    });
  }
  if (commercial > 0) {
    signals.push({
      id: "commercial",
      category: "Comercial",
      title: "Centre comerciale și retail",
      description: "Mall-uri, supermarketuri și zone comerciale în interiorul zonei.",
      count: commercial,
      impact: "Atragere trafic și uz comercial pentru terenuri de dezvoltare.",
    });
  }
  if (motorway > 0) {
    signals.push({
      id: "motorway",
      category: "Infrastructură",
      title: "Autostrăzi / drumuri rapide apropiate",
      description: "Acces rapid detectat pe drumuri majore din apropiere.",
      count: motorway,
      impact: "Susține creșterea valorii terenurilor pe termen mediu.",
    });
  }
  if (newRoad > 0) {
    signals.push({
      id: "new-road",
      category: "Drumuri noi",
      title: "Drumuri noi în construcție",
      description: "Drumuri și proiecte de infrastructură rutieră în zonă.",
      count: newRoad,
      impact: "Indicativ pentru dezvoltări viitoare și conectivitate sporită.",
    });
  }
  if (railway > 0) {
    signals.push({
      id: "railway",
      category: "Cale ferată",
      title: "Infrastructură feroviară apropiată",
      description: "Căi ferate active sau în extindere în apropiere.",
      count: railway,
      impact: "Valoare logistică crescută pentru terenuri industriale.",
    });
  }

  if (signals.length === 0) {
    signals.push({
      id: "no-signals",
      category: "Fără semnale",
      title: "Fără semnale de proiecte noi detectate",
      description: "Niciun indicator major din Overpass nu se regăsește direct în zona selectată.",
      count: 0,
      impact: "Poți căuta încă dinamic prin zone învecinate sau reseta zona.",
    });
  }

  return NextResponse.json({ signals });
}
