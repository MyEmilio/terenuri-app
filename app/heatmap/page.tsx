"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { ColorMode, HeatLand } from "./heatmap-map";

const HeatmapMap = dynamic(() => import("./heatmap-map"), { ssr: false });

type PropertyType = "teren-agricol" | "teren-industrial" | "teren-intravilan" | "casa" | "apartament" | "spatiu-comercial";

const PROP_CONFIGS: Record<string, { label: string; icon: string; color: string }> = {
  "teren-agricol":    { label: "Teren agricol",    icon: "🌾", color: "#16a34a" },
  "teren-industrial": { label: "Teren industrial", icon: "🏭", color: "#ea580c" },
  "teren-intravilan": { label: "Teren intravilan", icon: "📐", color: "#2b6cb0" },
  "casa":             { label: "Casă",             icon: "🏡", color: "#dc2626" },
  "apartament":       { label: "Apartament",       icon: "🏢", color: "#7c3aed" },
  "spatiu-comercial": { label: "Spațiu comercial", icon: "🏪", color: "#ca8a04" },
};

function computeRentability(land: { score: number; negotiatedPrice: number | null; marketPrice: number | null; areaM2: number | null; confirmed: boolean }): number {
  let score = land.score * 0.4;
  if (land.marketPrice && land.negotiatedPrice && land.marketPrice > 0 && land.negotiatedPrice > 0) {
    const discount = (land.marketPrice - land.negotiatedPrice) / land.marketPrice;
    score += Math.min(30, Math.max(0, discount * 60));
  }
  if (land.areaM2 && land.areaM2 > 0 && land.negotiatedPrice && land.negotiatedPrice > 0) {
    score += Math.max(0, Math.min(20, 20 - land.negotiatedPrice / land.areaM2 / 100));
  }
  if (land.confirmed) score += 10;
  return Math.min(100, Math.max(0, Math.round(score)));
}

const MODES: { key: ColorMode; label: string; desc: string }[] = [
  { key: "aiScore",      label: "🤖 Scor AI",        desc: "Colorat după scorul calculat de motorul AI (8 factori)" },
  { key: "rentability",  label: "📈 Rentabilitate",   desc: "Colorat după indicele de rentabilitate al investiției" },
  { key: "userScore",    label: "⭐ Scor utilizator", desc: "Colorat după scorul setat manual" },
  { key: "price",        label: "💰 Preț",            desc: "Dimensionat după preț, verde = mai ieftin" },
];

const btn = { padding: "7px 12px", borderRadius: 8, border: "1px solid #333", background: "#0b0b0b", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 } as const;

export default function HeatmapPage() {
  const [rawLands, setRawLands] = useState<(HeatLand & { marketPrice: number | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ColorMode>("rentability");
  const [typeFilter, setTypeFilter] = useState<PropertyType | "all">("all");
  const [onlyWithAi, setOnlyWithAi] = useState(false);
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);

  useEffect(() => {
    fetch("/api/lands")
      .then((r) => r.json())
      .then((data: Array<{
        id: string; title: string; locality: string; lat: number; lng: number;
        negotiatedPrice: number | null; marketPrice: number | null; areaM2: number | null;
        score: number; aiScore: number | null; propertyType: string; confirmed: boolean;
        images: string[]; thumbnailIdx: number;
      }>) => {
        setRawLands(data.map((l) => ({
          id: l.id, dbId: l.id, title: l.title, locality: l.locality,
          lat: l.lat, lng: l.lng, negotiatedPrice: l.negotiatedPrice,
          areaM2: l.areaM2, marketPrice: l.marketPrice,
          score: l.score, aiScore: l.aiScore,
          rentability: computeRentability({ score: l.score, negotiatedPrice: l.negotiatedPrice, marketPrice: l.marketPrice, areaM2: l.areaM2, confirmed: l.confirmed }),
          propertyType: l.propertyType, confirmed: l.confirmed,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const lands = useMemo(() => rawLands.filter((l) => {
    if (typeFilter !== "all" && l.propertyType !== typeFilter) return false;
    if (onlyWithAi && l.aiScore == null) return false;
    if (onlyConfirmed && !l.confirmed) return false;
    return true;
  }), [rawLands, typeFilter, onlyWithAi, onlyConfirmed]);

  const stats = useMemo(() => {
    if (!lands.length) return null;
    const withAi = lands.filter((l) => l.aiScore != null);
    const withPrice = lands.filter((l) => l.negotiatedPrice);
    return {
      total: lands.length,
      avgAi: withAi.length ? Math.round(withAi.reduce((s, l) => s + l.aiScore!, 0) / withAi.length) : null,
      avgRent: Math.round(lands.reduce((s, l) => s + l.rentability, 0) / lands.length),
      avgPrice: withPrice.length ? Math.round(withPrice.reduce((s, l) => s + l.negotiatedPrice!, 0) / withPrice.length) : null,
      confirmed: lands.filter((l) => l.confirmed).length,
    };
  }, [lands]);

  const activeMode = MODES.find((m) => m.key === mode)!;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0a0a0a", color: "#fff", fontFamily: "system-ui, sans-serif" }}>

      {/* Panel stânga */}
      <div style={{ width: 300, minWidth: 300, background: "#111", borderRight: "1px solid #222", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #222" }}>
          <div style={{ fontWeight: 900, fontSize: 17 }}>🗺️ Heatmap</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Vizualizare spațială proprietăți</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Mod colorare */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, letterSpacing: 0.5 }}>MOD VIZUALIZARE</div>
            <div style={{ display: "grid", gap: 6 }}>
              {MODES.map((m) => (
                <button key={m.key} onClick={() => setMode(m.key)}
                  style={{ ...btn, textAlign: "left", padding: "8px 12px",
                    background: mode === m.key ? "#1e293b" : "#0b0b0b",
                    border: mode === m.key ? "1px solid #60a5fa" : "1px solid #222",
                    color: mode === m.key ? "#e2e8f0" : "#94a3b8" }}>
                  {m.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>{activeMode.desc}</div>
          </div>

          {/* Legendă */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, letterSpacing: 0.5 }}>LEGENDĂ</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {[
                { color: "#4ade80", label: "Ridicat (≥65)" },
                { color: "#f59e0b", label: "Mediu (35–64)" },
                { color: "#f87171", label: "Scăzut (<35)" },
                { color: "#334155", label: "Fără date AI" },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: color, border: "2px solid rgba(255,255,255,0.3)", flexShrink: 0 }} />
                  <span style={{ color: "#94a3b8" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filtre */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, letterSpacing: 0.5 }}>FILTRE</div>
            <div style={{ display: "grid", gap: 6 }}>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as PropertyType | "all")}
                style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #222", background: "#0b0b0b", color: "#fff", fontSize: 12 }}>
                <option value="all">Toate tipurile</option>
                {Object.entries(PROP_CONFIGS).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", cursor: "pointer" }}>
                <input type="checkbox" checked={onlyWithAi} onChange={(e) => setOnlyWithAi(e.target.checked)} />
                Doar cu scor AI calculat
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", cursor: "pointer" }}>
                <input type="checkbox" checked={onlyConfirmed} onChange={(e) => setOnlyConfirmed(e.target.checked)} />
                Doar confirmate
              </label>
            </div>
          </div>

          {/* Statistici */}
          {stats && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, letterSpacing: 0.5 }}>STATISTICI</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Proprietăți", value: String(stats.total) },
                  { label: "Confirmate", value: String(stats.confirmed) },
                  { label: "Scor AI mediu", value: stats.avgAi != null ? `${stats.avgAi}/100` : "—" },
                  { label: "Rentab. medie", value: `${stats.avgRent}/100` },
                  { label: "Preț mediu", value: stats.avgPrice ? `${stats.avgPrice.toLocaleString("ro-RO")} €` : "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "#0b0b0b", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", padding: "20px 0" }}>⏳ Se încarcă proprietățile...</div>}
          {!loading && lands.length === 0 && (
            <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", padding: "20px 0" }}>
              Nicio proprietate {onlyWithAi ? "cu scor AI" : ""} găsită.
            </div>
          )}
        </div>
      </div>

      {/* Hartă */}
      <div style={{ flex: 1, position: "relative" }}>
        {!loading && (
          <HeatmapMap
            lands={lands}
            mode={mode}
            center={[45.75, 21.23]}
            zoom={7}
          />
        )}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 16, color: "#64748b" }}>
            ⏳ Se încarcă harta...
          </div>
        )}
        {/* Badge proprietăți vizibile */}
        <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(17,17,17,0.92)", border: "1px solid #333", borderRadius: 10, padding: "6px 12px", fontSize: 12, color: "#94a3b8", zIndex: 1000 }}>
          {lands.length} proprietăți vizibile
        </div>
      </div>
    </div>
  );
}
