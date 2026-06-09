import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { scrapeAll } from "@/app/lib/scrapers/index";
import { sendAlertEmail } from "@/app/lib/email";
import type { ScrapedItem } from "@/app/lib/scrapers/types";

const PROP_TYPE_LABELS: Record<string, string> = {
  "teren-agricol":    "Teren agricol",
  "teren-industrial": "Teren industrial",
  "teren-intravilan": "Teren intravilan",
  "casa":             "Casă",
  "apartament":       "Apartament",
  "spatiu-comercial": "Spațiu comercial",
};

export async function POST(request: Request) {
  // Protecție cu secret pentru a preveni abuzul
  const secret = request.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await prisma.alert.findMany({ where: { active: true } });
  if (!alerts.length) {
    return NextResponse.json({ message: "Nicio alertă activă", processed: 0 });
  }

  const results: { alertId: string; locality: string; newMatches: number; emailSent: boolean }[] = [];

  for (const alert of alerts) {
    try {
      const { items } = await scrapeAll(alert.locality, alert.propertyType, "all");

      // Filtrează după criterii alertă
      const matching = items.filter((it) => {
        const priceEur = it.price != null
          ? (it.currency === "RON" ? Math.round(it.price / 4.97) : it.price)
          : null;

        if (alert.maxTotalPrice && priceEur && priceEur > alert.maxTotalPrice) return false;
        if (alert.maxPriceM2 && priceEur && it.areaM2 && (priceEur / it.areaM2) > alert.maxPriceM2) return false;
        return true;
      });

      // Filtrează doar cele noi (nu au fost notificate deja)
      const newItems: ScrapedItem[] = matching.filter(
        (it) => it.link && !alert.notifiedLinks.includes(it.link)
      );

      let emailSent = false;
      if (newItems.length > 0) {
        await sendAlertEmail(
          alert.email,
          alert.locality,
          PROP_TYPE_LABELS[alert.propertyType] ?? alert.propertyType,
          newItems
        );
        emailSent = true;

        // Marchează ca notificate
        await prisma.alert.update({
          where: { id: alert.id },
          data: {
            notifiedLinks: {
              push: newItems.map((it) => it.link).filter(Boolean) as string[],
            },
            lastCheckedAt: new Date(),
          },
        });
      } else {
        await prisma.alert.update({
          where: { id: alert.id },
          data: { lastCheckedAt: new Date() },
        });
      }

      results.push({ alertId: alert.id, locality: alert.locality, newMatches: newItems.length, emailSent });
    } catch (err) {
      results.push({ alertId: alert.id, locality: alert.locality, newMatches: 0, emailSent: false });
      console.error(`[cron] Alert ${alert.id} failed:`, err);
    }
  }

  const totalNew = results.reduce((s, r) => s + r.newMatches, 0);
  return NextResponse.json({ processed: alerts.length, totalNewMatches: totalNew, results });
}

// Permite și GET pentru trigger manual din browser (fără secret în dev)
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Use POST in production" }, { status: 405 });
  }
  return POST(request);
}
