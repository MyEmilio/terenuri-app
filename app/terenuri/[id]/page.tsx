"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ZonePriceHint from "@/app/components/zone-price-hint";

const DetailMap = dynamic(() => import("./detail-map"), { ssr: false });

type ScoreFactor = { key: string; label: string; icon: string; score: number; max: number; details: string };
type AiScoreResult = { total: number; label: string; factors: ScoreFactor[] };
type PricePoint = { id: string; price: number; source: string; recordedAt: string };

type DbLand = {
  id: string;
  title: string;
  locality: string;
  link: string | null;
  lat: number;
  lng: number;
  score: number;
  negotiatedPrice: number | null;
  confirmed: boolean;
  imagePath: string | null;
  propertyType: string;
  marketPrice: number | null;
  areaM2: number | null;
  rooms: number | null;
  floor: number | null;
  images: string[];
  thumbnailIdx: number;
  createdAt: string;
  aiScore: number | null;
  aiScoreData: AiScoreResult | null;
  priceHistory: PricePoint[];
};

const PROPERTY_CONFIGS: Record<string, { label: string; icon: string; color: string }> = {
  "teren-agricol":    { label: "Teren agricol",    icon: "🌾", color: "#16a34a" },
  "teren-industrial": { label: "Teren industrial", icon: "🏭", color: "#ea580c" },
  "teren-intravilan": { label: "Teren intravilan", icon: "📐", color: "#2b6cb0" },
  "casa":             { label: "Casă",             icon: "🏡", color: "#dc2626" },
  "apartament":       { label: "Apartament",       icon: "🏢", color: "#7c3aed" },
  "spatiu-comercial": { label: "Spațiu comercial", icon: "🏪", color: "#ca8a04" },
};

function computeRentability(land: DbLand): number {
  let score = land.score * 0.4;
  if (land.marketPrice && land.negotiatedPrice && land.marketPrice > 0 && land.negotiatedPrice > 0) {
    const discount = (land.marketPrice - land.negotiatedPrice) / land.marketPrice;
    score += Math.min(30, Math.max(0, discount * 60));
  }
  if (land.areaM2 && land.areaM2 > 0 && land.negotiatedPrice && land.negotiatedPrice > 0) {
    const ppm2 = land.negotiatedPrice / land.areaM2;
    score += Math.max(0, Math.min(20, 20 - ppm2 / 100));
  }
  if (land.confirmed) score += 10;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function PriceChart({ points }: { points: PricePoint[] }) {
  if (points.length < 2) return null;

  const W = 640, H = 120, PAD = { t: 16, r: 16, b: 28, l: 64 };
  const prices = points.map((p) => p.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const times = points.map((p) => new Date(p.recordedAt).getTime());
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const tRange = maxT - minT || 1;

  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  const cx = (t: number) => PAD.l + ((t - minT) / tRange) * iW;
  const cy = (p: number) => PAD.t + iH - ((p - minP) / range) * iH;

  const pts = points.map((p) => ({ x: cx(new Date(p.recordedAt).getTime()), y: cy(p.price), ...p }));
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `M${pts[0].x},${PAD.t + iH} L${pts.map((p) => `${p.x},${p.y}`).join(" L")} L${pts[pts.length - 1].x},${PAD.t + iH} Z`;

  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k €` : `${n} €`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });

  const last = pts[pts.length - 1];
  const first = pts[0];
  const diff = last.price - first.price;
  const diffColor = diff < 0 ? "#4ade80" : diff > 0 ? "#f87171" : "#94a3b8";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>📉 Istoric preț ({points.length} înregistrări)</span>
        {diff !== 0 && (
          <span style={{ fontSize: 12, color: diffColor, fontWeight: 700 }}>
            {diff < 0 ? "▼" : "▲"} {Math.abs(diff).toLocaleString("ro-RO")} € față de primul preț
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + iH * t} y2={PAD.t + iH * t}
            stroke="#1e293b" strokeWidth="1" />
        ))}
        {/* Y labels */}
        {[0, 0.5, 1].map((t) => (
          <text key={t} x={PAD.l - 6} y={PAD.t + iH * t + 4} textAnchor="end"
            fill="#475569" fontSize="10">{fmt(maxP - range * t)}</text>
        ))}
        {/* Area fill */}
        <path d={area} fill="url(#pg)" />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
        {/* Points */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill={i === pts.length - 1 ? "#4ade80" : "#3b82f6"}
            stroke="#0a0a0a" strokeWidth="2">
            <title>{fmt(p.price)} — {fmtDate(p.recordedAt)}</title>
          </circle>
        ))}
        {/* X labels — first + last */}
        <text x={pts[0].x} y={H - 4} textAnchor="middle" fill="#475569" fontSize="10">{fmtDate(pts[0].recordedAt)}</text>
        <text x={pts[pts.length - 1].x} y={H - 4} textAnchor="middle" fill="#475569" fontSize="10">{fmtDate(pts[pts.length - 1].recordedAt)}</text>
      </svg>
    </div>
  );
}

const card = { background: "#111", border: "1px solid #222", borderRadius: 12, padding: "14px 16px" } as const;
const inputDark = { padding: "8px 12px", borderRadius: 10, border: "1px solid #333", background: "#0b0b0b", color: "#fff", width: "100%", boxSizing: "border-box" as const, fontSize: 16 };
const btn = { padding: "10px 16px", borderRadius: 10, border: "1px solid #333", background: "#0b0b0b", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" } as const;

export default function LandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [land, setLand] = useState<DbLand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState<AiScoreResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editLocality, setEditLocality] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editMarket, setEditMarket] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editRooms, setEditRooms] = useState("");
  const [editFloor, setEditFloor] = useState("");
  const [editScore, setEditScore] = useState("");
  const [editConfirmed, setEditConfirmed] = useState(false);
  const [editType, setEditType] = useState("");

  useEffect(() => {
    fetch(`/api/lands/${id}`)
      .then((r) => { if (!r.ok) throw new Error("Teren negăsit"); return r.json(); })
      .then((data: DbLand) => {
        setLand(data);
        setActiveImg(data.thumbnailIdx ?? 0);
        if (data.aiScoreData) setAiResult(data.aiScoreData);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function openEdit() {
    if (!land) return;
    setEditTitle(land.title);
    setEditLocality(land.locality);
    setEditLink(land.link ?? "");
    setEditPrice(land.negotiatedPrice != null ? String(land.negotiatedPrice) : "");
    setEditMarket(land.marketPrice != null ? String(land.marketPrice) : "");
    setEditArea(land.areaM2 != null ? String(land.areaM2) : "");
    setEditRooms(land.rooms != null ? String(land.rooms) : "");
    setEditFloor(land.floor != null ? String(land.floor) : "");
    setEditScore(String(land.score));
    setEditConfirmed(land.confirmed);
    setEditType(land.propertyType);
    setIsEditing(true);
  }

  async function saveEdit() {
    if (!land) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/lands/${land.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle, locality: editLocality, link: editLink,
          negotiatedPrice: editPrice ? Number(editPrice) : null,
          marketPrice: editMarket ? Number(editMarket) : null,
          areaM2: editArea ? Number(editArea) : null,
          rooms: editRooms ? Number(editRooms) : null,
          floor: editFloor !== "" ? Number(editFloor) : null,
          score: Number(editScore), confirmed: editConfirmed,
          propertyType: editType,
        }),
      });
      if (!res.ok) throw new Error("Eroare server");
      const updated = await res.json() as DbLand;
      setLand(updated);
      setIsEditing(false);
    } catch {
      alert("Salvarea a eșuat. Verifică conexiunea.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLand() {
    if (!land || !confirm(`Ștergi "${land.title}"?`)) return;
    await fetch(`/api/lands/${land.id}`, { method: "DELETE" }).catch(() => {});
    router.push("/");
  }

  async function toggleConfirm() {
    if (!land) return;
    const res = await fetch(`/api/lands/${land.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed: !land.confirmed }),
    });
    if (res.ok) setLand((p) => p ? { ...p, confirmed: !p.confirmed } : p);
  }

  async function calculateAiScore() {
    if (!land) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/lands/${land.id}/score`, { method: "POST" });
      if (!res.ok) throw new Error("Eroare server");
      const result = await res.json() as AiScoreResult;
      setAiResult(result);
      setLand((p) => p ? { ...p, aiScore: result.total, aiScoreData: result } : p);
    } catch {
      alert("Calculul a eșuat. Încearcă din nou.");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: "100%", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16 }}>
      ⏳ Se încarcă...
    </div>
  );

  if (error || !land) return (
    <div style={{ minHeight: "100%", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#fff" }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <div style={{ fontSize: 18 }}>{error ?? "Teren negăsit"}</div>
      <Link href="/" style={{ color: "#60a5fa", textDecoration: "none" }}>← Înapoi la hartă</Link>
    </div>
  );

  const cfg = PROPERTY_CONFIGS[land.propertyType] ?? PROPERTY_CONFIGS["teren-intravilan"];
  const rentability = computeRentability(land);
  const rentColor = rentability >= 70 ? "#4ade80" : rentability >= 40 ? "#f59e0b" : "#f87171";
  const allImages = land.images?.length ? land.images : land.imagePath ? [land.imagePath] : [];
  const safeImg = Math.min(activeImg, Math.max(0, allImages.length - 1));
  const discount = land.marketPrice && land.negotiatedPrice && land.marketPrice > 0
    ? Math.round(((land.marketPrice - land.negotiatedPrice) / land.marketPrice) * 100) : null;

  return (
    <div style={{ minHeight: "100%", background: "#0a0a0a", color: "#fff", fontFamily: "system-ui, sans-serif" }}>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 12px", display: "grid", gap: 14 }}>

        {/* Titlu */}
        <div>
          <Link href="/" style={{ fontSize: 12, color: "#475569", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
            ← Înapoi la hartă
          </Link>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: cfg.color + "33", color: cfg.color, border: `1px solid ${cfg.color}55` }}>
              {cfg.icon} {cfg.label}
            </span>
            {land.confirmed
              ? <span style={{ fontSize: 11, color: "#4ade80", background: "#052e16", border: "1px solid #166534", borderRadius: 20, padding: "3px 10px" }}>✅ Confirmat</span>
              : <span style={{ fontSize: 11, color: "#fbbf24", background: "#1c1300", border: "1px solid #713f12", borderRadius: 20, padding: "3px 10px" }}>⏳ Neconfirmat</span>
            }
          </div>
          <h1 style={{ margin: 0, fontSize: "clamp(18px, 5vw, 26px)", fontWeight: 900, lineHeight: 1.2 }}>{land.title}</h1>
          <div style={{ color: "#94a3b8", marginTop: 6, fontSize: 14 }}>📍 {land.locality}</div>
          <div style={{ color: "#475569", marginTop: 3, fontSize: 12 }}>
            Adăugat: {new Date(land.createdAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* Metrici cheie */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
          {([
            { label: "Preț negociat", value: land.negotiatedPrice ? `${land.negotiatedPrice.toLocaleString("ro-RO")} €` : "—", color: "#4ade80" },
            { label: "Preț piață", value: land.marketPrice ? `${land.marketPrice.toLocaleString("ro-RO")} €` : "—", color: "#94a3b8" },
            { label: "Discount", value: discount != null ? `${discount}%` : "—", color: discount != null && discount > 0 ? "#f59e0b" : "#64748b" },
            { label: "Suprafață", value: land.areaM2 ? `${land.areaM2.toLocaleString("ro-RO")} m²` : "—", color: "#94a3b8" },
            { label: "Scor", value: `${land.score}/100`, color: "#60a5fa" },
            { label: "Rentabilitate", value: `${rentability}/100`, color: rentColor },
          ] as {label:string;value:string;color:string}[]).map(({ label, value, color }) => (
            <div key={label} style={{ ...card, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Bară rentabilitate */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 700 }}>📈 Indice rentabilitate</span>
            <span style={{ color: rentColor, fontWeight: 800 }}>{rentability}/100</span>
          </div>
          <div style={{ background: "#1e293b", borderRadius: 6, height: 10, overflow: "hidden" }}>
            <div style={{ width: `${rentability}%`, height: "100%", background: rentColor, borderRadius: 6, transition: "width 0.8s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>
            Calculat din: scor utilizator (40%) + discount față de piață (30%) + eficiență m² (20%) + confirmare (10%)
          </div>
        </div>

        {/* Istoric preț */}
        {land.priceHistory?.length >= 2 && (
          <div style={card}>
            <PriceChart points={land.priceHistory} />
          </div>
        )}

        {/* AI Score Engine */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: aiResult ? 16 : 0, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>🤖 Scor AI — 8 factori</div>
              {!aiResult && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>Analizează locația prin OSM, preț, infrastructură și mai mult.</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {aiResult && (
                <div style={{ textAlign: "right" }}>
                  {(() => {
                    const aiColor = aiResult.total >= 65 ? "#4ade80" : aiResult.total >= 35 ? "#f59e0b" : "#f87171";
                    const labelBg = aiResult.total >= 65 ? "#052e16" : aiResult.total >= 35 ? "#1c1300" : "#1a0000";
                    const labelBorder = aiResult.total >= 65 ? "#166534" : aiResult.total >= 35 ? "#713f12" : "#7f1d1d";
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: aiColor }}>{aiResult.total}<span style={{ fontSize: 13, opacity: 0.6 }}>/100</span></div>
                        <div style={{ background: labelBg, border: `1px solid ${labelBorder}`, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 800, color: aiColor, letterSpacing: 1 }}>{aiResult.label}</div>
                      </div>
                    );
                  })()}
                </div>
              )}
              <button onClick={calculateAiScore} disabled={aiLoading}
                style={{ ...btn, borderColor: "#7c3aed", color: aiLoading ? "#a78bfa" : "#c4b5fd", background: aiLoading ? "#1e1030" : "#0b0b0b", whiteSpace: "nowrap" }}>
                {aiLoading ? "⏳ Se calculează..." : aiResult ? "🔄 Recalculează" : "🚀 Calculează"}
              </button>
            </div>
          </div>

          {aiLoading && (
            <div style={{ padding: "16px 0", fontSize: 13, color: "#94a3b8" }}>
              <div style={{ marginBottom: 6 }}>⏳ Se interoghează OpenStreetMap...</div>
              <div style={{ background: "#1e293b", borderRadius: 6, height: 6, overflow: "hidden" }}>
                <div style={{ width: "60%", height: "100%", background: "#7c3aed", borderRadius: 6, animation: "pulse 1.5s ease-in-out infinite" }} />
              </div>
            </div>
          )}

          {aiResult && !aiLoading && (
            <div style={{ display: "grid", gap: 10 }}>
              {aiResult.factors.map((f) => {
                const pct = Math.round((f.score / f.max) * 100);
                const fc = pct >= 65 ? "#4ade80" : pct >= 35 ? "#f59e0b" : "#64748b";
                return (
                  <div key={f.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginBottom: 3 }}>
                      <span style={{ fontWeight: 600 }}>{f.icon} {f.label}</span>
                      <span style={{ color: fc, fontWeight: 700 }}>{f.score}/{f.max}</span>
                    </div>
                    <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden", marginBottom: 3 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: fc, borderRadius: 3, transition: "width 0.6s ease" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{f.details}</div>
                  </div>
                );
              })}
              <div style={{ fontSize: 10, color: "#334155", marginTop: 6, paddingTop: 8, borderTop: "1px solid #1e293b" }}>
                Surse: OpenStreetMap · Overpass API · Date proprietate
              </div>
            </div>
          )}
        </div>

        {/* Galerie */}
        {allImages.length > 0 && (
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📷 Galerie ({allImages.length} {allImages.length === 1 ? "poză" : "poze"})</div>
            <div style={{ position: "relative", marginBottom: allImages.length > 1 ? 10 : 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={allImages[safeImg]} alt={`poza ${safeImg + 1}`}
                style={{ width: "100%", height: 320, objectFit: "cover", borderRadius: 10, border: "1px solid #333", display: "block" }} />
              {allImages.length > 1 && (
                <>
                  <button onClick={() => setActiveImg((p) => Math.max(0, p - 1))} disabled={safeImg === 0}
                    style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.7)", border: "1px solid #555", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 18, opacity: safeImg === 0 ? 0.3 : 1 }}>‹</button>
                  <button onClick={() => setActiveImg((p) => Math.min(allImages.length - 1, p + 1))} disabled={safeImg === allImages.length - 1}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.7)", border: "1px solid #555", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 18, opacity: safeImg === allImages.length - 1 ? 0.3 : 1 }}>›</button>
                  <div style={{ position: "absolute", bottom: 10, right: 12, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, borderRadius: 6, padding: "2px 8px" }}>
                    {safeImg + 1} / {allImages.length}
                  </div>
                </>
              )}
            </div>
            {allImages.length > 1 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {allImages.map((src, i) => (
                  <div key={i} onClick={() => setActiveImg(i)}
                    style={{ cursor: "pointer", borderRadius: 6, border: `2px solid ${i === safeImg ? cfg.color : i === land.thumbnailIdx ? "#f59e0b" : "transparent"}`, overflow: "hidden", width: 60, height: 48, flexShrink: 0, transition: "border-color 0.15s" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`thumb ${i + 1}`} style={{ width: 60, height: 48, objectFit: "cover", display: "block" }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hartă */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
            📍 Locație
            <span style={{ fontWeight: 400, color: "#64748b", fontSize: 12, marginLeft: 8 }}>
              {land.lat.toFixed(5)}, {land.lng.toFixed(5)}
            </span>
          </div>
          <DetailMap lat={land.lat} lng={land.lng} title={land.title} color={cfg.color} />
        </div>

        {/* Detalii complete */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>📋 Detalii complete</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px 20px", fontSize: 13 }}>
            {([
              { label: "Tip proprietate", value: `${cfg.icon} ${cfg.label}` },
              { label: "Localitate", value: land.locality },
              land.negotiatedPrice != null ? { label: "Preț negociat", value: `${land.negotiatedPrice.toLocaleString("ro-RO")} €` } : null,
              land.marketPrice != null ? { label: "Preț piață", value: `${land.marketPrice.toLocaleString("ro-RO")} €` } : null,
              land.areaM2 != null ? { label: "Suprafață", value: `${land.areaM2.toLocaleString("ro-RO")} m²` } : null,
              land.negotiatedPrice && land.areaM2 ? { label: "Preț / m²", value: `${Math.round(land.negotiatedPrice / land.areaM2).toLocaleString("ro-RO")} €/m²` } : null,
              (land.propertyType === "casa" || land.propertyType === "apartament") && land.rooms != null ? { label: "Camere", value: String(land.rooms) } : null,
              land.propertyType === "apartament" && land.floor != null ? { label: "Etaj", value: String(land.floor) } : null,
              { label: "Scor investiție", value: `${land.score}/100` },
              { label: "Rentabilitate", value: `${rentability}/100` },
              { label: "Status", value: land.confirmed ? "✅ Confirmat" : "⏳ Neconfirmat" },
            ] as ({label:string;value:string}|null)[]).filter(Boolean).map((item) => (
              <div key={item!.label}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>{item!.label}</div>
                <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{item!.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Acțiuni */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 32 }}>
          {land.link && (
            <a href={land.link} target="_blank" rel="noreferrer"
              style={{ ...btn, color: "#60a5fa", borderColor: "#1e3a8a", textDecoration: "none" }}>
              🔗 Anunț original
            </a>
          )}
          <button onClick={openEdit} style={{ ...btn, borderColor: "#f59e0b", color: "#f59e0b" }}>
            ✏️ Editează
          </button>
          <button onClick={toggleConfirm}
            style={{ ...btn, borderColor: land.confirmed ? "#166534" : "#713f12", color: land.confirmed ? "#4ade80" : "#fbbf24" }}>
            {land.confirmed ? "🔓 Deconfirmă" : "📌 Confirmă"}
          </button>
          <button onClick={deleteLand} style={{ ...btn, borderColor: "#7f1d1d", color: "#f87171" }}>
            🗑️ Șterge
          </button>
        </div>
      </div>

      {/* Modal editare */}
      {isEditing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          onClick={() => setIsEditing(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", color: "#fff", padding: "20px 16px", width: "min(480px, 92vw)", maxHeight: "88dvh", overflowY: "auto", borderRadius: 16, border: "1px solid #222", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>✏️ Editează proprietate</h3>
            <div style={{ display: "grid", gap: 10 }}>
              <select value={editType} onChange={(e) => setEditType(e.target.value)} style={inputDark}>
                {Object.entries(PROPERTY_CONFIGS).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Titlu" style={inputDark} />
              <input value={editLocality} onChange={(e) => setEditLocality(e.target.value)} placeholder="Localitate" style={inputDark} />
              <input value={editLink} onChange={(e) => setEditLink(e.target.value)} placeholder="Link anunț" style={inputDark} />
              <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="Preț negociat (€)" style={inputDark} />
              <ZonePriceHint
                locality={editLocality}
                propertyType={editType}
                areaM2={editArea ? parseFloat(editArea) : undefined}
                onUseSuggested={(price) => setEditPrice(String(price))}
              />
              <input type="number" value={editMarket} onChange={(e) => setEditMarket(e.target.value)} placeholder="Preț piață (€) — opțional" style={inputDark} />
              <input type="number" value={editArea} onChange={(e) => setEditArea(e.target.value)} placeholder="Suprafață m² — opțional" style={inputDark} />
              {(editType === "casa" || editType === "apartament") && (
                <input type="number" value={editRooms} onChange={(e) => setEditRooms(e.target.value)} placeholder="Camere" style={inputDark} />
              )}
              {editType === "apartament" && (
                <input type="number" value={editFloor} onChange={(e) => setEditFloor(e.target.value)} placeholder="Etaj" style={inputDark} />
              )}
              <input type="number" value={editScore} onChange={(e) => setEditScore(e.target.value)} placeholder="Scor (0-100)" style={inputDark} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={editConfirmed} onChange={(e) => setEditConfirmed(e.target.checked)} />
                Locație confirmată
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={() => setIsEditing(false)} style={btn}>Anulează</button>
              <button onClick={saveEdit} disabled={saving}
                style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #22c55e", background: saving ? "#052e16" : "#22c55e", color: saving ? "#4ade80" : "#000", fontWeight: 800, cursor: saving ? "wait" : "pointer" }}>
                {saving ? "⏳ Se salvează..." : "💾 Salvează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
