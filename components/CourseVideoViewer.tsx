'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import '../app/css/courses-list.css';

interface CourseVideoViewerProps {
  courseId: string;
  courseName: string;
  onClose: () => void;
  onEdit: () => void;
  onSuccess: () => void;
}

export default function CourseVideoViewer({
  courseId,
  courseName,
  onClose,
  onEdit,
  onSuccess,
}: CourseVideoViewerProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchVideo();
  }, [courseId]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`/api/courses/get-course-video?course_id=${courseId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setVideoUrl(result.data.video_url || '');
        setDescripcion(result.data.descripcion || '');
      } else if (response.status === 404) {
        setError('No hay video configurado para este curso');
      } else {
        throw new Error(result.error || 'Error al cargar el video');
      }
    } catch (err: any) {
      console.error('Error al obtener video:', err);
      setError(err.message || 'Error al cargar el video');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar el video de este curso?')) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch('/api/courses/delete-course-video', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          course_id: courseId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar el video');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('Error al eliminar video:', err);
      setError(err.message || 'Error al eliminar el video');
    } finally {
      setDeleting(false);
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
          <p>Cargando video del curso...</p>
        </div>
      </div>
    );
  }

  const embedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;

  return (
    <div className="courses-list-container">
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>Video del Curso</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {courseName}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            color: '#6b7280',
            fontSize: '1.5rem',
            lineHeight: 1,
          }}
        >
          ×
        </button>
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
            Video eliminado exitosamente
          </div>
        )}

        {!error && embedUrl && (
          <>
            {/* Video */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#1f2937',
              }}>
                Video
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

            {/* URL del Video */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#1f2937',
              }}>
                URL del Video
              </label>
              <div style={{
                padding: '0.75rem',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#1f2937',
                wordBreak: 'break-all',
              }}>
                {videoUrl}
              </div>
            </div>

            {/* Descripción */}
            {descripcion && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1f2937',
                }}>
                  Descripción
                </label>
                <div style={{
                  padding: '0.75rem',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#1f2937',
                  whiteSpace: 'pre-wrap',
                }}>
                  {descripcion}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#f3f4f6',
              color: '#1f2937',
              border: 'none',
              borderRadius: '6px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              opacity: deleting ? 0.5 : 1,
            }}
          >
            Cerrar
          </button>
          {videoUrl && (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? 'Eliminando...' : 'Eliminar Video'}
              </button>
              <button
                type="button"
                onClick={onEdit}
                disabled={deleting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                Editar Video
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}





