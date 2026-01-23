'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import '../app/css/admin-dashboard.css';

interface Curso {
  id: string;
  nombre: string;
  nivel: string;
  materias?: Materia[];
}

interface Materia {
  id: string;
  nombre: string;
  descripcion?: string;
  curso_id: string;
  periodos?: Periodo[];
}

interface Periodo {
  id: string;
  nombre: string;
  numero_periodo: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  temas?: Tema[];
}

interface Tema {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  subtemas?: Subtema[];
}

interface Subtema {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  contenido?: Contenido[];
}

interface Contenido {
  id: string;
  tipo: 'video' | 'archivo' | 'foro';
  titulo: string;
  descripcion?: string;
  url?: string;
  archivo_url?: string;
  orden: number;
}

export default function ContentStructureManager() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStructure();
  }, []);

  const fetchStructure = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      };

      // Obtener todos los cursos con su estructura completa
      const response = await fetch('/api/admin/get-content-structure', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Error al cargar la estructura de contenidos');
      }

      const result = await response.json();
      if (result.success) {
        setCursos(result.data || []);
        // Expandir el primer curso por defecto
        if (result.data && result.data.length > 0) {
          setExpandedItems(new Set([result.data[0].id]));
        }
      }
    } catch (err: any) {
      console.error('Error al obtener estructura:', err);
      setError(err.message || 'Error al cargar la estructura');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const isExpanded = (id: string) => expandedItems.has(id);

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <div className="dashboard-loading">
          <p>Cargando estructura de contenidos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-container">
        <div className="dashboard-error">
          <p>Error: {error}</p>
          <button onClick={fetchStructure}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <div className="dashboard-header-section">
        <h1 className="dashboard-title">Gestionar Contenidos</h1>
        <p className="dashboard-subtitle">Estructura completa de cursos, materias, periodos, temas y subtemas</p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        {cursos.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            <p>No hay cursos creados aún</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cursos.map((curso) => (
              <div
                key={curso.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: 'white',
                }}
              >
                {/* Curso Header */}
                <div
                  onClick={() => toggleExpand(`curso-${curso.id}`)}
                  style={{
                    padding: '1rem 1.5rem',
                    background: isExpanded(`curso-${curso.id}`) ? '#f3f4f6' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: isExpanded(`curso-${curso.id}`) ? '1px solid #e5e7eb' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <svg
                      style={{
                        transform: isExpanded(`curso-${curso.id}`) ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        width: '20px',
                        height: '20px',
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
                        📚 {curso.nombre}
                      </h3>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                        Nivel: {curso.nivel}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {curso.materias?.length || 0} materia{curso.materias?.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Materias */}
                {isExpanded(`curso-${curso.id}`) && curso.materias && curso.materias.length > 0 && (
                  <div style={{ padding: '0.5rem' }}>
                    {curso.materias.map((materia) => (
                      <div
                        key={materia.id}
                        style={{
                          marginBottom: '0.5rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          background: 'white',
                        }}
                      >
                        {/* Materia Header */}
                        <div
                          onClick={() => toggleExpand(`materia-${materia.id}`)}
                          style={{
                            padding: '0.75rem 1rem',
                            background: isExpanded(`materia-${materia.id}`) ? '#f9fafb' : 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginLeft: '1rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <svg
                              style={{
                                transform: isExpanded(`materia-${materia.id}`) ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                                width: '16px',
                                height: '16px',
                              }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>
                                📖 {materia.nombre}
                              </h4>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {materia.periodos?.length || 0} periodo{materia.periodos?.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Periodos */}
                        {isExpanded(`materia-${materia.id}`) && materia.periodos && materia.periodos.length > 0 && (
                          <div style={{ padding: '0.5rem', marginLeft: '1rem' }}>
                            {materia.periodos.map((periodo) => (
                              <div
                                key={periodo.id}
                                style={{
                                  marginBottom: '0.5rem',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  background: 'white',
                                }}
                              >
                                {/* Periodo Header */}
                                <div
                                  onClick={() => toggleExpand(`periodo-${periodo.id}`)}
                                  style={{
                                    padding: '0.75rem 1rem',
                                    background: isExpanded(`periodo-${periodo.id}`) ? '#f9fafb' : 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginLeft: '1rem',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <svg
                                      style={{
                                        transform: isExpanded(`periodo-${periodo.id}`) ? 'rotate(90deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s',
                                        width: '16px',
                                        height: '16px',
                                      }}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    <div>
                                      <h5 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#1f2937' }}>
                                        📅 {periodo.nombre}
                                      </h5>
                                    </div>
                                  </div>
                                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                    {periodo.temas?.length || 0} tema{periodo.temas?.length !== 1 ? 's' : ''}
                                  </span>
                                </div>

                                {/* Temas */}
                                {isExpanded(`periodo-${periodo.id}`) && periodo.temas && periodo.temas.length > 0 && (
                                  <div style={{ padding: '0.5rem', marginLeft: '1rem' }}>
                                    {periodo.temas
                                      .sort((a, b) => a.orden - b.orden)
                                      .map((tema) => (
                                        <div
                                          key={tema.id}
                                          style={{
                                            marginBottom: '0.5rem',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '6px',
                                            overflow: 'hidden',
                                            background: 'white',
                                          }}
                                        >
                                          {/* Tema Header */}
                                          <div
                                            onClick={() => toggleExpand(`tema-${tema.id}`)}
                                            style={{
                                              padding: '0.75rem 1rem',
                                              background: isExpanded(`tema-${tema.id}`) ? '#f9fafb' : 'white',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              marginLeft: '1rem',
                                            }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                              <svg
                                                style={{
                                                  transform: isExpanded(`tema-${tema.id}`) ? 'rotate(90deg)' : 'rotate(0deg)',
                                                  transition: 'transform 0.2s',
                                                  width: '16px',
                                                  height: '16px',
                                                }}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                              </svg>
                                              <div>
                                                <h6 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>
                                                  📌 {tema.nombre}
                                                </h6>
                                              </div>
                                            </div>
                                            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                              {tema.subtemas?.length || 0} subtema{tema.subtemas?.length !== 1 ? 's' : ''}
                                            </span>
                                          </div>

                                          {/* Subtemas */}
                                          {isExpanded(`tema-${tema.id}`) && tema.subtemas && tema.subtemas.length > 0 && (
                                            <div style={{ padding: '0.5rem', marginLeft: '1rem' }}>
                                              {tema.subtemas
                                                .sort((a, b) => a.orden - b.orden)
                                                .map((subtema) => (
                                                  <div
                                                    key={subtema.id}
                                                    style={{
                                                      marginBottom: '0.5rem',
                                                      border: '1px solid #e5e7eb',
                                                      borderRadius: '6px',
                                                      overflow: 'hidden',
                                                      background: 'white',
                                                    }}
                                                  >
                                                    {/* Subtema Header */}
                                                    <div
                                                      onClick={() => toggleExpand(`subtema-${subtema.id}`)}
                                                      style={{
                                                        padding: '0.5rem 0.75rem',
                                                        background: isExpanded(`subtema-${subtema.id}`) ? '#f9fafb' : 'white',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        marginLeft: '1rem',
                                                      }}
                                                    >
                                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <svg
                                                          style={{
                                                            transform: isExpanded(`subtema-${subtema.id}`) ? 'rotate(90deg)' : 'rotate(0deg)',
                                                            transition: 'transform 0.2s',
                                                            width: '14px',
                                                            height: '14px',
                                                          }}
                                                          fill="none"
                                                          stroke="currentColor"
                                                          viewBox="0 0 24 24"
                                                        >
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                        <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
                                                          📄 {subtema.nombre}
                                                        </span>
                                                      </div>
                                                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                        {subtema.contenido?.length || 0} contenido{subtema.contenido?.length !== 1 ? 's' : ''}
                                                      </span>
                                                    </div>

                                                    {/* Contenido del Subtema */}
                                                    {isExpanded(`subtema-${subtema.id}`) && subtema.contenido && subtema.contenido.length > 0 && (
                                                      <div style={{ padding: '0.5rem', marginLeft: '1rem' }}>
                                                        {subtema.contenido
                                                          .sort((a, b) => a.orden - b.orden)
                                                          .map((item) => (
                                                            <div
                                                              key={item.id}
                                                              style={{
                                                                padding: '0.5rem 0.75rem',
                                                                marginBottom: '0.25rem',
                                                                background: '#f9fafb',
                                                                borderRadius: '4px',
                                                                marginLeft: '1rem',
                                                                fontSize: '0.8125rem',
                                                                borderLeft: `3px solid ${
                                                                  item.tipo === 'video' ? '#3b82f6' :
                                                                  item.tipo === 'archivo' ? '#10b981' :
                                                                  '#f59e0b'
                                                                }`,
                                                              }}
                                                            >
                                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                                <span>
                                                                  {item.tipo === 'video' && '🎥'}
                                                                  {item.tipo === 'archivo' && '📄'}
                                                                  {item.tipo === 'foro' && '💬'}
                                                                </span>
                                                                <span style={{ fontWeight: 600, color: '#1f2937' }}>{item.titulo}</span>
                                                                <span
                                                                  style={{
                                                                    fontSize: '0.75rem',
                                                                    padding: '0.125rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    background:
                                                                      item.tipo === 'video' ? '#dbeafe' :
                                                                      item.tipo === 'archivo' ? '#d1fae5' :
                                                                      '#fef3c7',
                                                                    color:
                                                                      item.tipo === 'video' ? '#1e40af' :
                                                                      item.tipo === 'archivo' ? '#065f46' :
                                                                      '#92400e',
                                                                    fontWeight: 500,
                                                                  }}
                                                                >
                                                                  {item.tipo}
                                                                </span>
                                                              </div>
                                                              {item.descripcion && (
                                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>
                                                                  {item.descripcion}
                                                                </p>
                                                              )}
                                                              {item.url && (
                                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#3b82f6' }}>
                                                                  🔗 {item.url.length > 50 ? `${item.url.substring(0, 50)}...` : item.url}
                                                                </p>
                                                              )}
                                                              {item.archivo_url && (
                                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#10b981' }}>
                                                                  📎 {Array.isArray(JSON.parse(item.archivo_url)) 
                                                                    ? `${JSON.parse(item.archivo_url).length} archivo(s)`
                                                                    : '1 archivo'}
                                                                </p>
                                                              )}
                                                            </div>
                                                          ))}
                                                      </div>
                                                    )}
                                                    {isExpanded(`subtema-${subtema.id}`) && (!subtema.contenido || subtema.contenido.length === 0) && (
                                                      <div style={{ padding: '0.5rem', marginLeft: '2rem', fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>
                                                        No hay contenido en este subtema
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

