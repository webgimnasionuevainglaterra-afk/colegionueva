'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { supabase } from '@/lib/supabase-client';

interface Pregunta {
  id: string;
  contenido_id: string;
  autor_id: string;
  tipo: 'pregunta';
  pregunta_id: null;
  texto: string;
  creado_at: string;
  autor: {
    nombre: string;
    tipo: 'estudiante' | 'profesor';
  };
  respuestas: Respuesta[];
}

interface Respuesta {
  id: string;
  contenido_id: string;
  autor_id: string;
  tipo: 'respuesta';
  pregunta_id: string;
  texto: string;
  creado_at: string;
  autor: {
    nombre: string;
    tipo: 'estudiante' | 'profesor';
  };
}

interface PreguntasRespuestasProps {
  contenidoId: string;
  contenidoTitulo?: string;
}

function PreguntasRespuestas({ 
  contenidoId, 
  contenidoTitulo = 'Preguntas y Respuestas'
}: PreguntasRespuestasProps) {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevaPregunta, setNuevaPregunta] = useState('');
  const [respondiendoA, setRespondiendoA] = useState<string | null>(null);
  const [nuevaRespuesta, setNuevaRespuesta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [userRole, setUserRole] = useState<'estudiante' | 'profesor' | null>(null);
  const [userName, setUserName] = useState<string>('');
  const preguntasEndRef = useRef<HTMLDivElement>(null);
  const nuevaPreguntaRef = useRef<string>('');
  const nuevaRespuestaRef = useRef<string>('');
  const isUserTypingRef = useRef<boolean>(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar rol del usuario (solo una vez)
  useEffect(() => {
    const verificarRol = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Verificar si es estudiante
        const { data: estudiante } = await supabase
          .from('estudiantes')
          .select('nombre, apellido')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (estudiante) {
          setUserRole('estudiante');
          setUserName(`${estudiante.nombre || ''} ${estudiante.apellido || ''}`.trim() || 'Estudiante');
          return;
        }

        // Verificar si es profesor
        const { data: profesor } = await supabase
          .from('profesores')
          .select('nombre, apellido')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profesor) {
          setUserRole('profesor');
          setUserName(`${profesor.nombre || ''} ${profesor.apellido || ''}`.trim() || 'Profesor');
        }
      } catch (err) {
        console.error('Error al verificar rol:', err);
      }
    };

    verificarRol();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar

  // Cargar preguntas - NO debe borrar el estado del input si el usuario está escribiendo
  const cargarPreguntas = useCallback(async (preserveInput = false) => {
    // Si el usuario está escribiendo, no recargar
    if (isUserTypingRef.current && preserveInput) {
      return;
    }

    try {
      // Solo mostrar loading si no estamos preservando el input
      if (!preserveInput) {
        setLoading(true);
      }
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No hay sesión activa');
        return;
      }

      const response = await fetch(`/api/preguntas-respuestas/get?contenido_id=${contenidoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        const mensajeError = result.error || 'Error al cargar preguntas';
        const detalleError = result.detalle ? `\n\nDetalle: ${result.detalle}` : '';
        throw new Error(mensajeError + detalleError);
      }

      setPreguntas(result.data || []);
      
      // Scroll al final solo si no estamos preservando el input
      if (!preserveInput) {
        setTimeout(() => {
          preguntasEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err: any) {
      console.error('Error al cargar preguntas:', err);
      setError(err.message || 'Error al cargar las preguntas');
    } finally {
      if (!preserveInput) {
        setLoading(false);
      }
    }
  }, [contenidoId]); // Solo depender de contenidoId

  // Cargar preguntas inicialmente (solo cuando cambia contenidoId)
  useEffect(() => {
    if (contenidoId) {
      cargarPreguntas(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contenidoId]); // Solo cuando cambia contenidoId

  // Cleanup del timeout cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Crear pregunta
  const crearPregunta = async () => {
    if (!nuevaPregunta.trim() || enviando || userRole !== 'estudiante') return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('No hay sesión activa');
      return;
    }

    setEnviando(true);
    const textoPregunta = nuevaPregunta.trim();

    try {
      const response = await fetch('/api/preguntas-respuestas/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          contenido_id: contenidoId,
          texto: textoPregunta,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la pregunta');
      }

      setNuevaPregunta('');
      nuevaPreguntaRef.current = '';
      isUserTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      // Recargar preguntas después de enviar
      setTimeout(() => {
        cargarPreguntas(false);
      }, 500);
    } catch (err: any) {
      console.error('Error al crear pregunta:', err);
      setError(err.message || 'Error al crear la pregunta');
    } finally {
      setEnviando(false);
    }
  };

  // Crear respuesta
  const crearRespuesta = async (preguntaId: string) => {
    if (!nuevaRespuesta.trim() || enviando || userRole !== 'profesor') return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('No hay sesión activa');
      return;
    }

    setEnviando(true);
    const textoRespuesta = nuevaRespuesta.trim();

    try {
      const response = await fetch('/api/preguntas-respuestas/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          contenido_id: contenidoId,
          texto: textoRespuesta,
          pregunta_id: preguntaId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la respuesta');
      }

      setNuevaRespuesta('');
      nuevaRespuestaRef.current = '';
      setRespondiendoA(null);
      isUserTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      // Recargar preguntas después de enviar
      setTimeout(() => {
        cargarPreguntas(false);
      }, 500);
    } catch (err: any) {
      console.error('Error al crear respuesta:', err);
      setError(err.message || 'Error al crear la respuesta');
    } finally {
      setEnviando(false);
    }
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

  if (loading && preguntas.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Cargando preguntas...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: 'white',
      }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
          ❓ {contenidoTitulo}
        </h2>
        {error && (
          <div style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#dc2626',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Preguntas */}
      <div style={{
        maxHeight: '600px',
        overflowY: 'auto',
        padding: '1rem',
      }}>
        {preguntas.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: '#6b7280',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💭</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              No hay preguntas aún
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              {userRole === 'estudiante' 
                ? '¡Sé el primero en hacer una pregunta!' 
                : 'Los estudiantes pueden hacer preguntas aquí'}
            </div>
          </div>
        ) : (
          preguntas.map((pregunta) => (
            <div key={pregunta.id} style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}>
              {/* Pregunta */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}>
                  <span style={{
                    fontWeight: 600,
                    color: '#111827',
                    fontSize: '0.875rem',
                  }}>
                    {pregunta.autor.nombre}
                  </span>
                  <span style={{
                    padding: '0.125rem 0.5rem',
                    borderRadius: '12px',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}>
                    Pregunta
                  </span>
                </div>
                <div style={{
                  color: '#374151',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  marginBottom: '0.5rem',
                }}>
                  {pregunta.texto}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                }}>
                  {formatearFecha(pregunta.creado_at)}
                </div>
              </div>

              {/* Respuestas */}
              {pregunta.respuestas && pregunta.respuestas.length > 0 && (
                <div style={{
                  marginTop: '1rem',
                  paddingLeft: '1rem',
                  borderLeft: '3px solid #3b82f6',
                }}>
                  <div style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '0.75rem',
                  }}>
                    Respuestas ({pregunta.respuestas.length})
                  </div>
                  {pregunta.respuestas.map((respuesta) => (
                    <div key={respuesta.id} style={{
                      marginBottom: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: '#f0f9ff',
                      borderRadius: '6px',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                      }}>
                        <span style={{
                          fontWeight: 600,
                          color: '#111827',
                          fontSize: '0.8125rem',
                        }}>
                          {respuesta.autor.nombre}
                        </span>
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '12px',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}>
                          Profesor
                        </span>
                      </div>
                      <div style={{
                        color: '#374151',
                        fontSize: '0.8125rem',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        marginBottom: '0.5rem',
                      }}>
                        {respuesta.texto}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                      }}>
                        {formatearFecha(respuesta.creado_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón responder (solo profesores) */}
              {userRole === 'profesor' && (
                <div style={{ marginTop: '1rem' }}>
                  {respondiendoA === pregunta.id ? (
                    <div>
                      <textarea
                        value={nuevaRespuesta}
                        onChange={(e) => {
                          setNuevaRespuesta(e.target.value);
                          nuevaRespuestaRef.current = e.target.value;
                          isUserTypingRef.current = true;
                          // Limpiar timeout anterior si existe
                          if (typingTimeoutRef.current) {
                            clearTimeout(typingTimeoutRef.current);
                          }
                          // Después de 2 segundos sin escribir, permitir actualizaciones
                          typingTimeoutRef.current = setTimeout(() => {
                            isUserTypingRef.current = false;
                          }, 2000);
                        }}
                        onFocus={() => {
                          isUserTypingRef.current = true;
                        }}
                        onBlur={() => {
                          // Cuando el usuario deja de escribir, permitir actualizaciones después de un delay
                          if (typingTimeoutRef.current) {
                            clearTimeout(typingTimeoutRef.current);
                          }
                          typingTimeoutRef.current = setTimeout(() => {
                            isUserTypingRef.current = false;
                          }, 2000);
                        }}
                        placeholder="Escribe tu respuesta..."
                        style={{
                          width: '100%',
                          minHeight: '100px',
                          padding: '0.75rem',
                          border: '1px solid #93c5fd',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          color: '#111827',
                          backgroundColor: 'white',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => crearRespuesta(pregunta.id)}
                          disabled={!nuevaRespuesta.trim() || enviando}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: nuevaRespuesta.trim() && !enviando ? 'pointer' : 'not-allowed',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            opacity: nuevaRespuesta.trim() && !enviando ? 1 : 0.5,
                          }}
                        >
                          {enviando ? 'Enviando...' : 'Responder'}
                        </button>
                        <button
                          onClick={() => {
                            setRespondiendoA(null);
                            setNuevaRespuesta('');
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRespondiendoA(pregunta.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'transparent',
                        color: '#2563eb',
                        border: '1px solid #2563eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      }}
                    >
                      Responder
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={preguntasEndRef} />
      </div>

      {/* Formulario de nueva pregunta (solo estudiantes) */}
      {userRole === 'estudiante' && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'white',
          borderTop: '1px solid #e5e7eb',
        }}>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '0.5rem',
          }}>
            Hacer una pregunta
          </div>
          <textarea
            value={nuevaPregunta}
            onChange={(e) => {
              setNuevaPregunta(e.target.value);
              nuevaPreguntaRef.current = e.target.value;
              isUserTypingRef.current = true;
              // Limpiar timeout anterior si existe
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              // Después de 2 segundos sin escribir, permitir actualizaciones
              typingTimeoutRef.current = setTimeout(() => {
                isUserTypingRef.current = false;
              }, 2000);
            }}
            onFocus={() => {
              isUserTypingRef.current = true;
            }}
            onBlur={() => {
              // Cuando el usuario deja de escribir, permitir actualizaciones después de un delay
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              typingTimeoutRef.current = setTimeout(() => {
                isUserTypingRef.current = false;
              }, 2000);
            }}
            placeholder="Escribe tu pregunta aquí..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              color: '#111827',
              backgroundColor: 'white',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                crearPregunta();
              }
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              onClick={crearPregunta}
              disabled={!nuevaPregunta.trim() || enviando}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: nuevaPregunta.trim() && !enviando ? 'pointer' : 'not-allowed',
                fontSize: '0.875rem',
                fontWeight: 500,
                opacity: nuevaPregunta.trim() && !enviando ? 1 : 0.5,
              }}
            >
              {enviando ? 'Enviando...' : 'Publicar pregunta'}
            </button>
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '0.5rem',
            textAlign: 'right',
          }}>
            Presiona Ctrl+Enter para enviar
          </div>
        </div>
      )}
    </div>
  );
}

// Memoizar el componente para evitar re-renders innecesarios
export default memo(PreguntasRespuestas, (prevProps, nextProps) => {
  // Solo re-renderizar si cambia el contenidoId
  return prevProps.contenidoId === nextProps.contenidoId;
});

