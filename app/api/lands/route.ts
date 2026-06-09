import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const lands = await prisma.land.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(lands);
  } catch (error) {
    console.error("GET /api/lands error:", error);
    return NextResponse.json({ error: "Eroare la citirea terenurilor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const land = await prisma.land.create({
      data: {
        title: body.title || "",
        locality: body.locality || "",
        link: body.link || "",
        lat: Number(body.lat),
        lng: Number(body.lng),
        score: Number(body.score || 0),
        negotiatedPrice: body.negotiatedPrice ? Number(body.negotiatedPrice) : null,
        confirmed: Boolean(body.confirmed || false),
        imagePath: body.imagePath || null,
        propertyType: body.propertyType || "teren-intravilan",
        marketPrice: body.marketPrice ? Number(body.marketPrice) : null,
        areaM2: body.areaM2 ? Number(body.areaM2) : null,
        rooms: body.rooms ? Number(body.rooms) : null,
        floor: body.floor != null && body.floor !== "" ? Number(body.floor) : null,
        images: Array.isArray(body.images) ? body.images : [],
        thumbnailIdx: Number(body.thumbnailIdx || 0),
      },
    });

    return NextResponse.json(land);
  } catch (error) {
    console.error("POST /api/lands error:", error);
    return NextResponse.json({ error: "Eroare la salvarea terenului" }, { status: 500 });
  }
}