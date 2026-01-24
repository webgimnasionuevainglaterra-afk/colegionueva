'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useEditMode } from '@/contexts/EditModeContext';

interface EditableImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  contentKey: string;
  priority?: boolean;
  unoptimized?: boolean;
}

export default function EditableImage({
  src,
  alt,
  width,
  height,
  className = '',
  contentKey,
  priority = false,
  unoptimized = false,
}: EditableImageProps) {
  const { isEditMode } = useEditMode();
  const [imageSrc, setImageSrc] = useState(src);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Cargar contenido guardado desde la base de datos al montar el componente
  useEffect(() => {
    const loadSavedContent = async () => {
      try {
        const response = await fetch(`/api/content/save-editable-content?key=${contentKey}`);
        const data = await response.json();
        
        if (response.ok && data.success && data.data && data.data.content) {
          // Si hay contenido guardado, usarlo
          setImageSrc(data.data.content);
          setImageError(false);
        } else {
          // Si no hay contenido guardado, usar el src por defecto
          setImageSrc(src);
          setImageError(false);
        }
      } catch (error) {
        console.error('Error al cargar contenido guardado:', error);
        // En caso de error, usar el src por defecto
        setImageSrc(src);
        setImageError(false);
      } finally {
        setLoading(false);
      }
    };

    loadSavedContent();
  }, [contentKey, src]);

  const handleImageClick = () => {
    if (isEditMode) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          await handleImageUpload(file);
        }
      };
      input.click();
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('key', contentKey);

      const response = await fetch('/api/content/upload-editable-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.url) {
        console.log('✅ Imagen subida exitosamente:', data.url);
        // Actualizar el estado inmediatamente
        setImageError(false);
        setImageSrc(data.url);
        
        // Guardar la URL en la base de datos
        const saveResponse = await fetch('/api/content/save-editable-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: contentKey,
            type: 'image',
            content: data.url,
          }),
        });
        
        if (saveResponse.ok) {
          console.log('✅ URL guardada en la base de datos');
        } else {
          console.error('❌ Error al guardar la URL en la base de datos');
        }
      } else {
        console.error('❌ Error al subir imagen:', data.error);
        alert(data.error || 'Error al subir la imagen');
      }
    } catch (error) {
      console.error('Error al subir imagen:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`editable-image-wrapper ${className} ${isEditMode ? 'editable' : ''}`}
      onClick={handleImageClick}
      style={{ position: 'relative', cursor: isEditMode ? 'pointer' : 'default' }}
    >
      {isEditMode && (
        <div className="editable-image-overlay">
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>{uploading ? 'Subiendo...' : 'Clic para cambiar imagen'}</span>
        </div>
      )}
      {loading ? (
        <div
          style={{
            width: width,
            height: height,
            background: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '0.875rem',
            borderRadius: '8px',
          }}
        >
          Cargando...
        </div>
      ) : imageSrc && !imageError ? (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <Image
            src={imageSrc}
            alt={alt}
            width={width}
            height={height}
            className={className}
            priority={priority}
            unoptimized={unoptimized}
            style={{ 
              objectFit: 'cover',
              width: '100%',
              height: '100%'
            }}
          />
          {/* Imagen oculta para detectar errores */}
          <img
            src={imageSrc}
            alt=""
            style={{ display: 'none' }}
            onError={() => {
              console.warn('⚠️ Error al cargar imagen:', imageSrc);
              setImageError(true);
            }}
            onLoad={() => {
              console.log('✅ Imagen cargada exitosamente:', imageSrc);
              setImageError(false);
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: width,
            height: height,
            background: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '0.875rem',
            borderRadius: '8px',
            border: isEditMode ? '2px dashed #cbd5e1' : 'none',
          }}
        >
          {isEditMode ? 'Clic para agregar imagen' : 'Sin imagen'}
        </div>
      )}
    </div>
  );
}

