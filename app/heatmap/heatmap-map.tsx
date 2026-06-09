"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export type HeatLand = {
  id: string;
  dbId?: string;
  title: string;
  locality: string;
  lat: number;
  lng: number;
  negotiatedPrice: number | null;
  areaM2: number | null;
  score: number;
  aiScore: number | null;
  rentability: number;
  propertyType: string;
  confirmed: boolean;
};

export type ColorMode = "aiScore" | "userScore" | "rentability" | "price";

function getColor(land: HeatLand, mode: ColorMode): string {
  let value = 0;
  let max = 100;
  if (mode === "aiScore") { value = land.aiScore ?? -1; if (value < 0) return "#334155"; }
  else if (mode === "userScore") { value = land.score; }
  else if (mode === "rentability") { value = land.rentability; }
  else if (mode === "price") {
    // invertit: mai mic preț = mai verde
    value = land.negotiatedPrice ? Math.max(0, 100 - Math.min(100, land.negotiatedPrice / 1000)) : 0;
    max = 100;
  }
  if (value >= 65) return "#4ade80";
  if (value >= 35) return "#f59e0b";
  return "#f87171";
}

function getRadius(land: HeatLand, mode: ColorMode): number {
  if (mode === "price" && land.negotiatedPrice) {
    return Math.min(30, Math.max(8, Math.sqrt(land.negotiatedPrice / 1000)));
  }
  if (mode === "aiScore" && land.aiScore != null) {
    return Math.min(28, Math.max(8, land.aiScore / 5));
  }
  return 12;
}

interface Props {
  lands: HeatLand[];
  mode: ColorMode;
  center: [number, number];
  zoom: number;
}

export default function HeatmapMap({ lands, mode, center, zoom }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const layerGroupRef = useRef<unknown>(null);

  // Init map once
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    let cleanup: (() => void) | null = null;

    import("leaflet").then((L) => {
      if (!divRef.current || mapRef.current) return;
      const map = L.map(divRef.current, { center, zoom, scrollWheelZoom: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OSM</a>', maxZoom: 19,
      }).addTo(map);
      const lg = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerGroupRef.current = lg;
      cleanup = () => { map.remove(); mapRef.current = null; layerGroupRef.current = null; };
    });

    return () => { cleanup?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw markers when lands or mode change
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;
    import("leaflet").then((L) => {
      const lg = layerGroupRef.current as ReturnType<typeof L.layerGroup>;
      lg.clearLayers();

      lands.forEach((land) => {
        const color = getColor(land, mode);
        const radius = getRadius(land, mode);
        const icon = L.divIcon({
          html: `<div style="background:${color};border:2px solid rgba(255,255,255,0.8);border-radius:50%;width:${radius * 2}px;height:${radius * 2}px;box-shadow:0 0 ${radius}px ${color}66;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:${Math.max(8, radius - 4)}px;font-weight:800;color:#000;"></div>`,
          iconSize: [radius * 2, radius * 2],
          iconAnchor: [radius, radius],
          className: "",
        });
        const marker = L.marker([land.lat, land.lng], { icon });
        const val = mode === "aiScore" ? (land.aiScore != null ? `🤖 ${land.aiScore}/100` : "fără AI score")
          : mode === "userScore" ? `⭐ ${land.score}/100`
          : mode === "rentability" ? `📈 ${land.rentability}/100`
          : land.negotiatedPrice ? `💰 ${land.negotiatedPrice.toLocaleString("ro-RO")} €` : "fără preț";

        marker.bindPopup(`
          <div style="min-width:180px;font-family:system-ui">
            <div style="font-weight:800;font-size:13px;margin-bottom:4px">${land.title}</div>
            <div style="font-size:11px;color:#666;margin-bottom:4px">📍 ${land.locality}</div>
            <div style="font-size:12px;color:${color};font-weight:700;margin-bottom:6px">${val}</div>
            ${land.dbId ? `<a href="/terenuri/${land.dbId}" style="font-size:11px;color:#3b82f6;text-decoration:none">📄 Vezi detalii →</a>` : ""}
          </div>
        `);
        lg.addLayer(marker);
      });
    });
  }, [lands, mode]);

  return <div ref={divRef} style={{ width: "100%", height: "100%", borderRadius: 0 }} />;
}
