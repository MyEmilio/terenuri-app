import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locality = searchParams.get("locality")?.trim() ?? "";
  const propertyType = searchParams.get("propertyType") ?? "teren-intravilan";

  if (!locality) {
    return NextResponse.json({ error: "locality required" }, { status: 400 });
  }

  const lands = await prisma.land.findMany({
    where: {
      locality: { contains: locality, mode: "insensitive" },
      propertyType,
      negotiatedPrice: { gt: 0 },
    },
    select: { negotiatedPrice: true, areaM2: true },
  });

  if (!lands.length) {
    return NextResponse.json({ count: 0 });
  }

  const withArea = lands.filter((l) => l.areaM2 && l.areaM2 > 0 && l.negotiatedPrice);
  const prices = lands.map((l) => l.negotiatedPrice!).filter(Boolean);
  const ppm2s = withArea.map((l) => l.negotiatedPrice! / l.areaM2!);

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const min = (arr: number[]) => arr.length ? Math.round(Math.min(...arr)) : null;
  const max = (arr: number[]) => arr.length ? Math.round(Math.max(...arr)) : null;

  return NextResponse.json({
    count: lands.length,
    avgTotalPrice: avg(prices),
    minTotalPrice: min(prices),
    maxTotalPrice: max(prices),
    avgPriceM2: avg(ppm2s),
    minPriceM2: min(ppm2s),
    maxPriceM2: max(ppm2s),
    withAreaCount: withArea.length,
  });
}
