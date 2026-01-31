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
import { captureVideo, CapturedVideo, formatDuration } from '@/lib/services/video';
import { getCurrentLocation, LocationCoords } from '@/lib/services/location';
import { uploadPhoto, uploadSignature, uploadVideo } from '@/lib/api/upload';
import { completeDelivery } from '@/lib/api/deliveries';
import { useAuth } from '@/lib/context/AuthContext';

type Step = 'photo' | 'video' | 'signature' | 'rating' | 'confirm';

export default function CompleteDeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refreshTracking } = useAuth();
  const signatureRef = useRef<SignatureViewRef>(null);

  const [step, setStep] = useState<Step>('photo');
  const [photos, setPhotos] = useState<CompressedPhoto[]>([]);
  const [video, setVideo] = useState<CapturedVideo | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<LocationCoords | null>(null);

  const handleTakePhoto = async () => {
    try {
      const result = await capturePhoto();
      if (result) {
        setPhotos((p) => [...p, result]);

        // Get location at the same time for first photo
        if (!location) {
          try {
            const loc = await getCurrentLocation();
            setLocation(loc);
          } catch (error) {
            console.warn('Could not get location:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((p) => p.filter((_, i) => i !== index));
  };

  const handleTakeVideo = async () => {
    try {
      const result = await captureVideo();
      if (result) {
        setVideo(result);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'No se pudo grabar el video');
    }
  };

  const handleRemoveVideo = () => {
    setVideo(null);
  };

  const handleNextFromPhotos = () => {
    if (photos.length === 0) {
      Alert.alert('Error', 'Se requiere al menos una foto');
      return;
    }
    setStep('video');
  };

  const handleNextFromVideo = () => {
    // Video is optional
    setStep('signature');
  };

  const handleSignatureSave = (sig: string) => {
    setSignature(sig);
    setStep('rating');
  };

  const handleSignatureClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleConfirmSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.readSignature();
    }
  };

  const handleNextFromRating = () => {
    // Rating is optional, proceed to confirm
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (photos.length === 0 || !signature) {
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
      // Upload all photos
      const uploadResults = await Promise.all(photos.map((p) => uploadPhoto(p.uri)));
      const photoResult = uploadResults[0];

      // Upload video if exists
      let videoUrl: string | undefined;
      if (video) {
        const videoResult = await uploadVideo(video.uri);
        videoUrl = videoResult.url;
      }

      // Upload signature
      const signatureUri = signature.replace('data:image/png;base64,', '');
      const signatureResult = await uploadSignature(`data:image/png;base64,${signatureUri}`);

      // Complete delivery
      await completeDelivery(id, {
        photoUrl: photoResult.url,
        signatureUrl: signatureResult.url,
        videoUrl,
        deliveryLat: location!.latitude,
        deliveryLng: location!.longitude,
        deliveryNotes: notes || undefined,
        extraPhotoUrls: uploadResults.map((r) => r.url),
        rating: rating > 0 ? rating : undefined,
      });

      // Refresh tracking to stop it since delivery is complete
      refreshTracking();

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

  const renderStarRating = () => {
    const stars = [];
    for (let i = 1; i <= 10; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starButton}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={32}
            color={i <= rating ? '#FBBF24' : '#D1D5DB'}
          />
          <Text style={[styles.starNumber, i <= rating && styles.starNumberActive]}>
            {i}
          </Text>
        </TouchableOpacity>
      );
    }
    return stars;
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

      {photos.length > 0 && (
        <ScrollView horizontal style={styles.photosList} contentContainerStyle={{ gap: 12 }}>
          {photos.map((p, idx) => (
            <View key={p.uri + idx} style={styles.photoItem}>
              <Image source={{ uri: p.uri }} style={styles.photoImage} />
              <Text style={styles.photoSize}>{formatFileSize(p.size)}</Text>
              <TouchableOpacity style={styles.removeButton} onPress={() => handleRemovePhoto(idx)}>
                <Text style={styles.removeButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.actionButton} onPress={handleTakePhoto}>
        <Ionicons name="camera-outline" size={32} color="#fff" />
        <Text style={styles.actionButtonText}>Abrir Cámara</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionButton, styles.nextButton]} onPress={handleNextFromPhotos}>
        <Text style={styles.actionButtonText}>Siguiente</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVideoStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="videocam" size={48} color="#8B5CF6" />
        <Text style={styles.stepTitle}>Grabar Video</Text>
        <Text style={styles.stepDescription}>
          Graba un video corto (máx. 10 segundos) de la entrega (opcional)
        </Text>
      </View>

      {video && (
        <View style={styles.videoPreview}>
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam" size={48} color="#8B5CF6" />
            <Text style={styles.videoDuration}>{formatDuration(video.duration / 1000)}</Text>
            <Text style={styles.videoSize}>{formatFileSize(video.size)}</Text>
          </View>
          <TouchableOpacity style={styles.removeButton} onPress={handleRemoveVideo}>
            <Text style={styles.removeButtonText}>Eliminar Video</Text>
          </TouchableOpacity>
        </View>
      )}

      {!video && (
        <TouchableOpacity style={[styles.actionButton, styles.videoButton]} onPress={handleTakeVideo}>
          <Ionicons name="videocam-outline" size={32} color="#fff" />
          <Text style={styles.actionButtonText}>Grabar Video (10s)</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.actionButton, styles.nextButton]} onPress={handleNextFromVideo}>
        <Text style={styles.actionButtonText}>{video ? 'Siguiente' : 'Omitir'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSignatureStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeaderSmall}>
        <Ionicons name="create" size={32} color="#3B82F6" />
        <Text style={styles.stepTitleSmall}>Firma del Cliente</Text>
      </View>

      <View style={styles.signatureContainerLarge}>
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

      <View style={styles.signatureButtons}>
        <TouchableOpacity style={styles.clearButtonInline} onPress={handleSignatureClear}>
          <Ionicons name="refresh-outline" size={20} color="#6B7280" />
          <Text style={styles.clearButtonText}>Limpiar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.confirmSignatureButton} onPress={handleConfirmSignature}>
          <Text style={styles.confirmSignatureButtonText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRatingStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="star" size={48} color="#FBBF24" />
        <Text style={styles.stepTitle}>Calificación</Text>
        <Text style={styles.stepDescription}>
          ¿Cómo calificarías esta entrega? (Opcional)
        </Text>
      </View>

      <View style={styles.ratingContainer}>
        <View style={styles.starsRow}>
          {renderStarRating().slice(0, 5)}
        </View>
        <View style={styles.starsRow}>
          {renderStarRating().slice(5, 10)}
        </View>
      </View>

      {rating > 0 && (
        <Text style={styles.ratingText}>
          Calificación: <Text style={styles.ratingValue}>{rating}/10</Text>
        </Text>
      )}

      <TouchableOpacity
        style={[styles.actionButton, styles.nextButton]}
        onPress={handleNextFromRating}
      >
        <Text style={styles.actionButtonText}>{rating > 0 ? 'Siguiente' : 'Omitir'}</Text>
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
        {photos.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Fotos ({photos.length})</Text>
            <ScrollView horizontal>
              {photos.map((p, i) => (
                <Image key={p.uri + i} source={{ uri: p.uri }} style={styles.previewPhoto} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Video preview */}
        {video && (
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Video</Text>
            <View style={styles.videoPreviewSmall}>
              <Ionicons name="videocam" size={24} color="#8B5CF6" />
              <Text style={styles.videoInfo}>{formatDuration(video.duration / 1000)} - {formatFileSize(video.size)}</Text>
            </View>
          </View>
        )}

        {/* Signature preview */}
        {signature && (
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>Firma</Text>
            <Image source={{ uri: signature }} style={styles.previewSignature} />
          </View>
        )}

        {/* Rating preview */}
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Calificación</Text>
          <View style={styles.ratingPreview}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < rating ? 'star' : 'star-outline'}
                size={20}
                color={i < rating ? '#FBBF24' : '#D1D5DB'}
              />
            ))}
            <Text style={styles.ratingPreviewText}>{rating}/10</Text>
          </View>
        </View>

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
          <TouchableOpacity style={styles.editButton} onPress={() => setStep('photo')}>
            <Text style={styles.editButtonText}>Fotos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={() => setStep('video')}>
            <Text style={styles.editButtonText}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={() => setStep('signature')}>
            <Text style={styles.editButtonText}>Firma</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={() => setStep('rating')}>
            <Text style={styles.editButtonText}>Rating</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const steps: Step[] = ['photo', 'video', 'signature', 'rating', 'confirm'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {steps.map((s, index) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              index <= currentStepIndex && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {step === 'photo' && renderPhotoStep()}
      {step === 'video' && renderVideoStep()}
      {step === 'signature' && renderSignatureStep()}
      {step === 'rating' && renderRatingStep()}
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
  stepHeaderSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  stepTitleSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 20,
    borderRadius: 16,
    marginTop: 'auto',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  nextButton: {
    backgroundColor: '#06b6d4',
    marginTop: 12,
  },
  videoButton: {
    backgroundColor: '#8B5CF6',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  photosList: {
    maxHeight: 140,
    marginBottom: 12,
  },
  photoItem: {
    alignItems: 'center',
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
  removeButton: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#DC2626',
    fontSize: 12,
  },
  videoPreview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  videoPlaceholder: {
    width: 200,
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDuration: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  videoSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  signatureContainerLarge: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 300,
  },
  signatureButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  clearButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  clearButtonText: {
    color: '#6B7280',
    marginLeft: 8,
  },
  confirmSignatureButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmSignatureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    alignItems: 'center',
    padding: 4,
  },
  starNumber: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  starNumberActive: {
    color: '#FBBF24',
    fontWeight: '600',
  },
  ratingText: {
    fontSize: 18,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
  },
  ratingValue: {
    fontWeight: 'bold',
    color: '#FBBF24',
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
  previewPhoto: {
    width: 160,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
  },
  previewSignature: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  videoPreviewSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  videoInfo: {
    color: '#4B5563',
  },
  ratingPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingPreviewText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FBBF24',
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
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  editButton: {
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  editButtonText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
});
