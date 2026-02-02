import React, { useState, useRef } from 'react';
import { Upload, Trash2, Link as LinkIcon, Image as ImageIcon, Loader } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabase/client';
import toast from 'react-hot-toast';

interface ImageUploaderProps {
  imageUrls: string[];
  onUpdateUrls: (urls: string[]) => void;
  productId?: number;
  maxImages?: number;
}

export function ImageUploader({
  imageUrls,
  onUpdateUrls,
  productId,
  maxImages = 3
}: ImageUploaderProps) {
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});
  const [showUrlInput, setShowUrlInput] = useState<{ [key: number]: boolean }>({});
  const [tempUrls, setTempUrls] = useState<{ [key: number]: string }>({});
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const compressAndResizeImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg'
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  };

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Solo JPG, PNG, WebP o GIF');
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 5MB');
      return false;
    }

    return true;
  };

  const uploadToStorage = async (file: File, index: number): Promise<string> => {
    setUploadProgress(prev => ({ ...prev, [index]: 10 }));

    const compressedFile = await compressAndResizeImage(file);
    setUploadProgress(prev => ({ ...prev, [index]: 40 }));

    const timestamp = Date.now();
    const fileExtension = compressedFile.type.split('/')[1];
    const fileName = `image-${index + 1}-${timestamp}.${fileExtension}`;
    const filePath = productId
      ? `${productId}/${fileName}`
      : `temp/${timestamp}/${fileName}`;

    setUploadProgress(prev => ({ ...prev, [index]: 60 }));

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, compressedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    setUploadProgress(prev => ({ ...prev, [index]: 80 }));

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    setUploadProgress(prev => ({ ...prev, [index]: 100 }));

    setTimeout(() => {
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[index];
        return newProgress;
      });
    }, 1000);

    return publicUrl;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) return;

    try {
      const publicUrl = await uploadToStorage(file, index);

      const newUrls = [...imageUrls];
      newUrls[index] = publicUrl;
      onUpdateUrls(newUrls);

      toast.success('Imagen subida correctamente');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Error al subir la imagen');
    }
  };

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!validateFile(file)) return;

    try {
      const publicUrl = await uploadToStorage(file, index);

      const newUrls = [...imageUrls];
      newUrls[index] = publicUrl;
      onUpdateUrls(newUrls);

      toast.success('Imagen subida correctamente');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Error al subir la imagen');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeImage = async (index: number) => {
    const url = imageUrls[index];

    if (url && url.includes('product-images')) {
      try {
        const urlParts = url.split('/product-images/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage
            .from('product-images')
            .remove([filePath]);
        }
      } catch (error) {
        console.error('Error deleting image from storage:', error);
      }
    }

    const newUrls = imageUrls.filter((_, i) => i !== index);
    onUpdateUrls(newUrls);
  };

  const toggleUrlInput = (index: number) => {
    setShowUrlInput(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
    setTempUrls(prev => ({
      ...prev,
      [index]: imageUrls[index] || ''
    }));
  };

  const saveManualUrl = (index: number) => {
    const url = tempUrls[index] || '';
    const newUrls = [...imageUrls];
    newUrls[index] = url;
    onUpdateUrls(newUrls);
    setShowUrlInput(prev => ({
      ...prev,
      [index]: false
    }));
  };

  const addImageSlot = () => {
    if (imageUrls.length < maxImages) {
      onUpdateUrls([...imageUrls, '']);
    }
  };

  return (
    <div className="space-y-3">
      {imageUrls.map((url, index) => (
        <div key={index} className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-pirateRed transition-colors">
          {url && !showUrlInput[index] ? (
            <div className="flex items-center gap-4">
              <img
                src={url}
                alt={`Producto ${index + 1}`}
                className="w-20 h-20 object-cover rounded border-2 border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23f3f4f6" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="14"%3EError%3C/text%3E%3C/svg%3E';
                }}
              />
              <div className="flex-1">
                <p className="text-sm text-gray-600 truncate">{url}</p>
                <button
                  type="button"
                  onClick={() => toggleUrlInput(index)}
                  className="text-xs text-pirateRed hover:underline mt-1"
                >
                  Editar URL
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ) : showUrlInput[index] ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                URL de la imagen
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={tempUrls[index] || ''}
                  onChange={(e) => setTempUrls(prev => ({
                    ...prev,
                    [index]: e.target.value
                  }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                <button
                  type="button"
                  onClick={() => saveManualUrl(index)}
                  className="px-4 py-2 bg-pirateRed text-white rounded-lg hover:bg-pirateRedDark transition-colors"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => toggleUrlInput(index)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 hover:border-pirateRed transition-colors"
                onClick={() => fileInputRefs.current[index]?.click()}
                onDrop={(e) => handleDrop(e, index)}
                onDragOver={handleDragOver}
              >
                {uploadProgress[index] ? (
                  <div className="space-y-2">
                    <Loader className="w-8 h-8 mx-auto text-pirateRed animate-spin" />
                    <p className="text-sm text-gray-600">
                      Subiendo... {uploadProgress[index]}%
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-pirateRed h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress[index]}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Arrastra una imagen o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-gray-400">
                      JPG, PNG, WebP o GIF (máx. 5MB)
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      La imagen se comprimirá y redimensionará automáticamente
                    </p>
                  </>
                )}
              </div>

              <input
                ref={(el) => fileInputRefs.current[index] = el}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleFileSelect(e, index)}
              />

              <button
                type="button"
                onClick={() => toggleUrlInput(index)}
                className="w-full mt-2 p-2 text-sm text-pirateRed hover:bg-pirateRed hover:bg-opacity-5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                O usar URL externa
              </button>
            </div>
          )}
        </div>
      ))}

      {imageUrls.length < maxImages && (
        <button
          type="button"
          onClick={addImageSlot}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-pirateRed hover:bg-pirateRed hover:bg-opacity-5 transition-colors flex items-center justify-center text-gray-600 hover:text-pirateRed"
        >
          <ImageIcon className="w-5 h-5 mr-2" />
          Agregar imagen ({imageUrls.length}/{maxImages})
        </button>
      )}
    </div>
  );
}
