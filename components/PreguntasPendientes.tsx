'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

interface PreguntaPendiente {
  id: string;
  contenido_id: string;
  autor_id: string;
  texto: string;
  creado_at: string;
  autor: {
    nombre: string;
  };
  contenido: {
    id: string;
    titulo: string;
    tipo: string;
  };
  materia: string;
}

interface PreguntasPendientesProps {
  onContenidoSelect?: (contenidoId: string) => void;
}

export default function PreguntasPendientes({ onContenidoSelect }: PreguntasPendientesProps) {
  const router = useRouter();
  const [preguntas, setPreguntas] = useState<PreguntaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cargandoContenido, setCargandoContenido] = useState<string | null>(null);

  const cargarPreguntasPendientes = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No hay sesión activa');
        return;
      }

      const response = await fetch('/api/preguntas-respuestas/get-pendientes', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar preguntas pendientes');
      }

      setPreguntas(result.data || []);
    } catch (err: any) {
      console.error('Error al cargar preguntas pendientes:', err);
      setError(err.message || 'Error al cargar las preguntas pendientes');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Cargar inicialmente
    cargarPreguntasPendientes();
    
    // Recargar cada 60 segundos de forma silenciosa (sin mostrar loading)
    // Aumentado a 60 segundos para reducir la frecuencia
    const interval = setInterval(() => {
      cargarPreguntasPendientes(true);
    }, 60000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar

  const irAContenido = (contenidoId: string) => {
    if (cargandoContenido === contenidoId) return; // Evitar clicks múltiples
    
    setCargandoContenido(contenidoId);
    
    // Si hay callback, usarlo (navegación sin recarga)
    if (onContenidoSelect) {
      onContenidoSelect(contenidoId);
      // Resetear el estado después de un breve delay para mostrar el feedback visual
      setTimeout(() => setCargandoContenido(null), 500);
      return;
    }
    
    // Fallback: usar router si no hay callback
    router.push(`/dashboard?contenido_id=${contenidoId}`);
    setTimeout(() => setCargandoContenido(null), 500);
  };

  const formatearFecha = (fecha: string) => {
    const ahora = new Date();
    const fechaMsg = new Date(fecha);
    const diffMs = ahora.getTime() - fechaMsg.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return fechaMsg.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Cargando preguntas pendientes...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>
          ❓ Preguntas Pendientes
        </h2>
        <button
          onClick={cargarPreguntasPendientes}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          🔄 Actualizar
        </button>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#dc2626',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {preguntas.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem', color: '#374151' }}>
            No hay preguntas pendientes
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Todas las preguntas han sido respondidas
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {preguntas.map((pregunta) => (
            <div
              key={pregunta.id}
              onClick={() => irAContenido(pregunta.contenido_id)}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '1.25rem',
                border: cargandoContenido === pregunta.contenido_id ? '2px solid #3b82f6' : '2px solid #fbbf24',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                cursor: cargandoContenido === pregunta.contenido_id ? 'wait' : 'pointer',
                transition: 'all 0.2s',
                opacity: cargandoContenido === pregunta.contenido_id ? 0.7 : 1,
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (cargandoContenido !== pregunta.contenido_id) {
                  e.currentTarget.style.borderColor = '#f59e0b';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (cargandoContenido !== pregunta.contenido_id) {
                  e.currentTarget.style.borderColor = '#fbbf24';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {cargandoContenido === pregunta.contenido_id && (
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}>
                  Cargando...
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.75rem',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                  }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}>
                      PENDIENTE
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                    }}>
                      {pregunta.materia}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: '0.25rem',
                  }}>
                    {pregunta.contenido.titulo}
                  </div>
                  <div style={{
                    fontSize: '0.8125rem',
                    color: '#6b7280',
                  }}>
                    Pregunta de: <strong>{pregunta.autor.nombre}</strong>
                  </div>
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  textAlign: 'right',
                }}>
                  {formatearFecha(pregunta.creado_at)}
                </div>
              </div>

              <div style={{
                color: '#374151',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                backgroundColor: '#f9fafb',
                padding: '0.75rem',
                borderRadius: '6px',
                marginBottom: '0.75rem',
              }}>
                {pregunta.texto}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
              }}>
                <span style={{
                  fontSize: '0.8125rem',
                  color: '#2563eb',
                  fontWeight: 500,
                }}>
                  👆 Haz clic para ir al contenido y responder →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

