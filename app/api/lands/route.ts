import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

// GET → listare terenuri
export async function GET() {
  const lands = await prisma.land.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(lands);
}

// POST → adaugă teren nou
export async function POST() {
  const land = await prisma.land.create({
    data: {
      title: "Teren test",
      locality: "Timișoara",
      link: "https://exemplu.ro",
      lat: 45.7489,
      lng: 21.2087,
      score: 5,
      negotiatedPrice: 120000,
      confirmed: false,
    },
  });

  return NextResponse.json(land);
}
