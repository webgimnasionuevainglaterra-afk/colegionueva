'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import Image from 'next/image';
import '../app/css/teacher-sidebar.css';

interface Course {
  id: string;
  nombre: string;
  nivel: string;
  materias: any[];
}

interface EstudianteConCurso {
  estudiante: {
    id: string;
    nombre: string;
    apellido: string;
    foto_url: string | null;
    is_active: boolean;
    is_online?: boolean;
  };
  curso: {
    id: string;
    nombre: string;
    nivel: string;
  };
}

interface TeacherSidebarProps {
  onStudentClick: (studentId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function TeacherSidebar({ onStudentClick, isOpen = true, onClose }: TeacherSidebarProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<EstudianteConCurso[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  const fetchMyCourses = async () => {
    try {
      setLoadingCourses(true);
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar los cursos');
      }

      setCourses(result.data || []);
    } catch (err: any) {
      console.error('Error al obtener cursos:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchStudentsByCourse = async (courseId: string) => {
    try {
      setLoadingStudents(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch('/api/teachers/get-my-students', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar los estudiantes');
      }

      // Filtrar estudiantes por curso seleccionado
      const filteredStudents = (result.data || []).filter(
        (item: EstudianteConCurso) => item.curso.id === courseId
      );

      setStudents(filteredStudents);
    } catch (err: any) {
      console.error('Error al obtener estudiantes:', err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const handleCourseClick = (courseId: string) => {
    if (expandedCourses.has(courseId)) {
      // Colapsar
      const newExpanded = new Set(expandedCourses);
      newExpanded.delete(courseId);
      setExpandedCourses(newExpanded);
      if (selectedCourse === courseId) {
        setSelectedCourse(null);
        setStudents([]);
      }
    } else {
      // Expandir
      const newExpanded = new Set(expandedCourses);
      newExpanded.add(courseId);
      setExpandedCourses(newExpanded);
      setSelectedCourse(courseId);
      fetchStudentsByCourse(courseId);
    }
  };

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
      {/* Header del Sidebar */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid #e5e7eb',
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#1f2937',
            margin: 0,
            marginBottom: '0.5rem',
          }}>
            Mis Cursos
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: 0,
          }}>
            {courses.length} curso{courses.length !== 1 ? 's' : ''} asignado{courses.length !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Botón cerrar para móvil */}
        {onClose && (
          <button
            onClick={onClose}
            className="teacher-sidebar-close-btn"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Lista de Cursos */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.5rem',
      }}>
        {loadingCourses ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#6b7280',
          }}>
            <p>Cargando cursos...</p>
          </div>
        ) : courses.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#6b7280',
          }}>
            <p>No tienes cursos asignados</p>
          </div>
        ) : (
          courses.map((course) => {
            const isExpanded = expandedCourses.has(course.id);
            const courseStudents = students.filter(s => s.curso.id === course.id);

            return (
              <div key={course.id} style={{ marginBottom: '0.5rem' }}>
                {/* Botón del Curso */}
                <button
                  onClick={() => handleCourseClick(course.id)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: selectedCourse === course.id ? '#eff6ff' : 'white',
                    border: `1px solid ${selectedCourse === course.id ? '#3b82f6' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCourse !== course.id) {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCourse !== course.id) {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      color: '#1f2937',
                      fontSize: '0.95rem',
                      marginBottom: '0.25rem',
                    }}>
                      {course.nombre}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                    }}>
                      {course.nivel}
                    </div>
                  </div>
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{
                      width: '20px',
                      height: '20px',
                      color: '#6b7280',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Lista de Estudiantes del Curso */}
                {isExpanded && (
                  <div style={{
                    marginTop: '0.5rem',
                    marginLeft: '1rem',
                    paddingLeft: '1rem',
                    borderLeft: '2px solid #e5e7eb',
                  }}>
                    {loadingStudents && selectedCourse === course.id ? (
                      <div style={{
                        padding: '1rem',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                      }}>
                        Cargando estudiantes...
                      </div>
                    ) : courseStudents.length === 0 ? (
                      <div style={{
                        padding: '1rem',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                      }}>
                        Sin estudiantes
                      </div>
                    ) : (
                      courseStudents.map((item) => (
                        <div
                          key={item.estudiante.id}
                          onClick={() => onStudentClick(item.estudiante.id)}
                          style={{
                            padding: '0.5rem',
                            marginBottom: '0.25rem',
                            background: 'white',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f3f4f6';
                            e.currentTarget.style.borderColor = '#d1d5db';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                        >
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            {item.estudiante.foto_url ? (
                              <Image
                                src={item.estudiante.foto_url}
                                alt={`${item.estudiante.nombre} ${item.estudiante.apellido}`}
                                width={32}
                                height={32}
                                style={{
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                }}
                                unoptimized
                              />
                            ) : (
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: '#e5e7eb',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#6b7280',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                }}
                              >
                                {item.estudiante.nombre.charAt(0)}
                                {item.estudiante.apellido.charAt(0)}
                              </div>
                            )}
                            {/* Indicador de estado online */}
                            <span 
                              className={`online-status-indicator ${item.estudiante.is_online ? 'online' : 'offline'}`}
                              title={item.estudiante.is_online ? 'En línea' : 'Desconectado'}
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                border: '2px solid white',
                                zIndex: 10,
                                background: item.estudiante.is_online ? '#10b981' : '#ef4444',
                                boxShadow: item.estudiante.is_online 
                                  ? '0 0 0 1px white, 0 0 3px rgba(16, 185, 129, 0.5)' 
                                  : '0 0 0 1px white, 0 0 3px rgba(239, 68, 68, 0.5)',
                              }}
                            ></span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              color: '#1f2937',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}>
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.estudiante.nombre} {item.estudiante.apellido}
                              </span>
                              {/* Icono de mensaje - funcionalidad pendiente */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Funcionalidad de mensaje pendiente
                                }}
                                style={{
                                  padding: '0.25rem',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#6b7280',
                                  transition: 'all 0.2s',
                                  flexShrink: 0,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#2563eb';
                                  e.currentTarget.style.background = '#eff6ff';
                                  e.currentTarget.style.borderRadius = '4px';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#6b7280';
                                  e.currentTarget.style.background = 'transparent';
                                }}
                                title="Enviar mensaje"
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      </div>
    </>
  );
}

