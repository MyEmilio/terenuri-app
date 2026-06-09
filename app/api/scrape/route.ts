import { NextResponse } from "next/server";
import { scrapeAll } from "@/app/lib/scrapers/index";
import type { ScrapeSource } from "@/app/lib/scrapers/index";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { locality?: string; propertyType?: string; sources?: string };
    const locality = String(body.locality ?? "").trim();
    const propertyType = String(body.propertyType ?? "teren-intravilan").trim();
    const sources = (body.sources ?? "all") as ScrapeSource;

    if (!locality) {
      return NextResponse.json({ error: "locality required" }, { status: 400 });
    }

    const { items, errors } = await scrapeAll(locality, propertyType, sources);

    return NextResponse.json({ items, errors, total: items.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
