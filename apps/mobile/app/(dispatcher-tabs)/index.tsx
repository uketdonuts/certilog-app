import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { getDeliveryStats, getDeliveries, getCouriersLocations } from '@/lib/api/dispatcher';

export default function DispatcherDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);

  useEffect(() => {
    async function fetch() {
      try {
        const [s, d, c] = await Promise.all([
          getDeliveryStats(),
          getDeliveries({ page: 1, limit: 5 }),
          getCouriersLocations(),
        ]);
        setStats(s);
        setRecent(d.data);
        setCouriers(c);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Hoy</Text>
          <Text style={styles.cardValue}>{stats?.todayDelivered ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Pendientes</Text>
          <Text style={styles.cardValue}>{stats?.pending ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>En tránsito</Text>
          <Text style={styles.cardValue}>{stats?.inTransit ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Fallidas</Text>
          <Text style={styles.cardValue}>{stats?.failed ?? 0}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Entregas recientes</Text>
      <FlatList
        data={recent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View>
              <Text style={styles.itemTitle}>{item.trackingCode}</Text>
              <Text style={styles.itemSub}>{item.customer?.name}</Text>
            </View>
            <Text style={styles.badge}>{item.status}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay entregas</Text>}
      />

      <Text style={styles.sectionTitle}>Mensajeros activos</Text>
      <FlatList
        data={couriers}
        keyExtractor={(item) => item.courierId}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View>
              <Text style={styles.itemTitle}>{item.fullName}</Text>
              <Text style={styles.itemSub}>{item.activeDeliveries} entrega(s)</Text>
            </View>
            <Text style={styles.badge}>{item.location ? 'Online' : 'Offline'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay mensajeros</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, width: '48%' },
  cardLabel: { fontSize: 12, color: '#6B7280' },
  cardValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 4 },
  sectionTitle: { marginTop: 12, marginBottom: 8, fontSize: 16, fontWeight: '600', color: '#111827' },
  listItem: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  itemSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  badge: { fontSize: 12, color: '#374151' },
  empty: { color: '#6B7280', paddingVertical: 12 },
});
