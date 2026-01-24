import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { assignDelivery, createDelivery, getCouriers, getCustomers, getDeliveries, updateDelivery } from '@/lib/api/dispatcher';
import { connectSocket } from '@/lib/services/socket';

export default function DispatcherDeliveriesScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editPriority, setEditPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [editDescription, setEditDescription] = useState('');
  const [editPackageDetails, setEditPackageDetails] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string; address: string }[]>([]);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; address: string } | null>(null);

  const [selectedCourier, setSelectedCourier] = useState<{ id: string; fullName: string } | null>(null);
  const [courierPickerOpen, setCourierPickerOpen] = useState(false);

  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [description, setDescription] = useState('');
  const [packageDetails, setPackageDetails] = useState('');

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDeliveryId, setAssignDeliveryId] = useState<string | null>(null);
  const [couriersLoading, setCouriersLoading] = useState(false);
  const [couriers, setCouriers] = useState<{ id: string; fullName: string }[]>([]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const refresh = async () => {
    const data = await getDeliveries({ page: 1, limit: 50 });
    setItems(data.data);
  };

  const openCreate = async () => {
    setSelectedCustomer(null);
    setSelectedCourier(null);
    setPriority('NORMAL');
    setDescription('');
    setPackageDetails('');
    setCreateOpen(true);

    if (customers.length === 0) {
      try {
        setCustomersLoading(true);
        const c = await getCustomers({ page: 1, limit: 200 });
        setCustomers(c.data.map((x: any) => ({ id: x.id, name: x.name, address: x.address })));
      } catch (e: any) {
        console.error(e);
        const msg = e?.response?.data?.error || 'Error cargando clientes';
        showAlert('Error', msg);
      } finally {
        setCustomersLoading(false);
      }
    }
  };

  const ensureCouriersLoaded = async () => {
    if (couriers.length > 0) return;
    try {
      setCouriersLoading(true);
      const list = await getCouriers();
      setCouriers(list.map((c: any) => ({ id: c.id, fullName: c.fullName })));
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || 'Error cargando mensajeros';
      showAlert('Error', msg);
    } finally {
      setCouriersLoading(false);
    }
  };

  const submitCreate = async () => {
    if (!selectedCustomer) {
      showAlert('Error', 'Selecciona un cliente');
      return;
    }
    try {
      setCreateSaving(true);
      await createDelivery({
        customerId: selectedCustomer.id,
        courierId: selectedCourier?.id,
        priority,
        description: description.trim() || undefined,
        packageDetails: packageDetails.trim() || undefined,
      });
      setCreateOpen(false);
      await refresh();
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || 'Error creando entrega';
      showAlert('Error', msg);
    } finally {
      setCreateSaving(false);
    }
  };

  useEffect(() => {
    async function fetch() {
      try {
        await refresh();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const sock = await connectSocket();
        const onDeliveryUpdated = () => {
          // Cheap + reliable: refresh list when a courier changes status.
          refresh().catch(() => undefined);
        };
        sock.on('delivery:updated', onDeliveryUpdated);
        cleanup = () => sock.off('delivery:updated', onDeliveryUpdated);
      } catch {
        // ignore
      }
    })();

    return () => cleanup?.();
  }, []);

  const openAssign = async (deliveryId: string) => {
    setAssignDeliveryId(deliveryId);
    setAssignOpen(true);
    if (couriers.length > 0) return;

    try {
      setCouriersLoading(true);
      const list = await getCouriers();
      setCouriers(list);
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || 'Error cargando mensajeros';
      showAlert('Error', msg);
    } finally {
      setCouriersLoading(false);
    }
  };

  const openEdit = (d: any) => {
    setEditing(d);
    setEditPriority((d?.priority as any) || 'NORMAL');
    setEditDescription(String(d?.description || ''));
    setEditPackageDetails(String(d?.packageDetails || ''));
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editing?.id) return;
    try {
      setEditSaving(true);
      await updateDelivery(editing.id, {
        priority: editPriority,
        description: editDescription,
        packageDetails: editPackageDetails,
      });
      setEditOpen(false);
      setEditing(null);
      await refresh();
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || 'Error editando entrega';
      showAlert('Error', msg);
    } finally {
      setEditSaving(false);
    }
  };

  const unassign = async () => {
    if (!editing?.id) return;
    const confirmed = Platform.OS === 'web'
      ? window.confirm('¿Quitar mensajero y volver a PENDING?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert('Quitar asignación', '¿Quitar mensajero y volver a PENDING?', [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Quitar', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });

    if (!confirmed) return;

    try {
      setEditSaving(true);
      await updateDelivery(editing.id, { courierId: null, status: 'PENDING' });
      setEditOpen(false);
      setEditing(null);
      await refresh();
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || 'Error quitando asignación';
      showAlert('Error', msg);
    } finally {
      setEditSaving(false);
    }
  };

  const pickCourier = async (courierId: string) => {
    if (!assignDeliveryId) return;
    try {
      await assignDelivery(assignDeliveryId, courierId);
      setAssignOpen(false);
      setAssignDeliveryId(null);
      await refresh();
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || 'Error asignando entrega';
      showAlert('Error', msg);
    }
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
      <View style={styles.headerRow}>
        <Text style={styles.titleTop}>Entregas</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={openCreate}>
          <Text style={styles.primaryBtnText}>Crear</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => router.push(`/delivery/${item.id}`)}
          >
            <View>
              <Text style={styles.title}>{item.trackingCode}</Text>
              <Text style={styles.sub}>{item.customer?.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>{item.customer?.address}</Text>
              <Text style={styles.sub}>
                {item.courier?.fullName ? `Mensajero: ${item.courier.fullName}` : 'Sin mensajero'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={styles.badge}>{item.status}</Text>
              <TouchableOpacity onPress={() => openEdit(item)}>
                <Text style={styles.link}>Editar</Text>
              </TouchableOpacity>
              {item.status !== 'DELIVERED' && (
                <TouchableOpacity onPress={() => openAssign(item.id)}>
                  <Text style={styles.link}>{item.courier?.fullName ? 'Reasignar' : 'Asignar'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay entregas</Text>}
      />

      <Modal visible={assignOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Asignar mensajero</Text>
            {couriersLoading ? (
              <View style={styles.centerSmall}><ActivityIndicator color="#3B82F6" /></View>
            ) : (
              <FlatList
                data={couriers}
                keyExtractor={(c) => c.id}
                renderItem={({ item: c }) => (
                  <TouchableOpacity style={styles.modalItem} onPress={() => pickCourier(c.id)}>
                    <Text style={styles.modalItemText}>{c.fullName}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No hay mensajeros</Text>}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setAssignOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar entrega</Text>

            <Text style={styles.hintText}>
              {editing?.trackingCode ? `Tracking: ${editing.trackingCode}` : ''}
            </Text>
            <Text style={styles.hintText}>
              {editing?.courier?.fullName ? `Mensajero: ${editing.courier.fullName}` : 'Sin mensajero'}
            </Text>

            <View style={styles.pillsRow}>
              {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.pill, editPriority === p && styles.pillActive]}
                  onPress={() => setEditPriority(p)}
                  disabled={editSaving}
                >
                  <Text style={[styles.pillText, editPriority === p && styles.pillTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Descripción (opcional)"
              value={editDescription}
              onChangeText={setEditDescription}
              style={styles.input}
              editable={!editSaving}
              multiline
            />

            <TextInput
              placeholder="Detalles del paquete (opcional)"
              value={editPackageDetails}
              onChangeText={setEditPackageDetails}
              style={styles.input}
              editable={!editSaving}
              multiline
            />

            <View style={styles.modalActionsRow}>
              {!!editing?.courier?.fullName && editing?.status !== 'DELIVERED' && (
                <TouchableOpacity style={styles.dangerBtn} onPress={unassign} disabled={editSaving}>
                  <Text style={styles.dangerBtnText}>Quitar</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEditOpen(false)} disabled={editSaving}>
                <Text style={styles.secondaryBtnText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitEdit} disabled={editSaving}>
                {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Guardar</Text>}
              </TouchableOpacity>
            </View>

            {editing?.status !== 'DELIVERED' && (
              <TouchableOpacity
                style={[styles.pickerButton, { marginTop: 10 }]}
                onPress={async () => {
                  setEditOpen(false);
                  await openAssign(editing.id);
                }}
                disabled={editSaving}
              >
                <Text style={styles.pickerButtonText}>
                  {editing?.courier?.fullName ? 'Cambiar mensajero (Reasignar)' : 'Asignar mensajero'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={createOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Crear entrega</Text>

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setCustomerPickerOpen(true)}
              disabled={customersLoading || createSaving}
            >
              <Text style={styles.pickerButtonText}>
                {selectedCustomer
                  ? `Cliente: ${selectedCustomer.name}`
                  : customersLoading
                    ? 'Cargando clientes...'
                    : 'Seleccionar cliente'}
              </Text>
              {!!selectedCustomer && (
                <Text style={styles.pickerSub} numberOfLines={1}>{selectedCustomer.address}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={async () => {
                await ensureCouriersLoaded();
                setCourierPickerOpen(true);
              }}
              disabled={couriersLoading || createSaving}
            >
              <Text style={styles.pickerButtonText}>
                {selectedCourier ? `Mensajero: ${selectedCourier.fullName}` : 'Asignar mensajero (opcional)'}
              </Text>
              {!!selectedCourier && (
                <TouchableOpacity onPress={() => setSelectedCourier(null)}>
                  <Text style={styles.link}>Quitar asignación</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <View style={styles.pillsRow}>
              {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.pill, priority === p && styles.pillActive]}
                  onPress={() => setPriority(p)}
                  disabled={createSaving}
                >
                  <Text style={[styles.pillText, priority === p && styles.pillTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Descripción (opcional)"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
              editable={!createSaving}
              multiline
            />

            <TextInput
              placeholder="Detalles del paquete (opcional)"
              value={packageDetails}
              onChangeText={setPackageDetails}
              style={styles.input}
              editable={!createSaving}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCreateOpen(false)} disabled={createSaving}>
                <Text style={styles.secondaryBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitCreate} disabled={createSaving}>
                {createSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.hintText}>
              Si asignas mensajero, la entrega queda en ASSIGNED.
            </Text>
          </View>
        </View>
      </Modal>

      <Modal visible={customerPickerOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Seleccionar cliente</Text>
            {customersLoading ? (
              <View style={styles.centerSmall}><ActivityIndicator color="#3B82F6" /></View>
            ) : (
              <FlatList
                data={customers}
                keyExtractor={(c) => c.id}
                renderItem={({ item: c }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedCustomer(c);
                      setCustomerPickerOpen(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{c.name}</Text>
                    <Text style={styles.modalItemSub} numberOfLines={1}>{c.address}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No hay clientes</Text>}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCustomerPickerOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={courierPickerOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Asignar mensajero</Text>
            {couriersLoading ? (
              <View style={styles.centerSmall}><ActivityIndicator color="#3B82F6" /></View>
            ) : (
              <FlatList
                data={couriers}
                keyExtractor={(c) => c.id}
                renderItem={({ item: c }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedCourier({ id: c.id, fullName: c.fullName });
                      setCourierPickerOpen(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{c.fullName}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No hay mensajeros</Text>}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCourierPickerOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerSmall: { paddingVertical: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleTop: { fontSize: 18, fontWeight: '800', color: '#111827' },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2, maxWidth: 240 },
  badge: { fontSize: 12, color: '#374151' },
  link: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  empty: { color: '#6B7280', paddingVertical: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, maxHeight: '80%' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 10 },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalItemText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  modalItemSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  modalActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  primaryBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  secondaryBtnText: { color: '#111827', fontWeight: '700' },
  dangerBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  dangerBtnText: { color: '#991B1B', fontWeight: '800' },
  pickerButton: { backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  pickerButtonText: { fontSize: 13, fontWeight: '800', color: '#111827' },
  pickerSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  pill: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillActive: { backgroundColor: '#DBEAFE' },
  pillText: { color: '#374151', fontWeight: '800', fontSize: 12 },
  pillTextActive: { color: '#1D4ED8' },
  input: { backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  hintText: { marginTop: 8, color: '#6B7280', fontSize: 12 },
});
