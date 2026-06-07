"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import L from "leaflet";
import { useEffect, useState } from "react";
import { EditControl } from "react-leaflet-draw";
import { FeatureGroup, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
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

  async function runSearch() {
    const query = q.trim();
    if (!query) {
      setItems([]);
      return;
    }

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
      window.dispatchEvent(
        new CustomEvent("markerMoved", {
          detail: { id: selectedLandId, lat, lng },
        })
      );
    }
    setItems([]);
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 88,
        zIndex: 2000,
        width: 360,
        maxWidth: "calc(100vw - 24px)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(17,17,17,0.92)",
          border: "1px solid #333",
          borderRadius: 12,
          padding: 10,
          color: "#fff",
          boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
          backdropFilter: "blur(4px)",
          pointerEvents: "auto",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cauta adresa / oras / strada..."
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #333",
              background: "#0b0b0b",
              color: "#fff",
              outline: "none",
            }}
          />
          <button
            onClick={runSearch}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #333",
              background: "#0b0b0b",
              color: "#fff",
              cursor: "pointer",
              minWidth: 92,
            }}
          >
            {loading ? "..." : "Cauta"}
          </button>
        </div>

        {items.length > 0 && (
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {items.map((it, idx) => (
              <button
                key={idx}
                onClick={() => choose(it)}
                style={{
                  textAlign: "left",
                  padding: "10px 10px",
                  borderRadius: 10,
                  border: "1px solid #333",
                  background: "#0b0b0b",
                  color: "#fff",
                  cursor: "pointer",
                  lineHeight: 1.25,
                }}
                title={it.display_name}
              >
                {it.display_name}
              </button>
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
          Tip: selecteaza un teren din lista inainte, ca sa-i mute pinul pe adresa.
        </div>
      </div>
    </div>
  );
}

export default function Map({
  lands = [],
  selectedLandId,
  onSelectLand,
  countryCenter,
  countryZoom,
}: {
  lands: LandOnMap[];
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
    <MapContainer center={center} zoom={10} style={{ height: "100vh", width: "100%" }}>
      <AddressSearch selectedLandId={selectedLandId} />

      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 2000 }}>
        <div
          style={{
            display: "grid",
            gap: 8,
            background: "rgba(17,17,17,0.92)",
            border: "1px solid #333",
            borderRadius: 10,
            padding: 8,
          }}
        >
          {/* Switcher straturi hartă */}
          <div style={{ display: "grid", gap: 4 }}>
            {(["street", "satellite", "terrain"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTileLayer(key)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: tileLayer === key ? "1px solid #f59e0b" : "1px solid #333",
                  background: tileLayer === key ? "#2a1800" : "#0b0b0b",
                  color: tileLayer === key ? "#f59e0b" : "#ccc",
                  cursor: "pointer",
                  fontWeight: tileLayer === key ? 700 : 400,
                  fontSize: 13,
                  textAlign: "left",
                }}
              >
                {TILE_LAYERS[key].label}
              </button>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: 8 }}>
            <button
              onClick={openGoogleSearch}
              style={{
                padding: "8px 12px", borderRadius: 10, width: "100%",
                border: "1px solid #333", background: "#0b0b0b", color: "#fff", cursor: "pointer", fontSize: 12,
              }}
            >
              🔍 Google în zonă
            </button>
            <button
              onClick={clearArea}
              style={{
                marginTop: 5, padding: "7px 12px", borderRadius: 10, width: "100%",
                border: "1px solid #555", background: "#141414", color: "#ddd", cursor: "pointer", fontSize: 12,
              }}
            >
              ✕ Resetează zona
            </button>
          </div>
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
    </MapContainer>
  );
}
