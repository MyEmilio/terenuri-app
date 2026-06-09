import { scrapeOlx } from "./olx";
import { scrapeImobiliare } from "./imobiliare";
import type { ScrapedItem } from "./types";

export type { ScrapedItem };

export type ScrapeSource = "olx" | "imobiliare" | "all";

export async function scrapeAll(
  locality: string,
  propertyType: string,
  sources: ScrapeSource = "all"
): Promise<{ items: ScrapedItem[]; errors: string[] }> {
  const tasks: Promise<ScrapedItem[]>[] = [];
  const labels: string[] = [];

  if (sources === "olx" || sources === "all") {
    tasks.push(scrapeOlx(locality, propertyType));
    labels.push("olx");
  }
  if (sources === "imobiliare" || sources === "all") {
    tasks.push(scrapeImobiliare(locality, propertyType));
    labels.push("imobiliare");
  }

  const settled = await Promise.allSettled(tasks);
  const items: ScrapedItem[] = [];
  const errors: string[] = [];

  settled.forEach((res, i) => {
    if (res.status === "fulfilled") {
      items.push(...res.value);
    } else {
      errors.push(`${labels[i]}: ${String(res.reason)}`);
    }
  });

  // Deduplică după link
  const seen = new Set<string>();
  return {
    items: items.filter((it) => {
      if (!it.link || seen.has(it.link)) return false;
      seen.add(it.link);
      return true;
    }),
    errors,
  };
}
