import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/app/lib/prisma";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES_PER_LAND = 5;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const landId = formData.get("landId");

    // Validare date de intrare
    if (!(file instanceof File) || typeof landId !== "string" || !landId.trim()) {
      return NextResponse.json({ error: "Date lipsă sau invalide." }, { status: 400 });
    }

    // Validare tip fișier
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tip de fișier nepermis. Acceptăm: JPG, PNG, WEBP, GIF." },
        { status: 400 }
      );
    }

    // Validare dimensiune
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Fișierul depășește limita de 10MB." },
        { status: 400 }
      );
    }

    // Verificăm că terenul există și nu a atins limita de poze
    const land = await prisma.land.findUnique({ where: { id: landId } });
    if (!land) {
      return NextResponse.json({ error: "Terenul nu a fost găsit." }, { status: 404 });
    }

    // Dacă modelul are câmpul images ca array, verificăm limita
    // (ajustează după schema ta Prisma)
    // const existingImages = (land as Record<string, unknown>).images as string[] ?? [];
    // if (existingImages.length >= MAX_IMAGES_PER_LAND) {
    //   return NextResponse.json({ error: "Limita de 5 poze atinsă." }, { status: 400 });
    // }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generăm un nume sigur pentru fișier (fără caractere speciale)
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

    const uploadDir = path.join(process.cwd(), "public/uploads");
    const filePath = path.join(uploadDir, fileName);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    const dbPath = `/uploads/${fileName}`;

    await prisma.land.update({
      where: { id: landId },
      data: { imagePath: dbPath },
    });

    return NextResponse.json({ path: dbPath });
  } catch (err) {
    console.error("[upload] Eroare:", err);
    return NextResponse.json({ error: "Eroare internă la upload." }, { status: 500 });
  }
}
