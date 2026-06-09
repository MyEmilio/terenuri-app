"use client";

import { useState } from "react";
import type { ScrapedItem } from "@/app/lib/scrapers/types";

const PROP_TYPES = [
  { value: "teren-intravilan", label: "Teren intravilan" },
  { value: "teren-agricol",    label: "Teren agricol" },
  { value: "teren-industrial", label: "Teren industrial" },
  { value: "casa",             label: "Casă" },
  { value: "apartament",       label: "Apartament" },
  { value: "spatiu-comercial", label: "Spațiu comercial" },
];

const SOURCES = [
  { value: "all",         label: "Toate sursele" },
  { value: "olx",        label: "OLX.ro" },
  { value: "imobiliare", label: "Imobiliare.ro" },
];

interface ResultItem extends ScrapedItem {
  _importState?: "idle" | "loading" | "done" | "error" | "exists";
  _importedId?: string;
  _importError?: string;
}

const SOURCE_COLORS: Record<string, string> = {
  olx: "#4ade80",
  imobiliare: "#60a5fa",
};

const btn = (active?: boolean, danger?: boolean): React.CSSProperties => ({
  padding: "8px 16px",
  borderRadius: 8,
  border: `1px solid ${danger ? "#7f1d1d" : active ? "#1d4ed8" : "#333"}`,
  background: danger ? "#1a0000" : active ? "#0b1a30" : "#0b0b0b",
  color: danger ? "#f87171" : active ? "#60a5fa" : "#e2e8f0",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: "nowrap" as const,
});

function PriceTag({ item }: { item: ScrapedItem }) {
  if (!item.price) return <span style={{ color: "#475569", fontSize: 12 }}>Preț necunoscut</span>;
  const eur = item.currency === "RON" ? Math.round(item.price / 4.97) : item.price;
  return (
    <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 14 }}>
      {eur.toLocaleString("ro-RO")} €
      {item.currency === "RON" && <span style={{ fontSize: 10, color: "#64748b", marginLeft: 4 }}>({item.price.toLocaleString("ro-RO")} RON)</span>}
    </span>
  );
}

export default function ScrapePage() {
  const [locality, setLocality] = useState("");
  const [propertyType, setPropertyType] = useState("teren-intravilan");
  const [source, setSource] = useState("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!locality.trim()) return;
    setLoading(true);
    setResults([]);
    setErrors([]);
    setSearched(false);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locality: locality.trim(), propertyType, sources: source }),
      });
      const data = await res.json() as { items: ScrapedItem[]; errors: string[]; total: number };
      setResults(data.items.map((it) => ({ ...it, _importState: "idle" as const })));
      setErrors(data.errors ?? []);
    } catch (err) {
      setErrors([String(err)]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  async function handleImport(idx: number) {
    const item = results[idx];
    setResults((prev) => prev.map((r, i) => i === idx ? { ...r, _importState: "loading" } : r));

    try {
      const res = await fetch("/api/scrape/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json() as { success?: boolean; id?: string; error?: string };

      if (res.status === 409) {
        setResults((prev) => prev.map((r, i) => i === idx ? { ...r, _importState: "exists", _importedId: data.id } : r));
      } else if (data.success) {
        setResults((prev) => prev.map((r, i) => i === idx ? { ...r, _importState: "done", _importedId: data.id } : r));
      } else {
        setResults((prev) => prev.map((r, i) => i === idx ? { ...r, _importState: "error", _importError: data.error } : r));
      }
    } catch (err) {
      setResults((prev) => prev.map((r, i) => i === idx ? { ...r, _importState: "error", _importError: String(err) } : r));
    }
  }

  async function handleImportAll() {
    const idxs = results
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r._importState === "idle")
      .map(({ i }) => i);

    for (const idx of idxs) {
      await handleImport(idx);
      await new Promise((resolve) => setTimeout(resolve, 600)); // respect Nominatim rate limit
    }
  }

  const importable = results.filter((r) => r._importState === "idle").length;
  const imported = results.filter((r) => r._importState === "done").length;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#111", borderBottom: "1px solid #222", padding: "16px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 2 }}>🔎 Scraper Anunțuri</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Caută proprietăți pe OLX și Imobiliare.ro și importă-le direct în baza de date</div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px" }}>

        {/* Formular căutare */}
        <form onSubmit={handleSearch} style={{ background: "#111", border: "1px solid #222", borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 5, fontWeight: 700, letterSpacing: 0.5 }}>LOCALITATE</label>
              <input
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="ex: Timișoara, Cluj-Napoca, Oradea..."
                required
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #333", background: "#0b0b0b", color: "#fff", fontSize: 14, boxSizing: "border-box" as const }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 5, fontWeight: 700, letterSpacing: 0.5 }}>TIP PROPRIETATE</label>
              <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #333", background: "#0b0b0b", color: "#fff", fontSize: 13 }}>
                {PROP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 5, fontWeight: 700, letterSpacing: 0.5 }}>SURSĂ</label>
              <select value={source} onChange={(e) => setSource(e.target.value)}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #333", background: "#0b0b0b", color: "#fff", fontSize: 13 }}>
                {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading} style={{ ...btn(true), padding: "9px 20px", opacity: loading ? 0.6 : 1 }}>
              {loading ? "⏳ Se caută..." : "🔍 Caută"}
            </button>
          </div>
        </form>

        {/* Erori */}
        {errors.length > 0 && (
          <div style={{ background: "#1a0000", border: "1px solid #7f1d1d", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#f87171", marginBottom: 4 }}>⚠️ Erori la scraping</div>
            {errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: "#fca5a5" }}>{e}</div>)}
          </div>
        )}

        {/* Rezultate header */}
        {searched && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {results.length > 0
                ? `${results.length} anunțuri găsite${imported > 0 ? ` · ${imported} importate` : ""}`
                : "Niciun anunț găsit"}
            </div>
            {importable > 0 && (
              <button onClick={handleImportAll} style={btn()}>
                ⬇️ Importă toate ({importable})
              </button>
            )}
          </div>
        )}

        {/* Grid rezultate */}
        {results.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
            {results.map((item, idx) => {
              const state = item._importState ?? "idle";
              const isDone = state === "done";
              const isExists = state === "exists";
              const isError = state === "error";
              const isLoading = state === "loading";

              return (
                <div key={idx} style={{
                  background: isDone ? "#071a0e" : isExists ? "#0a1020" : "#111",
                  border: `1px solid ${isDone ? "#166534" : isExists ? "#1e3a5f" : isError ? "#7f1d1d" : "#222"}`,
                  borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column",
                }}>
                  {/* Imagine */}
                  {item.imageUrl ? (
                    <div style={{ height: 140, overflow: "hidden", background: "#0a0a0a" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt={item.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ) : (
                    <div style={{ height: 80, background: "#0b0b0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
                      {item.propertyType === "apartament" ? "🏢" : item.propertyType === "casa" ? "🏡" : "📐"}
                    </div>
                  )}

                  <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Sursa + tip */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: SOURCE_COLORS[item.source] ?? "#fff",
                        background: `${SOURCE_COLORS[item.source] ?? "#fff"}18`, border: `1px solid ${SOURCE_COLORS[item.source] ?? "#fff"}33`,
                        borderRadius: 5, padding: "2px 7px" }}>
                        {item.source.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 10, color: "#64748b", background: "#1e293b", borderRadius: 5, padding: "2px 7px" }}>
                        {PROP_TYPES.find((t) => t.value === item.propertyType)?.label ?? item.propertyType}
                      </span>
                    </div>

                    {/* Titlu */}
                    <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.4, color: "#e2e8f0" }}>
                      {item.title.slice(0, 80)}{item.title.length > 80 ? "…" : ""}
                    </div>

                    {/* Localitate + suprafață */}
                    <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#94a3b8" }}>
                      <span>📍 {item.locality}</span>
                      {item.areaM2 && <span>📐 {item.areaM2} m²</span>}
                    </div>

                    {/* Preț */}
                    <PriceTag item={item} />

                    {/* Descriere */}
                    {item.description && (
                      <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
                        {item.description.slice(0, 100)}…
                      </div>
                    )}

                    <div style={{ flex: 1 }} />

                    {/* Status import + butoane */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noreferrer"
                          style={{ ...btn(), padding: "6px 10px", fontSize: 11, textDecoration: "none", display: "inline-block" }}>
                          🔗 Anunț
                        </a>
                      )}

                      {state === "idle" && (
                        <button onClick={() => handleImport(idx)} style={{ ...btn(true), padding: "6px 12px", fontSize: 11, flex: 1 }}>
                          ⬇️ Importă
                        </button>
                      )}
                      {isLoading && (
                        <span style={{ fontSize: 11, color: "#60a5fa", flex: 1 }}>⏳ Se importă…</span>
                      )}
                      {isDone && (
                        <a href={`/terenuri/${item._importedId}`}
                          style={{ fontSize: 11, color: "#4ade80", flex: 1, textDecoration: "none" }}>
                          ✅ Importat → Vezi detalii
                        </a>
                      )}
                      {isExists && (
                        <a href={`/terenuri/${item._importedId}`}
                          style={{ fontSize: 11, color: "#60a5fa", flex: 1, textDecoration: "none" }}>
                          📌 Există deja → Vezi
                        </a>
                      )}
                      {isError && (
                        <span style={{ fontSize: 11, color: "#f87171", flex: 1 }} title={item._importError}>
                          ❌ {(item._importError ?? "Eroare").slice(0, 40)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {searched && results.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Niciun anunț găsit</div>
            <div style={{ fontSize: 13 }}>Încearcă o altă localitate sau tip de proprietate.</div>
          </div>
        )}

        {!searched && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#334155" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏘️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Caută anunțuri imobiliare</div>
            <div style={{ fontSize: 13 }}>Introdu o localitate și selectează tipul de proprietate pentru a începe.</div>
          </div>
        )}
      </div>
    </div>
  );
}
