'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

interface StudentRightSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  subjectId?: string | null;
  subjectName?: string | null;
  onTemaSelect?: (tema: Tema, periodoNombre: string) => void;
  onEvaluacionSelect?: (evaluacionId: string) => void;
}

interface Contenido {
  id: string;
  titulo: string;
  tipo: 'video' | 'archivo' | 'foro';
  descripcion?: string | null;
  url?: string | null;
  archivo_url?: string | null;
}

interface Subtema {
  id: string;
  nombre: string;
  descripcion?: string | null;
  contenido?: Contenido[];
}

interface Tema {
  id: string;
  nombre: string;
  subtemas?: Subtema[];
  descripcion?: string | null;
}

interface Periodo {
  id: string;
  nombre: string;
  numero_periodo: number;
  temas?: Tema[];
}

interface Evaluacion {
  id: string;
  nombre: string;
  descripcion?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  periodo_id: string;
  materia_id: string;
  is_active?: boolean;
}

export default function StudentRightSidebar({
  isOpen = true,
  onClose,
  subjectId,
  subjectName,
  onTemaSelect,
  onEvaluacionSelect,
}: StudentRightSidebarProps) {
  console.log('🔵 StudentRightSidebar renderizado con onTemaSelect:', !!onTemaSelect, typeof onTemaSelect);
  
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPeriodoId, setExpandedPeriodoId] = useState<string | null>(null);
  const [selectedContenido, setSelectedContenido] = useState<Contenido | null>(null);
  const [evaluacionesPorPeriodo, setEvaluacionesPorPeriodo] = useState<Record<string, Evaluacion[]>>({});
  const [loadingEvaluaciones, setLoadingEvaluaciones] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!subjectId) {
        setPeriodos([]);
        setSelectedContenido(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setSelectedContenido(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No hay sesión activa');
        }

        const response = await fetch(
          `/api/estudiantes/get-materia-contenidos?materia_id=${subjectId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error al cargar contenidos');
        }

        setPeriodos(result.data || []);
      } catch (err: any) {
        console.error('Error al obtener contenidos de la materia:', err);
        setError(err.message || 'Error al cargar contenidos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [subjectId]);

  // Cargar evaluaciones del período cuando se cargan los períodos
  useEffect(() => {
    if (!subjectId || periodos.length === 0) {
      setEvaluacionesPorPeriodo({});
      return;
    }

    const fetchEvaluaciones = async () => {
      setLoadingEvaluaciones(true);
      const evaluaciones: Record<string, Evaluacion[]> = {};

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Obtener evaluaciones de todos los períodos
        const promises = periodos.map(async (periodo) => {
          try {
            const response = await fetch(
              `/api/evaluaciones/get-evaluacion?periodo_id=${periodo.id}&materia_id=${subjectId}`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
              }
            );
            const result = await response.json();
            if (response.ok && result.data) {
              // Filtrar solo evaluaciones activas
              const evaluacionesArray = Array.isArray(result.data) ? result.data : [result.data];
              evaluaciones[periodo.id] = evaluacionesArray.filter((e: Evaluacion) => e.is_active !== false);
            } else {
              evaluaciones[periodo.id] = [];
            }
          } catch (err) {
            console.error(`Error al cargar evaluaciones del período ${periodo.id}:`, err);
            evaluaciones[periodo.id] = [];
          }
        });

        await Promise.all(promises);
        setEvaluacionesPorPeriodo(evaluaciones);
      } catch (err) {
        console.error('Error al cargar evaluaciones:', err);
      } finally {
        setLoadingEvaluaciones(false);
      }
    };

    fetchEvaluaciones();
  }, [subjectId, periodos]);

  const togglePeriodo = (id: string) => {
    setExpandedPeriodoId((prev) => (prev === id ? null : id));
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
    
    return null;
  };

  const renderContenidoViewer = () => {
    if (!selectedContenido) return null;

    if (selectedContenido.tipo === 'video' && selectedContenido.url) {
      const embedUrl = getYouTubeEmbedUrl(selectedContenido.url);
      
      if (!embedUrl) {
        return (
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <h3
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#111827',
              }}
            >
              {selectedContenido.titulo}
            </h3>
            <div
              style={{
                padding: '1rem',
                background: '#f3f4f6',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#6b7280',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.85rem' }}>URL de video no válida</p>
              <a
                href={selectedContenido.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.8rem',
                  color: '#2563eb',
                  textDecoration: 'none',
                  marginTop: '0.5rem',
                  display: 'inline-block',
                }}
              >
                🔗 Abrir enlace
              </a>
            </div>
          </div>
        );
      }

      return (
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <h3
            style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#111827',
            }}
          >
            {selectedContenido.titulo}
          </h3>
          <div
            style={{
              position: 'relative',
              paddingBottom: '56.25%',
              height: 0,
              overflow: 'hidden',
              borderRadius: '8px',
              background: '#000',
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
          {selectedContenido.descripcion && (
            <p
              style={{
                marginTop: '0.75rem',
                fontSize: '0.8rem',
                color: '#4b5563',
              }}
            >
              {selectedContenido.descripcion}
            </p>
          )}
        </div>
      );
    }

    if (selectedContenido.tipo === 'archivo' && selectedContenido.archivo_url) {
      let archivos: string[] = [];
      try {
        const parsed = JSON.parse(selectedContenido.archivo_url);
        archivos = Array.isArray(parsed) ? parsed : [selectedContenido.archivo_url];
      } catch {
        archivos = [selectedContenido.archivo_url];
      }

      return (
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <h3
            style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#111827',
            }}
          >
            {selectedContenido.titulo}
          </h3>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            {archivos.map((url, index) => (
              <li key={index}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.8rem',
                    color: '#2563eb',
                    textDecoration: 'none',
                  }}
                >
                  Archivo {index + 1}
                </a>
              </li>
            ))}
          </ul>
          {selectedContenido.descripcion && (
            <p
              style={{
                marginTop: '0.75rem',
                fontSize: '0.8rem',
                color: '#4b5563',
              }}
            >
              {selectedContenido.descripcion}
            </p>
          )}
        </div>
      );
    }

    if (selectedContenido.tipo === 'foro') {
      return (
        <div
          style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <h3
            style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#111827',
            }}
          >
            {selectedContenido.titulo}
          </h3>
          {selectedContenido.descripcion && (
            <p
              style={{
                fontSize: '0.8rem',
                color: '#4b5563',
              }}
            >
              {selectedContenido.descripcion}
            </p>
          )}
          <p
            style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: '#6b7280',
            }}
          >
            (Vista de foro próximamente)
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {onClose && (
        <div
          onClick={onClose}
          className={`teacher-sidebar-overlay ${isOpen ? 'show' : ''}`}
        />
      )}
      <aside className={`teacher-right-sidebar ${isOpen ? 'open' : ''}`}>
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            background: 'white',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  color: '#1f2937',
                  margin: 0,
                  marginBottom: '0.25rem',
                }}
              >
                Contenidos
              </h2>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: '#6b7280',
                  margin: 0,
                }}
              >
                {subjectName ? `Materia: ${subjectName}` : 'Selecciona una materia a la izquierda'}
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="teacher-sidebar-close-btn"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ width: '24px', height: '24px' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            padding: '0.75rem 1rem 1rem',
            fontSize: '0.8rem',
            color: '#4b5563',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {!subjectId ? (
            <p style={{ color: '#6b7280' }}>
              Elige una materia en el panel izquierdo para ver sus periodos y contenidos.
            </p>
          ) : loading ? (
            <p style={{ color: '#6b7280' }}>Cargando contenidos...</p>
          ) : error ? (
            <p style={{ color: '#b91c1c' }}>{error}</p>
          ) : periodos.length === 0 ? (
            <p style={{ color: '#6b7280' }}>
              Esta materia aún no tiene periodos configurados.
            </p>
          ) : (
            periodos.map((periodo) => {
              const isExpanded = expandedPeriodoId === periodo.id;
              return (
                <div
                  key={periodo.id}
                  style={{
                    marginBottom: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    background: 'white',
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      // Solo toggle si el click no viene de un botón hijo
                      const target = e.target as HTMLElement;
                      if (target.closest('button[type="button"]') && target !== e.currentTarget) {
                        return; // El click viene de un botón hijo, no hacer toggle
                      }
                      togglePeriodo(periodo.id);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: 'none',
                      background: 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: '#111827',
                        }}
                      >
                        {periodo.nombre}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: '#6b7280',
                        }}
                      >
                        Periodo {periodo.numero_periodo}
                      </div>
                    </div>
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{
                        width: '18px',
                        height: '18px',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        color: '#6b7280',
                      }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div
                      style={{
                        padding: '0.5rem 0.75rem 0.75rem',
                        borderTop: '1px solid #f3f4f6',
                      }}
                    >
                      {(!periodo.temas || periodo.temas.length === 0) && (
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            margin: 0,
                          }}
                        >
                          Aún no hay temas configurados en este periodo.
                        </p>
                      )}
                      {periodo.temas?.map((tema) => {
                        const desbloqueado = tema.desbloqueado !== false; // Por defecto true si no está definido
                        const completado = tema.completado === true;
                        
                        return (
                          <div
                            key={tema.id}
                            style={{
                              marginBottom: '0.4rem',
                              opacity: desbloqueado ? 1 : 0.5,
                            }}
                          >
                            <button
                              type="button"
                              disabled={!desbloqueado}
                              onClick={(e) => {
                                if (!desbloqueado) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  return;
                                }
                                
                                // Prevenir cualquier propagación del evento
                                e.preventDefault();
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                                
                                if (!onTemaSelect) {
                                  return;
                                }
                                
                                if (!tema || !tema.id) {
                                  return;
                                }
                                
                                try {
                                  const temaSeleccionado = {
                                    ...tema,
                                    subtemas: tema.subtemas ? [...tema.subtemas] : []
                                  };
                                  
                                  onTemaSelect(temaSeleccionado, periodo.nombre);
                                } catch (error) {
                                  console.error('Error al llamar onTemaSelect:', error);
                                }
                              }}
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: desbloqueado ? '#111827' : '#9ca3af',
                                marginBottom: '0.15rem',
                                background: desbloqueado ? 'transparent' : '#f3f4f6',
                                border: desbloqueado ? '1px solid transparent' : '1px solid #e5e7eb',
                                borderRadius: '6px',
                                padding: '0.4rem 0.6rem',
                                cursor: desbloqueado ? 'pointer' : 'not-allowed',
                                width: '100%',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                                position: 'relative',
                              }}
                              onMouseEnter={(e) => {
                                if (desbloqueado) {
                                  e.currentTarget.style.background = '#f3f4f6';
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (desbloqueado) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.borderColor = 'transparent';
                                }
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {completado && (
                                  <span style={{ color: '#10b981', fontSize: '0.9rem' }}>✓</span>
                                )}
                                {!desbloqueado && (
                                  <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>🔒</span>
                                )}
                                <span>{tema.nombre}</span>
                                {!desbloqueado && (
                                  <span style={{ 
                                    fontSize: '0.7rem', 
                                    color: '#9ca3af',
                                    marginLeft: 'auto',
                                    fontStyle: 'italic'
                                  }}>
                                    Completa el tema anterior
                                  </span>
                                )}
                              </div>
                            </button>
                            {tema.subtemas?.map((subtema) => (
                            <div
                              key={subtema.id}
                              style={{
                                marginLeft: '0.5rem',
                                marginBottom: '0.25rem',
                              }}
                            >
                              {/* Nombre del subtema clickable: muestra SOLO este subtema en el centro */}
                              <button
                                onClick={() => {
                                  if (!onTemaSelect) return;

                                  console.log('🧭 onTemaSelect desde SUBTEMA:', {
                                    temaId: tema.id,
                                    temaNombre: tema.nombre,
                                    subtemaId: subtema.id,
                                    subtemaNombre: subtema.nombre,
                                    periodo: periodo.nombre,
                                  });

                                  // Tema con SOLO este subtema
                                  const temaSeleccionado = {
                                    ...tema,
                                    subtemas: tema.subtemas
                                      ? tema.subtemas
                                          .filter((st: Subtema) => st.id === subtema.id)
                                          .map((st: Subtema) => ({ ...st }))
                                      : [],
                                  };

                                  onTemaSelect(temaSeleccionado, periodo.nombre);
                                }}
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                  color: '#374151',
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                {subtema.nombre}
                              </button>
                              <ul
                                style={{
                                  listStyle: 'none',
                                  padding: 0,
                                  margin: '0.15rem 0 0.25rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.15rem',
                                }}
                              >
                                {subtema.contenido?.map((contenido) => (
                                  <li key={contenido.id}>
                                    <button
                                      onClick={() => {
                                        // Seguir mostrando la vista previa en la barra derecha
                                        setSelectedContenido(contenido);

                                        // Además, abrir el tema completo en el centro del dashboard
                                        // IMPORTANTE: Filtrar para mostrar SOLO el subtema que contiene este contenido
                                        if (onTemaSelect) {
                                          console.log('🧭 onTemaSelect desde contenido (subtema):', {
                                            contenidoId: contenido.id,
                                            contenidoTitulo: contenido.titulo,
                                            temaId: tema.id,
                                            temaNombre: tema.nombre,
                                            subtemaId: subtema.id,
                                            subtemaNombre: subtema.nombre,
                                            periodo: periodo.nombre,
                                          });
                                          
                                          // IMPORTANTE: Crear una copia del tema pero con SOLO el subtema que contiene este contenido
                                          // Esto asegura que solo se muestre el subtema específico, no todos los subtemas
                                          const temaSeleccionado = {
                                            ...tema,
                                            // Filtrar para incluir SOLO el subtema que contiene este contenido
                                            subtemas: tema.subtemas 
                                              ? tema.subtemas
                                                  .filter((st: Subtema) => st.id === subtema.id)
                                                  .map((st: Subtema) => ({ ...st }))
                                              : []
                                          };
                                          
                                          console.log('🧭 Tema filtrado - solo subtema:', subtema.nombre);
                                          console.log('🧭 Subtemas en tema filtrado:', temaSeleccionado.subtemas.length);
                                          
                                          onTemaSelect(temaSeleccionado, periodo.nombre);
                                        }
                                      }}
                                      style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        border: 'none',
                                        background: 'transparent',
                                        padding: '0.2rem 0.25rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        color: '#1f2937',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {contenido.tipo === 'video' && '📺 ' }
                                      {contenido.tipo === 'archivo' && '📎 ' }
                                      {contenido.tipo === 'foro' && '💬 ' }
                                      {contenido.titulo}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            ))}
                          </div>
                        );
                      })}

                      {/* Evaluaciones del período */}
                      {evaluacionesPorPeriodo[periodo.id] && evaluacionesPorPeriodo[periodo.id].length > 0 && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem' }}>
                            📝 Evaluaciones del Período:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {evaluacionesPorPeriodo[periodo.id].map((evaluacion) => {
                              const evaluacionDesbloqueada = periodo.evaluacion_desbloqueada !== false;
                              
                              return (
                              <div
                                key={evaluacion.id}
                                style={{
                                  padding: '0.75rem',
                                  marginBottom: '0.5rem',
                                  background: evaluacionDesbloqueada ? '#f0fdf4' : '#f9fafb',
                                  borderRadius: '6px',
                                  border: evaluacionDesbloqueada ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
                                  fontSize: '0.8rem',
                                  color: evaluacionDesbloqueada ? '#1f2937' : '#9ca3af',
                                  opacity: evaluacionDesbloqueada ? 1 : 0.6,
                                }}
                              >
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#166534' }}>
                                  {evaluacion.nombre}
                                </div>
                                {evaluacion.descripcion && (
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                    {evaluacion.descripcion}
                                  </div>
                                )}
                                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                  <div>Inicio: {new Date(evaluacion.fecha_inicio).toLocaleDateString()}</div>
                                  <div>Fin: {new Date(evaluacion.fecha_fin).toLocaleDateString()}</div>
                                </div>
                                {!evaluacionDesbloqueada && (
                                  <div style={{ 
                                    fontSize: '0.75rem', 
                                    color: '#9ca3af',
                                    fontStyle: 'italic',
                                    marginTop: '0.5rem',
                                    padding: '0.5rem',
                                    background: '#f3f4f6',
                                    borderRadius: '4px',
                                  }}>
                                    🔒 Completa todos los temas del período para desbloquear esta evaluación
                                  </div>
                                )}
                                
                                {(() => {
                                  // Si la evaluación no está desbloqueada, no mostrar botón
                                  if (!evaluacionDesbloqueada) {
                                    return null;
                                  }
                                  
                                  // Si la evaluación no está activa, no mostrar botón
                                  if (evaluacion.is_active === false) {
                                    return null;
                                  }
                                  
                                  // Validar fechas para determinar el estado del botón
                                  const ahora = new Date();
                                  const fechaInicio = new Date(evaluacion.fecha_inicio);
                                  const fechaFin = new Date(evaluacion.fecha_fin);
                                  const finDelDia = new Date(fechaFin);
                                  finDelDia.setHours(23, 59, 59, 999);
                                  
                                  const estaDisponible = ahora >= fechaInicio && ahora <= finDelDia;
                                  const haExpirado = ahora > finDelDia;
                                  const aunNoDisponible = ahora < fechaInicio;
                                  
                                  // Si ha expirado pero está activado manualmente, permitir presentarlo
                                  if (haExpirado && evaluacion.is_active === true) {
                                    // Profesor activó manualmente después de la fecha fin - permitir presentarla
                                    return (
                                      <button
                                        onClick={() => {
                                          if (onEvaluacionSelect) {
                                            onEvaluacionSelect(evaluacion.id);
                                          }
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '0.5rem',
                                          background: '#10b981',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '0.75rem',
                                          fontWeight: 500,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        📝 Presentar Evaluación
                                      </button>
                                    );
                                  }
                                  
                                  if (haExpirado) {
                                    return (
                                      <button
                                        disabled
                                        style={{
                                          width: '100%',
                                          padding: '0.5rem',
                                          background: '#9ca3af',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '0.75rem',
                                          fontWeight: 500,
                                          cursor: 'not-allowed',
                                        }}
                                      >
                                        ⏰ Evaluación Finalizada
                                      </button>
                                    );
                                  }
                                  
                                  if (aunNoDisponible) {
                                    const diff = fechaInicio.getTime() - ahora.getTime();
                                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                    
                                    return (
                                      <button
                                        disabled
                                        style={{
                                          width: '100%',
                                          padding: '0.5rem',
                                          background: '#f59e0b',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '0.75rem',
                                          fontWeight: 500,
                                          cursor: 'not-allowed',
                                        }}
                                      >
                                        ⏰ Disponible en {days > 0 ? `${days}d ` : ''}{hours}h
                                      </button>
                                    );
                                  }
                                  
                                  // Está disponible
                                  return (
                                    <button
                                      onClick={() => {
                                        if (onEvaluacionSelect) {
                                          onEvaluacionSelect(evaluacion.id);
                                        }
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        background: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      📝 Presentar Evaluación
                                    </button>
                                  );
                                })()}
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {renderContenidoViewer()}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}



