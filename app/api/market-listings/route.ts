import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locality = searchParams.get("locality")?.trim();
  const propertyType = searchParams.get("propertyType");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  const listings = await prisma.marketListing.findMany({
    where: {
      ...(locality ? { locality: { contains: locality, mode: "insensitive" } } : {}),
      ...(propertyType && propertyType !== "all" ? { propertyType } : {}),
      ...(minPrice ? { price: { gte: parseFloat(minPrice) } } : {}),
      ...(maxPrice ? { price: { lte: parseFloat(maxPrice) } } : {}),
    },
    orderBy: { scrapedAt: "desc" },
    take: 500,
    select: {
      id: true, source: true, title: true, price: true,
      locality: true, lat: true, lng: true, link: true,
      areaM2: true, propertyType: true, imageUrl: true,
      scrapedAt: true,
    },
  });

  return NextResponse.json(listings);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const locality = searchParams.get("locality")?.trim();
  const propertyType = searchParams.get("propertyType");

  const result = await prisma.marketListing.deleteMany({
    where: {
      ...(locality ? { locality: { contains: locality, mode: "insensitive" } } : {}),
      ...(propertyType && propertyType !== "all" ? { propertyType } : {}),
    },
  });

  return NextResponse.json({ deleted: result.count });
}
