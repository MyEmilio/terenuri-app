import { prisma } from "@/app/lib/prisma";
import { computeAiScore } from "@/app/lib/ai-score";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const land = await prisma.land.findUnique({ where: { id } });
    if (!land) return NextResponse.json({ error: "Teren negăsit" }, { status: 404 });

    const result = await computeAiScore({
      lat: land.lat,
      lng: land.lng,
      propertyType: land.propertyType,
      negotiatedPrice: land.negotiatedPrice,
      marketPrice: land.marketPrice,
      areaM2: land.areaM2,
      confirmed: land.confirmed,
      userScore: land.score,
    });

    await prisma.land.update({
      where: { id },
      data: {
        aiScore: result.total,
        aiScoreData: result as object,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/lands/[id]/score error:", error);
    return NextResponse.json({ error: "Eroare la calculul scorului AI" }, { status: 500 });
  }
}
