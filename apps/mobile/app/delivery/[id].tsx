import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDeliveryById, Delivery, updateDeliveryStatus } from '@/lib/api/deliveries';
import { openWhatsApp, callPhone } from '@/lib/services/whatsapp';
import { openMapsNavigation } from '@/lib/services/location';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#FFA500',
  ASSIGNED: '#3B82F6',
  IN_TRANSIT: '#8B5CF6',
  DELIVERED: '#22C55E',
  FAILED: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignada',
  IN_TRANSIT: 'En tránsito',
  DELIVERED: 'Entregada',
  FAILED: 'Fallida',
};

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchDelivery();
  }, [id]);

  const fetchDelivery = async () => {
    try {
      const data = await getDeliveryById(id);
      setDelivery(data);
    } catch (error) {
      console.error('Error fetching delivery:', error);
      Alert.alert('Error', 'No se pudo cargar la entrega');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartDelivery = async () => {
    if (!delivery) return;

    setIsUpdating(true);
    try {
      const updated = await updateDeliveryStatus(delivery.id, 'IN_TRANSIT');
      setDelivery(updated);
      Alert.alert('Éxito', 'Entrega iniciada');
    } catch (error) {
      console.error('Error starting delivery:', error);
      Alert.alert('Error', 'No se pudo iniciar la entrega');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteDelivery = () => {
    router.push(`/delivery/complete/${id}`);
  };

  const handleNavigate = () => {
    if (!delivery?.customer.latitude || !delivery?.customer.longitude) {
      Alert.alert('Error', 'No hay coordenadas de ubicación');
      return;
    }

    openMapsNavigation(
      Number(delivery.customer.latitude),
      Number(delivery.customer.longitude),
      delivery.customer.name
    );
  };

  const handleWhatsApp = () => {
    if (!delivery?.customer.phone) {
      Alert.alert('Error', 'No hay número de teléfono');
      return;
    }

    openWhatsApp(
      delivery.customer.phone,
      `Hola ${delivery.customer.name}, soy el mensajero de CertiLog. Voy en camino con su entrega.`
    );
  };

  const handleCall = () => {
    if (!delivery?.customer.phone) {
      Alert.alert('Error', 'No hay número de teléfono');
      return;
    }

    callPhone(delivery.customer.phone);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!delivery) {
    return null;
  }

  const canStart = delivery.status === 'ASSIGNED';
  const canComplete = delivery.status === 'IN_TRANSIT';
  const isCompleted = delivery.status === 'DELIVERED';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: STATUS_COLORS[delivery.status] },
          ]}
        >
          <Text style={styles.statusText}>{STATUS_LABELS[delivery.status]}</Text>
          <Text style={styles.trackingCode}>{delivery.trackingCode}</Text>
        </View>

        {/* Customer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>

          <View style={styles.customerCard}>
            <View style={styles.customerInfo}>
              <Ionicons name="person" size={24} color="#3B82F6" />
              <View style={styles.customerDetails}>
                <Text style={styles.customerName}>{delivery.customer.name}</Text>
                <Text style={styles.customerPhone}>{delivery.customer.phone}</Text>
              </View>
            </View>

            <View style={styles.contactButtons}>
              <TouchableOpacity
                style={[styles.contactButton, styles.whatsappButton]}
                onPress={handleWhatsApp}
              >
                <Ionicons name="logo-whatsapp" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactButton, styles.callButton]}
                onPress={handleCall}
              >
                <Ionicons name="call" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dirección</Text>

          <TouchableOpacity style={styles.addressCard} onPress={handleNavigate}>
            <View style={styles.addressInfo}>
              <Ionicons name="location" size={24} color="#EF4444" />
              <Text style={styles.address}>{delivery.customer.address}</Text>
            </View>
            <View style={styles.navigateButton}>
              <Ionicons name="navigate" size={20} color="#3B82F6" />
              <Text style={styles.navigateText}>Navegar</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Package Details */}
        {(delivery.description || delivery.packageDetails) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalles del paquete</Text>
            <View style={styles.detailsCard}>
              {delivery.description && (
                <Text style={styles.detailText}>{delivery.description}</Text>
              )}
              {delivery.packageDetails && (
                <Text style={styles.detailText}>{delivery.packageDetails}</Text>
              )}
            </View>
          </View>
        )}

        {/* Delivery Proof (if completed) */}
        {isCompleted && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prueba de entrega</Text>
            <View style={styles.proofCard}>
              {delivery.deliveredAt && (
                <Text style={styles.deliveredAt}>
                  Entregado: {new Date(delivery.deliveredAt).toLocaleString()}
                </Text>
              )}
              {delivery.deliveryNotes && (
                <Text style={styles.notes}>Notas: {delivery.deliveryNotes}</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action Buttons */}
      {!isCompleted && (
        <View style={styles.actionContainer}>
          {canStart && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={handleStartDelivery}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>Iniciar Entrega</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {canComplete && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleCompleteDelivery}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Completar Entrega</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  scrollView: {
    flex: 1,
  },
  statusBanner: {
    padding: 20,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trackingCode: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  callButton: {
    backgroundColor: '#3B82F6',
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  address: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
    lineHeight: 24,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF5FF',
    padding: 12,
    borderRadius: 12,
  },
  navigateText: {
    color: '#3B82F6',
    fontWeight: '600',
    marginLeft: 8,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  detailText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  proofCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  deliveredAt: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '600',
  },
  notes: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  bottomPadding: {
    height: 120,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  startButton: {
    backgroundColor: '#8B5CF6',
  },
  completeButton: {
    backgroundColor: '#22C55E',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
