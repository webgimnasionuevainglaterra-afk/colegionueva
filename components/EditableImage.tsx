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

  // Cargar contenido guardado desde la base de datos al montar el componente
  useEffect(() => {
    const loadSavedContent = async () => {
      try {
        const response = await fetch(`/api/content/save-editable-content?key=${contentKey}`);
        const data = await response.json();
        
        if (response.ok && data.success && data.data && data.data.content) {
          // Si hay contenido guardado, usarlo
          setImageSrc(data.data.content);
        } else {
          // Si no hay contenido guardado, usar el src por defecto
          setImageSrc(src);
        }
      } catch (error) {
        console.error('Error al cargar contenido guardado:', error);
        // En caso de error, usar el src por defecto
        setImageSrc(src);
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
        setImageSrc(data.url);
        
        // Guardar la URL en la base de datos
        await fetch('/api/content/save-editable-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: contentKey,
            type: 'image',
            content: data.url,
          }),
        });
      } else {
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
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        priority={priority}
        unoptimized={unoptimized}
      />
    </div>
  );
}

