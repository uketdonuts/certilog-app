export type LatLngPoint = {
  lat: number;
  lng: number;
  recordedAt: string;
  accuracy?: number | null;
};

function isValidLatLng(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function toEpochMs(iso: string) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : NaN;
}

// Haversine distance in meters
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type CleanRouteOptions = {
  // Remove points that imply higher speeds (km/h)
  maxSpeedKmh?: number;
  // If timestamps are missing/duplicate, remove single-step jumps bigger than this (meters)
  maxJumpMeters?: number;
  // Remove micro-jitter / duplicate points closer than this (meters)
  minStepMeters?: number;
  // Simple moving-average smoothing window (odd number; 1 disables)
  smoothingWindow?: 1 | 3 | 5;
};

const DEFAULTS: Required<CleanRouteOptions> = {
  maxSpeedKmh: 160,
  maxJumpMeters: 400,
  minStepMeters: 2,
  smoothingWindow: 3,
};

export function cleanRouteTrace(rawPoints: LatLngPoint[], options?: CleanRouteOptions) {
  const cfg = { ...DEFAULTS, ...(options || {}) };

  // 1) Basic validation
  const valid = (rawPoints || []).filter((p) => isValidLatLng(Number(p.lat), Number(p.lng)) && !!p.recordedAt);
  if (valid.length <= 2) return valid;

  // 2) Ensure stable ordering by recordedAt (defensive)
  const ordered = [...valid].sort((a, b) => {
    const ta = toEpochMs(a.recordedAt);
    const tb = toEpochMs(b.recordedAt);
    if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0;
    return ta - tb;
  });

  // 3) Drop duplicates / impossible jumps
  const cleaned: LatLngPoint[] = [];

  for (const p of ordered) {
    if (!cleaned.length) {
      cleaned.push(p);
      continue;
    }

    const prev = cleaned[cleaned.length - 1];
    const dist = distanceMeters(prev, p);

    if (dist < cfg.minStepMeters) continue;

    const tPrev = toEpochMs(prev.recordedAt);
    const tCur = toEpochMs(p.recordedAt);
    const dtSec = Number.isFinite(tPrev) && Number.isFinite(tCur) ? Math.max(0, (tCur - tPrev) / 1000) : 0;

    if (dtSec > 0) {
      const speedKmh = (dist / dtSec) * 3.6;
      if (speedKmh > cfg.maxSpeedKmh) continue;
    } else {
      if (dist > cfg.maxJumpMeters) continue;
    }

    cleaned.push(p);
  }

  if (cleaned.length <= 2) return cleaned;

  // 4) Light smoothing (keeps endpoints)
  const w = cfg.smoothingWindow;
  if (w === 1 || cleaned.length < 5) return cleaned;

  const half = Math.floor(w / 2);
  const smoothed: LatLngPoint[] = cleaned.map((p) => ({ ...p }));

  for (let i = 0; i < cleaned.length; i++) {
    if (i < half || i > cleaned.length - 1 - half) continue;

    let latSum = 0;
    let lngSum = 0;
    let count = 0;

    for (let j = i - half; j <= i + half; j++) {
      latSum += cleaned[j].lat;
      lngSum += cleaned[j].lng;
      count++;
    }

    smoothed[i].lat = latSum / count;
    smoothed[i].lng = lngSum / count;
  }

  return smoothed;
}
