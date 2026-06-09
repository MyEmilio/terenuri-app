"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

interface Props { lat: number; lng: number; title: string; color: string; }

export default function DetailMap({ lat, lng, title, color }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    let cleanup: (() => void) | null = null;

    import("leaflet").then((L) => {
      if (!divRef.current || mapRef.current) return;
      const map = L.map(divRef.current, { center: [lat, lng], zoom: 14, scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OSM</a>',
        maxZoom: 19,
      }).addTo(map);
      const icon = L.divIcon({
        html: `<div style="background:${color};border:3px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 0 10px ${color}99;"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        className: "",
      });
      L.marker([lat, lng], { icon }).addTo(map).bindPopup(title);
      mapRef.current = map;
      cleanup = () => { map.remove(); mapRef.current = null; };
    });

    return () => { cleanup?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={divRef} style={{ height: 260, borderRadius: 10, overflow: "hidden", border: "1px solid #333" }} />;
}
