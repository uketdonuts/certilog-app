"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cleanRouteTrace } from "@/lib/utils/routeTrace";

const AnyMapContainer: any = MapContainer;
const AnyCircleMarker: any = CircleMarker;

type LatLngTuple = [number, number];

type RoutePoint = {
  lat: number;
  lng: number;
  recordedAt?: string;
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
    const cleaned = cleanRouteTrace(
      (Array.isArray(points) ? points : []).map((p) => ({
        lat: Number(p.lat),
        lng: Number(p.lng),
        recordedAt: p.recordedAt,
      })),
      {
        maxSpeedKmh: 160,
        maxJumpMeters: 400,
        minStepMeters: 2,
        smoothingWindow: 3,
      }
    );

    return cleaned.map((p) => [p.lat, p.lng] as LatLngTuple);
  }, [points]);

  const start = latLngPoints.length ? latLngPoints[0] : null;
  const end = latLngPoints.length ? latLngPoints[latLngPoints.length - 1] : null;

  const center: LatLngTuple = start ?? [9.0, -79.5]; // Panama City

  return (
    <div className="h-72 w-full rounded-lg overflow-hidden">
      <AnyMapContainer center={center} zoom={13} style={{ width: "100%", height: "100%" }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <FitBounds points={latLngPoints} />

        {latLngPoints.length >= 2 ? (
          <Polyline
            positions={latLngPoints}
            pathOptions={{
              color: "#2563eb",
              weight: 5,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        ) : null}

        {/* Start marker - green circle like mobile app */}
        {start ? (
          <AnyCircleMarker
            center={start}
            radius={6}
            pathOptions={{ color: "#16a34a", fillColor: "#22c55e", fillOpacity: 1, weight: 2 }}
          />
        ) : null}

        {/* End marker - red circle like mobile app */}
        {end && (!start || end[0] !== start[0] || end[1] !== start[1]) ? (
          <AnyCircleMarker
            center={end}
            radius={6}
            pathOptions={{ color: "#dc2626", fillColor: "#ef4444", fillOpacity: 1, weight: 2 }}
          />
        ) : null}

        {/* Destination marker */}
        {destination && Number.isFinite(destination.lat) && Number.isFinite(destination.lng) ? (
          <Marker position={[destination.lat, destination.lng]} />
        ) : null}
      </AnyMapContainer>
    </div>
  );
}
