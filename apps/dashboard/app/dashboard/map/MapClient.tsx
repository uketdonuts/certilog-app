"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCouriersLocations, getCourierLocationHistory } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";

const AnyMapContainer: any = MapContainer;

type LatLngTuple = [number, number];

type CourierLocation = {
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  batteryLevel?: number | null;
  recordedAt?: string;
} | null;

type Courier = {
  courierId: string;
  fullName: string;
  activeDeliveries: number;
  phone?: string | null;
  location: CourierLocation;
};

const DEFAULT_CENTER: LatLngTuple = [18.4861, -69.9312];
const DEFAULT_ZOOM = 12;
const MAX_TRAIL_POINTS = 200;

function isRecent(ts?: string, withinMs = 2 * 60 * 1000) {
  if (!ts) return false;
  const t = new Date(ts).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= withinMs;
}

function formatTime(ts?: string) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function FollowController({ target }: { target: LatLngTuple | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    const current = map.getCenter();
    const dist = current.distanceTo(L.latLng(target[0], target[1]));
    if (dist < 15) return;
    map.flyTo(target, Math.max(map.getZoom(), 15), { animate: true, duration: 0.6 });
  }, [map, target]);

  return null;
}

// Ensure default Leaflet icons load
(L.Icon.Default as any).mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapClient() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [followCourierId, setFollowCourierId] = useState<string | null>(null);
  const [followTarget, setFollowTarget] = useState<LatLngTuple | null>(null);
  const [trailByCourier, setTrailByCourier] = useState<Record<string, LatLngTuple[]>>({});
  const [query, setQuery] = useState<string>("");
  const [historyHours, setHistoryHours] = useState<number>(24);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getCouriersLocations();
        const list = Array.isArray(data) ? (data as Courier[]) : [];
        setCouriers(list);

        // seed trails with last known positions
        setTrailByCourier((prev) => {
          const next = { ...prev };
          for (const c of list) {
            if (c.location) {
              if (!next[c.courierId]?.length) {
                next[c.courierId] = [[c.location.lat, c.location.lng] as LatLngTuple];
              }
            }
          }
          return next;
        });
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, []);

  const selectedCourier = useMemo(() => {
    if (!selectedCourierId) return null;
    return couriers.find((c) => c.courierId === selectedCourierId) ?? null;
  }, [couriers, selectedCourierId]);

  const followedCourier = useMemo(() => {
    if (!followCourierId) return null;
    return couriers.find((c) => c.courierId === followCourierId) ?? null;
  }, [couriers, followCourierId]);

  const visibleCouriers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Array.isArray(couriers) ? couriers : [];
    const filtered = !q
      ? list
      : list.filter((c) => (c.fullName ?? "").toLowerCase().includes(q));

    return filtered.slice().sort((a, b) => {
      const ar = a.location?.recordedAt ?? "";
      const br = b.location?.recordedAt ?? "";
      return br.localeCompare(ar);
    });
  }, [couriers, query]);

  const loadHistoryForCourier = useCallback(async (courierId: string) => {
    try {
      const toDate = new Date();
      const fromDate = new Date(Date.now() - historyHours * 60 * 60 * 1000);
      const resp = await getCourierLocationHistory(courierId, {
        page: 1,
        limit: 500,
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
      });

      const pointsRaw = Array.isArray(resp?.data) ? resp.data : [];
      const points = pointsRaw
        .map((p: any) => [Number(p.lat), Number(p.lng)] as LatLngTuple)
        .filter((p: LatLngTuple) => Number.isFinite(p[0]) && Number.isFinite(p[1]));

      // API returns desc by recordedAt, so reverse to draw chronological trail.
      points.reverse();

      setTrailByCourier((prev) => ({
        ...prev,
        [courierId]: points.slice(-MAX_TRAIL_POINTS),
      }));
    } catch (e) {
      console.error(e);
    }
  }, [historyHours]);

  const toggleFollow = useCallback(
    async (courierId: string) => {
      setSelectedCourierId(courierId);
      setFollowCourierId((prev) => (prev === courierId ? null : courierId));

      // If enabling follow, pre-load history for a nice immediate trail.
      const enabling = followCourierId !== courierId;
      if (enabling) {
        await loadHistoryForCourier(courierId);
      }

      const c = couriers.find((x) => x.courierId === courierId);
      if (c?.location) setFollowTarget([c.location.lat, c.location.lng]);
    },
    [couriers, followCourierId, loadHistoryForCourier]
  );

  useEffect(() => {
    const socket = connectSocket();

    const onLocation = (evt: any) => {
      setCouriers((prev) => {
        const list = Array.isArray(prev) ? prev.slice() : [];
        const idx = list.findIndex((c) => c.courierId === evt.courierId);

        const recordedAt = new Date(evt.timestamp ?? Date.now()).toISOString();

        const nextCourier: Courier = {
          courierId: evt.courierId,
          fullName: evt.fullName ?? (idx >= 0 ? list[idx].fullName : "Mensajero"),
          activeDeliveries: idx >= 0 ? list[idx].activeDeliveries : 0,
          location: {
            lat: Number(evt.lat),
            lng: Number(evt.lng),
            batteryLevel: evt.battery ?? null,
            recordedAt,
          },
        };

        // Update trail for this courier.
        if (Number.isFinite(nextCourier.location?.lat) && Number.isFinite(nextCourier.location?.lng)) {
          const point: LatLngTuple = [nextCourier.location!.lat, nextCourier.location!.lng];
          setTrailByCourier((prevTrail) => {
            const existing = prevTrail[evt.courierId] ?? [];
            const next = existing.concat([point]).slice(-MAX_TRAIL_POINTS);
            return { ...prevTrail, [evt.courierId]: next };
          });
        }

        if (followCourierId === evt.courierId && nextCourier.location) {
          setFollowTarget([nextCourier.location.lat, nextCourier.location.lng]);
        }

        if (idx >= 0) list[idx] = { ...list[idx], ...nextCourier };
        else list.unshift(nextCourier);

        return list;
      });
    };

    const onOffline = (evt: any) => {
      setCouriers((prev) => {
        const list = Array.isArray(prev) ? prev.slice() : [];
        const idx = list.findIndex((c) => c.courierId === evt.courierId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], location: null };
        }
        return list;
      });

      if (followCourierId === evt.courierId) {
        setFollowTarget(null);
      }
    };

    socket.on('courier:location', onLocation);
    socket.on('courier:offline', onOffline);

    return () => {
      socket.off('courier:location', onLocation);
      socket.off('courier:offline', onOffline);
      disconnectSocket();
    };
  }, [followCourierId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mapa</h1>
        {followedCourier ? (
          <div className="text-sm text-gray-600">
            Siguiendo: <span className="font-medium text-gray-900">{followedCourier.fullName}</span>
          </div>
        ) : null}
      </div>

      <div className="h-[calc(100vh-12rem)] rounded-xl overflow-hidden shadow-lg relative">
        <AnyMapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ width: "100%", height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FollowController target={followTarget} />

          {couriers.map((c) =>
            c.location ? (
              <Marker
                key={c.courierId}
                position={[c.location.lat, c.location.lng]}
                eventHandlers={{
                  click: () => setSelectedCourierId(c.courierId),
                }}
              />
            ) : null
          )}

          {followCourierId && trailByCourier[followCourierId]?.length ? (
            <Polyline
              positions={trailByCourier[followCourierId]}
              pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.9 }}
            />
          ) : null}
        </AnyMapContainer>

        {/* Sidebar overlay */}
        <div className="absolute top-4 left-4 z-[1000] w-[22rem] max-w-[calc(100%-2rem)]">
          <div className="rounded-xl bg-white/95 backdrop-blur border border-gray-200 shadow-lg overflow-hidden">
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900">Mensajeros</div>
                <div className="text-xs text-gray-500">{visibleCouriers.length}</div>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre…"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">Historial:</span>
                <select
                  value={historyHours}
                  onChange={(e) => {
                    setHistoryHours(Number(e.target.value));
                    if (followCourierId) loadHistoryForCourier(followCourierId);
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value={1}>1 hora</option>
                  <option value={6}>6 horas</option>
                  <option value={12}>12 horas</option>
                  <option value={24}>24 horas</option>
                  <option value={48}>48 horas</option>
                  <option value={168}>7 días</option>
                </select>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-auto">
              {visibleCouriers.map((c) => {
                const isSelected = c.courierId === selectedCourierId;
                const isFollowing = c.courierId === followCourierId;
                const lastSeen = c.location?.recordedAt;
                const online = isRecent(lastSeen);

                return (
                  <button
                    key={c.courierId}
                    type="button"
                    onClick={() => setSelectedCourierId(c.courierId)}
                    className={
                      "w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-50 " +
                      (isSelected ? "bg-blue-50" : "")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              "inline-block h-2.5 w-2.5 rounded-full " +
                              (c.location ? (online ? "bg-emerald-500" : "bg-amber-500") : "bg-gray-300")
                            }
                            aria-hidden
                          />
                          <div className="font-medium text-gray-900 truncate">{c.fullName}</div>
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          Activas: <span className="font-medium text-gray-800">{c.activeDeliveries ?? 0}</span>
                          {" · "}Última: {formatTime(lastSeen)}
                          {c.location?.batteryLevel != null ? ` · Bat: ${c.location.batteryLevel}%` : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {c.location ? (
                          <span
                            className={
                              "text-[11px] px-2 py-1 rounded-full border " +
                              (isFollowing
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-700 border-gray-200")
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void toggleFollow(c.courierId);
                            }}
                          >
                            {isFollowing ? "Siguiendo" : "Seguir"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedCourier ? (
              <div className="p-3 bg-gray-50 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-900 truncate">{selectedCourier.fullName}</div>
                <div className="mt-1 text-xs text-gray-600">
                  {selectedCourier.location
                    ? `Lat: ${selectedCourier.location.lat.toFixed(5)} · Lng: ${selectedCourier.location.lng.toFixed(5)}`
                    : "Sin ubicación"}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
