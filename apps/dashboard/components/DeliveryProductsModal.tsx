'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, CubeIcon, WrenchIcon } from '@heroicons/react/24/outline';
import { getDeliveryProducts, addDeliveryProducts, updateDeliveryProducts, deleteDeliveryProduct } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

interface DeliveryProduct {
  id: string;
  deliveryId: string;
  itemNumber: string;
  description: string;
  assemblyBy?: string;
  requiresAssembly: boolean;
  isAssembled: boolean;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Delivery {
  id: string;
  trackingCode: string;
  customer: {
    name: string;
  };
}

interface DeliveryProductsModalProps {
  delivery: Delivery | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface ProductForm {
  itemNumber: string;
  description: string;
  assemblyBy: string;
  requiresAssembly: boolean;
}

const ASSEMBLY_OPTIONS = [
  { value: '', label: 'Sin armado (solo entregar)' },
  { value: 'TRANSPORTE', label: 'TRANSPORTE (debe armar)' },
  { value: 'CLIENTE', label: 'CLIENTE (el cliente arma)' },
  { value: 'INSTALADOR', label: 'INSTALADOR (instalador externo)' },
];

export default function DeliveryProductsModal({ delivery, isOpen, onClose, onUpdate }: DeliveryProductsModalProps) {
  const [products, setProducts] = useState<DeliveryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState<ProductForm>({
    itemNumber: '',
    description: '',
    assemblyBy: '',
    requiresAssembly: false,
  });
  const [editProducts, setEditProducts] = useState<ProductForm[]>([]);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && delivery) {
      fetchProducts();
    }
  }, [isOpen, delivery]);

  useEffect(() => {
    // Convert products to edit format
    setEditProducts(products.map(p => ({
      itemNumber: p.itemNumber,
      description: p.description,
      assemblyBy: p.assemblyBy || '',
      requiresAssembly: p.requiresAssembly,
    })));
  }, [products]);

  async function fetchProducts() {
    if (!delivery) return;
    setIsLoading(true);
    try {
      const data = await getDeliveryProducts(delivery.id);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.push({ type: 'error', message: 'Error al cargar los productos' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveAll() {
    if (!delivery) return;
    if (editProducts.length === 0) {
      toast.push({ type: 'error', message: 'Debe haber al menos un producto' });
      return;
    }

    // Validate all products
    for (const p of editProducts) {
      if (!p.itemNumber.trim() || !p.description.trim()) {
        toast.push({ type: 'error', message: 'Todos los productos deben tener número de artículo y descripción' });
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateDeliveryProducts(
        delivery.id,
        editProducts.map(p => ({
          ...p,
          requiresAssembly: p.assemblyBy === 'TRANSPORTE',
        }))
      );
      toast.push({ type: 'success', message: 'Productos actualizados exitosamente' });
      await fetchProducts();
      onUpdate();
    } catch (error) {
      console.error('Error saving products:', error);
      toast.push({ type: 'error', message: 'Error al guardar los productos' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddProduct() {
    if (!delivery) return;
    if (!newProduct.itemNumber.trim() || !newProduct.description.trim()) {
      toast.push({ type: 'error', message: 'Número de artículo y descripción son requeridos' });
      return;
    }

    setIsSaving(true);
    try {
      await addDeliveryProducts(delivery.id, [{
        itemNumber: newProduct.itemNumber.trim(),
        description: newProduct.description.trim(),
        assemblyBy: newProduct.assemblyBy,
        requiresAssembly: newProduct.assemblyBy === 'TRANSPORTE',
      }]);
      toast.push({ type: 'success', message: 'Producto agregado exitosamente' });
      setNewProduct({ itemNumber: '', description: '', assemblyBy: '', requiresAssembly: false });
      setShowAddForm(false);
      await fetchProducts();
      onUpdate();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.push({ type: 'error', message: 'Error al agregar el producto' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProduct(productId: string) {
    if (!delivery) return;
    if (!confirm('¿Está seguro de eliminar este producto?')) return;

    try {
      await deleteDeliveryProduct(delivery.id, productId);
      toast.push({ type: 'success', message: 'Producto eliminado exitosamente' });
      await fetchProducts();
      onUpdate();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.push({ type: 'error', message: 'Error al eliminar el producto' });
    }
  }

  function handleEditChange(index: number, field: keyof ProductForm, value: string | boolean) {
    setEditProducts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function handleRemoveEditProduct(index: number) {
    setEditProducts(prev => prev.filter((_, i) => i !== index));
  }

  if (!isOpen || !delivery) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CubeIcon className="h-6 w-6 text-primary-600" />
                Productos de la Entrega
              </h2>
              <p className="text-sm text-gray-500">
                {delivery.trackingCode} - {delivery.customer.name}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <>
                {/* Products List */}
                <div className="space-y-4">
                  {editProducts.map((product, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="grid grid-cols-12 gap-4">
                        {/* Item Number */}
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            N° Artículo
                          </label>
                          <input
                            type="text"
                            value={product.itemNumber}
                            onChange={(e) => handleEditChange(index, 'itemNumber', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary-500"
                            placeholder="Ej: 7017301"
                          />
                        </div>

                        {/* Description */}
                        <div className="col-span-6">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Descripción
                          </label>
                          <input
                            type="text"
                            value={product.description}
                            onChange={(e) => handleEditChange(index, 'description', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary-500"
                            placeholder="Ej: ALC DOB 1.52 NORUEGA..."
                          />
                        </div>

                        {/* Assembly Type */}
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Armado
                          </label>
                          <select
                            value={product.assemblyBy}
                            onChange={(e) => handleEditChange(index, 'assemblyBy', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary-500"
                          >
                            {ASSEMBLY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Delete Button */}
                        <div className="col-span-1 flex items-end justify-center">
                          <button
                            onClick={() => handleRemoveEditProduct(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                            title="Eliminar"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Assembly indicator */}
                      {product.assemblyBy === 'TRANSPORTE' && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          <WrenchIcon className="h-3 w-3" />
                          <span>Debe ser armado por el mensajero</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {editProducts.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <CubeIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p>No hay productos asignados a esta entrega</p>
                    </div>
                  )}
                </div>

                {/* Add New Product Form */}
                {showAddForm ? (
                  <div className="mt-6 bg-primary-50 rounded-lg p-4 border border-primary-200">
                    <h3 className="text-sm font-semibold text-primary-900 mb-4">Agregar Nuevo Producto</h3>
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          N° Artículo *
                        </label>
                        <input
                          type="text"
                          value={newProduct.itemNumber}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, itemNumber: e.target.value }))}
                          className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                          placeholder="Ej: 7017301"
                        />
                      </div>
                      <div className="col-span-6">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Descripción *
                        </label>
                        <input
                          type="text"
                          value={newProduct.description}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                          placeholder="Ej: ALC DOB 1.52 NORUEGA RIHAN MAD/NT OS EXP"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Armado Por
                        </label>
                        <select
                          value={newProduct.assemblyBy}
                          onChange={(e) => setNewProduct(prev => ({ 
                            ...prev, 
                            assemblyBy: e.target.value,
                            requiresAssembly: e.target.value === 'TRANSPORTE'
                          }))}
                          className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                        >
                          {ASSEMBLY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleAddProduct}
                        disabled={isSaving}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Guardando...' : 'Guardar Producto'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setNewProduct({ itemNumber: '', description: '', assemblyBy: '', requiresAssembly: false });
                        }}
                        className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-600 flex items-center justify-center gap-2 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Agregar Producto
                  </button>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex justify-between bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              Cerrar
            </button>
            <div className="flex gap-2">
              {editProducts.length > 0 && (
                <button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Todos los Cambios'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
