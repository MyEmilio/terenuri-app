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
      },
    });

    return NextResponse.json(land);
  } catch (error) {
    console.error("POST /api/lands error:", error);
    return NextResponse.json({ error: "Eroare la salvarea terenului" }, { status: 500 });
  }
}