"use client";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { useEffect, useRef } from "react";

export type AreaBounds = { ne: { lat: number; lng: number }; sw: { lat: number; lng: number } };

interface Props {
  onZoneDrawn: (bounds: AreaBounds) => void;
  onZoneCleared: () => void;
}

export default function AnalyzeMap({ onZoneDrawn, onZoneCleared }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    let cleanup: (() => void) | null = null;

    Promise.all([import("leaflet"), import("leaflet-draw")]).then(([L]) => {
      if (!divRef.current || mapRef.current) return;
      const map = L.map(divRef.current, { center: [45.75, 21.23], zoom: 8 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OSM</a>', maxZoom: 19,
      }).addTo(map);

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      // @ts-expect-error leaflet-draw extends L
      const drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItems, remove: true },
        draw: {
          rectangle: { shapeOptions: { color: "#4ade80", weight: 2 } },
          polygon: false, polyline: false, circle: false, circlemarker: false, marker: false,
        },
      });
      map.addControl(drawControl);

      // @ts-expect-error leaflet-draw event
      map.on(L.Draw.Event.CREATED, (e) => {
        drawnItems.clearLayers();
        drawnItems.addLayer(e.layer);
        const bounds = e.layer.getBounds();
        onZoneDrawn({
          ne: { lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng },
          sw: { lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng },
        });
      });

      // @ts-expect-error leaflet-draw event
      map.on(L.Draw.Event.DELETED, () => {
        drawnItems.clearLayers();
        onZoneCleared();
      });

      mapRef.current = map;
      cleanup = () => { map.remove(); mapRef.current = null; };
    });

    return () => { cleanup?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={divRef} style={{ width: "100%", height: "100%" }} />;
}
