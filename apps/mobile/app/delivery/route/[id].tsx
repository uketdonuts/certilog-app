import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams } from 'expo-router';
import { getDeliveryRoute, DeliveryRoutePoint } from '@/lib/api/deliveries';
import { cleanRouteTrace } from '@/lib/utils/routeTrace';

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildRouteHtml(points: { lat: number; lng: number; recordedAt: string }[]) {
  const coords = points.map((p) => [p.lat, p.lng]);
  const coordsJson = safeJson(coords);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
    <style>
      html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #f3f4f6; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
    <script>
      const coords = ${coordsJson};
      const map = L.map('map', { zoomControl: true });
      // CARTO Voyager: light, familiar (Google-ish) styling without an API key.
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        subdomains: 'abcd',
        attribution: '',
      }).addTo(map);

      if (coords && coords.length) {
        const polyline = L.polyline(coords, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
          smoothFactor: 1.2,
        }).addTo(map);
        const start = coords[0];
        const end = coords[coords.length - 1];
        L.circleMarker(start, { radius: 6, color: '#16a34a', fillColor: '#22c55e', fillOpacity: 1 }).addTo(map);
        L.circleMarker(end, { radius: 6, color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1 }).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [18, 18] });
      } else {
        map.setView([0, 0], 2);
      }
    </script>
  </body>
</html>`;
}

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function DeliveryRouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<DeliveryRoutePoint[]>([]);

  const webViewRef = useRef<WebView | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getDeliveryRoute(id);
        setPoints(data.points || []);
      } catch (e: any) {
        console.error(e);
        const msg = e?.response?.data?.error || 'No se pudo cargar la ruta';
        showAlert('Error', msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const summary = useMemo(() => {
    if (!points.length) return null;
    const first = points[0];
    const last = points[points.length - 1];
    return {
      count: points.length,
      from: first.recordedAt,
      to: last.recordedAt,
      first,
      last,
    };
  }, [points]);

  const routeHtml = useMemo(() => {
    const usable = cleanRouteTrace(
      points.map((p) => ({
        lat: Number(p.lat),
        lng: Number(p.lng),
        recordedAt: p.recordedAt,
        accuracy: p.accuracy,
      })),
      {
        // Conservative defaults that remove "teleport" points and reduce jitter
        maxSpeedKmh: 160,
        maxJumpMeters: 400,
        minStepMeters: 2,
        smoothingWindow: 3,
      }
    ).map((p) => ({ lat: p.lat, lng: p.lng, recordedAt: p.recordedAt }));
    return buildRouteHtml(usable);
  }, [points]);

  const openMaps = async (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    await Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ruta de entrega</Text>

      {summary ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{summary.count} punto(s)</Text>
          <Text style={styles.sub}>Desde: {new Date(summary.from).toLocaleString()}</Text>
          <Text style={styles.sub}>Hasta: {new Date(summary.to).toLocaleString()}</Text>

          <View style={styles.mapCard}>
            <WebView
              // @ts-expect-error - web shim differs, but works.
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: routeHtml }}
              javaScriptEnabled
              domStorageEnabled
              style={styles.map}
            />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.btn} onPress={() => openMaps(summary.first.lat, summary.first.lng)}>
              <Text style={styles.btnText}>Abrir inicio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={() => openMaps(summary.last.lat, summary.last.lng)}>
              <Text style={styles.btnText}>Abrir final</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>No hay puntos de ruta para esta entrega</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 6 },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  mapCard: { height: 220, backgroundColor: '#F3F4F6', borderRadius: 12, overflow: 'hidden', marginTop: 10 },
  map: { flex: 1, backgroundColor: '#F3F4F6' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  empty: { color: '#6B7280', paddingVertical: 12 },
});
