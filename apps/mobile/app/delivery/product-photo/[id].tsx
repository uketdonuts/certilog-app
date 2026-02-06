import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { capturePhoto, CompressedPhoto } from '@/lib/services/photo';
import { uploadPhoto } from '@/lib/api/upload';
import { getDeliveryProducts, updateDeliveryProduct, DeliveryProduct } from '@/lib/api/deliveries';

export default function ProductPhotoScreen() {
  const { id, productId } = useLocalSearchParams<{ id: string; productId: string }>();
  const [product, setProduct] = useState<DeliveryProduct | null>(null);
  const [photo, setPhoto] = useState<CompressedPhoto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const products = await getDeliveryProducts(id);
      const found = products.find(p => p.id === productId);
      if (found) {
        setProduct(found);
      } else {
        Alert.alert('Error', 'Producto no encontrado');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Error', 'No se pudo cargar el producto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await capturePhoto();
      if (result) {
        setPhoto(result);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
  };

  const handleSave = async () => {
    if (!photo) {
      Alert.alert('Error', 'Debe tomar una foto del producto');
      return;
    }

    setIsSaving(true);
    try {
      // Upload photo
      const uploadResult = await uploadPhoto(photo.uri);
      
      // Update product with photo
      await updateDeliveryProduct(id, productId, {
        photoUrl: uploadResult.url,
        photoPublicId: uploadResult.publicId,
      });

      Alert.alert('Éxito', 'Foto del producto guardada', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error saving photo:', error);
      Alert.alert('Error', 'No se pudo guardar la foto');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Foto del Producto</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Product Info */}
      {product && (
        <View style={styles.productInfo}>
          <Text style={styles.productItemNumber}>{product.itemNumber}</Text>
          <Text style={styles.productDescription}>{product.description}</Text>
          {product.requiresAssembly && (
            <View style={styles.assemblyBadge}>
              <Ionicons name="construct" size={14} color="#F97316" />
              <Text style={styles.assemblyText}>Debe ser armado</Text>
            </View>
          )}
        </View>
      )}

      {/* Photo Section */}
      <View style={styles.photoSection}>
        {!photo ? (
          <View style={styles.noPhoto}>
            <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
            <Text style={styles.noPhotoText}>Toma una foto del producto</Text>
            <Text style={styles.noPhotoSubtext}>
              {product?.requiresAssembly 
                ? 'Muestra el producto armado o el proceso de armado'
                : 'Muestra el producto antes de la entrega'}
            </Text>
          </View>
        ) : (
          <View style={styles.photoPreview}>
            <Image source={{ uri: photo.uri }} style={styles.photoImage} />
            <TouchableOpacity style={styles.removeButton} onPress={handleRemovePhoto}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
              <Text style={styles.removeText}>Eliminar foto</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.cameraButton]}
          onPress={handleTakePhoto}
        >
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>
            {photo ? 'Tomar otra foto' : 'Abrir cámara'}
          </Text>
        </TouchableOpacity>

        {photo && (
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Guardar Foto</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  productInfo: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  productItemNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  productDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
    lineHeight: 20,
  },
  assemblyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  assemblyText: {
    fontSize: 13,
    color: '#F97316',
    fontWeight: '500',
  },
  photoSection: {
    flex: 1,
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  noPhoto: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noPhotoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  noPhotoSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  photoPreview: {
    flex: 1,
    position: 'relative',
  },
  photoImage: {
    flex: 1,
    width: '100%',
  },
  removeButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
  },
  removeText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  cameraButton: {
    backgroundColor: '#3B82F6',
  },
  saveButton: {
    backgroundColor: '#22C55E',
  },
  saveButtonDisabled: {
    backgroundColor: '#86EFAC',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
