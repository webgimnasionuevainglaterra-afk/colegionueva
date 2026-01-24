'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import StudentGradesView from './StudentGradesView';
import RespuestasEstudiante from './RespuestasEstudiante';
import '../app/css/courses-list.css';

interface StudentInstitutionalVideoProps {
  onContenidoSelect?: (contenidoId: string) => void;
}

export default function StudentInstitutionalVideo({ onContenidoSelect }: StudentInstitutionalVideoProps = {}) {
  const [videoUrl, setVideoUrl] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            if (response.status === 404 || !data.data) {
              setVideoUrl('');
              setDescripcion('');
              return;
            }
            throw new Error(data.error || 'Error al cargar el video institucional');
          } catch {
            if (response.status === 404) {
              setVideoUrl('');
              setDescripcion('');
              return;
            }
            throw new Error(text || 'Error al cargar el video institucional');
          }
        }

        const result = await response.json();

        if (result.data) {
          setVideoUrl(result.data.video_url || '');
          setDescripcion(result.data.descripcion || '');
        } else {
          setVideoUrl('');
          setDescripcion('');
        }
      } catch (err: any) {
        console.error('Error al obtener video institucional:', err);
        setError(err.message || 'Error al cargar el video institucional');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, []);

  const getYouTubeEmbedUrl = (url: string): string | null => {
    if (!url) return null;

    const youtuBeMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (youtuBeMatch) {
      return `https://www.youtube.com/embed/${youtuBeMatch[1]}`;
    }

    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) {
      return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }

    if (url.includes('youtube.com/embed/')) {
      return url;
    }

    return url;
  };

  if (loading) {
    return (
      <div className="courses-list-container">
        <div className="loading-state">
          <p>Cargando video institucional...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="courses-list-container">
        <div
          style={{
            padding: '1rem',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#b91c1c',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="courses-list-container">
        <div className="dashboard-welcome">
          <h1 className="welcome-title">
            Bienvenido a tu Aula Virtual
          </h1>
          <p className="welcome-description">
            A la izquierda verás tu curso y las materias donde estás inscrito. Una vez el administrador configure el video institucional, lo verás aquí.
          </p>
        </div>
      </div>
    );
  }

  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  return (
    <div className="courses-list-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>Bienvenido a tu Aula Virtual</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Mira el video institucional del colegio. A la izquierda verás tu curso y las materias donde estás inscrito.
        </p>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {embedUrl && (
          <div>
            <div
              style={{
                position: 'relative',
                paddingBottom: '56.25%',
                height: 0,
                overflow: 'hidden',
                borderRadius: '8px',
                background: '#f3f4f6',
              }}
            >
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
            {descripcion && (
              <p
                style={{
                  marginTop: '1rem',
                  fontSize: '0.9rem',
                  color: '#4b5563',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {descripcion}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Respuestas del profesor */}
      <RespuestasEstudiante onContenidoSelect={onContenidoSelect} />

      {/* Calificaciones por materia */}
      <StudentGradesView />
    </div>
  );
}




