// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCouriersLocations } from "@/lib/api";

const AnyMapContainer: any = MapContainer;

// Ensure default Leaflet icons load
(L.Icon.Default as any).mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapClient() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getCouriersLocations();
        setCouriers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mapa</h1>
      </div>

      <div className="h-[calc(100vh-12rem)] rounded-xl overflow-hidden shadow-lg">
        <AnyMapContainer center={[18.4861, -69.9312]} zoom={12} style={{ width: "100%", height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {couriers.map((c: any) =>
            c.location ? (
              <Marker
                key={c.courierId}
                position={[c.location.lat, c.location.lng]}
                eventHandlers={{ click: () => setSelected(c) }}
              />
            ) : null
          )}

          {selected && selected.location && (
            <Popup
              position={[selected.location.lat, selected.location.lng]}
              onClose={() => setSelected(null)}
            >
              <div className="p-2">
                <h3 className="font-semibold">{selected.fullName}</h3>
                <p className="text-sm text-gray-600">Mensajero</p>
              </div>
            </Popup>
          )}
        </AnyMapContainer>
      </div>
    </div>
  );
}
