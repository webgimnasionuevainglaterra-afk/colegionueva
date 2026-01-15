'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

interface StudentSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSubjectSelect?: (subjectId: string, subjectName: string) => void;
  selectedSubjectId?: string | null;
}

interface Materia {
  id: string;
  nombre: string;
}

interface CursoConMaterias {
  id: string;
  nombre: string;
  nivel: string | null;
  materias: Materia[];
}

export default function StudentSidebar({ isOpen = true, onClose, onSubjectSelect, selectedSubjectId }: StudentSidebarProps) {
  const [courses, setCourses] = useState<CursoConMaterias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No hay sesión activa');
        }

        // Obtener el estudiante actual
        const { data: estudiante, error: estudianteError } = await supabase
          .from('estudiantes')
          .select('id, nombre, apellido')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (estudianteError || !estudiante) {
          throw new Error('No se encontró información del estudiante');
        }

        // Obtener cursos y materias donde está inscrito el estudiante
        const { data: estudiantesCursos, error: cursosError } = await supabase
          .from('estudiantes_cursos')
          .select(`
            cursos (
              id,
              nombre,
              nivel,
              materias (
                id,
                nombre
              )
            )
          `)
          .eq('estudiante_id', estudiante.id);

        if (cursosError) {
          throw new Error(cursosError.message || 'Error al obtener los cursos del estudiante');
        }

        const cursosFormateados: CursoConMaterias[] =
          (estudiantesCursos || [])
            .map((ec: any) => ec.cursos)
            .filter((c: any) => !!c)
            .map((c: any) => ({
              id: c.id,
              nombre: c.nombre,
              nivel: c.nivel ?? null,
              materias: c.materias || [],
            }));

        setCourses(cursosFormateados);
      } catch (err: any) {
        console.error('Error al obtener cursos del estudiante:', err);
        setError(err.message || 'Error al cargar los cursos');
      } finally {
        setLoading(false);
      }
    };

    fetchMyCourses();
  }, []);

  return (
    <>
      {/* Overlay para móvil */}
      {onClose && (
        <div
          onClick={onClose}
          className={`teacher-sidebar-overlay ${isOpen ? 'show' : ''}`}
        />
      )}
      <div className={`teacher-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            background: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#1f2937',
                margin: 0,
                marginBottom: '0.5rem',
              }}
            >
              Mi Curso
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: 0,
              }}
            >
              {courses.length === 0
                ? 'Sin curso asignado'
                : `${courses.length} curso${courses.length !== 1 ? 's' : ''} inscrito${courses.length !== 1 ? 's' : ''}`}
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

        {/* Lista de cursos y materias */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
          }}
        >
          {loading ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6b7280',
              }}
            >
              Cargando cursos...
            </div>
          ) : error ? (
            <div
              style={{
                padding: '1rem',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          ) : courses.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6b7280',
              }}
            >
              Aún no tienes cursos asignados.
            </div>
          ) : (
            courses.map((course) => (
              <div
                key={course.id}
                style={{
                  marginBottom: '1rem',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
                }}
              >
                <div
                  style={{
                    padding: '0.875rem 1rem',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: '#111827',
                    }}
                  >
                    {course.nombre}
                  </div>
                  {course.nivel && (
                    <div
                      style={{
                        marginTop: '0.25rem',
                        fontSize: '0.75rem',
                        color: '#6b7280',
                      }}
                    >
                      {course.nivel}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    padding: '0.75rem 1rem 0.75rem 1.25rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Materias del curso
                  </div>
                  {course.materias && course.materias.length > 0 ? (
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
                      {course.materias.map((materia) => {
                        const isSelected = selectedSubjectId === materia.id;
                        return (
                        <li
                          key={materia.id}
                          style={{
                            fontSize: '0.85rem',
                            color: isSelected ? '#1d4ed8' : '#111827',
                            padding: '0.35rem 0.5rem',
                            borderRadius: '6px',
                            backgroundColor: isSelected ? '#e0edff' : '#f9fafb',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            if (onSubjectSelect) {
                              onSubjectSelect(materia.id, materia.nombre);
                            }
                          }}
                        >
                          {materia.nombre}
                        </li>
                      );})}
                    </ul>
                  ) : (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#9ca3af',
                      }}
                    >
                      Aún no hay materias asociadas a este curso.
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}


