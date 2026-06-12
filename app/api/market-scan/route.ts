import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { scrapeAll } from "@/app/lib/scrapers/index";
import { geocodeLocality, scatterCoords } from "@/app/lib/geocode";
import type { ScrapeSource } from "@/app/lib/scrapers/index";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      locality?: string;
      propertyType?: string;
      sources?: string;
    };

    const locality = String(body.locality ?? "").trim();
    const propertyType = String(body.propertyType ?? "teren-intravilan");
    const sources = (body.sources ?? "all") as ScrapeSource;

    if (!locality) {
      return NextResponse.json({ error: "locality required" }, { status: 400 });
    }

    // 1. Geocodăm localitatea o singură dată
    const center = await geocodeLocality(locality);
    if (!center) {
      return NextResponse.json(
        { error: `Nu s-a putut geocoda "${locality}"` },
        { status: 422 }
      );
    }

    // 2. Scrape
    const { items, errors } = await scrapeAll(locality, propertyType, sources);

    // 3. Upsert fiecare listing (by link — skip dacă există deja)
    let imported = 0;
    let skipped = 0;

    for (const item of items) {
      // Coordonate deterministe bazate pe link/titlu
      const seed = item.link ?? item.title ?? String(Math.random());
      const coords = scatterCoords(center.lat, center.lng, seed, 2);

      const priceEur =
        item.price != null
          ? item.currency === "RON"
            ? Math.round(item.price / 4.97)
            : item.price
          : null;

      try {
        await prisma.marketListing.upsert({
          where: { link: item.link ?? `no-link-${seed}` },
          update: {
            price: priceEur ?? undefined,
            title: item.title,
            areaM2: item.areaM2 ?? undefined,
            imageUrl: item.imageUrl ?? undefined,
            scrapedAt: new Date(),
          },
          create: {
            source: item.source,
            externalId: item.externalId ?? null,
            title: item.title,
            price: priceEur ?? null,
            currency: "EUR",
            locality,
            lat: coords.lat,
            lng: coords.lng,
            link: item.link ?? null,
            description: item.description ?? null,
            areaM2: item.areaM2 ?? null,
            propertyType,
            imageUrl: item.imageUrl ?? null,
            rooms: item.rooms ?? null,
            floor: item.floor ?? null,
            publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
          },
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    // Stats agregat pentru localitate + tip
    const stats = await prisma.marketListing.aggregate({
      where: { locality: { contains: locality, mode: "insensitive" }, propertyType },
      _count: { id: true },
      _avg: { price: true, areaM2: true },
      _min: { price: true },
      _max: { price: true },
    });

    const withArea = await prisma.marketListing.findMany({
      where: {
        locality: { contains: locality, mode: "insensitive" },
        propertyType,
        price: { gt: 0 },
        areaM2: { gt: 0 },
      },
      select: { price: true, areaM2: true },
    });

    const ppm2s = withArea.map((l) => l.price! / l.areaM2!);
    const avgPriceM2 = ppm2s.length
      ? Math.round(ppm2s.reduce((a, b) => a + b, 0) / ppm2s.length)
      : null;

    return NextResponse.json({
      imported,
      skipped,
      errors,
      total: stats._count.id,
      avgPrice: stats._avg.price ? Math.round(stats._avg.price) : null,
      minPrice: stats._min.price ? Math.round(stats._min.price) : null,
      maxPrice: stats._max.price ? Math.round(stats._max.price) : null,
      avgPriceM2,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
