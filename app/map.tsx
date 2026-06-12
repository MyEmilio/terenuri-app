"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import L from "leaflet";
import { useEffect, useState } from "react";
import { EditControl } from "react-leaflet-draw";
import { FeatureGroup, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { PROPERTY_TYPES, type PropertyType } from "./page";

// Iconuri colorate per tip proprietate
function makeIcon(color: string, size: number) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:999px;
      background:${color};border:2px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.4);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const selectedIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:20px;height:20px;border-radius:999px;
    background:#f59e0b;border:3px solid white;
    box-shadow:0 3px 12px rgba(245,158,11,.6);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const iconCache: Record<string, L.DivIcon> = {};

function getIcon(propertyType: PropertyType | undefined, isSelected: boolean): L.DivIcon {
  if (isSelected) return selectedIcon;
  const color = propertyType ? (PROPERTY_TYPES[propertyType]?.color ?? "#2b6cb0") : "#2b6cb0";
  if (!iconCache[color]) iconCache[color] = makeIcon(color, 14);
  return iconCache[color];
}

export type MarketPin = {
  id: string;
  source: string;
  title: string;
  price: number | null;
  locality: string;
  lat: number;
  lng: number;
  link: string | null;
  areaM2: number | null;
  propertyType: string;
  imageUrl: string | null;
};

const marketIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:10px;height:10px;border-radius:999px;
    background:#3b82f6;border:2px solid white;
    box-shadow:0 2px 6px rgba(59,130,246,.5);
  "></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

type LandOnMap = {
  id: string;
  propertyType?: PropertyType;
  title: string;
  locality: string;
  link: string;
  lat: number;
  lng: number;
  score: number;
  negotiatedPrice: number;
  confirmed: boolean;
};

type AreaBounds = {
  ne: { lat: number; lng: number };
  sw: { lat: number; lng: number };
};

type DrawCreatedEvent = {
  layerType: string;
  layer: L.Layer;
};

function FlyToSelected({
  lands,
  selectedLandId,
}: {
  lands: LandOnMap[];
  selectedLandId: string | null | undefined;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedLandId) return;
    const land = lands.find((x) => x.id === selectedLandId);
    if (!land) return;
    map.flyTo([land.lat, land.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [lands, selectedLandId, map]);

  return null;
}

function FlyToCountry({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

function AddressSearch({
  selectedLandId,
}: {
  selectedLandId: string | null | undefined;
}) {
  const map = useMap();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [expanded, setExpanded] = useState(false);

  async function runSearch() {
    const query = q.trim();
    if (!query) { setItems([]); return; }
    setLoading(true);
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&q=" +
        encodeURIComponent(query);
      const res = await fetch(url, { headers: { "accept-language": "ro,en;q=0.8" } });
      const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function choose(it: { lat: string; lon: string }) {
    const lat = Number(it.lat);
    const lng = Number(it.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    if (selectedLandId) {
      window.dispatchEvent(new CustomEvent("markerMoved", { detail: { id: selectedLandId, lat, lng } }));
    }
    setItems([]);
    setExpanded(false);
  }

  return (
    <div style={{ position: "absolute", top: 12, left: 88, zIndex: 2000, pointerEvents: "none" }}>
      {/* Toggle button */}
      <button
        onClick={() => { setExpanded((v) => !v); }}
        title="Caută adresă"
        style={{
          pointerEvents: "auto", width: 38, height: 38, borderRadius: 10,
          border: expanded ? "1px solid #f59e0b" : "1px solid #333",
          background: expanded ? "#2a1800" : "rgba(17,17,17,0.92)",
          color: expanded ? "#f59e0b" : "#fff", cursor: "pointer",
          fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        🔍
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div style={{
          pointerEvents: "auto", marginTop: 6, width: 320,
          background: "rgba(17,17,17,0.95)", border: "1px solid #333",
          borderRadius: 12, padding: 10, color: "#fff",
          boxShadow: "0 12px 30px rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Adresă / oraș / stradă..."
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
              autoFocus
              style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #333", background: "#0b0b0b", color: "#fff", outline: "none", fontSize: 13 }}
            />
            <button onClick={runSearch}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #333", background: "#0b0b0b", color: "#fff", cursor: "pointer", fontSize: 13 }}>
              {loading ? "..." : "Go"}
            </button>
          </div>

          {items.length > 0 && (
            <div style={{ marginTop: 8, display: "grid", gap: 4, maxHeight: 240, overflowY: "auto" }}>
              {items.map((it, idx) => (
                <button key={idx} onClick={() => choose(it)}
                  style={{ textAlign: "left", padding: "7px 9px", borderRadius: 8, border: "1px solid #2a2a2a", background: "#0b0b0b", color: "#e2e8f0", cursor: "pointer", fontSize: 12, lineHeight: 1.3 }}
                  title={it.display_name}>
                  {it.display_name}
                </button>
              ))}
            </div>
          )}

          {selectedLandId && (
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 6 }}>
              Selectează un pin înainte ca să-i mute locația.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Map({
  lands = [],
  marketListings = [],
  selectedLandId,
  onSelectLand,
  countryCenter,
  countryZoom,
}: {
  lands: LandOnMap[];
  marketListings?: MarketPin[];
  selectedLandId?: string | null;
  onSelectLand?: (id: string) => void;
  countryCenter?: [number, number];
  countryZoom?: number;
}) {
  const center: [number, number] = [45.75797, 21.22898];
  const [selectedArea, setSelectedArea] = useState<AreaBounds | null>(null);
  const [drawReady, setDrawReady] = useState(false);
  const [drawVersion, setDrawVersion] = useState(0);
  const [tileLayer, setTileLayer] = useState<"street" | "satellite" | "terrain">("street");
  const [showMarket, setShowMarket] = useState(true);

  const TILE_LAYERS = {
    street: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap contributors",
      label: "🗺️ Hartă",
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "&copy; Esri, Maxar, Earthstar Geographics",
      label: "🛰️ Satelit",
    },
    terrain: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "&copy; Esri, HERE, Garmin, USGS",
      label: "🏔️ Teren",
    },
  } as const;

  useEffect(() => {
    (window as Window & { L?: typeof L }).L = L;
    import("leaflet-draw")
      .then(() => setDrawReady(true))
      .catch(() => setDrawReady(false));
  }, []);

  const emitAreaSelected = (area: AreaBounds) => {
    window.dispatchEvent(new CustomEvent("zoneSelected", { detail: area }));
  };

  const clearArea = () => {
    setSelectedArea(null);
    setDrawVersion((v) => v + 1);
    window.dispatchEvent(new CustomEvent("zoneCleared"));
  };

  const handleCreated = (e: DrawCreatedEvent) => {
    if (e.layerType !== "rectangle") return;
    const layer = e.layer as L.Rectangle;
    const bounds = layer.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const area: AreaBounds = {
      ne: { lat: ne.lat, lng: ne.lng },
      sw: { lat: sw.lat, lng: sw.lng },
    };
    setSelectedArea(area);
    emitAreaSelected(area);
  };

  const openGoogleSearch = () => {
    if (!selectedArea) {
      alert("Deseneaza mai intai un dreptunghi pe harta.");
      return;
    }
    const centerLat = (selectedArea.ne.lat + selectedArea.sw.lat) / 2;
    const centerLng = (selectedArea.ne.lng + selectedArea.sw.lng) / 2;
    const query = `teren de vanzare in zona ${selectedArea.sw.lat},${selectedArea.sw.lng} - ${selectedArea.ne.lat},${selectedArea.ne.lng} centru ${centerLat},${centerLng}`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
  };

  return (
    <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }}>
      <AddressSearch selectedLandId={selectedLandId} />

      {/* Panel dreapta — compact, colapsibil */}
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        {/* Tile switcher — 3 icon butoane */}
        <div style={{ display: "flex", gap: 4, background: "rgba(17,17,17,0.9)", border: "1px solid #333", borderRadius: 10, padding: 5 }}>
          {(["street", "satellite", "terrain"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTileLayer(key)}
              title={TILE_LAYERS[key].label}
              style={{
                width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 15,
                border: tileLayer === key ? "1px solid #f59e0b" : "1px solid transparent",
                background: tileLayer === key ? "#2a1800" : "transparent",
                color: tileLayer === key ? "#f59e0b" : "#999",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {key === "street" ? "🗺️" : key === "satellite" ? "🛰️" : "⛰️"}
            </button>
          ))}
        </div>

        {/* Toggle market listings */}
        {marketListings.length > 0 && (
          <button
            onClick={() => setShowMarket((s) => !s)}
            title={showMarket ? "Ascunde anunțuri piață" : "Arată anunțuri piață"}
            style={{
              padding: "5px 10px", borderRadius: 8,
              border: showMarket ? "1px solid #3b82f6" : "1px solid #333",
              background: showMarket ? "#0b1a30" : "rgba(17,17,17,0.9)",
              color: showMarket ? "#60a5fa" : "#64748b",
              cursor: "pointer", fontSize: 12, fontWeight: showMarket ? 700 : 400,
            }}
          >
            📊 {marketListings.length}
          </button>
        )}

        {/* Google search + clear zone */}
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={openGoogleSearch} title="Caută pe Google în zonă"
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #333", background: "rgba(17,17,17,0.9)", color: "#fff", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
            🌐
          </button>
          <button onClick={clearArea} title="Resetează zona selectată"
            style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #444", background: "rgba(17,17,17,0.9)", color: "#aaa", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>
      </div>

      <FlyToSelected lands={lands} selectedLandId={selectedLandId} />
      {countryCenter && <FlyToCountry center={countryCenter} zoom={countryZoom ?? 7} />}

      <TileLayer
        key={tileLayer}
        attribution={TILE_LAYERS[tileLayer].attribution}
        url={TILE_LAYERS[tileLayer].url}
      />

      {drawReady && (
        <FeatureGroup key={drawVersion}>
          <EditControl
            position="topleft"
            onCreated={handleCreated}
            onDeleted={clearArea}
            draw={{
              rectangle: true,
              polygon: false,
              circle: false,
              marker: false,
              polyline: false,
              circlemarker: false,
            }}
          />
        </FeatureGroup>
      )}

      {lands.map((land) => (
        <Marker
          key={land.id}
          position={[land.lat, land.lng]}
          draggable={!land.confirmed}
          icon={getIcon(land.propertyType, land.id === selectedLandId)}
          eventHandlers={{
            click: () => onSelectLand?.(land.id),
            dragend: (e) => {
              const marker = e.target as L.Marker;
              const pos = marker.getLatLng();
              window.dispatchEvent(
                new CustomEvent("markerMoved", {
                  detail: { id: land.id, lat: pos.lat, lng: pos.lng },
                })
              );
            },
          }}
        />
      ))}

      {showMarket && marketListings.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={marketIcon}>
          <Popup maxWidth={260}>
            <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, minWidth: 200 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                  background: m.source === "olx" ? "#052e16" : "#0b1a30",
                  color: m.source === "olx" ? "#4ade80" : "#60a5fa",
                  border: `1px solid ${m.source === "olx" ? "#166534" : "#1e3a5f"}` }}>
                  {m.source.toUpperCase()}
                </span>
              </div>
              <div style={{ fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>
                {m.title.slice(0, 70)}{m.title.length > 70 ? "…" : ""}
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 12, marginBottom: 6 }}>
                {m.price && (
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>
                    {m.price.toLocaleString("ro-RO")} €
                  </span>
                )}
                {m.areaM2 && <span style={{ color: "#555" }}>{m.areaM2} m²</span>}
                {m.price && m.areaM2 && (
                  <span style={{ color: "#888" }}>{Math.round(m.price / m.areaM2)} €/m²</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>📍 {m.locality}</div>
              {m.link && (
                <a href={m.link} target="_blank" rel="noreferrer"
                  style={{ display: "inline-block", padding: "5px 12px", background: "#1d4ed8",
                    color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                  🔗 Vezi anunțul
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
