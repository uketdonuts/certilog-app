import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyDeliveries, Delivery } from '@/lib/api/deliveries';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#FFA500',
  ASSIGNED: '#3B82F6',
  IN_TRANSIT: '#8B5CF6',
  DELIVERED: '#22C55E',
  FAILED: '#EF4444',
  CANCELLED: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignada',
  IN_TRANSIT: 'En tránsito',
  DELIVERED: 'Entregada',
  FAILED: 'Fallida',
  CANCELLED: 'Cancelada',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#6B7280',
  NORMAL: '#3B82F6',
  HIGH: '#F59E0B',
  URGENT: '#EF4444',
};

export default function DeliveriesScreen() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>('ACTIVE');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchDeliveries = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      // If filter is 'ACTIVE', fetch both ASSIGNED and IN_TRANSIT
      if (filter === 'ACTIVE') {
        const [assignedRes, inTransitRes] = await Promise.all([
          getMyDeliveries(1, 50, 'ASSIGNED'),
          getMyDeliveries(1, 50, 'IN_TRANSIT'),
        ]);
        // Combine and sort by priority and date
        const combined = [...assignedRes.data, ...inTransitRes.data].sort((a, b) => {
          // Priority order: URGENT > HIGH > NORMAL > LOW
          const priorityOrder = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
          const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          if (priorityDiff !== 0) return priorityDiff;
          // Then by created date (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setDeliveries(combined);
      } else {
        const response = await getMyDeliveries(1, 50, filter || undefined);
        setDeliveries(response.data);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchDeliveries(false);
  };

  const renderDeliveryCard = ({ item }: { item: Delivery }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/delivery/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.trackingContainer}>
          <Text style={styles.trackingCode}>{item.trackingCode}</Text>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: PRIORITY_COLORS[item.priority] + '20' },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color: PRIORITY_COLORS[item.priority] },
              ]}
            >
              {item.priority}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: STATUS_COLORS[item.status] },
          ]}
        >
          <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.customerInfo}>
          <Ionicons name="person-outline" size={16} color="#6B7280" />
          <Text style={styles.customerName}>{item.customer.name}</Text>
        </View>

        <View style={styles.addressInfo}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.address} numberOfLines={2}>
            {item.customer.address}
          </Text>
        </View>

        {item.description && (
          <View style={styles.descriptionInfo}>
            <Ionicons name="document-text-outline" size={16} color="#6B7280" />
            <Text style={styles.description} numberOfLines={1}>
              {item.description}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  const filters = [
    { key: 'ACTIVE', label: 'Activas (Asignadas + En tránsito)' },
    { key: 'ASSIGNED', label: 'Asignadas' },
    { key: 'IN_TRANSIT', label: 'En tránsito' },
    { key: 'DELIVERED', label: 'Entregadas' },
    { key: 'CANCELLED', label: 'Canceladas' },
    { key: null, label: 'Todas' },
  ];

  const currentLabel = filters.find((f) => f.key === filter)?.label || 'Filtrar';

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter dropdown */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setDropdownOpen((s) => !s)}
        >
          <Text style={styles.dropdownText}>{currentLabel}</Text>
          <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
        </TouchableOpacity>
        {dropdownOpen && (
          <View style={styles.dropdownMenu}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f.key ?? 'all'}
                style={styles.dropdownItem}
                onPress={() => {
                  setFilter(f.key);
                  setDropdownOpen(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        renderItem={renderDeliveryCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No hay entregas</Text>
            <Text style={styles.emptySubtext}>
              Las entregas activas aparecerán aquí
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 1000,
    elevation: 10,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    flex: 1,
  },
  dropdownText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 50,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#1F2937',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  trackingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  trackingCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
    flexShrink: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 0,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  address: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  descriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  cardFooter: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
