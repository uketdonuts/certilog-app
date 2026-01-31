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

  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');

  // Courier/helper specific
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [secondLastName, setSecondLastName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [basePhone, setBasePhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [insurancePolicy, setInsurancePolicy] = useState('');
  const [insurerPhone, setInsurerPhone] = useState('');
  const [insurerName, setInsurerName] = useState('');
  const [nextWeightReview, setNextWeightReview] = useState('');

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
    setPin('');
    setPhone('');
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setSecondLastName('');
    setGender('');
    setBirthDate('');
    setPersonalPhone('');
    setBasePhone('');
    setEmergencyPhone('');
    setLicensePlate('');
    setInsurancePolicy('');
    setInsurerPhone('');
    setInsurerName('');
    setNextWeightReview('');
    setCreateOpen(true);
  };

  const openEdit = (u: any) => {
    setEditing(u);
    setEditFullName(String(u?.fullName || ''));
    setEditPhone(String(u?.phone || ''));
    setEditRole((u?.role as any) || 'COURIER');
    setEditOpen(true);
    // populate extended fields if present
    setFirstName(String(u?.firstName || ''));
    setMiddleName(String(u?.middleName || ''));
    setLastName(String(u?.lastName || ''));
    setSecondLastName(String(u?.secondLastName || ''));
    setGender((u?.gender as any) || '');
    setBirthDate(u?.birthDate ? String(u.birthDate).split('T')[0] : '');
    setPersonalPhone(String(u?.personalPhone || ''));
    setBasePhone(String(u?.basePhone || ''));
    setEmergencyPhone(String(u?.emergencyPhone || ''));
    setLicensePlate(String(u?.licensePlate || ''));
    setInsurancePolicy(String(u?.insurancePolicy || ''));
    setInsurerPhone(String(u?.insurerPhone || ''));
    setInsurerName(String(u?.insurerName || ''));
    setNextWeightReview(u?.nextWeightReview ? String(u.nextWeightReview).split('T')[0] : '');
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
      const payload: Record<string, any> = {
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        username: username.trim() || undefined,
        password: password.trim(),
        pin: pin.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
      };

      if (role === 'COURIER' || role === 'HELPER') {
        Object.assign(payload, {
          firstName: firstName.trim() || undefined,
          middleName: middleName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          secondLastName: secondLastName.trim() || undefined,
          gender: gender || undefined,
          birthDate: birthDate ? new Date(birthDate).toISOString() : undefined,
          personalPhone: personalPhone.trim() || undefined,
          basePhone: basePhone.trim() || undefined,
          emergencyPhone: emergencyPhone.trim() || undefined,
          licensePlate: licensePlate.trim() || undefined,
          insurancePolicy: insurancePolicy.trim() || undefined,
          insurerPhone: insurerPhone.trim() || undefined,
          insurerName: insurerName.trim() || undefined,
          nextWeightReview: nextWeightReview ? new Date(nextWeightReview).toISOString() : undefined,
        });
      }

      await createUser(payload);
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
      const payload: Record<string, any> = {
        fullName: editFullName.trim(),
        phone: editPhone.trim() || undefined,
        role: editRole,
      };

      if (editRole === 'COURIER' || editRole === 'HELPER') {
        Object.assign(payload, {
          firstName: firstName.trim() || undefined,
          middleName: middleName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          secondLastName: secondLastName.trim() || undefined,
          gender: gender || undefined,
          birthDate: birthDate ? new Date(birthDate).toISOString() : undefined,
          personalPhone: personalPhone.trim() || undefined,
          basePhone: basePhone.trim() || undefined,
          emergencyPhone: emergencyPhone.trim() || undefined,
          licensePlate: licensePlate.trim() || undefined,
          insurancePolicy: insurancePolicy.trim() || undefined,
          insurerPhone: insurerPhone.trim() || undefined,
          insurerName: insurerName.trim() || undefined,
          nextWeightReview: nextWeightReview ? new Date(nextWeightReview).toISOString() : undefined,
        });
      }

      await updateUser(editing.id, payload);
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

      <Modal visible={createOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.fullScreenModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
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
              <TextInput
                placeholder="PIN (4-6 dígitos)"
                value={pin}
                onChangeText={(t) => setPin(t.replace(/\D/g, ''))}
                keyboardType={Platform.OS === 'web' ? 'default' : 'numeric'}
                style={styles.input}
              />
              <TextInput
                placeholder="Teléfono (opcional)"
                value={phone}
                onChangeText={setPhone}
                style={styles.input}
              />

              {/* Courier specific fields */}
              {(role === 'COURIER' || role === 'HELPER') && (
                <>
                  <TextInput placeholder="Primer nombre" value={firstName} onChangeText={setFirstName} style={styles.input} />
                  <TextInput placeholder="Segundo nombre" value={middleName} onChangeText={setMiddleName} style={styles.input} />
                  <TextInput placeholder="Apellido" value={lastName} onChangeText={setLastName} style={styles.input} />
                  <TextInput placeholder="Segundo apellido" value={secondLastName} onChangeText={setSecondLastName} style={styles.input} />
                  <TextInput placeholder="Teléfono personal" value={personalPhone} onChangeText={setPersonalPhone} style={styles.input} />
                  <TextInput placeholder="Teléfono base" value={basePhone} onChangeText={setBasePhone} style={styles.input} />
                  <TextInput placeholder="Teléfono emergencia" value={emergencyPhone} onChangeText={setEmergencyPhone} style={styles.input} />
                  <TextInput placeholder="Placa" value={licensePlate} onChangeText={(t) => setLicensePlate(t.toUpperCase())} style={styles.input} />
                  <TextInput placeholder="Póliza de seguro" value={insurancePolicy} onChangeText={setInsurancePolicy} style={styles.input} />
                  <TextInput placeholder="Aseguradora" value={insurerName} onChangeText={setInsurerName} style={styles.input} />
                  <TextInput placeholder="Teléfono aseguradora" value={insurerPhone} onChangeText={setInsurerPhone} style={styles.input} />
                  <TextInput placeholder="Próxima revisión (YYYY-MM-DD)" value={nextWeightReview} onChangeText={setNextWeightReview} style={styles.input} />
                </>
              )}
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
              <View style={styles.modalActionsTopSpacing} />
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
              <TextInput
                placeholder="Nuevo PIN (dejar vacío para no cambiar)"
                value={pin}
                onChangeText={(t) => setPin(t.replace(/\D/g, ''))}
                keyboardType={Platform.OS === 'web' ? 'default' : 'numeric'}
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

              {(editRole === 'COURIER' || editRole === 'HELPER') && (
                <>
                  <TextInput placeholder="Primer nombre" value={firstName} onChangeText={setFirstName} style={styles.input} />
                  <TextInput placeholder="Segundo nombre" value={middleName} onChangeText={setMiddleName} style={styles.input} />
                  <TextInput placeholder="Apellido" value={lastName} onChangeText={setLastName} style={styles.input} />
                  <TextInput placeholder="Segundo apellido" value={secondLastName} onChangeText={setSecondLastName} style={styles.input} />
                  <TextInput placeholder="Teléfono personal" value={personalPhone} onChangeText={setPersonalPhone} style={styles.input} />
                  <TextInput placeholder="Teléfono base" value={basePhone} onChangeText={setBasePhone} style={styles.input} />
                  <TextInput placeholder="Teléfono emergencia" value={emergencyPhone} onChangeText={setEmergencyPhone} style={styles.input} />
                  <TextInput placeholder="Placa" value={licensePlate} onChangeText={(t) => setLicensePlate(t.toUpperCase())} style={styles.input} />
                  <TextInput placeholder="Póliza de seguro" value={insurancePolicy} onChangeText={setInsurancePolicy} style={styles.input} />
                  <TextInput placeholder="Aseguradora" value={insurerName} onChangeText={setInsurerName} style={styles.input} />
                  <TextInput placeholder="Teléfono aseguradora" value={insurerPhone} onChangeText={setInsurerPhone} style={styles.input} />
                  <TextInput placeholder="Próxima revisión (YYYY-MM-DD)" value={nextWeightReview} onChangeText={setNextWeightReview} style={styles.input} />
                </>
              )}

              <View style={styles.modalActionsTopSpacing} />
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
  fullScreenModal: { flex: 1, backgroundColor: '#F3F4F6' },
  modalScroll: { padding: 16, paddingBottom: 40 },
  modalActionsTopSpacing: { height: 8 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 10 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  rolePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F3F4F6' },
  rolePillActive: { backgroundColor: '#DBEAFE' },
  rolePillText: { color: '#374151', fontWeight: '700', fontSize: 12 },
  rolePillTextActive: { color: '#1D4ED8' },
});
