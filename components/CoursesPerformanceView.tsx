'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import '../app/css/admin-dashboard.css';

interface EstadisticasMateria {
  totalQuizzes: number;
  totalEvaluaciones: number;
  promedioQuizzes: number;
  promedioEvaluaciones: number;
  promedioGeneral: number;
  estudiantesActivos: number;
  totalEstudiantes: number;
  participacion: number;
}

interface Materia {
  id: string;
  nombre: string;
  estadisticas: EstadisticasMateria;
}

interface EstadisticasCurso {
  promedioGeneral: number;
  totalEstudiantes: number;
  totalMaterias: number;
}

interface Curso {
  id: string;
  nombre: string;
  nivel: string;
  materias: Materia[];
  estadisticas: EstadisticasCurso;
}

export default function CoursesPerformanceView() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCursos, setExpandedCursos] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
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

      const response = await fetch('/api/admin/get-courses-performance', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Error al cargar el rendimiento');
      }

      const result = await response.json();
      if (result.success) {
        setCursos(result.data || []);
        // Expandir el primer curso por defecto
        if (result.data && result.data.length > 0) {
          setExpandedCursos(new Set([result.data[0].id]));
        }
      }
    } catch (err: any) {
      console.error('Error al obtener rendimiento:', err);
      setError(err.message || 'Error al cargar el rendimiento');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (cursoId: string) => {
    const newExpanded = new Set(expandedCursos);
    if (newExpanded.has(cursoId)) {
      newExpanded.delete(cursoId);
    } else {
      newExpanded.add(cursoId);
    }
    setExpandedCursos(newExpanded);
  };

  const getColorByScore = (score: number) => {
    if (score >= 4) return { bg: '#d1fae5', text: '#065f46', label: 'Excelente' };
    if (score >= 3) return { bg: '#fef3c7', text: '#92400e', label: 'Bueno' };
    if (score >= 2) return { bg: '#fed7aa', text: '#9a3412', label: 'Regular' };
    return { bg: '#fee2e2', text: '#991b1b', label: 'Bajo' };
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Cargando rendimiento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>Error: {error}</p>
        <button onClick={fetchPerformance} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1f2937' }}>
        Rendimiento por Curso y Materia
      </h2>

      {cursos.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          <p>No hay cursos con datos de rendimiento</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cursos.map((curso) => {
            const cursoColor = getColorByScore(curso.estadisticas.promedioGeneral);
            const isExpanded = expandedCursos.has(curso.id);

            return (
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
                  onClick={() => toggleExpand(curso.id)}
                  style={{
                    padding: '1rem 1.5rem',
                    background: isExpanded ? '#f3f4f6' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <svg
                      style={{
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
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
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
                        📚 {curso.nombre}
                      </h3>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                        Nivel: {curso.nivel} • {curso.estadisticas.totalMaterias} materia{curso.estadisticas.totalMaterias !== 1 ? 's' : ''} • {curso.estadisticas.totalEstudiantes} estudiante{curso.estadisticas.totalEstudiantes !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div
                      style={{
                        padding: '0.5rem 1rem',
                        background: cursoColor.bg,
                        color: cursoColor.text,
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      Promedio: {curso.estadisticas.promedioGeneral > 0 ? curso.estadisticas.promedioGeneral.toFixed(2) : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Materias */}
                {isExpanded && curso.materias && curso.materias.length > 0 && (
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {curso.materias.map((materia) => {
                        const materiaColor = getColorByScore(materia.estadisticas.promedioGeneral);

                        return (
                          <div
                            key={materia.id}
                            style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '1rem',
                              background: 'white',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>
                                📖 {materia.nombre}
                              </h4>
                              <div
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: materiaColor.bg,
                                  color: materiaColor.text,
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                  fontSize: '0.875rem',
                                }}
                              >
                                {materia.estadisticas.promedioGeneral > 0 ? materia.estadisticas.promedioGeneral.toFixed(2) : 'N/A'}
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                              <div style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '6px' }}>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Quizzes</p>
                                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>
                                  {materia.estadisticas.totalQuizzes}
                                </p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                                  Promedio: {materia.estadisticas.promedioQuizzes > 0 ? materia.estadisticas.promedioQuizzes.toFixed(2) : 'N/A'}
                                </p>
                              </div>

                              <div style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '6px' }}>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Evaluaciones</p>
                                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>
                                  {materia.estadisticas.totalEvaluaciones}
                                </p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                                  Promedio: {materia.estadisticas.promedioEvaluaciones > 0 ? materia.estadisticas.promedioEvaluaciones.toFixed(2) : 'N/A'}
                                </p>
                              </div>

                              <div style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '6px' }}>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Participación</p>
                                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>
                                  {materia.estadisticas.participacion.toFixed(1)}%
                                </p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                                  {materia.estadisticas.estudiantesActivos} de {materia.estadisticas.totalEstudiantes} estudiantes
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


