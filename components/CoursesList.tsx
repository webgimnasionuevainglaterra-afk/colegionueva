'use client';

import { useEffect, useState } from 'react';
import EditCourseForm from './EditCourseForm';
import CourseSubjectsManager from './CourseSubjectsManager';
import '../app/css/courses-list.css';

interface Course {
  id: string;
  nombre: string;
  nivel: string;
  created_at: string;
  updated_at: string;
}

interface CoursesListProps {
  refreshKey?: number;
}

export default function CoursesList({ refreshKey = 0 }: CoursesListProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [managingSubjects, setManagingSubjects] = useState<Course | null>(null);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/courses/get-courses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar los cursos');
      }

      setCourses(result.data || []);
    } catch (err: any) {
      console.error('Error al obtener cursos:', err);
      setError(err.message || 'Error al cargar los cursos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [refreshKey]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNivelBadgeClass = (nivel: string) => {
    switch (nivel) {
      case 'Primaria':
        return 'badge-primary';
      case 'Bachillerato':
        return 'badge-secondary';
      case 'Técnico':
        return 'badge-success';
      case 'Profesional':
        return 'badge-info';
      default:
        return 'badge-default';
    }
  };

  if (loading) {
    return (
      <div className="courses-list-container">
        <div className="loading-state">
          <p>Cargando cursos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="courses-list-container">
        <div className="error-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="courses-list-container">
      <div className="courses-table-wrapper">
        <table className="courses-table">
          <thead>
            <tr>
              <th>Nombre del Curso</th>
              <th>Nivel</th>
              <th>Fecha de Creación</th>
              <th>Última Actualización</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  <div className="empty-state-content">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p>No hay cursos creados aún</p>
                    <span>Crea tu primer curso usando el botón "Crear Curso"</span>
                  </div>
                </td>
              </tr>
            ) : (
              courses.map((course) => (
                <tr key={course.id}>
                  <td>
                    <div className="course-name">
                      <strong>{course.nombre}</strong>
                    </div>
                  </td>
                  <td>
                    <span className={`nivel-badge ${getNivelBadgeClass(course.nivel)}`}>
                      {course.nivel}
                    </span>
                  </td>
                  <td>
                    <span className="date-text">{formatDate(course.created_at)}</span>
                  </td>
                  <td>
                    <span className="date-text">{formatDate(course.updated_at)}</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn subjects-btn"
                        title="Gestionar materias"
                        onClick={() => {
                          setManagingSubjects(course);
                        }}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </button>
                      <button
                        className="action-btn edit-btn"
                        title="Editar curso"
                        onClick={() => {
                          setEditingCourse(course);
                        }}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        className="action-btn delete-btn"
                        title="Eliminar curso"
                        disabled={loading}
                        onClick={async () => {
                          if (confirm(`¿Estás seguro de que deseas eliminar el curso "${course.nombre}"?`)) {
                            try {
                              setLoading(true);
                              const response = await fetch(`/api/courses/delete-course?id=${course.id}`, {
                                method: 'DELETE',
                              });

                              if (response.ok) {
                                await fetchCourses();
                              } else {
                                const result = await response.json();
                                alert(result.error || 'Error al eliminar el curso');
                                setLoading(false);
                              }
                            } catch (err) {
                              console.error('Error al eliminar curso:', err);
                              alert('Error al eliminar el curso');
                              setLoading(false);
                            }
                          }
                        }}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {editingCourse && (
        <EditCourseForm
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onCourseUpdated={() => {
            setEditingCourse(null);
            fetchCourses();
          }}
        />
      )}

      {managingSubjects && (
        <CourseSubjectsManager
          courseId={managingSubjects.id}
          courseName={managingSubjects.nombre}
          onClose={() => setManagingSubjects(null)}
        />
      )}
    </div>
  );
}

