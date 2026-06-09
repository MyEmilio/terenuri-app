import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const land = await prisma.land.findUnique({
      where: { id },
      include: { priceHistory: { orderBy: { recordedAt: "asc" } } },
    });
    if (!land) return NextResponse.json({ error: "Teren negăsit" }, { status: 404 });
    return NextResponse.json(land);
  } catch (error) {
    console.error("GET /api/lands/[id] error:", error);
    return NextResponse.json({ error: "Eroare la citirea terenului" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = String(body.title);
    if (body.locality !== undefined) data.locality = String(body.locality);
    if (body.link !== undefined) data.link = String(body.link);
    if (body.lat !== undefined) data.lat = Number(body.lat);
    if (body.lng !== undefined) data.lng = Number(body.lng);
    if (body.score !== undefined) data.score = Number(body.score);
    if (body.negotiatedPrice !== undefined) {
      const newPrice = body.negotiatedPrice ? Number(body.negotiatedPrice) : null;
      data.negotiatedPrice = newPrice;
      // Log price change if price actually changed
      if (newPrice) {
        const existing = await prisma.land.findUnique({ where: { id }, select: { negotiatedPrice: true } });
        if (existing && existing.negotiatedPrice !== newPrice) {
          await prisma.priceHistory.create({ data: { landId: id, price: newPrice, source: "manual" } });
        }
      }
    }
    if (body.confirmed !== undefined) data.confirmed = Boolean(body.confirmed);
    if (body.imagePath !== undefined) data.imagePath = body.imagePath || null;
    if (body.propertyType !== undefined) data.propertyType = String(body.propertyType);
    if (body.marketPrice !== undefined) data.marketPrice = body.marketPrice ? Number(body.marketPrice) : null;
    if (body.areaM2 !== undefined) data.areaM2 = body.areaM2 ? Number(body.areaM2) : null;
    if (body.rooms !== undefined) data.rooms = body.rooms ? Number(body.rooms) : null;
    if (body.floor !== undefined) data.floor = body.floor != null && body.floor !== "" ? Number(body.floor) : null;
    if (body.images !== undefined) data.images = Array.isArray(body.images) ? body.images : [];
    if (body.thumbnailIdx !== undefined) data.thumbnailIdx = Number(body.thumbnailIdx);

    const land = await prisma.land.update({ where: { id }, data });
    return NextResponse.json(land);
  } catch (error) {
    console.error("PATCH /api/lands/[id] error:", error);
    return NextResponse.json({ error: "Eroare la actualizarea terenului" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.land.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/lands/[id] error:", error);
    return NextResponse.json({ error: "Eroare la ștergerea terenului" }, { status: 500 });
  }
}
