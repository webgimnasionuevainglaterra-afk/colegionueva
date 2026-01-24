'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

interface Respuesta {
  id: string;
  texto: string;
  fecha: string;
  profesor_nombre: string;
}

interface PreguntaConRespuestas {
  pregunta_id: string;
  contenido_id: string;
  contenido_titulo: string;
  materia_nombre: string;
  pregunta_texto: string;
  pregunta_fecha: string;
  respuestas: Respuesta[];
  ultima_respuesta_fecha: string;
}

interface RespuestasEstudianteProps {
  onContenidoSelect?: (contenidoId: string) => void;
}

export default function RespuestasEstudiante({ onContenidoSelect }: RespuestasEstudianteProps) {
  const [preguntas, setPreguntas] = useState<PreguntaConRespuestas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cargandoContenido, setCargandoContenido] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const router = useRouter();

  const cargarRespuestas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No hay sesión activa');
        return;
      }

      const response = await fetch('/api/preguntas-respuestas/get-respuestas-estudiante', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar respuestas');
      }

      setPreguntas(result.data || []);
    } catch (err: any) {
      console.error('Error al cargar respuestas:', err);
      setError(err.message || 'Error al cargar las respuestas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarRespuestas();
    const interval = setInterval(() => cargarRespuestas(), 60000);
    return () => clearInterval(interval);
  }, [cargarRespuestas]);

  const irAContenido = async (contenidoId: string) => {
    if (cargandoContenido === contenidoId) return;
    setCargandoContenido(contenidoId);
    try {
      if (onContenidoSelect) {
        onContenidoSelect(contenidoId);
      } else {
        router.push(`/dashboard?contenido_id=${contenidoId}`);
      }
    } catch (err) {
      console.error('Error al navegar:', err);
    } finally {
      setCargandoContenido(null);
    }
  };

  const eliminarPregunta = async (preguntaId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se active el onClick del contenedor
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta pregunta? Esta acción no se puede deshacer.')) {
      return;
    }

    setEliminando(preguntaId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch('/api/preguntas-respuestas/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ pregunta_id: preguntaId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar la pregunta');
      }

      // Recargar las preguntas
      await cargarRespuestas();
    } catch (err: any) {
      console.error('Error al eliminar pregunta:', err);
      alert(err.message || 'Error al eliminar la pregunta');
    } finally {
      setEliminando(null);
    }
  };

  const formatearFecha = (fecha: string) => {
    try {
      const date = new Date(fecha);
      const ahora = new Date();
      const diffMs = ahora.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Hace unos momentos';
      if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
      if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
      if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
      
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return fecha;
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '1.5rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem',
      }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          Cargando respuestas...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '1.5rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem',
      }}>
        <div style={{ color: '#ef4444', textAlign: 'center' }}>
          {error}
        </div>
      </div>
    );
  }

  if (preguntas.length === 0) {
    return (
      <div style={{
        padding: '1.5rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1.5rem' }}>💬</span>
          Respuestas del Profesor
        </h3>
        <div style={{
          textAlign: 'center',
          color: '#6b7280',
          padding: '2rem 1rem',
        }}>
          <p>No hay respuestas nuevas del profesor.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1.5rem',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '1.5rem',
    }}>
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{ fontSize: '1.5rem' }}>💬</span>
        Respuestas del Profesor
        <span style={{
          background: '#3b82f6',
          color: 'white',
          borderRadius: '9999px',
          padding: '0.25rem 0.75rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginLeft: '0.5rem',
        }}>
          {preguntas.length}
        </span>
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {preguntas.map((pregunta) => {
          const primeraRespuesta = pregunta.respuestas[0];

          return (
            <div
              key={pregunta.pregunta_id}
              onClick={() => irAContenido(pregunta.contenido_id)}
              style={{
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: (cargandoContenido === pregunta.contenido_id || eliminando === pregunta.pregunta_id) ? 0.7 : 1,
                pointerEvents: (cargandoContenido === pregunta.contenido_id || eliminando === pregunta.pregunta_id) ? 'none' : 'auto',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              {eliminando === pregunta.pregunta_id && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem',
                  color: '#ef4444',
                }}>
                  Eliminando...
                </div>
              )}

              {cargandoContenido === pregunta.contenido_id && !eliminando && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem',
                  color: '#3b82f6',
                }}>
                  Cargando...
                </div>
              )}

              {/* Botón de eliminar */}
              <button
                onClick={(e) => eliminarPregunta(pregunta.pregunta_id, e)}
                disabled={eliminando === pregunta.pregunta_id}
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '0.75rem',
                  background: eliminando === pregunta.pregunta_id ? '#9ca3af' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  cursor: eliminando === pregunta.pregunta_id ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (eliminando !== pregunta.pregunta_id) {
                    e.currentTarget.style.background = '#dc2626';
                  }
                }}
                onMouseLeave={(e) => {
                  if (eliminando !== pregunta.pregunta_id) {
                    e.currentTarget.style.background = '#ef4444';
                  }
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                {eliminando === pregunta.pregunta_id ? 'Eliminando...' : 'Eliminar'}
              </button>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.75rem',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}>
                    {pregunta.materia_nombre}
                  </div>
                  <h4 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '0.5rem',
                  }}>
                    {pregunta.contenido_titulo}
                  </h4>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#4b5563',
                    marginBottom: '0.5rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    <strong>Tu pregunta:</strong> {pregunta.pregunta_texto}
                  </p>
                </div>
              </div>

              <div style={{
                padding: '0.75rem',
                background: 'white',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                marginTop: '0.75rem',
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <span style={{ fontWeight: '600' }}>📝 {primeraRespuesta.profesor_nombre}</span>
                  <span>•</span>
                  <span>{formatearFecha(pregunta.ultima_respuesta_fecha)}</span>
                </div>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  lineHeight: '1.5',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {primeraRespuesta.texto}
                </p>
                {pregunta.respuestas.length > 1 && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#3b82f6',
                    marginTop: '0.5rem',
                    fontWeight: '500',
                  }}>
                    +{pregunta.respuestas.length - 1} {pregunta.respuestas.length - 1 === 1 ? 'respuesta más' : 'respuestas más'}
                  </div>
                )}
              </div>

              <div style={{
                fontSize: '0.75rem',
                color: '#3b82f6',
                marginTop: '0.75rem',
                fontWeight: '500',
                textAlign: 'right',
              }}>
                Ver contenido →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

