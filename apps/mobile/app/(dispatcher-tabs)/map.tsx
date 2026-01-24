import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Linking, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { getCouriersLocations } from '@/lib/api/dispatcher';
import { connectSocket } from '@/lib/services/socket';

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildLeafletHtml(params: {
  couriers: {
    courierId: string;
    fullName: string;
    activeDeliveries?: number;
    location: { lat: number; lng: number; recordedAt?: string | null; batteryLevel?: number | null };
  }[];
}) {
  const couriersJson = safeJson(params.couriers);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      crossorigin=""
    />
    <style>
      html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #f3f4f6; }
      .popup-title { font-weight: 700; margin-bottom: 4px; }
      .popup-sub { color: #4b5563; font-size: 12px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
    <script>
      const initialCouriers = ${couriersJson};

      function postMessageSafe(message) {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(String(message));
            return;
          }
        } catch (e) {}
        try {
          window.parent && window.parent.postMessage(String(message), '*');
        } catch (e) {}
      }

      const map = L.map('map', { zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '',
      }).addTo(map);

      const markersById = {};

      function courierPopupHtml(c) {
        const recordedAt = c.location && c.location.recordedAt ? new Date(c.location.recordedAt).toLocaleString() : '';
        const batt = c.location && c.location.batteryLevel != null ? (c.location.batteryLevel + '%') : '';
        const active = c.activeDeliveries != null ? String(c.activeDeliveries) : '';
        return (
          '<div class="popup-title">' + (c.fullName || 'Mensajero') + '</div>' +
          '<div class="popup-sub">' +
            (active ? ('Activas: ' + active + '<br/>') : '') +
            'Lat/Lng: ' + c.location.lat.toFixed(5) + ', ' + c.location.lng.toFixed(5) + (recordedAt ? ('<br/>' + recordedAt) : '') + (batt ? ('<br/>Batería: ' + batt) : '') +
          '</div>'
        );
      }

      function setCouriers(nextCouriers) {
        const seen = {};
        const points = [];

        for (const c of nextCouriers || []) {
          if (!c || !c.courierId || !c.location) continue;
          const id = c.courierId;
          seen[id] = true;
          const lat = Number(c.location.lat);
          const lng = Number(c.location.lng);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

          points.push([lat, lng]);

          if (!markersById[id]) {
            markersById[id] = L.marker([lat, lng]).addTo(map);
            markersById[id].on('click', () => postMessageSafe('courier:' + id));
          } else {
            markersById[id].setLatLng([lat, lng]);
          }
          markersById[id].bindPopup(courierPopupHtml(c));
        }

        for (const id in markersById) {
          if (!seen[id]) {
            map.removeLayer(markersById[id]);
            delete markersById[id];
          }
        }

        if (points.length === 1) {
          map.setView(points[0], 15);
        } else if (points.length > 1) {
          map.fitBounds(points, { padding: [24, 24] });
        } else {
          map.setView([0, 0], 2);
        }
      }

      function centerOnCourier(id) {
        try {
          const m = markersById[id];
          if (m) {
            const latlng = m.getLatLng();
            map.setView([latlng.lat, latlng.lng], 15);
            m.openPopup();
          }
        } catch (e) {}
      }

      window.setCouriers = setCouriers;
      window.centerOnCourier = centerOnCourier;
      setCouriers(initialCouriers);
    </script>
  </body>
</html>`;
}

export default function DispatcherMapScreen() {
  const [loading, setLoading] = useState(true);
  const [itemsById, setItemsById] = useState<Record<string, any>>({});
  const [liveConnected, setLiveConnected] = useState(false);

  const webViewRef = useRef<WebView | null>(null);

  const items = useMemo(() => {
    const list = Object.values(itemsById);
    // Online first, then by name
    return list.sort((a: any, b: any) => {
      const ao = a.location ? 0 : 1;
      const bo = b.location ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return String(a.fullName || '').localeCompare(String(b.fullName || ''));
    });
  }, [itemsById]);

  const couriersWithLocation = useMemo(() => {
    return items
      .filter((x: any) => x?.location)
      .map((x: any) => ({
        courierId: String(x.courierId),
        fullName: String(x.fullName || ''),
        activeDeliveries: typeof x.activeDeliveries === 'number' ? x.activeDeliveries : undefined,
        location: {
          lat: Number(x.location.lat),
          lng: Number(x.location.lng),
          recordedAt: x.location.recordedAt || null,
          batteryLevel: x.location.batteryLevel ?? null,
        },
      }));
  }, [items]);

  const initialHtml = useMemo(() => {
    return buildLeafletHtml({ couriers: couriersWithLocation });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Platform.OS === 'web' ? couriersWithLocation : null]);

  useEffect(() => {
    if (Platform.OS === 'web') return; // web shim doesn't support injection
    if (!webViewRef.current) return;
    const js = `window.setCouriers && window.setCouriers(${safeJson(couriersWithLocation)}); true;`;
    webViewRef.current.injectJavaScript(js);
  }, [couriersWithLocation]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const data = await getCouriersLocations();
        const next: Record<string, any> = {};
        for (const c of data) next[c.courierId] = c;
        setItemsById(next);

        // Start socket live updates (admin/dispatcher join the "dashboard" room on connect)
        try {
          const sock = await connectSocket();
          setLiveConnected(sock.connected);

          const onConnect = () => setLiveConnected(true);
          const onDisconnect = () => setLiveConnected(false);

          const onCourierLocation = (payload: any) => {
            setItemsById((prev) => {
              const existing = prev[payload.courierId] || {
                courierId: payload.courierId,
                fullName: payload.fullName,
                activeDeliveries: 0,
                location: null,
              };
              return {
                ...prev,
                [payload.courierId]: {
                  ...existing,
                  courierId: payload.courierId,
                  fullName: payload.fullName ?? existing.fullName,
                  location: {
                    lat: payload.lat,
                    lng: payload.lng,
                    batteryLevel: payload.battery ?? null,
                    recordedAt: payload.timestamp
                      ? new Date(payload.timestamp).toISOString()
                      : new Date().toISOString(),
                  },
                },
              };
            });
          };

          const onCourierOffline = (payload: any) => {
            setItemsById((prev) => {
              const existing = prev[payload.courierId];
              if (!existing) return prev;
              return {
                ...prev,
                [payload.courierId]: {
                  ...existing,
                  location: null,
                },
              };
            });
          };

          sock.on('connect', onConnect);
          sock.on('disconnect', onDisconnect);
          sock.on('courier:location', onCourierLocation);
          sock.on('courier:offline', onCourierOffline);

          cleanup = () => {
            sock.off('connect', onConnect);
            sock.off('disconnect', onDisconnect);
            sock.off('courier:location', onCourierLocation);
            sock.off('courier:offline', onCourierOffline);
          };
        } catch {
          setLiveConnected(false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();

    return () => cleanup?.();
  }, []);

  const openMaps = async (lat: number, lng: number) => {
    // Prefer centering the in-app WebView map; fallback to Google Maps if WebView unavailable
    try {
      if (webViewRef.current) {
        const js = `window.centerOnCourier && window.centerOnCourier('${lat},${lng}'); true;`;
        // centerOnCourier expects an id, but older code calls openMaps with coords — if we get coords inject a setView directly
        const jsCoords = `map && map.setView([${lat}, ${lng}], 15); true;`;
        webViewRef.current.injectJavaScript(jsCoords);
        return;
      }
    } catch (e) {
      // fallthrough to open externally
    }

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
      <Text style={styles.hint}>{liveConnected ? 'En vivo: GPS en tiempo real' : 'Mapa (sin conexión en vivo)'}</Text>

      <View style={styles.mapCard}>
        <WebView
          // @ts-expect-error - web shim differs, but works.
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: initialHtml }}
          javaScriptEnabled
          domStorageEnabled
          style={styles.map}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.courierId}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.fullName}</Text>
              <Text style={styles.sub}>
                {item.location
                  ? `(${item.location.lat.toFixed(5)}, ${item.location.lng.toFixed(5)})`
                  : 'Sin ubicación'}
              </Text>
            </View>
            {item.location ? (
              <TouchableOpacity style={styles.btn} onPress={() => openMaps(item.location.lat, item.location.lng)}>
                <Text style={styles.btnText}>Abrir</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.badge}>Offline</Text>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay mensajeros</Text>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { color: '#6B7280', marginBottom: 8 },
  mapCard: { height: 280, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  map: { flex: 1, backgroundColor: '#F3F4F6' },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  btn: { backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '600' },
  badge: { color: '#6B7280' },
  empty: { color: '#6B7280', paddingVertical: 12 },
});
