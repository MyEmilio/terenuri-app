"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { AreaBounds } from "./analyze-map";

const AnalyzeMap = dynamic(() => import("./analyze-map"), { ssr: false });

type ScoreFactor = { label: string; score: number; max: number; details: string[]; icon: string };
type ZoneScore = { total: number; label: "RIDICAT" | "MEDIU" | "SCĂZUT"; factors: ScoreFactor[]; highlights: string[]; city: string };
type NewsSignal = { title: string; link: string; pubDate: string; source: string; snippet: string };
type ZoneSignal = { id: string; category: string; title: string; description: string; count: number; impact: string };

function ScoreCircle({ total, label }: { total: number; label: string }) {
  const color = total >= 65 ? "#4ade80" : total >= 35 ? "#f59e0b" : "#f87171";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ width: 96, height: 96, borderRadius: "50%", border: `5px solid ${color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `${color}11`, boxShadow: `0 0 24px ${color}33` }}>
        <span style={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: 10, color, opacity: 0.7 }}>/100</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: 1, background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px" }}>{label}</div>
    </div>
  );
}

export default function AnalyzePage() {
  const [zone, setZone] = useState<AreaBounds | null>(null);
  const [zoneScore, setZoneScore] = useState<ZoneScore | null>(null);
  const [newsSignals, setNewsSignals] = useState<NewsSignal[]>([]);
  const [geoSignals, setGeoSignals] = useState<ZoneSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"score" | "news" | "geo">("score");

  async function handleZoneDrawn(bounds: AreaBounds) {
    setZone(bounds);
    setLoading(true);
    setZoneScore(null);
    setNewsSignals([]);
    setGeoSignals([]);

    const { ne, sw } = bounds;
    const centerLat = (ne.lat + sw.lat) / 2;
    const centerLng = (ne.lng + sw.lng) / 2;

    await Promise.all([
      fetch(`/api/zone-score?neLat=${ne.lat}&neLng=${ne.lng}&swLat=${sw.lat}&swLng=${sw.lng}`)
        .then((r) => r.json()).then((d) => setZoneScore(d as ZoneScore)).catch(() => {}),
      fetch(`/api/news?lat=${centerLat}&lng=${centerLng}&lang=ro`)
        .then((r) => r.json()).then((d) => setNewsSignals((d.items ?? []) as NewsSignal[])).catch(() => {}),
      fetch(`/api/zone-signals?neLat=${ne.lat}&neLng=${ne.lng}&swLat=${sw.lat}&swLng=${sw.lng}`)
        .then((r) => r.json()).then((d) => setGeoSignals((d.signals ?? []) as ZoneSignal[])).catch(() => {}),
    ]);
    setLoading(false);
  }

  function handleZoneCleared() {
    setZone(null);
    setZoneScore(null);
    setNewsSignals([]);
    setGeoSignals([]);
  }

  const tabBtn = (key: typeof activeTab, label: string, count?: number) => (
    <button onClick={() => setActiveTab(key)}
      style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: activeTab === key ? "1px solid #60a5fa" : "1px solid #222",
        background: activeTab === key ? "#0b1a30" : "#0b0b0b", color: activeTab === key ? "#60a5fa" : "#64748b",
        fontWeight: activeTab === key ? 700 : 400, fontSize: 12, cursor: "pointer" }}>
      {label}{count != null && count > 0 ? ` (${count})` : ""}
    </button>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0a0a0a", color: "#fff", fontFamily: "system-ui, sans-serif" }}>

      {/* Panel stânga */}
      <div style={{ width: 340, minWidth: 340, background: "#111", borderRight: "1px solid #222", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #222" }}>
          <div style={{ fontWeight: 900, fontSize: 17 }}>🔍 Analizează Zonă</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Desenează un dreptunghi pe hartă pentru analiză</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Instrucțiune */}
          {!zone && !loading && (
            <div style={{ background: "#0a1a30", border: "1px solid #1e3a8a", borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✏️</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Selectează o zonă</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                Apasă iconița ■ din bara de instrumente a hărții, apoi desenează un dreptunghi pe zona de interes.
              </div>
            </div>
          )}

          {loading && (
            <div style={{ background: "#0b0b0b", border: "1px solid #1e293b", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#60a5fa" }}>⏳ Se analizează zona...</div>
              {["Scor potențial zonă", "Știri de dezvoltare", "Semnale geo / proiecte"].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", animation: "pulse 1s ease-in-out infinite", flexShrink: 0 }} />
                  {step}
                </div>
              ))}
            </div>
          )}

          {/* Tabs rezultate */}
          {(zoneScore || newsSignals.length > 0 || geoSignals.length > 0) && (
            <>
              <div style={{ display: "flex", gap: 6 }}>
                {tabBtn("score", "🎯 Scor")}
                {tabBtn("news", "📰 Știri", newsSignals.length)}
                {tabBtn("geo", "📡 Geo", geoSignals.length)}
              </div>

              {/* Tab Scor */}
              {activeTab === "score" && zoneScore && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, background: "#080d14", border: "1px solid #1e293b", borderRadius: 14, padding: 16 }}>
                    <ScoreCircle total={zoneScore.total} label={zoneScore.label} />
                    <div style={{ flex: 1 }}>
                      {zoneScore.city && <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>📍 {zoneScore.city}</div>}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {zoneScore.highlights.slice(0, 4).map((h, i) => (
                          <div key={i} style={{ fontSize: 11, color: "#94a3b8", display: "flex", gap: 5 }}>
                            <span style={{ color: "#4ade80", flexShrink: 0 }}>✔</span>
                            <span>{h.charAt(0).toUpperCase() + h.slice(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {zoneScore.factors.map((f) => {
                      const pct = Math.round((f.score / f.max) * 100);
                      const fc = pct >= 65 ? "#4ade80" : pct >= 35 ? "#f59e0b" : "#64748b";
                      return (
                        <div key={f.label} style={{ background: "#0b0b0b", border: "1px solid #1e293b", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                            <span style={{ color: "#94a3b8", fontWeight: 600 }}>{f.icon} {f.label}</span>
                            <span style={{ color: fc, fontWeight: 700 }}>{f.score}/{f.max}</span>
                          </div>
                          <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: fc, borderRadius: 3, transition: "width 0.6s" }} />
                          </div>
                          {f.details.slice(0, 2).map((d, i) => (
                            <div key={i} style={{ fontSize: 10, color: "#475569" }}>{d}</div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: "#334155", textAlign: "center" }}>Surse: OpenStreetMap · Overpass API</div>
                </div>
              )}

              {/* Tab Știri */}
              {activeTab === "news" && (
                <div>
                  {newsSignals.length === 0
                    ? <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", padding: "20px 0" }}>Nicio știre găsită pentru această zonă.</div>
                    : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {newsSignals.map((s, i) => (
                          <a key={i} href={s.link} target="_blank" rel="noreferrer"
                            style={{ display: "block", background: "#1a1200", border: "1px solid #3a2800", borderRadius: 10, padding: "10px 12px", color: "#fde68a", textDecoration: "none" }}>
                            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3, lineHeight: 1.4 }}>{s.title}</div>
                            {s.snippet && <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.4 }}>{s.snippet.slice(0, 140)}...</div>}
                            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 5 }}>{s.source} · {s.pubDate.slice(0, 16)}</div>
                          </a>
                        ))}
                      </div>
                    )
                  }
                </div>
              )}

              {/* Tab Geo */}
              {activeTab === "geo" && (
                <div>
                  {geoSignals.length === 0
                    ? <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", padding: "20px 0" }}>Niciun semnal geo găsit pentru această zonă.</div>
                    : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {geoSignals.map((s) => (
                          <div key={s.id} style={{ background: "#08131f", border: "1px solid #1e3a5f", borderRadius: 10, padding: "10px 12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: "#cffafe", marginBottom: 3 }}>{s.title}</div>
                                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.4 }}>{s.description}</div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontSize: 12, color: "#22d3ee", fontWeight: 700 }}>{s.count} semnal{s.count !== 1 ? "e" : ""}</div>
                                <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{s.impact}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>
              )}
            </>
          )}

          {/* Coordonate zonă */}
          {zone && (
            <div style={{ background: "#0b0b0b", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#475569" }}>
              <div style={{ marginBottom: 2 }}>NE: {zone.ne.lat.toFixed(4)}, {zone.ne.lng.toFixed(4)}</div>
              <div>SW: {zone.sw.lat.toFixed(4)}, {zone.sw.lng.toFixed(4)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Harta */}
      <div style={{ flex: 1, position: "relative" }}>
        <AnalyzeMap onZoneDrawn={handleZoneDrawn} onZoneCleared={handleZoneCleared} />
        {!zone && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(17,17,17,0.9)", border: "1px solid #333", borderRadius: 14, padding: "16px 22px", textAlign: "center", pointerEvents: "none", zIndex: 500 }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>✏️</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>Desenează o zonă</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>Folosește iconița ■ din bara de instrumente</div>
          </div>
        )}
      </div>
    </div>
  );
}
