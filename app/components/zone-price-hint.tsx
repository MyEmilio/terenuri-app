"use client";

import { useEffect, useState } from "react";

interface ZoneStats {
  count: number;
  avgTotalPrice?: number | null;
  minTotalPrice?: number | null;
  maxTotalPrice?: number | null;
  avgPriceM2?: number | null;
  minPriceM2?: number | null;
  maxPriceM2?: number | null;
  withAreaCount?: number;
}

interface Props {
  locality: string;
  propertyType: string;
  areaM2?: number;
  onUseSuggested?: (price: number) => void;
}

function fmt(n: number) {
  return n.toLocaleString("ro-RO");
}

export default function ZonePriceHint({ locality, propertyType, areaM2, onUseSuggested }: Props) {
  const [stats, setStats] = useState<ZoneStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locality.trim() || locality.trim().length < 3) {
      setStats(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/zone-price?locality=${encodeURIComponent(locality)}&propertyType=${encodeURIComponent(propertyType)}`
        );
        const data = await res.json() as ZoneStats;
        setStats(data);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [locality, propertyType]);

  if (loading) {
    return (
      <div style={{ fontSize: 11, color: "#475569", padding: "6px 10px", background: "#0b0b0b", borderRadius: 7, border: "1px solid #1e293b" }}>
        ⏳ Se caută prețuri în zonă...
      </div>
    );
  }

  if (!stats || stats.count === 0) return null;

  const suggestedTotal = areaM2 && areaM2 > 0 && stats.avgPriceM2
    ? Math.round(stats.avgPriceM2 * areaM2)
    : stats.avgTotalPrice;

  return (
    <div style={{
      background: "#050d1a",
      border: "1px solid #1e3a5f",
      borderRadius: 8,
      padding: "10px 12px",
      fontSize: 12,
      display: "flex",
      flexDirection: "column",
      gap: 5,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 11, letterSpacing: 0.4 }}>
          💡 PREȚUL ZONEI — {stats.count} proprietăți similare
        </span>
        {onUseSuggested && suggestedTotal && (
          <button
            type="button"
            onClick={() => onUseSuggested(suggestedTotal)}
            style={{
              fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 6,
              border: "1px solid #1d4ed8", background: "#1e3a8a", color: "#93c5fd",
              cursor: "pointer",
            }}
          >
            ← Folosește
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {stats.avgPriceM2 && (
          <div>
            <div style={{ color: "#64748b", fontSize: 10 }}>Preț mediu / m²</div>
            <div style={{ color: "#e2e8f0", fontWeight: 700 }}>{fmt(stats.avgPriceM2)} €/m²</div>
            {stats.minPriceM2 && stats.maxPriceM2 && (
              <div style={{ color: "#475569", fontSize: 10 }}>
                {fmt(stats.minPriceM2)} – {fmt(stats.maxPriceM2)} €/m²
              </div>
            )}
          </div>
        )}

        {suggestedTotal && (
          <div>
            <div style={{ color: "#64748b", fontSize: 10 }}>
              {areaM2 && stats.avgPriceM2 ? `Estimat pentru ${areaM2} m²` : "Preț mediu total"}
            </div>
            <div style={{ color: "#4ade80", fontWeight: 700 }}>{fmt(suggestedTotal)} €</div>
            {stats.avgTotalPrice && stats.minTotalPrice && stats.maxTotalPrice && !areaM2 && (
              <div style={{ color: "#475569", fontSize: 10 }}>
                {fmt(stats.minTotalPrice)} – {fmt(stats.maxTotalPrice)} €
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ color: "#334155", fontSize: 10 }}>
        Calculat din {stats.withAreaCount ?? stats.count} proprietăți din baza de date locală
      </div>
    </div>
  );
}
