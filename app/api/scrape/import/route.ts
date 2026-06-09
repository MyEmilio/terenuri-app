import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import type { ScrapedItem } from "@/app/lib/scrapers/types";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function geocode(locality: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locality + ", Romania")}&format=json&limit=1&countrycodes=ro`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "terenuri-app/1.0 (limeuragod@yahoo.com)" },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json() as NominatimResult[];
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const item = await request.json() as ScrapedItem;

    if (!item.title || !item.locality) {
      return NextResponse.json({ error: "title and locality are required" }, { status: 400 });
    }

    // Geocodare Nominatim dacă nu avem coordonate
    const coords = await geocode(item.locality);
    if (!coords) {
      return NextResponse.json({ error: `Nu s-au putut geocoda coordonatele pentru "${item.locality}"` }, { status: 422 });
    }

    // Verifică dacă există deja (după link)
    if (item.link) {
      const existing = await prisma.land.findFirst({ where: { link: item.link } });
      if (existing) {
        return NextResponse.json({ error: "Proprietatea există deja în baza de date", id: existing.id }, { status: 409 });
      }
    }

    const priceEur = item.price != null
      ? (item.currency === "RON" ? Math.round(item.price / 4.97) : item.price)
      : null;

    const land = await prisma.land.create({
      data: {
        title: item.title,
        locality: item.locality,
        link: item.link || null,
        lat: coords.lat,
        lng: coords.lng,
        score: 50,
        negotiatedPrice: priceEur ?? null,
        propertyType: item.propertyType ?? "teren-intravilan",
        areaM2: item.areaM2 ?? null,
        rooms: item.rooms ?? null,
        floor: item.floor ?? null,
        images: item.imageUrl ? [item.imageUrl] : [],
        thumbnailIdx: 0,
      },
    });

    // Log initial price in history
    if (priceEur) {
      await prisma.priceHistory.create({
        data: { landId: land.id, price: priceEur, source: item.source },
      });
    }

    return NextResponse.json({ success: true, id: land.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
