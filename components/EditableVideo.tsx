'use client';

import { useState, useEffect } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';

interface EditableVideoProps {
  src: string;
  className?: string;
  contentKey: string;
  title?: string;
  allowFullScreen?: boolean;
}

export default function EditableVideo({
  src,
  className = '',
  contentKey,
  title = 'Video educativo',
  allowFullScreen = true,
}: EditableVideoProps) {
  const { isEditMode } = useEditMode();
  const [videoSrc, setVideoSrc] = useState(src);
  const [showModal, setShowModal] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Cargar contenido guardado desde la base de datos al montar el componente
  useEffect(() => {
    let isMounted = true;
    
    const loadSavedContent = async () => {
      try {
        const response = await fetch(`/api/content/save-editable-content?key=${contentKey}`);
        
        if (!isMounted) return;
        
        const data = await response.json();
        
        if (response.ok && data.success && data.data && data.data.content) {
          // Si hay contenido guardado, usarlo
          if (isMounted) {
            console.log('📹 Cargando video guardado:', data.data.content);
            setVideoSrc(data.data.content);
          }
        } else {
          // Si no hay contenido guardado, usar el src por defecto
          if (isMounted) {
            console.log('📹 Usando video por defecto:', src);
            setVideoSrc(src);
          }
        }
      } catch (error) {
        console.error('Error al cargar contenido guardado:', error);
        // En caso de error, usar el src por defecto
        if (isMounted) {
          setVideoSrc(src);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSavedContent();
    
    return () => {
      isMounted = false;
    };
  }, [contentKey]); // Solo dependemos de contentKey, no de src

  const handleVideoClick = () => {
    if (isEditMode) {
      // Extraer la URL original del embed para mostrarla en el input
      // Si es un embed, intentar mostrar la URL original
      let displayUrl = videoSrc;
      const embedMatch = videoSrc.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch && embedMatch[1]) {
        displayUrl = `https://www.youtube.com/watch?v=${embedMatch[1]}`;
      }
      setNewUrl(displayUrl);
      setUrlError(null);
      setPreviewUrl(null);
      setShowModal(true);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setNewUrl(url);
    
    if (!url.trim()) {
      setUrlError(null);
      setPreviewUrl(null);
      return;
    }

    // Validar y generar preview en tiempo real
    const { embedUrl, error } = convertToEmbedUrl(url);
    if (error) {
      setUrlError(error);
      setPreviewUrl(null);
    } else if (embedUrl) {
      setUrlError(null);
      setPreviewUrl(embedUrl);
    }
  };

  const extractVideoId = (url: string): { videoId: string | null; platform: 'youtube' | 'vimeo' | 'unknown' } => {
    if (!url || typeof url !== 'string') {
      return { videoId: null, platform: 'unknown' };
    }

    // Limpiar la URL de espacios y caracteres especiales
    const cleanUrl = url.trim();

    // Si ya es una URL de embed de YouTube, extraer el ID
    const embedMatch = cleanUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch && embedMatch[1]) {
      return { videoId: embedMatch[1], platform: 'youtube' };
    }

    // YouTube: youtube.com/watch?v=VIDEO_ID
    const watchMatch = cleanUrl.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch && watchMatch[1]) {
      return { videoId: watchMatch[1], platform: 'youtube' };
    }

    // YouTube: youtube.com/v/VIDEO_ID
    const vMatch = cleanUrl.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
    if (vMatch && vMatch[1]) {
      return { videoId: vMatch[1], platform: 'youtube' };
    }

    // YouTube: youtu.be/VIDEO_ID
    const shortMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch && shortMatch[1]) {
      return { videoId: shortMatch[1], platform: 'youtube' };
    }

    // YouTube Shorts: youtube.com/shorts/VIDEO_ID
    const shortsMatch = cleanUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch && shortsMatch[1]) {
      return { videoId: shortsMatch[1], platform: 'youtube' };
    }

    // YouTube: Solo el ID del video (11 caracteres alfanuméricos)
    const idOnlyMatch = cleanUrl.match(/^([a-zA-Z0-9_-]{11})$/);
    if (idOnlyMatch && idOnlyMatch[1]) {
      return { videoId: idOnlyMatch[1], platform: 'youtube' };
    }

    // Vimeo: vimeo.com/VIDEO_ID
    const vimeoMatch = cleanUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return { videoId: vimeoMatch[1], platform: 'vimeo' };
    }

    // Vimeo embed: player.vimeo.com/video/VIDEO_ID
    const vimeoEmbedMatch = cleanUrl.match(/player\.vimeo\.com\/video\/(\d+)/);
    if (vimeoEmbedMatch && vimeoEmbedMatch[1]) {
      return { videoId: vimeoEmbedMatch[1], platform: 'vimeo' };
    }

    return { videoId: null, platform: 'unknown' };
  };

  const convertToEmbedUrl = (url: string): { embedUrl: string | null; error: string | null } => {
    if (!url || !url.trim()) {
      return { embedUrl: null, error: 'Por favor ingrese una URL válida' };
    }

    const { videoId, platform } = extractVideoId(url.trim());

    if (!videoId) {
      return { 
        embedUrl: null, 
        error: 'No se pudo extraer el ID del video. Por favor ingrese una URL válida de YouTube o Vimeo.' 
      };
    }

    if (platform === 'youtube') {
      return { 
        embedUrl: `https://www.youtube.com/embed/${videoId}`, 
        error: null 
      };
    }

    if (platform === 'vimeo') {
      return { 
        embedUrl: `https://player.vimeo.com/video/${videoId}`, 
        error: null 
      };
    }

    return { 
      embedUrl: null, 
      error: 'Plataforma de video no soportada. Solo se admiten YouTube y Vimeo.' 
    };
  };

  const handleSaveUrl = async () => {
    if (!newUrl.trim()) {
      setUrlError('Por favor ingrese una URL válida');
      return;
    }

    // Validar la URL antes de guardar
    const { embedUrl, error } = convertToEmbedUrl(newUrl.trim());
    
    if (error || !embedUrl) {
      setUrlError(error || 'URL inválida');
      return;
    }

    setSaving(true);
    setUrlError(null);
    
    try {
      // Guardar la URL en la base de datos
      const response = await fetch('/api/content/save-editable-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: contentKey,
          type: 'video',
          content: embedUrl,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Video guardado correctamente:', embedUrl);
        // Cerrar el modal primero
        setShowModal(false);
        setNewUrl('');
        setPreviewUrl(null);
        setUrlError(null);
        
        // Actualizar el video después de un pequeño delay para asegurar que el modal se cierre
        setTimeout(() => {
          setVideoSrc(embedUrl);
          setLoading(false);
          console.log('✅ Video actualizado en el estado:', embedUrl);
        }, 200);
      } else {
        const errorMessage = data.error || data.details || 'Error al guardar la URL';
        console.error('Error al guardar:', data);
        setUrlError(`Error al guardar: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('Error al guardar URL:', error);
      setUrlError(`Error al guardar: ${error.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={`editable-video-wrapper ${isEditMode ? 'editable' : ''}`}
        onClick={handleVideoClick}
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: isEditMode ? 'pointer' : 'default',
          zIndex: isEditMode ? 1 : 0
        }}
      >
        {isEditMode && (
          <div className="editable-video-overlay">
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span>Clic para cambiar URL del video</span>
          </div>
        )}
        {loading ? (
          <div style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: '#000',
            borderRadius: '8px',
            zIndex: 2
          }}>
            <span style={{ color: '#fff' }}>Cargando video...</span>
          </div>
        ) : videoSrc ? (
          <iframe
            className={className}
            src={videoSrc}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen={allowFullScreen}
            key={videoSrc}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              zIndex: 0
            }}
          />
        ) : (
          <div style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: '#000',
            borderRadius: '8px',
            zIndex: 2
          }}>
            <span style={{ color: '#fff' }}>No hay video disponible</span>
          </div>
        )}
      </div>

      {showModal && (
        <div className="editable-video-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="editable-video-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Editar URL del Video</h3>
            <div className="editable-video-modal-input-group">
              <label htmlFor="video-url">URL del Video (YouTube, Vimeo, etc.)</label>
              <input
                id="video-url"
                type="text"
                value={newUrl}
                onChange={handleUrlChange}
                placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/... o solo el ID del video"
                autoFocus
                style={{ 
                  color: '#1f2937', 
                  background: '#ffffff',
                  borderColor: urlError ? '#ef4444' : '#e5e7eb'
                }}
              />
              {urlError && (
                <div style={{ 
                  color: '#ef4444', 
                  fontSize: '0.875rem', 
                  marginTop: '0.25rem',
                  padding: '0.5rem',
                  background: '#fef2f2',
                  borderRadius: '6px'
                }}>
                  {urlError}
                </div>
              )}
              {previewUrl && !urlError && (
                <div style={{ 
                  color: '#10b981', 
                  fontSize: '0.875rem', 
                  marginTop: '0.25rem',
                  padding: '0.5rem',
                  background: '#f0fdf4',
                  borderRadius: '6px'
                }}>
                  ✓ URL válida - Vista previa disponible
                </div>
              )}
              <small style={{ marginTop: '0.5rem', display: 'block' }}>
                Formatos aceptados:
                <br />• YouTube: https://www.youtube.com/watch?v=VIDEO_ID
                <br />• YouTube corto: https://youtu.be/VIDEO_ID
                <br />• YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID
                <br />• Solo ID: VIDEO_ID (11 caracteres)
                <br />• Vimeo: https://vimeo.com/VIDEO_ID
              </small>
              {previewUrl && !urlError && (
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    Vista Previa:
                  </label>
                  <div style={{
                    position: 'relative',
                    paddingBottom: '56.25%', // 16:9 aspect ratio
                    height: 0,
                    overflow: 'hidden',
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb'
                  }}>
                    <iframe
                      src={previewUrl}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        border: 'none'
                      }}
                      title="Vista previa del video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="editable-video-modal-actions">
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewUrl('');
                  setUrlError(null);
                  setPreviewUrl(null);
                }}
                className="editable-video-modal-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUrl}
                disabled={saving || !newUrl.trim() || !!urlError || !previewUrl}
                className="editable-video-modal-save"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

