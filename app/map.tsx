"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

const normalIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:14px;height:14px;border-radius:999px;
    background:#2b6cb0;border:2px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,.35);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const selectedIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:18px;height:18px;border-radius:999px;
    background:#f59e0b;border:3px solid white;
    box-shadow:0 3px 10px rgba(0,0,0,.45);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

type LandOnMap = {
  id: string;
  title: string;
  locality: string;
  link: string;
  lat: number;
  lng: number;
  score: number;
  negotiatedPrice: number;
  confirmed: boolean;
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
    const l = lands.find((x) => x.id === selectedLandId);
    if (!l) return;

    map.flyTo([l.lat, l.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [lands, selectedLandId, map]);

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
  const [items, setItems] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([]);

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

      const res = await fetch(url, {
        headers: { "accept-language": "ro,en;q=0.8" },
      });

      const data = (await res.json()) as {
        display_name: string;
        lat: string;
        lon: string;
      }[];

      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function choose(it: { lat: string; lon: string; display_name: string }) {
    const lat = Number(it.lat);
    const lng = Number(it.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.6 });

    // mută AUTOMAT pinul terenului selectat
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
        left: 12,
        zIndex: 2000,
        width: 360,
        maxWidth: "calc(100vw - 24px)",
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
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Caută adresă / oraș / stradă…"
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
            {loading ? "..." : "Caută"}
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
          Tip: selectează un teren din listă înainte, ca să-i mute pinul pe adresă.
        </div>
      </div>
    </div>
  );
}

export default function Map({
  lands = [],
  selectedLandId,
  onSelectLand,
}: {
  lands: LandOnMap[];
  selectedLandId?: string | null;
  onSelectLand?: (id: string) => void;
}) {
  const center: [number, number] = [45.75797, 21.22898];

  return (
    <MapContainer center={center} zoom={10} style={{ height: "100vh", width: "100%" }}>
      <AddressSearch selectedLandId={selectedLandId} />
      <FlyToSelected lands={lands} selectedLandId={selectedLandId} />

      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {lands.map((l) => (
        <Marker
          key={l.id}
          position={[l.lat, l.lng]}
          draggable
          icon={l.id === selectedLandId ? selectedIcon : normalIcon}
          eventHandlers={{
            click: () => onSelectLand?.(l.id),
            dragend: (e) => {
              const marker = e.target as L.Marker;
              const pos = marker.getLatLng();

              window.dispatchEvent(
                new CustomEvent("markerMoved", {
                  detail: { id: l.id, lat: pos.lat, lng: pos.lng },
                })
              );
            },
          }}
        />
      ))}
    </MapContainer>
  );
}
