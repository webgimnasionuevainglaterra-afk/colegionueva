'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase-client';

interface CalificacionQuiz {
  id: string;
  nombre: string;
  calificacion: number;
  fecha_fin: string;
  tipo: 'quiz';
}

interface CalificacionEvaluacion {
  id: string;
  nombre: string;
  calificacion: number;
  fecha_fin: string;
  tipo: 'evaluacion';
}

interface CalificacionesMateria {
  materia_id: string;
  materia_nombre: string;
  quizzes: CalificacionQuiz[];
  evaluaciones: CalificacionEvaluacion[];
  promedio: number; // Nota final ponderada (70% quices, 30% evaluaciones)
}

export default function StudentGradesView() {
  const { user } = useAuth();
  const [calificaciones, setCalificaciones] = useState<CalificacionesMateria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCalificaciones = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No hay sesión activa');
        }

        const response = await fetch(
          `/api/estudiantes/get-calificaciones?estudiante_id=${user.id}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error al cargar las calificaciones');
        }

        setCalificaciones(result.data || []);
      } catch (err: any) {
        console.error('Error al cargar calificaciones:', err);
        setError(err.message || 'Error al cargar las calificaciones');
      } finally {
        setLoading(false);
      }
    };

    fetchCalificaciones();
  }, [user?.id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const getColorByCalificacion = (calificacion: number) => {
    if (calificacion >= 3.7) return '#10b981'; // Verde (aprueba)
    if (calificacion >= 3.0) return '#f59e0b'; // Amarillo (en riesgo)
    return '#ef4444'; // Rojo (reprueba)
  };

  const calcularPromedioQuizzes = (materia: CalificacionesMateria) => {
    if (materia.quizzes.length === 0) return 0;
    const suma = materia.quizzes.reduce((acc, q) => acc + q.calificacion, 0);
    return suma / materia.quizzes.length;
  };

  const calcularPromedioEvaluaciones = (materia: CalificacionesMateria) => {
    if (materia.evaluaciones.length === 0) return 0;
    const suma = materia.evaluaciones.reduce((acc, e) => acc + e.calificacion, 0);
    return suma / materia.evaluaciones.length;
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Cargando calificaciones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>{error}</p>
      </div>
    );
  }

  if (calificaciones.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>
          Aún no tienes calificaciones registradas.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '1.5rem',
        }}
      >
        Mis Calificaciones
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {calificaciones.map((materia) => {
          const promedioQuizzes = calcularPromedioQuizzes(materia);
          const promedioEvaluaciones = calcularPromedioEvaluaciones(materia);

          return (
          <div
            key={materia.materia_id}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
            }}
          >
            {/* Header de la materia */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #e5e7eb',
              }}
            >
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#111827',
                  margin: 0,
                }}
              >
                {materia.materia_nombre}
              </h3>
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      fontWeight: 500,
                    }}
                  >
                    Nota final:
                  </span>
                  <span
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: getColorByCalificacion(materia.promedio),
                    }}
                  >
                    {materia.promedio.toFixed(2)} / 5.0
                  </span>
                </div>
                <div
                  style={{
                    marginTop: '0.25rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                  }}
                >
                  Prom. quices ({'70%'}): <strong>{promedioQuizzes.toFixed(2)}</strong> &nbsp;|&nbsp;
                  Prom. evaluaciones ({'30%'}): <strong>{promedioEvaluaciones.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Quizzes */}
            {materia.quizzes.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '0.75rem',
                  }}
                >
                  Quizzes
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {materia.quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        background: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#111827',
                            margin: 0,
                            marginBottom: '0.25rem',
                          }}
                        >
                          {quiz.nombre}
                        </p>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            margin: 0,
                          }}
                        >
                          {formatDate(quiz.fecha_fin)}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: getColorByCalificacion(quiz.calificacion),
                          minWidth: '60px',
                          textAlign: 'right',
                        }}
                      >
                        {quiz.calificacion.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evaluaciones */}
            {materia.evaluaciones.length > 0 && (
              <div>
                <h4
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '0.75rem',
                  }}
                >
                  Evaluaciones
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {materia.evaluaciones.map((evaluacion) => (
                    <div
                      key={evaluacion.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        background: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#111827',
                            margin: 0,
                            marginBottom: '0.25rem',
                          }}
                        >
                          {evaluacion.nombre}
                        </p>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            margin: 0,
                          }}
                        >
                          {formatDate(evaluacion.fecha_fin)}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: getColorByCalificacion(evaluacion.calificacion),
                          minWidth: '60px',
                          textAlign: 'right',
                        }}
                      >
                        {evaluacion.calificacion.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensaje si no hay calificaciones en esta materia */}
            {materia.quizzes.length === 0 && materia.evaluaciones.length === 0 && (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: '1rem',
                }}
              >
                Aún no tienes calificaciones en esta materia.
              </p>
            )}
          </div>
        );})}
      </div>
    </div>
  );
}


