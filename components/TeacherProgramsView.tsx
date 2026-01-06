'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import CourseSubjectsManager from './CourseSubjectsManager';
import '../app/css/courses-list.css';

interface Course {
  id: string;
  nombre: string;
  nivel: string;
  materias: any[];
}

export default function TeacherProgramsView() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managingSubjects, setManagingSubjects] = useState<Course | null>(null);

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch('/api/teachers/get-my-courses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
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
    fetchMyCourses();
  }, []);

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
          <p>Cargando cursos asignados...</p>
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
          <button onClick={fetchMyCourses} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (managingSubjects) {
    return (
      <CourseSubjectsManager
        courseId={managingSubjects.id}
        courseName={managingSubjects.nombre}
        onClose={() => setManagingSubjects(null)}
      />
    );
  }

  return (
    <div className="courses-list-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>Mis Cursos Asignados</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Gestiona el contenido de las materias en tus cursos asignados
        </p>
      </div>

      <div className="courses-table-wrapper">
        <table className="courses-table">
          <thead>
            <tr>
              <th>Nombre del Curso</th>
              <th>Nivel</th>
              <th>Materias</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-state">
                  <div className="empty-state-content">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p>No tienes cursos asignados</p>
                    <span>Contacta al administrador para que te asigne cursos</span>
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
                    <span style={{ color: '#6b7280' }}>
                      {course.materias?.length || 0} materia{course.materias?.length !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn edit-btn"
                        title="Gestionar Materias"
                        onClick={() => setManagingSubjects(course)}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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
    </div>
  );
}

