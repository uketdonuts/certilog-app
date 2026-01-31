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
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from '@/lib/api/dispatcher';

export default function DispatcherCustomersScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const refresh = async () => {
    const data = await getCustomers({ page: 1, limit: 50 });
    setItems(data.data);
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

  const openCreate = () => {
    setName('');
    setPhone('');
    setAddress('');
    setCreateOpen(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setEditName(String(c?.name || ''));
    setEditPhone(String(c?.phone || ''));
    setEditAddress(String(c?.address || ''));
    setEditOpen(true);
  };

  const submitCreate = async () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      showAlert('Error', 'Nombre, teléfono y dirección son requeridos');
      return;
    }
    try {
      await createCustomer({ name: name.trim(), phone: phone.trim(), address: address.trim() });
      setCreateOpen(false);
      await refresh();
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || 'Error creando cliente';
      showAlert('Error', msg);
    }
  };

  const submitEdit = async () => {
    if (!editing?.id) return;
    if (!editName.trim() || !editPhone.trim() || !editAddress.trim()) {
      showAlert('Error', 'Nombre, teléfono y dirección son requeridos');
      return;
    }
    try {
      await updateCustomer(editing.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
      });
      setEditOpen(false);
      setEditing(null);
      await refresh();
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || 'Error editando cliente';
      showAlert('Error', msg);
    }
  };

  const onDeactivate = async (id: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('¿Desactivar cliente?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert('Desactivar', '¿Desactivar cliente?', [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Desactivar', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });
    if (!confirmed) return;
    try {
      await deleteCustomer(id);
      await refresh();
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || 'Error desactivando cliente';
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
        <Text style={styles.titleTop}>Clientes</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={openCreate}>
          <Text style={styles.primaryBtnText}>Crear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.sub}>{item.phone}</Text>
              <Text style={styles.sub} numberOfLines={1}>{item.address}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <TouchableOpacity onPress={() => openEdit(item)}>
                <Text style={styles.linkText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDeactivate(item.id)}>
                <Text style={styles.dangerText}>Desactivar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay clientes</Text>}
      />

      <Modal visible={createOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.fullScreenModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Crear cliente</Text>
              <TextInput placeholder="Nombre" value={name} onChangeText={setName} style={styles.input} />
              <TextInput placeholder="Teléfono" value={phone} onChangeText={setPhone} style={styles.input} />
              <TextInput placeholder="Dirección" value={address} onChangeText={setAddress} style={styles.input} />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCreateOpen(false)}>
                  <Text style={styles.secondaryBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={submitCreate}>
                  <Text style={styles.primaryBtnText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal visible={editOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.fullScreenModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Editar cliente</Text>
              <TextInput placeholder="Nombre" value={editName} onChangeText={setEditName} style={styles.input} />
              <TextInput placeholder="Teléfono" value={editPhone} onChangeText={setEditPhone} style={styles.input} />
              <TextInput placeholder="Dirección" value={editAddress} onChangeText={setEditAddress} style={styles.input} />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEditOpen(false)}>
                  <Text style={styles.secondaryBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={submitEdit}>
                  <Text style={styles.primaryBtnText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleTop: { fontSize: 18, fontWeight: '800', color: '#111827' },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2, maxWidth: 300 },
  linkText: { fontSize: 12, color: '#2563EB', fontWeight: '700' },
  dangerText: { fontSize: 12, color: '#DC2626', fontWeight: '700' },
  empty: { color: '#6B7280', paddingVertical: 12 },
  primaryBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  secondaryBtnText: { color: '#111827', fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  fullScreenModal: { flex: 1, backgroundColor: '#F3F4F6' },
  modalScroll: { padding: 16, paddingBottom: 40 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 10 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
