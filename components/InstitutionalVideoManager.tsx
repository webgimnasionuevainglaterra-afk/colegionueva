'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import '../app/css/courses-list.css';

interface InstitutionalVideoManagerProps {
  onSuccess?: () => void;
}

export default function InstitutionalVideoManager({
  onSuccess,
}: InstitutionalVideoManagerProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchVideo();
  }, []);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch('/api/admin/get-global-video', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Error al cargar el video' };
        }
        throw new Error(errorData.error || 'Error al cargar el video');
      }

      const result = await response.json();

      if (result.data) {
        setVideoUrl(result.data.video_url || '');
        setDescripcion(result.data.descripcion || '');
      }
      // Si result.data es null, simplemente no cargamos nada (es normal si no hay video aún)
    } catch (err: any) {
      console.error('Error al obtener video:', err);
      setError(err.message || 'Error al cargar el video');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (!videoUrl.trim()) {
        throw new Error('La URL del video es requerida');
      }

      // Validar que sea una URL válida
      try {
        new URL(videoUrl);
      } catch {
        throw new Error('Por favor ingresa una URL válida');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch('/api/admin/save-global-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          video_url: videoUrl.trim(),
          descripcion: descripcion.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar el video');
      }

      setSuccess(true);
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error al guardar video:', err);
      setError(err.message || 'Error al guardar el video');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar el video institucional?')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch('/api/admin/delete-global-video', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar el video');
      }

      setSuccess(true);
      setVideoUrl('');
      setDescripcion('');
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error al eliminar video:', err);
      setError(err.message || 'Error al eliminar el video');
    } finally {
      setSaving(false);
    }
  };

  // Función para convertir URL de YouTube a formato embed
  const getYouTubeEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    
    // Detectar formato youtu.be
    const youtuBeMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (youtuBeMatch) {
      return `https://www.youtube.com/embed/${youtuBeMatch[1]}`;
    }
    
    // Detectar formato youtube.com/watch?v=
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) {
      return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }
    
    // Detectar formato youtube.com/embed/
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    // Si no es YouTube, devolver la URL original
    return url;
  };

  if (loading) {
    return (
      <div className="courses-list-container">
        <div className="loading-state">
          <p>Cargando información del video institucional...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="courses-list-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>Video Institucional</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Gestiona el video que se mostrará en el perfil de todos los estudiantes
        </p>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        {error && (
          <div style={{
            padding: '1rem',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '1rem',
            background: '#d1fae5',
            border: '1px solid #a7f3d0',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Video guardado exitosamente
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="video_url" style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#1f2937',
            }}>
              URL del Video *
            </label>
            <input
              type="url"
              id="video_url"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setSuccess(false);
              }}
              placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
              required
              disabled={saving}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#1f2937',
              }}
            />
            <p style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: '#6b7280',
            }}>
              Ingresa la URL del video (YouTube, Vimeo, etc.)
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="descripcion" style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#1f2937',
            }}>
              Descripción (Opcional)
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción del video..."
              rows={4}
              disabled={saving}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#1f2937',
                resize: 'vertical',
              }}
            />
          </div>

          {videoUrl && (() => {
            const embedUrl = getYouTubeEmbedUrl(videoUrl);
            if (!embedUrl) return null;
            
            return (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1f2937',
                }}>
                  Vista Previa
                </label>
                <div style={{
                  position: 'relative',
                  paddingBottom: '56.25%', // 16:9 aspect ratio
                  height: 0,
                  overflow: 'hidden',
                  borderRadius: '8px',
                  background: '#f3f4f6',
                }}>
                  <iframe
                    src={embedUrl}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            {videoUrl && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  opacity: saving ? 0.5 : 1,
                }}
              >
                Eliminar Video
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? 'Guardando...' : 'Guardar Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

