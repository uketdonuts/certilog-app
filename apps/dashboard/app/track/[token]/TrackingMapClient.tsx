'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Use any to avoid TypeScript issues with Leaflet types
const LeafletMap: any = L;

interface RoutePoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

interface TrackingMapProps {
  routePoints: RoutePoint[];
  courierLocation: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
}

export default function TrackingMapClient({
  routePoints,
  courierLocation,
  destination,
}: TrackingMapProps) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polylineRef = useRef<any>(null);
  const courierMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center: Panama City
    const defaultCenter: [number, number] = [9.0, -79.5];

    const map = LeafletMap.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: true,
    });

    // CARTO Voyager tiles (same as mobile app)
    LeafletMap.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update route polyline
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
    }

    if (routePoints.length > 0) {
      const latlngs = routePoints.map((p) => [p.lat, p.lng] as [number, number]);
      polylineRef.current = LeafletMap.polyline(latlngs, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
      }).addTo(mapRef.current);
    }
  }, [routePoints]);

  // Update courier marker
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (courierMarkerRef.current) {
      courierMarkerRef.current.remove();
    }

    if (courierLocation) {
      courierMarkerRef.current = LeafletMap.circleMarker([courierLocation.lat, courierLocation.lng], {
        radius: 12,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        color: '#1d4ed8',
        weight: 3,
      })
        .bindPopup('Ubicación del mensajero')
        .addTo(mapRef.current);
    }
  }, [courierLocation]);

  // Update destination marker
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
    }

    if (destination) {
      destinationMarkerRef.current = LeafletMap.circleMarker([destination.lat, destination.lng], {
        radius: 10,
        fillColor: '#ef4444',
        fillOpacity: 1,
        color: '#b91c1c',
        weight: 3,
      })
        .bindPopup('Destino')
        .addTo(mapRef.current);
    }
  }, [destination]);

  // Fit bounds to show all markers
  useEffect(() => {
    if (!mapRef.current) return;

    const points: [number, number][] = [];

    if (courierLocation) {
      points.push([courierLocation.lat, courierLocation.lng]);
    }
    if (destination) {
      points.push([destination.lat, destination.lng]);
    }
    routePoints.forEach((p) => points.push([p.lat, p.lng]));

    if (points.length > 0) {
      const bounds = LeafletMap.latLngBounds(points);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routePoints, courierLocation, destination]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-[400px] rounded-lg overflow-hidden"
    />
  );
}
