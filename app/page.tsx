"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Land = {
  id: string;
  title: string;
  locality: string;
  link: string;
  lat: number;
  lng: number;
  score: number;
  negotiatedPrice: number;
  images: string[]; // base64 sau URL-uri
  thumbnailIdx: number; // index-ul pozei principale
  marketPrice?: number;
  areaM2?: number;
  confirmed: boolean;
};

type LandWithDistance = Land & { distanceKm: number | null };
type RawLand = Partial<Land> & Record<string, unknown>;

const Map = dynamic(() => import("./map"), { ssr: false });
const STORAGE_KEY = "terenuri_v2";
const MAX_IMAGES = 5;

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

// Convertim fișierul la base64 pentru stocare locală
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ====== GALERIE COMPONENT ======
function ImageGallery({
  images,
  thumbnailIdx,
  onDelete,
  onSetThumbnail,
}: {
  images: string[];
  thumbnailIdx: number;
  onDelete: (idx: number) => void;
  onSetThumbnail: (idx: number) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  // Când se schimbă imaginile, asigurăm că activeIdx e valid
  const safeIdx = Math.min(activeIdx, Math.max(0, images.length - 1));

  useEffect(() => {
    if (activeIdx >= images.length && images.length > 0) {
      setActiveIdx(images.length - 1);
    }
  }, [images.length, activeIdx]);

  if (images.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
      {/* Poza mare */}
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[safeIdx]}
          alt={`poza ${safeIdx + 1}`}
          style={{
            width: "100%",
            height: 180,
            objectFit: "cover",
            borderRadius: 10,
            border: safeIdx === thumbnailIdx ? "2px solid #f59e0b" : "1px solid #333",
            display: "block",
          }}
        />

        {/* Badge thumbnail */}
        {safeIdx === thumbnailIdx && (
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              background: "#f59e0b",
              color: "#000",
              fontSize: 10,
              fontWeight: 800,
              borderRadius: 5,
              padding: "2px 6px",
              letterSpacing: 0.5,
            }}
          >
            ★ THUMBNAIL
          </div>
        )}

        {/* Buton setare thumbnail */}
        {safeIdx !== thumbnailIdx && (
          <button
            onClick={() => onSetThumbnail(safeIdx)}
            title="Setează ca thumbnail"
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              background: "rgba(0,0,0,0.7)",
              border: "1px solid #555",
              borderRadius: 6,
              color: "#f59e0b",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              padding: "3px 7px",
            }}
          >
            ★ Set thumbnail
          </button>
        )}

        {/* Buton ștergere */}
        <button
          onClick={() => {
            onDelete(safeIdx);
            setActiveIdx(Math.max(0, safeIdx - 1));
          }}
          title="Șterge poza"
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            background: "rgba(200,0,0,0.85)",
            border: "none",
            borderRadius: 6,
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            padding: "2px 8px",
            lineHeight: 1.6,
          }}
        >
          ✕
        </button>

        {/* Counter */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 8,
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontSize: 11,
            borderRadius: 6,
            padding: "2px 7px",
          }}
        >
          {safeIdx + 1} / {images.length}
        </div>
      </div>

      {/* Miniaturi */}
      {images.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {images.map((src, idx) => (
            <div
              key={idx}
              onClick={() => setActiveIdx(idx)}
              style={{
                position: "relative",
                cursor: "pointer",
                borderRadius: 7,
                border:
                  idx === safeIdx
                    ? "2px solid #4ade80"
                    : idx === thumbnailIdx
                    ? "2px solid #f59e0b"
                    : "2px solid transparent",
                overflow: "hidden",
                width: 56,
                height: 44,
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`thumb ${idx + 1}`}
                style={{ width: 56, height: 44, objectFit: "cover", display: "block" }}
              />
              {idx === thumbnailIdx && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(245,158,11,0.85)",
                    color: "#000",
                    fontSize: 8,
                    fontWeight: 800,
                    textAlign: "center",
                    padding: "1px 0",
                  }}
                >
                  ★
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ====== CARD THUMBNAIL PREVIEW (în lista principală) ======
function CardThumbnail({ images, thumbnailIdx }: { images: string[]; thumbnailIdx: number }) {
  if (images.length === 0) return null;
  const src = images[thumbnailIdx] ?? images[0];
  return (
    <div style={{ position: "relative", marginTop: 8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="thumbnail"
        style={{
          width: "100%",
          height: 110,
          objectFit: "cover",
          borderRadius: 8,
          border: "1px solid #444",
          display: "block",
        }}
      />
      {images.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 5,
            right: 7,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: 10,
            borderRadius: 5,
            padding: "1px 6px",
          }}
        >
          +{images.length - 1} poze
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lands, setLands] = useState<Land[]>([]);
  const [selectedLandId, setSelectedLandId] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = useState("");
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Land | null>(null);
  // stare galerie extinsă per card
  const [expandedGallery, setExpandedGallery] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const effectiveSelectedLandId = selectedLandId ?? lands[0]?.id ?? null;

  const selectedLand = useMemo(
    () => lands.find((l) => l.id === effectiveSelectedLandId) || null,
    [lands, effectiveSelectedLandId]
  );

  // ====== FIX: uploadImage cu useCallback + fără closure stale ======
  const uploadImage = useCallback(async (file: File, landId: string) => {
    // validare tip fișier
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      alert("Tip de fișier nepermis. Acceptăm: JPG, PNG, WEBP, GIF.");
      return;
    }
    // validare dimensiune (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Fișierul este prea mare. Limita este 10MB.");
      return;
    }

    setUploading(true);
    try {
      // Încearcă upload pe server
      const formData = new FormData();
      formData.append("file", file);
      formData.append("landId", landId);

      let imagePath: string | null = null;

      try {
        const res = await fetch("/api/lands/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          imagePath = data.path as string;
        }
      } catch {
        // server indisponibil — fallback la base64
      }

      // Dacă server-ul nu a răspuns, salvăm ca base64 local
      if (!imagePath) {
        imagePath = await fileToBase64(file);
      }

      const finalPath = imagePath;

      // FIX: folosim callback în setLands pentru a evita stale closure
      setLands((prev) => {
        const land = prev.find((l) => l.id === landId);
        if (!land) return prev;
        if ((land.images ?? []).length >= MAX_IMAGES) {
          alert("Ai atins limita de 5 poze per teren.");
          return prev;
        }
        return prev.map((l) =>
          l.id === landId ? { ...l, images: [...(l.images ?? []), finalPath] } : l
        );
      });
    } catch (err) {
      console.error(err);
      alert("Upload a eșuat. Încearcă din nou.");
    } finally {
      setUploading(false);
    }
  }, []);

  const deleteImage = useCallback((landId: string, imgIdx: number) => {
    setLands((prev) =>
      prev.map((l) => {
        if (l.id !== landId) return l;
        const newImages = l.images.filter((_, i) => i !== imgIdx);
        // ajustăm thumbnailIdx dacă e necesar
        let newThumb = l.thumbnailIdx;
        if (imgIdx === l.thumbnailIdx) {
          newThumb = 0; // resetăm la prima poză
        } else if (imgIdx < l.thumbnailIdx) {
          newThumb = l.thumbnailIdx - 1; // shiftăm
        }
        newThumb = Math.min(newThumb, Math.max(0, newImages.length - 1));
        return { ...l, images: newImages, thumbnailIdx: newThumb };
      })
    );
  }, []);

  const setThumbnail = useCallback((landId: string, idx: number) => {
    setLands((prev) =>
      prev.map((l) => (l.id === landId ? { ...l, thumbnailIdx: idx } : l))
    );
  }, []);

  // ====== LOAD din localStorage ======
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // migrare de la STORAGE_KEY vechi (terenuri_v1)
      const rawOld = !raw ? localStorage.getItem("terenuri_v1") : null;
      const source = raw ?? rawOld;
      if (source) {
        const parsed = JSON.parse(source);
        if (Array.isArray(parsed)) {
          const normalized: Land[] = parsed.map((t: RawLand) => ({
            id: String(t.id ?? uid()),
            title: String(t.title ?? "Teren nou"),
            locality: String(t.locality ?? "Timișoara"),
            link: String(t.link ?? ""),
            lat: safeNumber(t.lat, 45.75797),
            lng: safeNumber(t.lng, 21.22898),
            score: safeNumber(t.score, 30),
            negotiatedPrice: safeNumber(t.negotiatedPrice, 19000),
            images: Array.isArray(t.images)
              ? (t.images as string[])
              : (t as Record<string, unknown>).imagePath
              ? [String((t as Record<string, unknown>).imagePath)]
              : [],
            thumbnailIdx: safeNumber(t.thumbnailIdx, 0),
            marketPrice: t.marketPrice == null ? undefined : safeNumber(t.marketPrice, 0),
            areaM2: t.areaM2 == null ? undefined : safeNumber(t.areaM2, 0),
            confirmed: Boolean(t.confirmed ?? false),
          }));
          setLands(normalized);
          return;
        }
      }
    } catch { /* ignore */ }
    // FIX: nu mai pornim cu date dummy — array gol
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
    if (lands.length === 0) return; // nu suprascriem dacă nu s-a încărcat încă
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lands));
    } catch { /* ignore — localStorage plin (ex. base64 mari) */ }
  }, [lands]);

  // markerMoved listener
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const detail = ce.detail as { id: string; lat: number; lng: number } | undefined;
      if (!detail) return;
      setLands((prev) =>
        prev.map((t) => (t.id === detail.id ? { ...t, lat: detail.lat, lng: detail.lng } : t))
      );
    };
    window.addEventListener("markerMoved", handler as EventListener);
    return () => window.removeEventListener("markerMoved", handler as EventListener);
  }, []);

  // Auto-scroll la cardul selectat
  useEffect(() => {
    if (!effectiveSelectedLandId) return;
    const el = cardRefs.current[effectiveSelectedLandId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [effectiveSelectedLandId]);

  const filteredLands = useMemo<LandWithDistance[]>(() => {
    const q = query.trim().toLowerCase();
    return lands
      .filter((l) => {
        const matchesQuery =
          !q || l.title.toLowerCase().includes(q) || l.locality.toLowerCase().includes(q);
        const matchesConfirmed = !onlyConfirmed || l.confirmed === true;
        return matchesQuery && matchesConfirmed;
      })
      .map((l) => {
        const distanceKm = myLocation
          ? haversineKm(myLocation.lat, myLocation.lng, l.lat, l.lng)
          : null;
        return { ...l, distanceKm };
      })
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [lands, query, onlyConfirmed, myLocation]);

  const onAdd = () => {
    const item: Land = {
      id: uid(),
      title: "Teren nou",
      locality: "Timișoara",
      link: "",
      lat: 45.75797,
      lng: 21.22898,
      score: 30,
      negotiatedPrice: 19000,
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
    setLands((prev) =>
      prev.map((t) => (t.id === effectiveSelectedLandId ? { ...t, ...patch } : t))
    );
  };

  // FIX: modal Save păstrează images din lands (nu din editForm snapshot)
  const handleModalSave = () => {
    if (!editForm) return;
    setLands((prev) =>
      prev.map((l) =>
        l.id === editForm.id
          ? {
              ...l, // păstrăm images, thumbnailIdx, lat, lng (nu le suprascriem cu snapshot-ul vechi)
              title: editForm.title,
              locality: editForm.locality,
              link: editForm.link,
              confirmed: editForm.confirmed,
              score: editForm.score,
              negotiatedPrice: editForm.negotiatedPrice,
              marketPrice: editForm.marketPrice,
              areaM2: editForm.areaM2,
            }
          : l
      )
    );
    setSelectedLandId(editForm.id);
    setIsEditing(false);
    setEditForm(null);
  };

  const inputDark = {
    padding: 10,
    borderRadius: 10,
    border: "1px solid #333",
    background: "#0b0b0b",
    color: "#fff",
  } as const;

  const btn = {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #333",
    background: "#0b0b0b",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
  } as const;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* SIDEBAR */}
      <div
        style={{
          width: 360,
          background: "#111",
          color: "#fff",
          padding: 12,
          overflowY: "auto",
          borderRight: "1px solid #222",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>🗺️ Terenuri</div>

        {/* Căutare + filtru */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută: titlu / localitate..."
            style={{ ...inputDark, flex: 1, padding: 8 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, opacity: 0.9, whiteSpace: "nowrap" }}>
            <input
              type="checkbox"
              checked={onlyConfirmed}
              onChange={(e) => setOnlyConfirmed(e.target.checked)}
            />
            Confirmate
          </label>
        </div>

        <button onClick={onAdd} style={{ ...btn, width: "100%", marginBottom: 12, background: "#1a1a1a", fontWeight: 700 }}>
          + Adaugă teren
        </button>

        {/* Lista carduri */}
        {filteredLands.length === 0 && (
          <div style={{ opacity: 0.5, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
            {lands.length === 0 ? "Niciun teren adăugat încă." : "Niciun rezultat găsit."}
          </div>
        )}

        {filteredLands.map((l) => {
          const isSelected = l.id === effectiveSelectedLandId;
          const isGalleryOpen = expandedGallery === l.id;

          return (
            <div
              key={l.id}
              ref={(el) => {
                if (el) cardRefs.current[l.id] = el;
                else delete cardRefs.current[l.id];
              }}
              onClick={() => setSelectedLandId(l.id)}
              style={{
                cursor: "pointer",
                border: isSelected ? "2px solid #4ade80" : "1px solid #2a2a2a",
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
                background: isSelected ? "#0f1f0f" : "#151515",
                transition: "border-color 0.15s",
              }}
            >
              {/* Header card */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <div style={{ fontWeight: 800, fontSize: 14, flex: 1 }}>{l.title}</div>
                <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "nowrap" }}>⭐ {l.score}</div>
              </div>

              {/* Thumbnail sau galerie */}
              {l.images.length > 0 && (
                <>
                  {isGalleryOpen ? (
                    <ImageGallery
                      images={l.images}
                      thumbnailIdx={l.thumbnailIdx ?? 0}
                      onDelete={(idx) => deleteImage(l.id, idx)}
                      onSetThumbnail={(idx) => setThumbnail(l.id, idx)}
                    />
                  ) : (
                    <CardThumbnail images={l.images} thumbnailIdx={l.thumbnailIdx ?? 0} />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedGallery(isGalleryOpen ? null : l.id);
                    }}
                    style={{ ...btn, marginTop: 5, fontSize: 11, padding: "4px 8px", opacity: 0.7 }}
                  >
                    {isGalleryOpen ? "▲ Ascunde galerie" : `▼ Galerie (${l.images.length}/${MAX_IMAGES})`}
                  </button>
                </>
              )}

              <div style={{ opacity: 0.8, marginTop: 6, fontSize: 13 }}>📍 {l.locality}</div>
              <div style={{ opacity: 0.8, marginTop: 4, fontSize: 13 }}>
                💰 {l.negotiatedPrice.toLocaleString("ro-RO")} €
              </div>
              <div style={{ opacity: 0.8, marginTop: 4, fontSize: 13 }}>
                📏 {l.distanceKm == null ? "locație necunoscută" : `${l.distanceKm.toFixed(1)} km distanță`}
              </div>
              <div style={{ marginTop: 5, fontSize: 13 }}>
                {l.confirmed ? (
                  <span style={{ color: "#4ade80" }}>✅ Confirmat</span>
                ) : (
                  <span style={{ color: "#facc15" }}>⏳ Neconfirmat</span>
                )}
              </div>

              {/* Butoane acțiuni */}
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {l.link && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(l.link, "_blank", "noreferrer");
                    }}
                    style={btn}
                  >
                    🔗 Anunț
                  </button>
                )}
                {l.confirmed ? (
                  <button onClick={(e) => { e.stopPropagation(); onUnconfirm(l.id); }} style={btn}>
                    🔓 Deblochează
                  </button>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); onConfirm(l.id); }} style={btn}>
                    📌 Confirmă
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditForm({ ...l });
                    setIsEditing(true);
                  }}
                  style={btn}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Ștergi terenul "${l.title}"?`)) onDelete(l.id);
                  }}
                  style={{ ...btn, borderColor: "#7f1d1d", color: "#f87171" }}
                >
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

        {/* ====== EDITARE DIRECTĂ TEREN SELECTAT ====== */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #222" }}>
          <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 14 }}>
            ✏️ Editare rapidă
          </div>
          {!selectedLand ? (
            <div style={{ opacity: 0.5, fontSize: 13 }}>Selectează un teren din listă.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 11, opacity: 0.7 }}>Titlu</label>
              <input
                value={selectedLand.title}
                onChange={(e) => updateSelected({ title: e.target.value })}
                style={inputDark}
              />

              <label style={{ fontSize: 11, opacity: 0.7 }}>Localitate</label>
              <input
                value={selectedLand.locality}
                onChange={(e) => updateSelected({ locality: e.target.value })}
                style={inputDark}
              />

              <label style={{ fontSize: 11, opacity: 0.7 }}>Link anunț</label>
              <input
                value={selectedLand.link}
                onChange={(e) => updateSelected({ link: e.target.value })}
                style={inputDark}
              />

              <label style={{ fontSize: 11, opacity: 0.7 }}>Preț negociat (€)</label>
              <input
                type="number"
                value={selectedLand.negotiatedPrice}
                onChange={(e) => updateSelected({ negotiatedPrice: safeNumber(e.target.value, 0) })}
                style={inputDark}
              />

              <label style={{ fontSize: 11, opacity: 0.7 }}>Scor</label>
              <input
                type="number"
                value={selectedLand.score}
                onChange={(e) => updateSelected({ score: safeNumber(e.target.value, 0) })}
                style={inputDark}
              />

              {/* Upload poze */}
              <label style={{ fontSize: 11, opacity: 0.7 }}>
                Poze ({selectedLand.images.length}/{MAX_IMAGES})
              </label>
              {selectedLand.images.length < MAX_IMAGES ? (
                <label
                  style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px dashed #444",
                    background: uploading ? "#0a1a0a" : "#0b0b0b",
                    color: uploading ? "#4ade80" : "#aaa",
                    cursor: uploading ? "wait" : "pointer",
                    textAlign: "center",
                    fontSize: 13,
                  }}
                >
                  {uploading ? "⏳ Se încarcă..." : "📷 Alege poză (JPG, PNG, WEBP)"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || !effectiveSelectedLandId) return;
                      uploadImage(file, effectiveSelectedLandId);
                      e.target.value = "";
                    }}
                    style={{ display: "none" }}
                  />
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

      {/* HARTA */}
      <div style={{ flex: 1 }}>
        <Map
          lands={lands}
          selectedLandId={effectiveSelectedLandId}
          onSelectLand={(id: string) => setSelectedLandId(id)}
        />
      </div>

      {/* MODAL EDIT */}
      {isEditing && editForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => {
            setIsEditing(false);
            setEditForm(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#111",
              color: "#fff",
              padding: 24,
              minWidth: 420,
              maxWidth: "90vw",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
              border: "1px solid #222",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16 }}>✏️ Editează teren</h3>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                value={editForm.title}
                onChange={(e) => setEditForm((p) => (p ? { ...p, title: e.target.value } : p))}
                placeholder="Titlu"
                style={inputDark}
              />
              <input
                value={editForm.locality}
                onChange={(e) => setEditForm((p) => (p ? { ...p, locality: e.target.value } : p))}
                placeholder="Localitate"
                style={inputDark}
              />
              <input
                value={editForm.link}
                onChange={(e) => setEditForm((p) => (p ? { ...p, link: e.target.value } : p))}
                placeholder="Link anunț"
                style={inputDark}
              />
              <input
                type="number"
                value={editForm.negotiatedPrice}
                onChange={(e) => setEditForm((p) => (p ? { ...p, negotiatedPrice: safeNumber(e.target.value, 0) } : p))}
                placeholder="Preț negociat (€)"
                style={inputDark}
              />
              <input
                type="number"
                value={editForm.score}
                onChange={(e) => setEditForm((p) => (p ? { ...p, score: safeNumber(e.target.value, 0) } : p))}
                placeholder="Scor"
                style={inputDark}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={editForm.confirmed}
                  onChange={(e) => setEditForm((p) => (p ? { ...p, confirmed: e.target.checked } : p))}
                />
                Locație confirmată (pin blocat)
              </label>
            </div>
            {/* FIX: notă că pozele nu se pierd la Save */}
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 10 }}>
              * Pozele sunt gestionate din card, nu se pierd la salvare.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm(null);
                }}
                style={btn}
              >
                Anulează
              </button>
              <button
                onClick={handleModalSave}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "1px solid #22c55e",
                  background: "#22c55e",
                  color: "#000",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                💾 Salvează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
