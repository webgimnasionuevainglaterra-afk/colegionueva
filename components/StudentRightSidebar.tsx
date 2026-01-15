'use client';

import { useEffect, useState } from 'react';

interface StudentRightSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  subjectId?: string | null;
  subjectName?: string | null;
  onTemaSelect?: (tema: Tema, periodoNombre: string) => void;
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

export default function StudentRightSidebar({
  isOpen = true,
  onClose,
  subjectId,
  subjectName,
  onTemaSelect,
}: StudentRightSidebarProps) {
  console.log('🔵 StudentRightSidebar renderizado con onTemaSelect:', !!onTemaSelect, typeof onTemaSelect);
  
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPeriodoId, setExpandedPeriodoId] = useState<string | null>(null);
  const [selectedContenido, setSelectedContenido] = useState<Contenido | null>(null);

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

        const response = await fetch(
          `/api/estudiantes/get-materia-contenidos?materia_id=${subjectId}`
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
                      {periodo.temas?.map((tema) => (
                        <div
                          key={tema.id}
                          style={{
                            marginBottom: '0.4rem',
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              // Prevenir cualquier propagación del evento
                              e.preventDefault();
                              e.stopPropagation();
                              e.nativeEvent.stopImmediatePropagation();
                              
                              console.log('🖱️ ========== CLICK EN TEMA ==========');
                              console.log('🖱️ Click en tema:', tema.nombre);
                              console.log('🖱️ Tema completo:', tema);
                              console.log('🖱️ Tema ID:', tema.id);
                              console.log('🖱️ Periodo:', periodo.nombre);
                              console.log('🖱️ onTemaSelect existe?', !!onTemaSelect);
                              console.log('🖱️ onTemaSelect tipo:', typeof onTemaSelect);
                              
                              if (!onTemaSelect) {
                                console.error('❌ onTemaSelect no está definido - el callback no se está pasando');
                                return;
                              }
                              
                              if (!tema || !tema.id) {
                                console.error('❌ El tema no tiene la estructura correcta:', tema);
                                return;
                              }
                              
                              console.log('✅ Llamando onTemaSelect con:', {
                                temaId: tema.id,
                                temaNombre: tema.nombre,
                                periodo: periodo.nombre
                              });
                              
                              try {
                                // IMPORTANTE: Crear una copia limpia del tema para asegurar que solo contiene este tema específico
                                // NO incluir otros temas del periodo
                                const temaSeleccionado = {
                                  ...tema,
                                  // Asegurar que solo tenemos los subtemas de este tema, no de otros temas
                                  subtemas: tema.subtemas ? [...tema.subtemas] : []
                                };
                                
                                console.log('✅ Tema seleccionado (limpio):', {
                                  id: temaSeleccionado.id,
                                  nombre: temaSeleccionado.nombre,
                                  subtemasCount: temaSeleccionado.subtemas?.length || 0
                                });
                                
                                // Llamar al callback de forma síncrona con el tema limpio
                                onTemaSelect(temaSeleccionado, periodo.nombre);
                                console.log('✅ onTemaSelect llamado exitosamente con tema:', temaSeleccionado.nombre);
                              } catch (error) {
                                console.error('❌ Error al llamar onTemaSelect:', error);
                              }
                            }}
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: '#111827',
                              marginBottom: '0.15rem',
                              background: 'transparent',
                              border: '1px solid transparent',
                              borderRadius: '6px',
                              padding: '0.4rem 0.6rem',
                              cursor: 'pointer',
                              width: '100%',
                              textAlign: 'left',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f3f4f6';
                              e.currentTarget.style.borderColor = '#e5e7eb';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = 'transparent';
                            }}
                          >
                            {tema.nombre}
                          </button>
                          {tema.subtemas?.map((subtema) => (
                            <div
                              key={subtema.id}
                              style={{
                                marginLeft: '0.5rem',
                                marginBottom: '0.25rem',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                  color: '#374151',
                                }}
                              >
                                {subtema.nombre}
                              </div>
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
                      ))}

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



