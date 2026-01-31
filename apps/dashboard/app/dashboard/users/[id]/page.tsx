"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserById, updateUser, deactivateUser, deleteUserPermanently } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { confirmAction } from '@/components/confirm';
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function EditUserPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Basic fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('COURIER');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Courier/Helper specific fields
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [secondLastName, setSecondLastName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [basePhone, setBasePhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [insurancePolicy, setInsurancePolicy] = useState('');
  const [insurerPhone, setInsurerPhone] = useState('');
  const [insurerName, setInsurerName] = useState('');
  const [nextWeightReview, setNextWeightReview] = useState('');

  const isCourierOrHelper = role === 'COURIER' || role === 'HELPER';

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getUserById(id);
        const u = data.data || data;
        setUser(u);

        // Basic fields
        setFullName(u.fullName || '');
        setEmail(u.email || '');
        setUsername(u.username || '');
        setRole(u.role || 'COURIER');
        setPhone(u.phone || '');
        setIsActive(u.isActive !== false);

        // Courier/Helper fields
        setFirstName(u.firstName || '');
        setMiddleName(u.middleName || '');
        setLastName(u.lastName || '');
        setSecondLastName(u.secondLastName || '');
        setGender(u.gender || '');
        setBirthDate(u.birthDate ? u.birthDate.split('T')[0] : '');
        setPersonalPhone(u.personalPhone || '');
        setBasePhone(u.basePhone || '');
        setEmergencyPhone(u.emergencyPhone || '');
        setLicensePlate(u.licensePlate || '');
        setInsurancePolicy(u.insurancePolicy || '');
        setInsurerPhone(u.insurerPhone || '');
        setInsurerName(u.insurerName || '');
        setNextWeightReview(u.nextWeightReview ? u.nextWeightReview.split('T')[0] : '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  const toast = useToast();

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const userData: Record<string, unknown> = {
        fullName: fullName || `${firstName} ${lastName}`.trim(),
        email: email || undefined,
        username: username || undefined,
        phone: phone || undefined,
        role,
        isActive,
      };

      // Only include PIN if it was changed (not empty)
      if (pin) {
        userData.pin = pin;
      }

      // Add courier/helper specific fields
      if (isCourierOrHelper) {
        Object.assign(userData, {
          firstName: firstName || undefined,
          middleName: middleName || undefined,
          lastName: lastName || undefined,
          secondLastName: secondLastName || undefined,
          gender: gender || undefined,
          birthDate: birthDate ? new Date(birthDate).toISOString() : undefined,
          personalPhone: personalPhone || undefined,
          basePhone: basePhone || undefined,
          emergencyPhone: emergencyPhone || undefined,
          licensePlate: licensePlate || undefined,
          insurancePolicy: insurancePolicy || undefined,
          insurerPhone: insurerPhone || undefined,
          insurerName: insurerName || undefined,
          nextWeightReview: nextWeightReview ? new Date(nextWeightReview).toISOString() : undefined,
        });
      }

      await updateUser(id, userData);
      router.push('/dashboard/users');
    } catch (err) {
      console.error(err);
      toast.push({ type: 'error', message: 'Error actualizando usuario' });
    } finally {
      setSaving(false);
    }
  };

  const onDeactivate = async () => {
    if (!confirmAction('¿Desactivar este usuario? El usuario no podrá iniciar sesión.')) return;
    try {
      await deactivateUser(id);
      router.push('/dashboard/users');
    } catch (err) {
      console.error(err);
      toast.push({ type: 'error', message: 'Error desactivando usuario' });
    }
  };

  const onDelete = async () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      toast.push({ type: 'error', message: 'Escriba ELIMINAR para confirmar' });
      return;
    }
    try {
      await deleteUserPermanently(id);
      router.push('/dashboard/users');
    } catch (err) {
      console.error(err);
      toast.push({ type: 'error', message: 'Error eliminando usuario. Si tiene entregas asociadas, primero reasígnelas.' });
    }
    setShowDeleteModal(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) return <div className="text-center py-12 text-gray-500">Usuario no encontrado</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Editar usuario</h1>
        {!isActive && (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
            Desactivado
          </span>
        )}
      </div>

      <form onSubmit={onSave} className="space-y-6">
        {/* Basic Info Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Información básica</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="COURIER">Mensajero (Transportista)</option>
                <option value="HELPER">Ayudante</option>
                <option value="DISPATCHER">Despachador</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isCourierOrHelper ? 'Nombre completo (auto)' : 'Nombre completo *'}
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder={isCourierOrHelper ? 'Se genera de los nombres' : 'Nombre completo'}
                required={!isCourierOrHelper}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="usuario"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nuevo PIN (dejar vacío para no cambiar)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4,6}"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="****"
              />
              <p className="text-xs text-gray-500 mt-1">Para inicio de sesión rápido en la app móvil</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="+507 6xxx-xxxx"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Usuario activo
              </label>
            </div>
          </div>
        </div>

        {/* Courier/Helper Specific Fields */}
        {isCourierOrHelper && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Datos personales</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Nombre</label>
                  <input
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Apellido</label>
                  <input
                    value={secondLastName}
                    onChange={(e) => setSecondLastName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Seleccionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Contactos</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número Personal</label>
                  <input
                    type="tel"
                    value={personalPhone}
                    onChange={(e) => setPersonalPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="+507 6xxx-xxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Base</label>
                  <input
                    type="tel"
                    value={basePhone}
                    onChange={(e) => setBasePhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="+507 xxx-xxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Emergencia</label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="+507 xxx-xxxx"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Vehículo y Seguro</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placa del Vehículo</label>
                  <input
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="ABC-1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Póliza de Seguro</label>
                  <input
                    value={insurancePolicy}
                    onChange={(e) => setInsurancePolicy(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Número de póliza"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Aseguradora</label>
                  <input
                    value={insurerName}
                    onChange={(e) => setInsurerName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Ej: ASSA, Seguros Sura"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de la Aseguradora</label>
                  <input
                    type="tel"
                    value={insurerPhone}
                    onChange={(e) => setInsurerPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="+507 xxx-xxxx"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Próxima Revisión de Peso y Tonelada</label>
                  <input
                    type="date"
                    value={nextWeightReview}
                    onChange={(e) => setNextWeightReview(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              disabled={saving}
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

          <div className="flex gap-2">
            {isActive && (
              <button
                type="button"
                onClick={onDeactivate}
                className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200"
              >
                Desactivar
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <TrashIcon className="h-4 w-4" />
              Eliminar permanentemente
            </button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-900/50"
              onClick={() => setShowDeleteModal(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Eliminar usuario</h3>
                  <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                ¿Estás seguro de que deseas eliminar permanentemente a <strong>{fullName}</strong>?
                Se eliminarán todos los datos asociados.
              </p>

              <p className="text-sm text-gray-600 mb-2">
                Escribe <strong>ELIMINAR</strong> para confirmar:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
                placeholder="ELIMINAR"
              />

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deleteConfirmText !== 'ELIMINAR'}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Eliminar definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Historial de movimientos */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Historial de movimientos</h2>
          <UserLogs id={id} />
        </div>
    </div>
  );
}

  function UserLogs({ id }: { id: string }) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(true);

    useEffect(() => {
      async function load() {
        try {
          const resp = await fetch(`/api/logs/users/${id}?limit=100`);
          const json = await resp.json();
          setLogs(json.data?.logs || []);
        } catch (err) {
          console.error('Error loading user logs', err);
        } finally {
          setLoadingLogs(false);
        }
      }
      load();
    }, [id]);

    if (loadingLogs) return <div className="text-sm text-gray-500">Cargando historial...</div>;
    if (!logs.length) return <div className="text-sm text-gray-500">No hay movimientos registrados</div>;

    return (
      <div className="space-y-3">
        {logs.map((l: any) => (
          <div key={l.id} className="border rounded p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{l.level}</div>
              <div className="text-xs text-gray-500">{new Date(l.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-sm text-gray-700 mt-1">{l.message}</div>
            {l.context && (
              <pre className="text-xs text-gray-500 mt-2 overflow-auto max-h-40">{JSON.stringify(l.context, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>
    );
  }
