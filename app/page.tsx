"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ====== HOOK RESIZE SIDEBAR ======
function useResizableSidebar(defaultWidth = 400, min = 280, max = 750) {
  const [width, setWidth] = useState(defaultWidth);
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setWidth(Math.min(max, Math.max(min, e.clientX)));
    };
    const onUp = () => { dragging.current = false; document.body.style.cursor = ""; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [min, max]);

  const onMouseDown = () => {
    dragging.current = true;
    document.body.style.cursor = "col-resize";
  };

  return { width, onMouseDown };
}

// ====== TIPURI PROPRIETATE ======
export type PropertyType =
  | "teren-agricol"
  | "teren-industrial"
  | "teren-intravilan"
  | "casa"
  | "apartament"
  | "spatiu-comercial";

export const PROPERTY_TYPES: Record<
  PropertyType,
  { label: string; icon: string; color: string; imobSlug: string; storiaSlug: string; olxSlug: string }
> = {
  "teren-agricol":    { label: "Teren agricol",    icon: "🌾", color: "#16a34a", imobSlug: "vanzare-terenuri",          storiaSlug: "teren",          olxSlug: "imobiliare-case-terenuri/terenuri" },
  "teren-industrial": { label: "Teren industrial", icon: "🏭", color: "#ea580c", imobSlug: "vanzare-terenuri",          storiaSlug: "teren",          olxSlug: "imobiliare-case-terenuri/terenuri" },
  "teren-intravilan": { label: "Teren intravilan", icon: "📐", color: "#2b6cb0", imobSlug: "vanzare-terenuri",          storiaSlug: "teren",          olxSlug: "imobiliare-case-terenuri/terenuri" },
  "casa":             { label: "Casă",             icon: "🏡", color: "#dc2626", imobSlug: "vanzare-case",              storiaSlug: "casa-si-vila",   olxSlug: "imobiliare-case-terenuri/case-de-vanzare" },
  "apartament":       { label: "Apartament",       icon: "🏢", color: "#7c3aed", imobSlug: "vanzare-apartamente",       storiaSlug: "apartament",     olxSlug: "imobiliare-case-terenuri/apartamente-garsoniere-de-vanzare" },
  "spatiu-comercial": { label: "Spațiu comercial", icon: "🏪", color: "#ca8a04", imobSlug: "vanzare-spatii-comerciale", storiaSlug: "birou",          olxSlug: "imobiliare-case-terenuri/spatii-comerciale-industriale" },
};

const ALL_TYPES = Object.entries(PROPERTY_TYPES) as [PropertyType, (typeof PROPERTY_TYPES)[PropertyType]][];

// ====== TIPURI DATE ======
type Land = {
  id: string;
  propertyType: PropertyType;
  title: string;
  locality: string;
  link: string;
  lat: number;
  lng: number;
  score: number;
  negotiatedPrice: number;
  images: string[];
  thumbnailIdx: number;
  marketPrice?: number;
  areaM2?: number;
  rooms?: number;
  floor?: number;
  confirmed: boolean;
};

type ExternalListing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  locality: string;
  link: string;
  source: string;
  areaM2?: number;
};

type NewsSignal = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
};

type ScoreFactor = {
  label: string;
  score: number;
  max: number;
  details: string[];
  icon: string;
};

type ZoneScore = {
  total: number;
  label: "RIDICAT" | "MEDIU" | "SCĂZUT";
  factors: ScoreFactor[];
  highlights: string[];
  city: string;
};

type ZoneSignal = {
  id: string;
  category: string;
  title: string;
  description: string;
  count: number;
  impact: string;
};

type LandWithDistance = Land & { distanceKm: number | null };
type RawLand = Partial<Land> & Record<string, unknown>;
type AreaBounds = { ne: { lat: number; lng: number }; sw: { lat: number; lng: number } };

// ====== CONFIGURAȚIE ȚĂRI EUROPENE ======
type CountryCode = "RO"|"DE"|"FR"|"IT"|"ES"|"PT"|"PL"|"HU"|"BG"|"AT"|"NL"|"BE"|"CZ"|"SK"|"HR"|"GR"|"GB"|"CH";

const EUROPEAN_COUNTRIES: Record<CountryCode, {
  name: string; flag: string; currency: string;
  center: [number, number]; zoom: number; lang: string;
}> = {
  RO: { name: "România",        flag: "🇷🇴", currency: "EUR", center: [45.94, 24.97], zoom: 7, lang: "ro" },
  DE: { name: "Germania",       flag: "🇩🇪", currency: "EUR", center: [51.17, 10.45], zoom: 6, lang: "de" },
  FR: { name: "Franța",         flag: "🇫🇷", currency: "EUR", center: [46.23, 2.21],  zoom: 6, lang: "fr" },
  IT: { name: "Italia",         flag: "🇮🇹", currency: "EUR", center: [41.87, 12.57], zoom: 6, lang: "it" },
  ES: { name: "Spania",         flag: "🇪🇸", currency: "EUR", center: [40.46, -3.75], zoom: 6, lang: "es" },
  PT: { name: "Portugalia",     flag: "🇵🇹", currency: "EUR", center: [39.40, -8.22], zoom: 7, lang: "pt" },
  PL: { name: "Polonia",        flag: "🇵🇱", currency: "PLN", center: [51.92, 19.15], zoom: 6, lang: "pl" },
  HU: { name: "Ungaria",        flag: "🇭🇺", currency: "HUF", center: [47.16, 19.50], zoom: 7, lang: "hu" },
  BG: { name: "Bulgaria",       flag: "🇧🇬", currency: "BGN", center: [42.73, 25.49], zoom: 7, lang: "bg" },
  AT: { name: "Austria",        flag: "🇦🇹", currency: "EUR", center: [47.52, 14.55], zoom: 7, lang: "de" },
  NL: { name: "Olanda",         flag: "🇳🇱", currency: "EUR", center: [52.13, 5.29],  zoom: 7, lang: "nl" },
  BE: { name: "Belgia",         flag: "🇧🇪", currency: "EUR", center: [50.50, 4.47],  zoom: 8, lang: "fr" },
  CZ: { name: "Cehia",          flag: "🇨🇿", currency: "CZK", center: [49.82, 15.47], zoom: 7, lang: "cs" },
  SK: { name: "Slovacia",       flag: "🇸🇰", currency: "EUR", center: [48.67, 19.70], zoom: 8, lang: "sk" },
  HR: { name: "Croația",        flag: "🇭🇷", currency: "EUR", center: [45.10, 15.20], zoom: 7, lang: "hr" },
  GR: { name: "Grecia",         flag: "🇬🇷", currency: "EUR", center: [39.07, 21.82], zoom: 7, lang: "el" },
  GB: { name: "Marea Britanie", flag: "🇬🇧", currency: "GBP", center: [55.38, -3.44], zoom: 6, lang: "en" },
  CH: { name: "Elveția",        flag: "🇨🇭", currency: "CHF", center: [46.82, 8.23],  zoom: 8, lang: "de" },
};

const ALL_COUNTRIES = Object.entries(EUROPEAN_COUNTRIES) as [CountryCode, (typeof EUROPEAN_COUNTRIES)[CountryCode]][];

// ====== TIP ZONĂ SALVATĂ ======
type SavedZone = {
  id: string;
  name: string;
  bounds: AreaBounds;
  propertyType: PropertyType | "all";
  lastCount: number;
  createdAt: string;
};

// ====== SCOR RENTABILITATE ======
function computeRentability(land: Land): number {
  let score = land.score * 0.4; // user score 40%

  // Discount față de prețul pieței (30%)
  if (land.marketPrice && land.negotiatedPrice && land.marketPrice > 0 && land.negotiatedPrice > 0) {
    const discount = (land.marketPrice - land.negotiatedPrice) / land.marketPrice;
    score += Math.min(30, Math.max(0, discount * 60));
  }

  // Eficiență preț/m² (20%) — mai mic e mai bine
  if (land.areaM2 && land.areaM2 > 0 && land.negotiatedPrice > 0) {
    const ppm2 = land.negotiatedPrice / land.areaM2;
    // <10€/m² = top, >2000€/m² = 0
    score += Math.max(0, Math.min(20, 20 - ppm2 / 100));
  }

  // Bonus confirmat (10%)
  if (land.confirmed) score += 10;

  return Math.min(100, Math.max(0, Math.round(score)));
}

// ====== EXPORT CSV ======
function exportCSV(lands: Land[]) {
  const headers = ["Tip","Titlu","Localitate","Preț neg. (€)","Preț piață (€)","Suprafață (m²)","Camere","Etaj","Scor","Rentabilitate %","Link","Confirmat","Lat","Lng"];
  const rows = lands.map((l) => [
    PROPERTY_TYPES[l.propertyType]?.label ?? l.propertyType,
    l.title, l.locality,
    l.negotiatedPrice, l.marketPrice ?? "", l.areaM2 ?? "",
    l.rooms ?? "", l.floor ?? "",
    l.score, computeRentability(l),
    l.link, l.confirmed ? "Da" : "Nu",
    l.lat.toFixed(6), l.lng.toFixed(6),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `imobiliare_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ====== CONSTANTE ======
const Map = dynamic(() => import("./map"), { ssr: false });
const STORAGE_KEY = "terenuri_v3";
const MAX_IMAGES = 5;

// ====== UTILITARE ======
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function safeNumber(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isInsideArea(lat: number, lng: number, area: AreaBounds) {
  return (
    lat <= area.ne.lat &&
    lat >= area.sw.lat &&
    lng <= area.ne.lng &&
    lng >= area.sw.lng
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Normalizare tip din date vechi
function normalizeType(v: unknown): PropertyType {
  const valid: PropertyType[] = ["teren-agricol","teren-industrial","teren-intravilan","casa","apartament","spatiu-comercial"];
  if (valid.includes(v as PropertyType)) return v as PropertyType;
  return "teren-intravilan";
}

// ====== GALERIE COMPONENT ======
function ImageGallery({
  images, thumbnailIdx, onDelete, onSetThumbnail,
}: {
  images: string[]; thumbnailIdx: number;
  onDelete: (idx: number) => void; onSetThumbnail: (idx: number) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const safeIdx = Math.min(activeIdx, Math.max(0, images.length - 1));
  if (images.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[safeIdx]} alt={`poza ${safeIdx + 1}`}
          style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 10,
            border: safeIdx === thumbnailIdx ? "2px solid #f59e0b" : "1px solid #333", display: "block" }}
        />
        {safeIdx === thumbnailIdx && (
          <div style={{ position: "absolute", top: 6, left: 6, background: "#f59e0b",
            color: "#000", fontSize: 10, fontWeight: 800, borderRadius: 5, padding: "2px 6px", letterSpacing: 0.5 }}>
            ★ THUMBNAIL
          </div>
        )}
        {safeIdx !== thumbnailIdx && (
          <button onClick={() => onSetThumbnail(safeIdx)} title="Setează ca thumbnail"
            style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.7)",
              border: "1px solid #555", borderRadius: 6, color: "#f59e0b", fontSize: 11,
              fontWeight: 700, cursor: "pointer", padding: "3px 7px" }}>
            ★ Set thumbnail
          </button>
        )}
        <button onClick={() => { onDelete(safeIdx); setActiveIdx(Math.max(0, safeIdx - 1)); }}
          title="Șterge poza"
          style={{ position: "absolute", top: 6, right: 6, background: "rgba(200,0,0,0.85)",
            border: "none", borderRadius: 6, color: "#fff", fontWeight: 800, fontSize: 14,
            cursor: "pointer", padding: "2px 8px", lineHeight: 1.6 }}>
          ✕
        </button>
        <div style={{ position: "absolute", bottom: 6, right: 8, background: "rgba(0,0,0,0.55)",
          color: "#fff", fontSize: 11, borderRadius: 6, padding: "2px 7px" }}>
          {safeIdx + 1} / {images.length}
        </div>
      </div>
      {images.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {images.map((src, idx) => (
            <div key={idx} onClick={() => setActiveIdx(idx)}
              style={{ position: "relative", cursor: "pointer", borderRadius: 7,
                border: idx === safeIdx ? "2px solid #4ade80" : idx === thumbnailIdx ? "2px solid #f59e0b" : "2px solid transparent",
                overflow: "hidden", width: 56, height: 44, flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`thumb ${idx + 1}`} style={{ width: 56, height: 44, objectFit: "cover", display: "block" }} />
              {idx === thumbnailIdx && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0,
                  background: "rgba(245,158,11,0.85)", color: "#000", fontSize: 8,
                  fontWeight: 800, textAlign: "center", padding: "1px 0" }}>★</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CardThumbnail({ images, thumbnailIdx }: { images: string[]; thumbnailIdx: number }) {
  if (images.length === 0) return null;
  const src = images[thumbnailIdx] ?? images[0];
  return (
    <div style={{ position: "relative", marginTop: 8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="thumbnail"
        style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8, border: "1px solid #444", display: "block" }} />
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: 5, right: 7, background: "rgba(0,0,0,0.6)",
          color: "#fff", fontSize: 10, borderRadius: 5, padding: "1px 6px" }}>
          +{images.length - 1} poze
        </div>
      )}
    </div>
  );
}

// ====== PANEL SCOR ZONĂ ======
function ZoneScorePanel({ score, loading }: { score: ZoneScore | null; loading: boolean }) {
  if (loading) return (
    <div style={{ marginBottom: 12, padding: "12px 14px", background: "#0a0f16",
      border: "1px solid #1e3a5f", borderRadius: 12, fontSize: 13, color: "#60a5fa" }}>
      ⏳ Se calculează scorul zonei...
    </div>
  );
  if (!score) return null;

  const totalColor = score.total >= 65 ? "#4ade80" : score.total >= 35 ? "#f59e0b" : "#f87171";
  const labelBg    = score.total >= 65 ? "#052e16" : score.total >= 35 ? "#1c1300" : "#1a0000";
  const labelBorder= score.total >= 65 ? "#166534" : score.total >= 35 ? "#713f12" : "#7f1d1d";

  return (
    <div style={{ marginBottom: 14, background: "#080d14", border: `1px solid ${totalColor}44`,
      borderRadius: 14, padding: "14px 14px 10px", boxShadow: `0 0 18px ${totalColor}18` }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: "#e2e8f0", letterSpacing: 0.5 }}>
          🎯 SCOR POTENȚIAL ZONĂ {score.city ? `· ${score.city}` : ""}
        </div>
        <div style={{ background: labelBg, border: `1px solid ${labelBorder}`,
          borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 800,
          color: totalColor, letterSpacing: 1 }}>
          {score.label}
        </div>
      </div>

      {/* Scor mare central */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%",
          border: `4px solid ${totalColor}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: `${totalColor}11`, flexShrink: 0, boxShadow: `0 0 16px ${totalColor}33` }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: totalColor, lineHeight: 1 }}>{score.total}</span>
          <span style={{ fontSize: 9, color: totalColor, opacity: 0.7, marginTop: 1 }}>/100</span>
        </div>
        <div style={{ flex: 1 }}>
          {score.highlights.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 3 }}>
              {score.highlights.map((h, i) => (
                <li key={i} style={{ fontSize: 11, color: "#94a3b8", display: "flex", gap: 5, alignItems: "flex-start" }}>
                  <span style={{ color: totalColor, flexShrink: 0 }}>✔</span>
                  <span style={{ lineHeight: 1.4 }}>{h.charAt(0).toUpperCase() + h.slice(1)}</span>
                </li>
              ))}
            </ul>
          )}
          {score.highlights.length === 0 && (
            <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
              Desenează o zonă mai mare pentru mai multe semnale.
            </div>
          )}
        </div>
      </div>

      {/* Bare factori */}
      <div style={{ display: "grid", gap: 8 }}>
        {score.factors.map((f) => {
          const pct = Math.round((f.score / f.max) * 100);
          const fc = pct >= 65 ? "#4ade80" : pct >= 35 ? "#f59e0b" : "#64748b";
          return (
            <div key={f.label}>
              <div style={{ display: "flex", justifyContent: "space-between",
                fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>
                <span>{f.icon} {f.label}</span>
                <span style={{ color: fc, fontWeight: 700 }}>{f.score}/{f.max}</span>
              </div>
              <div style={{ height: 5, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: fc,
                  borderRadius: 3, transition: "width 0.6s ease" }} />
              </div>
              {f.details.length > 0 && (
                <div style={{ fontSize: 10, color: "#475569", marginTop: 2, lineHeight: 1.5 }}>
                  {f.details.slice(0, 2).join(" · ")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: "#334155", marginTop: 10, borderTop: "1px solid #1e293b", paddingTop: 6 }}>
        Surse: OpenStreetMap · Google News · Overpass API
      </div>
    </div>
  );
}

// ====== PANEL SEMNALE EXTERNE ======
function SignalPanel({ signals, loading }: { signals: NewsSignal[]; loading: boolean }) {
  if (loading) return (
    <div style={{ padding: "10px 0", fontSize: 13, opacity: 0.7 }}>⏳ Se caută știri de dezvoltare...</div>
  );
  if (signals.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#f59e0b", marginBottom: 6 }}>
        📰 Semnale de dezvoltare în zonă ({signals.length})
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {signals.map((s, i) => (
          <a key={i} href={s.link} target="_blank" rel="noreferrer"
            style={{ display: "block", background: "#1a1200", border: "1px solid #3a2800",
              borderRadius: 8, padding: "8px 10px", color: "#fde68a", textDecoration: "none",
              fontSize: 12, lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{s.title}</div>
            {s.snippet && <div style={{ opacity: 0.75, fontSize: 11 }}>{s.snippet.slice(0, 120)}...</div>}
            <div style={{ fontSize: 10, opacity: 0.55, marginTop: 4 }}>{s.source} · {s.pubDate.slice(0, 16)}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ====== PANEL SEMNALE GEO ======
function ZoneSignalsPanel({ signals, loading }: { signals: ZoneSignal[]; loading: boolean }) {
  if (loading) return (
    <div style={{ padding: "10px 0", fontSize: 13, opacity: 0.7 }}>⏳ Se caută semnale geo în zonă...</div>
  );
  if (signals.length === 0) return null;
  return (
    <div style={{ marginBottom: 12, border: "1px solid #1f2937", borderRadius: 10, padding: 10, background: "#081013" }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#7dd3fc", marginBottom: 8 }}>
        📡 Radar de proiecte viitoare
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {signals.map((signal) => (
          <div key={signal.id} style={{ background: "#08131f", border: "1px solid #233240", borderRadius: 10, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, color: "#cffafe", fontSize: 13 }}>{signal.title}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{signal.description}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#22d3ee", fontWeight: 700 }}>{signal.count} semnal(e)</div>
                <div style={{ fontSize: 11, opacity: 0.75 }}>{signal.impact}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ====== PANEL REZULTATE EXTERNE ======
function ExternalPanel({
  results, links, loading, propertyType,
}: {
  results: ExternalListing[]; links: Record<string, string>; loading: boolean; propertyType: PropertyType | "all";
}) {
  const cfg = propertyType !== "all" ? PROPERTY_TYPES[propertyType] : null;
  const label = cfg ? cfg.label.toLowerCase() : "imobiliare";

  return (
    <div style={{ marginBottom: 12, border: "1px solid #1e3a5f", borderRadius: 10, padding: 10, background: "#0a1520" }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#60a5fa", marginBottom: 8 }}>
        🔍 Caută {label} pe site-uri
      </div>

      {/* Butoane linkuri directe */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {Object.entries(links).map(([site, url]) => (
          <a key={site} href={url} target="_blank" rel="noreferrer"
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #1e3a5f",
              background: "#0b1a30", color: "#93c5fd", fontSize: 12, textDecoration: "none",
              fontWeight: 600, cursor: "pointer" }}>
            {site} →
          </a>
        ))}
      </div>

      {/* Rezultate scraped dacă există */}
      {loading && <div style={{ fontSize: 12, opacity: 0.6 }}>⏳ Se caută anunțuri...</div>}
      {!loading && results.length > 0 && (
        <>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
            {results.length} anunțuri găsite automat:
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {results.map((r) => (
              <a key={r.id} href={r.link} target="_blank" rel="noreferrer"
                style={{ display: "block", background: "#0b1a30", border: "1px solid #1e3a5f",
                  borderRadius: 8, padding: "8px 10px", color: "#fff", textDecoration: "none", fontSize: 12 }}>
                <div style={{ fontWeight: 700 }}>{r.title}</div>
                <div style={{ color: "#4ade80", fontSize: 13, marginTop: 2 }}>
                  {r.price > 0 ? `${r.price.toLocaleString("ro-RO")} ${r.currency}` : "Preț la cerere"}
                </div>
                <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{r.source}</div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ====== BARA RENTABILITATE ======
function RentabilityBar({ score }: { score: number }) {
  const color = score >= 70 ? "#4ade80" : score >= 40 ? "#f59e0b" : "#f87171";
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.7, marginBottom: 2 }}>
        <span>Rentabilitate</span>
        <span style={{ color, fontWeight: 700 }}>{score}/100</span>
      </div>
      <div style={{ background: "#2a2a2a", borderRadius: 4, height: 5, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ====== MODAL COMPARATOR ======
function ComparatorModal({ lands, ids, onClose }: { lands: Land[]; ids: string[]; onClose: () => void }) {
  const selected = ids.map((id) => lands.find((l) => l.id === id)).filter(Boolean) as Land[];
  if (selected.length === 0) return null;

  const rows: { label: string; key: (l: Land) => string }[] = [
    { label: "Tip", key: (l) => { const c = PROPERTY_TYPES[l.propertyType]; return c ? c.icon + " " + c.label : l.propertyType; } },
    { label: "Localitate", key: (l) => l.locality },
    { label: "Preț negociat", key: (l) => l.negotiatedPrice > 0 ? l.negotiatedPrice.toLocaleString("ro-RO") + " €" : "—" },
    { label: "Preț piață", key: (l) => l.marketPrice ? l.marketPrice.toLocaleString("ro-RO") + " €" : "—" },
    { label: "Suprafață", key: (l) => l.areaM2 ? l.areaM2.toLocaleString("ro-RO") + " m²" : "—" },
    { label: "Preț / m²", key: (l) => l.areaM2 && l.negotiatedPrice ? Math.round(l.negotiatedPrice / l.areaM2).toLocaleString("ro-RO") + " €/m²" : "—" },
    { label: "Camere", key: (l) => l.rooms ? String(l.rooms) : "—" },
    { label: "Etaj", key: (l) => l.floor != null ? String(l.floor) : "—" },
    { label: "Scor utilizator", key: (l) => String(l.score) + "/100" },
    { label: "Rentabilitate", key: (l) => String(computeRentability(l)) + "/100" },
    { label: "Confirmat", key: (l) => l.confirmed ? "✅ Da" : "⏳ Nu" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#111", color: "#fff", borderRadius: 16, border: "1px solid #333",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)", maxWidth: "90vw", maxHeight: "90vh",
          overflowY: "auto", padding: 24, minWidth: 500 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>⚖️ Comparator proprietăți</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#aaa", fontWeight: 600, borderBottom: "1px solid #2a2a2a", width: 130 }}>Câmp</th>
                {selected.map((l) => {
                  const cfg = PROPERTY_TYPES[l.propertyType];
                  return (
                    <th key={l.id} style={{ padding: "8px 12px", borderBottom: "1px solid #2a2a2a",
                      color: cfg?.color ?? "#fff", textAlign: "center", fontWeight: 700 }}>
                      {l.title}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <td style={{ padding: "8px 12px", color: "#888", fontWeight: 600 }}>{row.label}</td>
                  {selected.map((l) => {
                    const val = row.key(l);
                    // Highlight rentabilitate
                    const isRent = row.label === "Rentabilitate";
                    const rentScore = isRent ? computeRentability(l) : 0;
                    const rentColor = rentScore >= 70 ? "#4ade80" : rentScore >= 40 ? "#f59e0b" : "#f87171";
                    return (
                      <td key={l.id} style={{ padding: "8px 12px", textAlign: "center",
                        color: isRent ? rentColor : "#fff", fontWeight: isRent ? 800 : 400 }}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Verdict rentabilitate */}
        <div style={{ marginTop: 20, padding: 14, background: "#0a0a0a", borderRadius: 10, border: "1px solid #222" }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📊 Verdict rapid:</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[...selected].sort((a, b) => computeRentability(b) - computeRentability(a)).map((l, i) => {
              const score = computeRentability(l);
              const color = score >= 70 ? "#4ade80" : score >= 40 ? "#f59e0b" : "#f87171";
              return (
                <div key={l.id} style={{ flex: 1, minWidth: 140, background: "#111", borderRadius: 8,
                  border: `1px solid ${color}55`, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#aaa" }}>#{i + 1} recomandat</div>
                  <div style={{ fontWeight: 800, fontSize: 13, marginTop: 2 }}>{l.title}</div>
                  <div style={{ color, fontWeight: 700, fontSize: 16, marginTop: 4 }}>{score}/100</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== COMPONENTA PRINCIPALĂ ======
export default function Home() {
  const { width: sidebarWidth, onMouseDown: startResize } = useResizableSidebar(400);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lands, setLands] = useState<Land[]>([]);
  const [selectedLandId, setSelectedLandId] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = useState("");
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Land | null>(null);
  const [areaFilter, setAreaFilter] = useState<AreaBounds | null>(null);
  const [expandedGallery, setExpandedGallery] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Module A - filtrare tip
  const [typeFilter, setTypeFilter] = useState<PropertyType | "all">("all");

  // Module B - rezultate externe
  const [externalResults, setExternalResults] = useState<ExternalListing[]>([]);
  const [externalLinks, setExternalLinks] = useState<Record<string, string>>({});
  const [loadingExternal, setLoadingExternal] = useState(false);

  // Module C - semnale de dezvoltare
  const [newsSignals, setNewsSignals] = useState<NewsSignal[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [zoneSignals, setZoneSignals] = useState<ZoneSignal[]>([]);
  const [loadingZoneSignals, setLoadingZoneSignals] = useState(false);

  // Module D - scor zonă
  const [zoneScore, setZoneScore] = useState<ZoneScore | null>(null);
  const [loadingZoneScore, setLoadingZoneScore] = useState(false);

  // Țară selectată
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>("RO");
  const [countryFlyTarget, setCountryFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);

  // Modul D — filtre avansate
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterPriceMin, setFilterPriceMin] = useState<number | "">("");
  const [filterPriceMax, setFilterPriceMax] = useState<number | "">("");
  const [filterAreaMin, setFilterAreaMin] = useState<number | "">("");
  const [filterAreaMax, setFilterAreaMax] = useState<number | "">("");
  const [filterRoomsMin, setFilterRoomsMin] = useState<number | "">("");
  const [sortBy, setSortBy] = useState<"distance" | "price-asc" | "price-desc" | "rentability" | "score">("distance");

  // Comparator
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showComparator, setShowComparator] = useState(false);

  // Zone salvate + notificări
  const [savedZones, setSavedZones] = useState<SavedZone[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showSavedZones, setShowSavedZones] = useState(false);

  const effectiveSelectedLandId = selectedLandId ?? lands[0]?.id ?? null;
  const selectedLand = useMemo(
    () => lands.find((l) => l.id === effectiveSelectedLandId) || null,
    [lands, effectiveSelectedLandId]
  );

  // ====== UPLOAD IMAGINE ======
  const uploadImage = useCallback(async (file: File, landId: string) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) { alert("Tip de fișier nepermis. Acceptăm: JPG, PNG, WEBP, GIF."); return; }
    if (file.size > 10 * 1024 * 1024) { alert("Fișierul este prea mare. Limita este 10MB."); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("landId", landId);

      let imagePath: string | null = null;
      try {
        const res = await fetch("/api/lands/upload", { method: "POST", body: formData });
        if (res.ok) { const data = await res.json(); imagePath = data.path as string; }
      } catch { /* fallback la base64 */ }

      if (!imagePath) imagePath = await fileToBase64(file);
      const finalPath = imagePath;

      setLands((prev) => {
        const land = prev.find((l) => l.id === landId);
        if (!land) return prev;
        if ((land.images ?? []).length >= MAX_IMAGES) { alert("Ai atins limita de 5 poze."); return prev; }
        return prev.map((l) => l.id === landId ? { ...l, images: [...(l.images ?? []), finalPath] } : l);
      });
    } catch (err) {
      console.error(err);
      alert("Upload a eșuat. Încearcă din nou.");
    } finally {
      setUploading(false);
    }
  }, []);

  const deleteImage = useCallback((landId: string, imgIdx: number) => {
    setLands((prev) => prev.map((l) => {
      if (l.id !== landId) return l;
      const newImages = l.images.filter((_, i) => i !== imgIdx);
      let newThumb = l.thumbnailIdx;
      if (imgIdx === l.thumbnailIdx) newThumb = 0;
      else if (imgIdx < l.thumbnailIdx) newThumb = l.thumbnailIdx - 1;
      newThumb = Math.min(newThumb, Math.max(0, newImages.length - 1));
      return { ...l, images: newImages, thumbnailIdx: newThumb };
    }));
  }, []);

  const setThumbnail = useCallback((landId: string, idx: number) => {
    setLands((prev) => prev.map((l) => (l.id === landId ? { ...l, thumbnailIdx: idx } : l)));
  }, []);

  // ====== LOAD din localStorage ======
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const rawOld = !raw ? (localStorage.getItem("terenuri_v2") ?? localStorage.getItem("terenuri_v1")) : null;
      const source = raw ?? rawOld;
      if (source) {
        const parsed = JSON.parse(source);
        if (Array.isArray(parsed)) {
          const normalized: Land[] = parsed.map((t: RawLand) => ({
            id: String(t.id ?? uid()),
            propertyType: normalizeType(t.propertyType),
            title: String(t.title ?? "Proprietate nouă"),
            locality: String(t.locality ?? "Timișoara"),
            link: String(t.link ?? ""),
            lat: safeNumber(t.lat, 45.75797),
            lng: safeNumber(t.lng, 21.22898),
            score: safeNumber(t.score, 30),
            negotiatedPrice: safeNumber(t.negotiatedPrice, 0),
            images: Array.isArray(t.images) ? (t.images as string[]) :
              (t as Record<string, unknown>).imagePath ? [String((t as Record<string, unknown>).imagePath)] : [],
            thumbnailIdx: safeNumber(t.thumbnailIdx, 0),
            marketPrice: t.marketPrice == null ? undefined : safeNumber(t.marketPrice, 0),
            areaM2: t.areaM2 == null ? undefined : safeNumber(t.areaM2, 0),
            rooms: t.rooms == null ? undefined : safeNumber(t.rooms, 0),
            floor: t.floor == null ? undefined : safeNumber(t.floor, 0),
            confirmed: Boolean(t.confirmed ?? false),
          }));
          setLands(normalized);
          return;
        }
      }
    } catch { /* ignore */ }
    setLands([]);
  }, []);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Save în localStorage
  useEffect(() => {
    if (lands.length === 0) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lands)); } catch { /* ignore */ }
  }, [lands]);

  // markerMoved listener
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string; lat: number; lng: number } | undefined;
      if (!detail) return;
      setLands((prev) => prev.map((t) => t.id === detail.id ? { ...t, lat: detail.lat, lng: detail.lng } : t));
    };
    window.addEventListener("markerMoved", handler as EventListener);
    return () => window.removeEventListener("markerMoved", handler as EventListener);
  }, []);

  // Zone selected/cleared
  useEffect(() => {
    const onZoneSelected = (e: Event) => {
      const detail = (e as CustomEvent).detail as AreaBounds | undefined;
      if (detail) setAreaFilter(detail);
    };
    const onZoneCleared = () => {
      setAreaFilter(null);
      setExternalResults([]);
      setExternalLinks({});
      setNewsSignals([]);
      setZoneScore(null);
    };
    window.addEventListener("zoneSelected", onZoneSelected as EventListener);
    window.addEventListener("zoneCleared", onZoneCleared as EventListener);
    return () => {
      window.removeEventListener("zoneSelected", onZoneSelected as EventListener);
      window.removeEventListener("zoneCleared", onZoneCleared as EventListener);
    };
  }, []);

  // ====== MODULE B + C: fetch când zona e selectată ======
  useEffect(() => {
    if (!areaFilter) return;

    const centerLat = (areaFilter.ne.lat + areaFilter.sw.lat) / 2;
    const centerLng = (areaFilter.ne.lng + areaFilter.sw.lng) / 2;
    const pt = typeFilter !== "all" ? typeFilter : "teren-intravilan";

    const countryCfg = EUROPEAN_COUNTRIES[selectedCountry];

    // Module B - linkuri + scraping
    setLoadingExternal(true);
    fetch(`/api/search?lat=${centerLat}&lng=${centerLng}&type=${pt}&country=${selectedCountry}`)
      .then((r) => r.json())
      .then((data) => {
        setExternalResults(data.results ?? []);
        setExternalLinks(data.urls ?? {});
      })
      .catch(() => {})
      .finally(() => setLoadingExternal(false));

    // Module C - semnale news în limba țării
    setLoadingNews(true);
    fetch(`/api/news?lat=${centerLat}&lng=${centerLng}&lang=${countryCfg.lang}`)
      .then((r) => r.json())
      .then((data) => setNewsSignals(data.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingNews(false));

    // Module D - scor zonă
    setLoadingZoneScore(true);
    setZoneScore(null);
    fetch(`/api/zone-score?neLat=${areaFilter.ne.lat}&neLng=${areaFilter.ne.lng}&swLat=${areaFilter.sw.lat}&swLng=${areaFilter.sw.lng}`)
      .then((r) => r.json())
      .then((data) => setZoneScore(data as ZoneScore))
      .catch(() => {})
      .finally(() => setLoadingZoneScore(false));

    // Module E - semnale geo / proiecte din zonă
    setLoadingZoneSignals(true);
    setZoneSignals([]);
    fetch(`/api/zone-signals?neLat=${areaFilter.ne.lat}&neLng=${areaFilter.ne.lng}&swLat=${areaFilter.sw.lat}&swLng=${areaFilter.sw.lng}`)
      .then((r) => r.json())
      .then((data) => setZoneSignals(Array.isArray(data.signals) ? data.signals : []))
      .catch(() => setZoneSignals([]))
      .finally(() => setLoadingZoneSignals(false));
  }, [areaFilter, typeFilter, selectedCountry]);

  // Load zone salvate
  useEffect(() => {
    try {
      const raw = localStorage.getItem("imob_saved_zones");
      if (raw) setSavedZones(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Save zone salvate
  useEffect(() => {
    try { localStorage.setItem("imob_saved_zones", JSON.stringify(savedZones)); } catch { /* ignore */ }
  }, [savedZones]);

  // Verifică notificări la load (o singură dată)
  useEffect(() => {
    if (savedZones.length === 0) return;
    savedZones.forEach((zone) => {
      const center = {
        lat: (zone.bounds.ne.lat + zone.bounds.sw.lat) / 2,
        lng: (zone.bounds.ne.lng + zone.bounds.sw.lng) / 2,
      };
      const pt = zone.propertyType !== "all" ? zone.propertyType : "teren-intravilan";
      fetch(`/api/search?lat=${center.lat}&lng=${center.lng}&type=${pt}`)
        .then((r) => r.json())
        .then((data) => {
          const newCount = (data.results as unknown[]).length;
          if (newCount > zone.lastCount) {
            setNotifications((prev) => [
              ...prev,
              `🔔 ${zone.name}: ${newCount - zone.lastCount} anunț/anunțuri noi!`,
            ]);
            setSavedZones((prev) =>
              prev.map((z) => (z.id === zone.id ? { ...z, lastCount: newCount } : z))
            );
          }
        })
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // o singură dată la mount

  // Auto-scroll la cardul selectat
  useEffect(() => {
    if (!effectiveSelectedLandId) return;
    const el = cardRefs.current[effectiveSelectedLandId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [effectiveSelectedLandId]);

  // ====== FILTRARE LISTA ======
  const filteredLands = useMemo<LandWithDistance[]>(() => {
    const q = query.trim().toLowerCase();
    return lands
      .filter((l) => {
        const matchesQuery = !q || l.title.toLowerCase().includes(q) || l.locality.toLowerCase().includes(q);
        const matchesConfirmed = !onlyConfirmed || l.confirmed === true;
        const matchesArea = !areaFilter || isInsideArea(l.lat, l.lng, areaFilter);
        const matchesType = typeFilter === "all" || l.propertyType === typeFilter;
        const matchesPriceMin = filterPriceMin === "" || l.negotiatedPrice >= filterPriceMin;
        const matchesPriceMax = filterPriceMax === "" || l.negotiatedPrice <= filterPriceMax;
        const matchesAreaMin = filterAreaMin === "" || (l.areaM2 ?? 0) >= filterAreaMin;
        const matchesAreaMax = filterAreaMax === "" || (l.areaM2 ?? Infinity) <= filterAreaMax;
        const matchesRooms = filterRoomsMin === "" || (l.rooms ?? 0) >= filterRoomsMin;
        return matchesQuery && matchesConfirmed && matchesArea && matchesType &&
          matchesPriceMin && matchesPriceMax && matchesAreaMin && matchesAreaMax && matchesRooms;
      })
      .map((l) => ({
        ...l,
        distanceKm: myLocation ? haversineKm(myLocation.lat, myLocation.lng, l.lat, l.lng) : null,
      }))
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.negotiatedPrice - b.negotiatedPrice;
        if (sortBy === "price-desc") return b.negotiatedPrice - a.negotiatedPrice;
        if (sortBy === "rentability") return computeRentability(b) - computeRentability(a);
        if (sortBy === "score") return b.score - a.score;
        // distance (default)
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [lands, query, onlyConfirmed, myLocation, areaFilter, typeFilter,
      filterPriceMin, filterPriceMax, filterAreaMin, filterAreaMax, filterRoomsMin, sortBy]);

  // ====== ACȚIUNI ======
  const onAdd = () => {
    const pt = typeFilter !== "all" ? typeFilter : "teren-intravilan";
    const cfg = PROPERTY_TYPES[pt];
    const item: Land = {
      id: uid(),
      propertyType: pt,
      title: `${cfg.icon} ${cfg.label} nou`,
      locality: "Timișoara",
      link: "",
      lat: 45.75797,
      lng: 21.22898,
      score: 30,
      negotiatedPrice: 0,
      images: [],
      thumbnailIdx: 0,
      confirmed: false,
    };
    setLands((prev) => [item, ...prev]);
    setSelectedLandId(item.id);
  };

  const onDelete = (id: string) => {
    setLands((prev) => prev.filter((t) => t.id !== id));
    setSelectedLandId((cur) => (cur === id ? null : cur));
    setExpandedGallery((cur) => (cur === id ? null : cur));
  };

  const onConfirm = (id: string) =>
    setLands((prev) => prev.map((t) => (t.id === id ? { ...t, confirmed: true } : t)));
  const onUnconfirm = (id: string) =>
    setLands((prev) => prev.map((t) => (t.id === id ? { ...t, confirmed: false } : t)));

  const updateSelected = (patch: Partial<Land>) => {
    if (!effectiveSelectedLandId) return;
    setLands((prev) => prev.map((t) => (t.id === effectiveSelectedLandId ? { ...t, ...patch } : t)));
  };

  const handleModalSave = () => {
    if (!editForm) return;
    setLands((prev) =>
      prev.map((l) =>
        l.id === editForm.id
          ? {
              ...l,
              propertyType: editForm.propertyType,
              title: editForm.title,
              locality: editForm.locality,
              link: editForm.link,
              confirmed: editForm.confirmed,
              score: editForm.score,
              negotiatedPrice: editForm.negotiatedPrice,
              marketPrice: editForm.marketPrice,
              areaM2: editForm.areaM2,
              rooms: editForm.rooms,
              floor: editForm.floor,
            }
          : l
      )
    );
    setSelectedLandId(editForm.id);
    setIsEditing(false);
    setEditForm(null);
  };

  // ====== STILURI ======
  const inputDark = {
    padding: 10, borderRadius: 10, border: "1px solid #333", background: "#0b0b0b", color: "#fff",
  } as const;

  const btn = {
    padding: "8px 10px", borderRadius: 10, border: "1px solid #333", background: "#0b0b0b",
    color: "#fff", cursor: "pointer", fontSize: 13,
  } as const;

  // ====== RENDER ======
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ===== SIDEBAR ===== */}
      <div style={{
        width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth,
        background: "#111", color: "#fff", padding: 12, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 0, flexShrink: 0,
      }}>
        {/* Notificări */}
        {notifications.map((n, i) => (
          <div key={i} style={{ background: "#1a2e00", border: "1px solid #4ade80", borderRadius: 8,
            padding: "8px 10px", marginBottom: 8, fontSize: 12, color: "#4ade80",
            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {n}
            <button onClick={() => setNotifications((p) => p.filter((_, j) => j !== i))}
              style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        ))}

        {/* Selector țară */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 5 }}>🌍 Țară / Piață</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {ALL_COUNTRIES.map(([code, c]) => (
              <button key={code} onClick={() => {
                setSelectedCountry(code);
                setCountryFlyTarget({ center: c.center, zoom: c.zoom });
                // Resetează filtre zonă la schimbarea țării
                setAreaFilter(null);
                setExternalResults([]);
                setExternalLinks({});
                setNewsSignals([]);
              }}
                title={c.name}
                style={{
                  padding: "4px 7px", borderRadius: 8, fontSize: 14, cursor: "pointer",
                  border: selectedCountry === code ? "2px solid #f59e0b" : "1px solid #2a2a2a",
                  background: selectedCountry === code ? "#2a1800" : "#0b0b0b",
                  lineHeight: 1,
                }}>
                {c.flag}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>
            {EUROPEAN_COUNTRIES[selectedCountry].flag} {EUROPEAN_COUNTRIES[selectedCountry].name} · {EUROPEAN_COUNTRIES[selectedCountry].currency}
          </div>
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>🏠 Imobiliare Invest</div>
          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={() => exportCSV(lands)} title="Export CSV"
              style={{ ...btn, padding: "5px 8px", fontSize: 12 }}>📥 CSV</button>
            <button onClick={() => { if (compareIds.length >= 2) setShowComparator(true); }}
              title={compareIds.length < 2 ? "Selectează cel puțin 2 proprietăți" : "Compară"}
              style={{ ...btn, padding: "5px 8px", fontSize: 12,
                border: compareIds.length >= 2 ? "1px solid #f59e0b" : "1px solid #333",
                color: compareIds.length >= 2 ? "#f59e0b" : "#555" }}>
              ⚖️ {compareIds.length > 0 ? `(${compareIds.length})` : ""}
            </button>
            {compareIds.length > 0 && (
              <button onClick={() => setCompareIds([])} title="Resetează selecție"
                style={{ ...btn, padding: "5px 6px", fontSize: 11, color: "#f87171", borderColor: "#7f1d1d" }}>✕</button>
            )}
          </div>
        </div>

        {/* Tab-uri tip proprietate */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            onClick={() => setTypeFilter("all")}
            style={{
              ...btn, padding: "5px 8px", fontSize: 11,
              background: typeFilter === "all" ? "#222" : "#0b0b0b",
              border: typeFilter === "all" ? "1px solid #555" : "1px solid #222",
              fontWeight: typeFilter === "all" ? 800 : 400,
            }}>
            Toate
          </button>
          {ALL_TYPES.map(([pt, cfg]) => (
            <button
              key={pt}
              onClick={() => setTypeFilter(pt)}
              style={{
                ...btn, padding: "5px 8px", fontSize: 11,
                background: typeFilter === pt ? cfg.color + "33" : "#0b0b0b",
                border: typeFilter === pt ? `1px solid ${cfg.color}` : "1px solid #222",
                color: typeFilter === pt ? cfg.color : "#aaa",
                fontWeight: typeFilter === pt ? 800 : 400,
              }}>
              {cfg.icon} {cfg.label}
            </button>
          ))}
        </div>

        {/* Căutare + filtru */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută: titlu / localitate..."
            style={{ ...inputDark, flex: 1, padding: 8 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, opacity: 0.9, whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={onlyConfirmed} onChange={(e) => setOnlyConfirmed(e.target.checked)} />
            Confirmate
          </label>
        </div>

        {/* Filtru zonă activ */}
        {areaFilter && (
          <div style={{ fontSize: 12, color: "#93c5fd", marginBottom: 10, border: "1px solid #1e3a8a",
            borderRadius: 8, padding: "6px 8px", background: "#0b1220" }}>
            📐 Filtru activ: zona desenată pe hartă.
          </div>
        )}

        {/* Sortare + filtre avansate */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            style={{ ...inputDark, flex: 1, padding: "6px 8px", fontSize: 12 }}>
            <option value="distance">📡 Distanță</option>
            <option value="price-asc">💰 Preț ↑</option>
            <option value="price-desc">💰 Preț ↓</option>
            <option value="rentability">📈 Rentabilitate ↓</option>
            <option value="score">⭐ Scor ↓</option>
          </select>
          <button onClick={() => setShowAdvanced((v) => !v)}
            style={{ ...btn, padding: "6px 10px", fontSize: 12,
              border: showAdvanced ? "1px solid #f59e0b" : "1px solid #333",
              color: showAdvanced ? "#f59e0b" : "#aaa" }}>
            🔧 Filtre
          </button>
        </div>

        {/* Panel filtre avansate */}
        {showAdvanced && (
          <div style={{ background: "#0b0b0b", border: "1px solid #2a2a2a", borderRadius: 10,
            padding: 10, marginBottom: 10, display: "grid", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", marginBottom: 2 }}>Filtre avansate</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <input type="number" placeholder="Preț min (€)" value={filterPriceMin}
                onChange={(e) => setFilterPriceMin(e.target.value ? Number(e.target.value) : "")}
                style={{ ...inputDark, padding: "6px 8px", fontSize: 12 }} />
              <input type="number" placeholder="Preț max (€)" value={filterPriceMax}
                onChange={(e) => setFilterPriceMax(e.target.value ? Number(e.target.value) : "")}
                style={{ ...inputDark, padding: "6px 8px", fontSize: 12 }} />
              <input type="number" placeholder="Suprafață min (m²)" value={filterAreaMin}
                onChange={(e) => setFilterAreaMin(e.target.value ? Number(e.target.value) : "")}
                style={{ ...inputDark, padding: "6px 8px", fontSize: 12 }} />
              <input type="number" placeholder="Suprafață max (m²)" value={filterAreaMax}
                onChange={(e) => setFilterAreaMax(e.target.value ? Number(e.target.value) : "")}
                style={{ ...inputDark, padding: "6px 8px", fontSize: 12 }} />
              <input type="number" placeholder="Camere min" value={filterRoomsMin}
                onChange={(e) => setFilterRoomsMin(e.target.value ? Number(e.target.value) : "")}
                style={{ ...inputDark, padding: "6px 8px", fontSize: 12 }} />
              <button onClick={() => {
                setFilterPriceMin(""); setFilterPriceMax("");
                setFilterAreaMin(""); setFilterAreaMax(""); setFilterRoomsMin("");
              }}
                style={{ ...btn, fontSize: 11, padding: "6px 8px", color: "#f87171", borderColor: "#7f1d1d" }}>
                ✕ Resetează
              </button>
            </div>
          </div>
        )}

        <button onClick={onAdd} style={{ ...btn, width: "100%", marginBottom: 10, background: "#1a1a1a", fontWeight: 700 }}>
          + Adaugă {typeFilter !== "all" ? PROPERTY_TYPES[typeFilter].label : "proprietate"}
        </button>

        {/* Zona activă — buton salvare */}
        {areaFilter && (
          <button
            onClick={() => {
              const name = prompt("Nume pentru această zonă:", `Zona ${new Date().toLocaleDateString("ro-RO")}`);
              if (!name) return;
              const zone: SavedZone = {
                id: uid(), name, bounds: areaFilter,
                propertyType: typeFilter, lastCount: externalResults.length,
                createdAt: new Date().toISOString(),
              };
              setSavedZones((prev) => [zone, ...prev]);
            }}
            style={{ ...btn, width: "100%", marginBottom: 10, borderColor: "#4ade80", color: "#4ade80", fontSize: 12 }}>
            💾 Salvează zona pentru notificări
          </button>
        )}

        {/* Zone salvate */}
        {savedZones.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <button onClick={() => setShowSavedZones((v) => !v)}
              style={{ ...btn, width: "100%", fontSize: 12, color: "#93c5fd", borderColor: "#1e3a8a" }}>
              🔔 Zone salvate ({savedZones.length}) {showSavedZones ? "▲" : "▼"}
            </button>
            {showSavedZones && (
              <div style={{ marginTop: 6, display: "grid", gap: 5 }}>
                {savedZones.map((z) => (
                  <div key={z.id} style={{ background: "#0a1220", border: "1px solid #1e3a8a",
                    borderRadius: 8, padding: "7px 10px", fontSize: 12,
                    display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#93c5fd" }}>{z.name}</div>
                      <div style={{ opacity: 0.6, fontSize: 11 }}>{z.propertyType !== "all" ? PROPERTY_TYPES[z.propertyType as PropertyType]?.label : "Toate"} · {z.lastCount} anunțuri</div>
                    </div>
                    <button onClick={() => setSavedZones((prev) => prev.filter((x) => x.id !== z.id))}
                      style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14 }}>🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== MODULE D: Scor zonă ===== */}
        {(areaFilter || loadingZoneScore) && (
          <ZoneScorePanel score={zoneScore} loading={loadingZoneScore} />
        )}

        {/* ===== MODULE C: Semnale de dezvoltare ===== */}
        {(areaFilter || loadingNews) && (
          <SignalPanel signals={newsSignals} loading={loadingNews} />
        )}

        {/* ===== MODULE E: Semnale geografice / proiecte ===== */}
        {(areaFilter || loadingZoneSignals) && (
          <ZoneSignalsPanel signals={zoneSignals} loading={loadingZoneSignals} />
        )}

        {/* ===== MODULE B: Căutare pe site-uri ===== */}
        {(areaFilter || loadingExternal) && (
          <ExternalPanel
            results={externalResults}
            links={externalLinks}
            loading={loadingExternal}
            propertyType={typeFilter}
          />
        )}

        {/* ===== LISTA CARDURI ===== */}
        {filteredLands.length === 0 && (
          <div style={{ opacity: 0.5, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
            {lands.length === 0 ? "Nicio proprietate adăugată încă." : "Niciun rezultat găsit."}
          </div>
        )}

        {filteredLands.map((l) => {
          const isSelected = l.id === effectiveSelectedLandId;
          const isGalleryOpen = expandedGallery === l.id;
          const cfg = PROPERTY_TYPES[l.propertyType] ?? PROPERTY_TYPES["teren-intravilan"];

          return (
            <div
              key={l.id}
              ref={(el) => { if (el) cardRefs.current[l.id] = el; else delete cardRefs.current[l.id]; }}
              onClick={() => setSelectedLandId(l.id)}
              style={{
                cursor: "pointer",
                border: isSelected ? `2px solid ${cfg.color}` : "1px solid #2a2a2a",
                borderRadius: 12, padding: 12, marginBottom: 10,
                background: isSelected ? cfg.color + "15" : "#151515",
                transition: "border-color 0.15s",
              }}
            >
              {/* Header card */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {/* Checkbox comparator */}
                  <input type="checkbox"
                    checked={compareIds.includes(l.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (e.target.checked) {
                        if (compareIds.length < 3) setCompareIds((p) => [...p, l.id]);
                      } else {
                        setCompareIds((p) => p.filter((id) => id !== l.id));
                      }
                    }}
                    title="Adaugă la comparator (max 3)"
                    style={{ accentColor: "#f59e0b", width: 14, height: 14, cursor: "pointer" }}
                  />
                  {/* Badge tip */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                    background: cfg.color + "33", color: cfg.color, border: `1px solid ${cfg.color}55`,
                  }}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "nowrap" }}>⭐ {l.score}</div>
              </div>

              <div style={{ fontWeight: 800, fontSize: 14, marginTop: 5 }}>{l.title}</div>

              {/* Thumbnail / Galerie */}
              {l.images.length > 0 && (
                <>
                  {isGalleryOpen ? (
                    <ImageGallery images={l.images} thumbnailIdx={l.thumbnailIdx ?? 0}
                      onDelete={(idx) => deleteImage(l.id, idx)} onSetThumbnail={(idx) => setThumbnail(l.id, idx)} />
                  ) : (
                    <CardThumbnail images={l.images} thumbnailIdx={l.thumbnailIdx ?? 0} />
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setExpandedGallery(isGalleryOpen ? null : l.id); }}
                    style={{ ...btn, marginTop: 5, fontSize: 11, padding: "4px 8px", opacity: 0.7 }}>
                    {isGalleryOpen ? "▲ Ascunde galerie" : `▼ Galerie (${l.images.length}/${MAX_IMAGES})`}
                  </button>
                </>
              )}

              <div style={{ opacity: 0.8, marginTop: 6, fontSize: 13 }}>📍 {l.locality}</div>
              <div style={{ opacity: 0.8, marginTop: 4, fontSize: 13 }}>
                💰 {l.negotiatedPrice > 0 ? l.negotiatedPrice.toLocaleString("ro-RO") + " €" : "Preț negociat nesetat"}
              </div>
              {l.areaM2 && <div style={{ opacity: 0.8, marginTop: 4, fontSize: 13 }}>📏 {l.areaM2.toLocaleString("ro-RO")} m²</div>}
              {(l.propertyType === "casa" || l.propertyType === "apartament") && l.rooms && (
                <div style={{ opacity: 0.8, marginTop: 4, fontSize: 13 }}>🚪 {l.rooms} camere</div>
              )}
              {l.propertyType === "apartament" && l.floor != null && (
                <div style={{ opacity: 0.8, marginTop: 4, fontSize: 13 }}>🏢 Etaj {l.floor}</div>
              )}
              <div style={{ opacity: 0.8, marginTop: 4, fontSize: 13 }}>
                📡 {l.distanceKm == null ? "locație necunoscută" : `${l.distanceKm.toFixed(1)} km distanță`}
              </div>
              <div style={{ marginTop: 5, fontSize: 13 }}>
                {l.confirmed ? (
                  <span style={{ color: "#4ade80" }}>✅ Confirmat</span>
                ) : (
                  <span style={{ color: "#facc15" }}>⏳ Neconfirmat</span>
                )}
              </div>

              {/* Bara rentabilitate */}
              <RentabilityBar score={computeRentability(l)} />

              {/* Butoane acțiuni */}
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {l.link && (
                  <button onClick={(e) => { e.stopPropagation(); window.open(l.link, "_blank", "noreferrer"); }} style={btn}>
                    🔗 Anunț
                  </button>
                )}
                {l.confirmed ? (
                  <button onClick={(e) => { e.stopPropagation(); onUnconfirm(l.id); }} style={btn}>🔓 Deblochează</button>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); onConfirm(l.id); }} style={btn}>📌 Confirmă</button>
                )}
                <button onClick={(e) => { e.stopPropagation(); setEditForm({ ...l }); setIsEditing(true); }} style={btn}>
                  ✏️ Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Ștergi "${l.title}"?`)) onDelete(l.id); }}
                  style={{ ...btn, borderColor: "#7f1d1d", color: "#f87171" }}>
                  🗑️
                </button>
              </div>

              {!l.confirmed && (
                <div style={{ fontSize: 11, opacity: 0.55, marginTop: 8 }}>
                  Trage pinul pe hartă, apoi apasă „Confirmă".
                </div>
              )}
            </div>
          );
        })}

        {/* ===== EDITARE RAPIDĂ ===== */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #222" }}>
          <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 14 }}>✏️ Editare rapidă</div>
          {!selectedLand ? (
            <div style={{ opacity: 0.5, fontSize: 13 }}>Selectează o proprietate din listă.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 11, opacity: 0.7 }}>Tip proprietate</label>
              <select
                value={selectedLand.propertyType}
                onChange={(e) => updateSelected({ propertyType: e.target.value as PropertyType })}
                style={{ ...inputDark }}>
                {ALL_TYPES.map(([pt, cfg]) => (
                  <option key={pt} value={pt}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>

              <label style={{ fontSize: 11, opacity: 0.7 }}>Titlu</label>
              <input value={selectedLand.title} onChange={(e) => updateSelected({ title: e.target.value })} style={inputDark} />

              <label style={{ fontSize: 11, opacity: 0.7 }}>Localitate</label>
              <input value={selectedLand.locality} onChange={(e) => updateSelected({ locality: e.target.value })} style={inputDark} />

              <label style={{ fontSize: 11, opacity: 0.7 }}>Link anunț</label>
              <input value={selectedLand.link} onChange={(e) => updateSelected({ link: e.target.value })} style={inputDark} />

              <label style={{ fontSize: 11, opacity: 0.7 }}>Preț negociat (€)</label>
              <input type="number" value={selectedLand.negotiatedPrice}
                onChange={(e) => updateSelected({ negotiatedPrice: safeNumber(e.target.value, 0) })} style={inputDark} />

              <label style={{ fontSize: 11, opacity: 0.7 }}>Suprafață (m²)</label>
              <input type="number" value={selectedLand.areaM2 ?? ""}
                onChange={(e) => updateSelected({ areaM2: e.target.value ? safeNumber(e.target.value, 0) : undefined })} style={inputDark} />

              {(selectedLand.propertyType === "casa" || selectedLand.propertyType === "apartament") && (
                <>
                  <label style={{ fontSize: 11, opacity: 0.7 }}>Camere</label>
                  <input type="number" value={selectedLand.rooms ?? ""}
                    onChange={(e) => updateSelected({ rooms: e.target.value ? safeNumber(e.target.value, 0) : undefined })} style={inputDark} />
                </>
              )}
              {selectedLand.propertyType === "apartament" && (
                <>
                  <label style={{ fontSize: 11, opacity: 0.7 }}>Etaj</label>
                  <input type="number" value={selectedLand.floor ?? ""}
                    onChange={(e) => updateSelected({ floor: e.target.value ? safeNumber(e.target.value, 0) : undefined })} style={inputDark} />
                </>
              )}

              <label style={{ fontSize: 11, opacity: 0.7 }}>Scor investiție (0-100)</label>
              <input type="number" value={selectedLand.score}
                onChange={(e) => updateSelected({ score: safeNumber(e.target.value, 0) })} style={inputDark} />

              {/* Upload poze */}
              <label style={{ fontSize: 11, opacity: 0.7 }}>Poze ({selectedLand.images.length}/{MAX_IMAGES})</label>
              {selectedLand.images.length < MAX_IMAGES ? (
                <label style={{
                  display: "block", padding: "10px 12px", borderRadius: 10, border: "1px dashed #444",
                  background: uploading ? "#0a1a0a" : "#0b0b0b", color: uploading ? "#4ade80" : "#aaa",
                  cursor: uploading ? "wait" : "pointer", textAlign: "center", fontSize: 13,
                }}>
                  {uploading ? "⏳ Se încarcă..." : "📷 Alege poză (JPG, PNG, WEBP)"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || !effectiveSelectedLandId) return;
                      uploadImage(file, effectiveSelectedLandId);
                      e.target.value = "";
                    }}
                    style={{ display: "none" }} />
                </label>
              ) : (
                <div style={{ fontSize: 12, color: "#f87171", padding: "8px 0" }}>
                  Limita de {MAX_IMAGES} poze atinsă.
                </div>
              )}

              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                📍 {selectedLand.lat.toFixed(6)}, {selectedLand.lng.toFixed(6)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== HANDLE RESIZE ===== */}
      <div
        onMouseDown={startResize}
        title="Trage pentru a redimensiona"
        style={{
          width: 6, cursor: "col-resize", background: "#1a1a1a", flexShrink: 0,
          borderLeft: "1px solid #2a2a2a", borderRight: "1px solid #2a2a2a",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#3a3a3a")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#1a1a1a")}
      />

      {/* ===== HARTA ===== */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Map
          lands={filteredLands}
          selectedLandId={effectiveSelectedLandId}
          onSelectLand={(id: string) => setSelectedLandId(id)}
          countryCenter={countryFlyTarget?.center}
          countryZoom={countryFlyTarget?.zoom}
        />
      </div>

      {/* ===== MODAL EDIT ===== */}
      {isEditing && editForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          onClick={() => { setIsEditing(false); setEditForm(null); }}
        >
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", color: "#fff", padding: 24, minWidth: 440, maxWidth: "90vw",
              maxHeight: "90vh", overflowY: "auto", borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.7)", border: "1px solid #222" }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16 }}>✏️ Editează proprietate</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {/* Tip */}
              <label style={{ fontSize: 11, opacity: 0.7 }}>Tip proprietate</label>
              <select value={editForm.propertyType}
                onChange={(e) => setEditForm((p) => p ? { ...p, propertyType: e.target.value as PropertyType } : p)}
                style={inputDark}>
                {ALL_TYPES.map(([pt, cfg]) => (
                  <option key={pt} value={pt}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>

              <input value={editForm.title}
                onChange={(e) => setEditForm((p) => p ? { ...p, title: e.target.value } : p)}
                placeholder="Titlu" style={inputDark} />
              <input value={editForm.locality}
                onChange={(e) => setEditForm((p) => p ? { ...p, locality: e.target.value } : p)}
                placeholder="Localitate" style={inputDark} />
              <input value={editForm.link}
                onChange={(e) => setEditForm((p) => p ? { ...p, link: e.target.value } : p)}
                placeholder="Link anunț" style={inputDark} />
              <input type="number" value={editForm.negotiatedPrice}
                onChange={(e) => setEditForm((p) => p ? { ...p, negotiatedPrice: safeNumber(e.target.value, 0) } : p)}
                placeholder="Preț negociat (€)" style={inputDark} />
              <input type="number" value={editForm.marketPrice ?? ""}
                onChange={(e) => setEditForm((p) => p ? { ...p, marketPrice: e.target.value ? safeNumber(e.target.value, 0) : undefined } : p)}
                placeholder="Preț piață (€) — opțional" style={inputDark} />
              <input type="number" value={editForm.areaM2 ?? ""}
                onChange={(e) => setEditForm((p) => p ? { ...p, areaM2: e.target.value ? safeNumber(e.target.value, 0) : undefined } : p)}
                placeholder="Suprafață m² — opțional" style={inputDark} />

              {(editForm.propertyType === "casa" || editForm.propertyType === "apartament") && (
                <input type="number" value={editForm.rooms ?? ""}
                  onChange={(e) => setEditForm((p) => p ? { ...p, rooms: e.target.value ? safeNumber(e.target.value, 0) : undefined } : p)}
                  placeholder="Număr camere" style={inputDark} />
              )}
              {editForm.propertyType === "apartament" && (
                <input type="number" value={editForm.floor ?? ""}
                  onChange={(e) => setEditForm((p) => p ? { ...p, floor: e.target.value ? safeNumber(e.target.value, 0) : undefined } : p)}
                  placeholder="Etaj" style={inputDark} />
              )}

              <input type="number" value={editForm.score}
                onChange={(e) => setEditForm((p) => p ? { ...p, score: safeNumber(e.target.value, 0) } : p)}
                placeholder="Scor (0-100)" style={inputDark} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={editForm.confirmed}
                  onChange={(e) => setEditForm((p) => p ? { ...p, confirmed: e.target.checked } : p)} />
                Locație confirmată (pin blocat)
              </label>
            </div>
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 10 }}>
              * Pozele sunt gestionate din card, nu se pierd la salvare.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => { setIsEditing(false); setEditForm(null); }} style={btn}>Anulează</button>
              <button onClick={handleModalSave}
                style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid #22c55e",
                  background: "#22c55e", color: "#000", fontWeight: 800, cursor: "pointer" }}>
                💾 Salvează
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL COMPARATOR ===== */}
      {showComparator && (
        <ComparatorModal
          lands={lands}
          ids={compareIds}
          onClose={() => setShowComparator(false)}
        />
      )}
    </div>
  );
}
