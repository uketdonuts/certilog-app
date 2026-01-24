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
import { useAuth } from '@/lib/context/AuthContext';
import { createUser, deactivateUser, getUsers, updateUser } from '@/lib/api/client';

export default function DispatcherUsersScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'DISPATCHER' | 'COURIER'>('COURIER');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'ADMIN' | 'DISPATCHER' | 'COURIER'>('COURIER');

  const isAdmin = user?.role === 'ADMIN';
  const isDispatcher = user?.role === 'DISPATCHER';
  const canManageUsers = isAdmin || isDispatcher;

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const refresh = async () => {
    const data = await getUsers(1, 50);
    setItems(data.data || data);
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
    setFullName('');
    setEmail('');
    setUsername('');
    setPassword('');
    setRole('COURIER');
    setCreateOpen(true);
  };

  const openEdit = (u: any) => {
    setEditing(u);
    setEditFullName(String(u?.fullName || ''));
    setEditPhone(String(u?.phone || ''));
    setEditRole((u?.role as any) || 'COURIER');
    setEditOpen(true);
  };

  const submitCreate = async () => {
    if (!fullName.trim()) {
      showAlert('Error', 'Nombre completo requerido');
      return;
    }
    if (!password.trim()) {
      showAlert('Error', 'Password requerido');
      return;
    }

    try {
      await createUser({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        username: username.trim() || undefined,
        password: password.trim(),
        role,
      });
      setCreateOpen(false);
      await refresh();
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || 'Error creando usuario';
      showAlert('Error', msg);
    }
  };

  const submitEdit = async () => {
    if (!editing?.id) return;
    if (!editFullName.trim()) {
      showAlert('Error', 'Nombre completo requerido');
      return;
    }

    try {
      await updateUser(editing.id, {
        fullName: editFullName.trim(),
        phone: editPhone.trim() || undefined,
        role: editRole,
      });
      setEditOpen(false);
      setEditing(null);
      await refresh();
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || 'Error editando usuario';
      showAlert('Error', msg);
    }
  };

  const onDeactivate = async (id: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('¿Desactivar usuario?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert('Desactivar', '¿Desactivar usuario?', [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Desactivar', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });

    if (!confirmed) return;

    try {
      await deactivateUser(id);
      await refresh();
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || 'Error desactivando usuario';
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
        <Text style={styles.hint}>
          {canManageUsers
            ? 'ADMIN/DISPATCHER: puedes crear y editar usuarios.'
            : 'Solo lectura (usuarios).'}
        </Text>
        {canManageUsers && (
          <TouchableOpacity style={styles.primaryBtn} onPress={openCreate}>
            <Text style={styles.primaryBtnText}>Crear</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={styles.title}>{item.fullName || item.username}</Text>
              <Text style={styles.sub}>{item.email || 'Sin email'}</Text>
              {!!item.phone && <Text style={styles.sub}>{item.phone}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={styles.badge}>{item.role}</Text>
              {canManageUsers && item.role !== 'ADMIN' && (
                <TouchableOpacity onPress={() => openEdit(item)}>
                  <Text style={styles.linkText}>Editar</Text>
                </TouchableOpacity>
              )}
              {(isAdmin || (isDispatcher && item.role === 'COURIER' && item.id !== user?.id)) && item.isActive !== false && (
                <TouchableOpacity onPress={() => onDeactivate(item.id)}>
                  <Text style={styles.dangerText}>Desactivar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay usuarios</Text>}
      />

      <Modal visible={createOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Crear usuario</Text>
            <TextInput
              placeholder="Nombre completo"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
            />
            <TextInput
              placeholder="Email (opcional)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              placeholder="Username (opcional)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
            <View style={styles.roleRow}>
              {((isAdmin ? ['COURIER', 'DISPATCHER', 'ADMIN'] : ['COURIER', 'DISPATCHER']) as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rolePill, role === r && styles.rolePillActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.rolePillText, role === r && styles.rolePillTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCreateOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitCreate}>
                <Text style={styles.primaryBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar usuario</Text>

            <TextInput
              placeholder="Nombre completo"
              value={editFullName}
              onChangeText={setEditFullName}
              style={styles.input}
            />
            <TextInput
              placeholder="Teléfono (opcional)"
              value={editPhone}
              onChangeText={setEditPhone}
              style={styles.input}
            />

            <View style={styles.roleRow}>
              {((isAdmin ? ['COURIER', 'DISPATCHER', 'ADMIN'] : ['COURIER', 'DISPATCHER']) as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rolePill, editRole === r && styles.rolePillActive]}
                  onPress={() => setEditRole(r)}
                >
                  <Text style={[styles.rolePillText, editRole === r && styles.rolePillTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEditOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitEdit}>
                <Text style={styles.primaryBtnText}>Guardar</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  hint: { color: '#6B7280', flex: 1 },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  badge: { fontSize: 12, color: '#374151' },
  linkText: { fontSize: 12, color: '#2563EB', fontWeight: '700' },
  dangerText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  empty: { color: '#6B7280', paddingVertical: 12 },
  primaryBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  secondaryBtnText: { color: '#111827', fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 10 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  rolePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F3F4F6' },
  rolePillActive: { backgroundColor: '#DBEAFE' },
  rolePillText: { color: '#374151', fontWeight: '700', fontSize: 12 },
  rolePillTextActive: { color: '#1D4ED8' },
});
