"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const AnyMapContainer: any = MapContainer;

type LatLngTuple = [number, number];

type RoutePoint = {
  lat: number;
  lng: number;
};

function FitBounds({ points }: { points: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 15));
      return;
    }

    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, points]);

  return null;
}

// Ensure default Leaflet icons load
(L.Icon.Default as any).mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function DeliveryRouteMapClient({
  points,
  destination,
}: {
  points: RoutePoint[];
  destination?: { lat: number; lng: number; label?: string } | null;
}) {
  const latLngPoints = useMemo(() => {
    return (Array.isArray(points) ? points : [])
      .map((p) => [Number(p.lat), Number(p.lng)] as LatLngTuple)
      .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  }, [points]);

  const start = latLngPoints.length ? latLngPoints[0] : null;
  const end = latLngPoints.length ? latLngPoints[latLngPoints.length - 1] : null;

  const center: LatLngTuple = start ?? [18.4861, -69.9312];

  return (
    <div className="h-72 w-full rounded-lg overflow-hidden">
      <AnyMapContainer center={center} zoom={13} style={{ width: "100%", height: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={latLngPoints} />

        {latLngPoints.length >= 2 ? (
          <Polyline positions={latLngPoints} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.9 }} />
        ) : null}

        {start ? <Marker position={start} /> : null}
        {end && (!start || end[0] !== start[0] || end[1] !== start[1]) ? <Marker position={end} /> : null}

        {destination && Number.isFinite(destination.lat) && Number.isFinite(destination.lng) ? (
          <Marker position={[destination.lat, destination.lng]} />
        ) : null}
      </AnyMapContainer>
    </div>
  );
}
