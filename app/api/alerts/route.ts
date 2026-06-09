import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const alerts = await prisma.alert.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, locality: true, propertyType: true,
      maxTotalPrice: true, maxPriceM2: true,
      email: true, active: true, createdAt: true, lastCheckedAt: true,
      notifiedLinks: true,
    },
  });
  return NextResponse.json(alerts);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      locality?: string;
      propertyType?: string;
      maxTotalPrice?: number;
      maxPriceM2?: number;
      email?: string;
    };

    if (!body.locality?.trim() || !body.email?.trim()) {
      return NextResponse.json({ error: "locality și email sunt obligatorii" }, { status: 400 });
    }

    const alert = await prisma.alert.create({
      data: {
        locality: body.locality.trim(),
        propertyType: body.propertyType ?? "teren-intravilan",
        maxTotalPrice: body.maxTotalPrice ?? null,
        maxPriceM2: body.maxPriceM2 ?? null,
        email: body.email.trim(),
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
