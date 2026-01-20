import { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { capturePhoto, CompressedPhoto, formatFileSize } from '@/lib/services/photo';
import { getCurrentLocation, LocationCoords } from '@/lib/services/location';
import { uploadPhoto, uploadSignature } from '@/lib/api/upload';
import { completeDelivery } from '@/lib/api/deliveries';

type Step = 'photo' | 'signature' | 'confirm';

export default function CompleteDeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const signatureRef = useRef<SignatureViewRef>(null);

  const [step, setStep] = useState<Step>('photo');
  const [photo, setPhoto] = useState<CompressedPhoto | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<LocationCoords | null>(null);

  const handleTakePhoto = async () => {
    try {
      const result = await capturePhoto();
      if (result) {
        setPhoto(result);

        // Get location at the same time
        try {
          const loc = await getCurrentLocation();
          setLocation(loc);
        } catch (error) {
          console.warn('Could not get location:', error);
        }

        setStep('signature');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handleSignatureSave = (sig: string) => {
    setSignature(sig);
    setStep('confirm');
  };

  const handleSignatureClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleSubmit = async () => {
    if (!photo || !signature) {
      Alert.alert('Error', 'Se requiere foto y firma');
      return;
    }

    if (!location) {
      try {
        const loc = await getCurrentLocation();
        setLocation(loc);
      } catch {
        Alert.alert('Error', 'No se pudo obtener la ubicación');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Upload photo
      const photoResult = await uploadPhoto(photo.uri);

      // Upload signature (convert base64 to file)
      // For signature, we need to save base64 to a file first
      const signatureUri = signature.replace('data:image/png;base64,', '');
      const signatureResult = await uploadSignature(`data:image/png;base64,${signatureUri}`);

      // Complete delivery
      await completeDelivery(id, {
        photoUrl: photoResult.url,
        signatureUrl: signatureResult.url,
        deliveryLat: location!.latitude,
        deliveryLng: location!.longitude,
        deliveryNotes: notes || undefined,
      });

      Alert.alert('Éxito', 'Entrega completada exitosamente', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch (error) {
      console.error('Error completing delivery:', error);
      Alert.alert('Error', 'No se pudo completar la entrega. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPhotoStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="camera" size={48} color="#3B82F6" />
        <Text style={styles.stepTitle}>Tomar Foto</Text>
        <Text style={styles.stepDescription}>
          Toma una foto del paquete entregado o del lugar de entrega
        </Text>
      </View>

      <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
        <Ionicons name="camera-outline" size={32} color="#fff" />
        <Text style={styles.photoButtonText}>Abrir Cámara</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSignatureStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="create" size={48} color="#3B82F6" />
        <Text style={styles.stepTitle}>Firma del Cliente</Text>
        <Text style={styles.stepDescription}>
          Solicita al cliente que firme en el área de abajo
        </Text>
      </View>

      {/* Photo preview */}
      {photo && (
        <View style={styles.photoPreview}>
          <Image source={{ uri: photo.uri }} style={styles.photoImage} />
          <Text style={styles.photoSize}>{formatFileSize(photo.size)}</Text>
        </View>
      )}

      <View style={styles.signatureContainer}>
        <SignatureScreen
          ref={signatureRef}
          onOK={handleSignatureSave}
          onEmpty={() => Alert.alert('Error', 'Por favor firme antes de continuar')}
          descriptionText=""
          clearText="Limpiar"
          confirmText="Confirmar"
          webStyle={signatureWebStyle}
        />
      </View>

      <TouchableOpacity style={styles.clearButton} onPress={handleSignatureClear}>
        <Ionicons name="refresh-outline" size={20} color="#6B7280" />
        <Text style={styles.clearButtonText}>Limpiar firma</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConfirmStep = () => (
    <ScrollView style={styles.scrollView}>
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
          <Text style={styles.stepTitle}>Confirmar Entrega</Text>
          <Text style={styles.stepDescription}>
            Verifica los datos antes de completar
          </Text>
        </View>

        {/* Photo preview */}
        {photo && (
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Foto</Text>
            <Image source={{ uri: photo.uri }} style={styles.previewImage} />
          </View>
        )}

        {/* Signature preview */}
        {signature && (
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Firma</Text>
            <Image source={{ uri: signature }} style={styles.previewSignature} />
          </View>
        )}

        {/* Location */}
        {location && (
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Ubicación</Text>
            <Text style={styles.locationText}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        {/* Notes */}
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Notas (opcional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Agregar notas sobre la entrega..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Completar Entrega</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Edit buttons */}
        <View style={styles.editButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setStep('photo')}
          >
            <Text style={styles.editButtonText}>Cambiar foto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setStep('signature')}
          >
            <Text style={styles.editButtonText}>Cambiar firma</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {['photo', 'signature', 'confirm'].map((s, index) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              (step === s || index < ['photo', 'signature', 'confirm'].indexOf(step)) &&
                styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {step === 'photo' && renderPhotoStep()}
      {step === 'signature' && renderSignatureStep()}
      {step === 'confirm' && renderConfirmStep()}
    </View>
  );
}

const signatureWebStyle = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; margin: 0px; }
  body, html { height: 100%; }
`;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#3B82F6',
  },
  stepContainer: {
    flex: 1,
    padding: 24,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  stepDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 20,
    borderRadius: 16,
    marginTop: 'auto',
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  photoPreview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  photoImage: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  photoSize: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  signatureContainer: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 200,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 12,
  },
  clearButtonText: {
    color: '#6B7280',
    marginLeft: 8,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  previewSignature: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  locationText: {
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  notesInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#86EFAC',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  editButton: {
    padding: 12,
  },
  editButtonText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
});
