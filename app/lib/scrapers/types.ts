export interface ScrapedItem {
  source: "olx" | "imobiliare";
  externalId?: string;
  title: string;
  price?: number;
  currency?: string;
  locality: string;
  link: string;
  description?: string;
  areaM2?: number;
  propertyType: string;
  imageUrl?: string;
  publishedAt?: string;
  rooms?: number;
  floor?: number;
}
