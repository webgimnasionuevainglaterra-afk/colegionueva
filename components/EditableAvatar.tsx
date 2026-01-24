'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useEditMode } from '@/contexts/EditModeContext';

interface EditableAvatarProps {
  src?: string | null;
  initials: string;
  backgroundColor?: string;
  className?: string;
  contentKey: string;
  size?: number;
}

export default function EditableAvatar({
  src,
  initials,
  backgroundColor = '#667eea',
  className = '',
  contentKey,
  size = 60,
}: EditableAvatarProps) {
  const { isEditMode } = useEditMode();
  const [avatarSrc, setAvatarSrc] = useState<string | null>(src || null);
  const [bgColor, setBgColor] = useState(backgroundColor);
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
          const savedContent = data.data.content;
          // Puede ser una URL de imagen o un color/gradiente
          if (savedContent.startsWith('http') || savedContent.startsWith('/') || savedContent.startsWith('data:')) {
            setAvatarSrc(savedContent);
            setBgColor(backgroundColor); // Resetear el color si hay imagen
          } else if (savedContent.includes('gradient') || savedContent.includes('rgb') || savedContent.startsWith('#')) {
            setBgColor(savedContent);
            setAvatarSrc(null); // No hay imagen, usar color
          } else {
            // Si no es reconocible, usar valores por defecto
            setAvatarSrc(src || null);
            setBgColor(backgroundColor);
          }
        } else {
          // Si no hay contenido guardado, usar los valores por defecto
          setAvatarSrc(src || null);
          setBgColor(backgroundColor);
        }
      } catch (error) {
        console.error('Error al cargar contenido guardado:', error);
        setAvatarSrc(src || null);
        setBgColor(backgroundColor);
      } finally {
        setLoading(false);
      }
    };

    loadSavedContent();
  }, [contentKey, src, backgroundColor]);

  const handleAvatarClick = () => {
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
        setAvatarSrc(data.url);
        setBgColor(backgroundColor); // Resetear el color si se sube una imagen
        
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

  if (loading) {
    return (
      <div
        className={`testimonial-avatar ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: `${size * 0.4}px`,
          fontWeight: 700,
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={`editable-avatar-wrapper ${className} ${isEditMode ? 'editable' : ''}`}
      onClick={handleAvatarClick}
      style={{ position: 'relative', cursor: isEditMode ? 'pointer' : 'default' }}
    >
      {isEditMode && (
        <div className="editable-image-overlay" style={{ borderRadius: '50%' }}>
          <svg
            width="20"
            height="20"
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
          <span style={{ fontSize: '0.75rem' }}>{uploading ? 'Subiendo...' : 'Clic para cambiar'}</span>
        </div>
      )}
      {avatarSrc ? (
        <Image
          src={avatarSrc}
          alt={initials}
          width={size}
          height={size}
          className="testimonial-avatar"
          style={{
            borderRadius: '50%',
            objectFit: 'cover',
          }}
          unoptimized
        />
      ) : (
        <div
          className="testimonial-avatar"
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: `${size * 0.4}px`,
            fontWeight: 700,
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

