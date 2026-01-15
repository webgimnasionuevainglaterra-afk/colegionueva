'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import '../app/css/teacher-sidebar.css';

interface Quiz {
  id: string;
  nombre: string;
  descripcion: string;
  subtema_id: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

interface Evaluacion {
  id: string;
  nombre: string;
  descripcion: string;
  periodo_id: string;
  materia_id: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

interface Periodo {
  id: string;
  nombre: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  quizzes: Quiz[];
  evaluaciones: Evaluacion[];
}

interface Materia {
  id: string;
  nombre: string;
  curso_id: string;
  periodos: Periodo[];
  quizzes: Quiz[];
  evaluaciones: Evaluacion[];
}

interface Curso {
  id: string;
  nombre: string;
  nivel: string;
}

interface CursoData {
  curso: Curso;
  materias: Materia[];
}

interface TeacherRightSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function TeacherRightSidebar({ isOpen = true, onClose }: TeacherRightSidebarProps) {
  const [cursosData, setCursosData] = useState<CursoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCursos, setExpandedCursos] = useState<Set<string>>(new Set());
  const [expandedMaterias, setExpandedMaterias] = useState<Set<string>>(new Set());
  const [expandedPeriodos, setExpandedPeriodos] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchQuizzesEvaluaciones();
  }, []);

  // Función para mostrar notificaciones
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const fetchQuizzesEvaluaciones = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch('/api/teachers/get-quizzes-evaluaciones', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar los quizzes y evaluaciones');
      }

      const data = result.data || [];
      console.log('📊 Datos recibidos de la API (Quizzes y Evaluaciones):', JSON.stringify(data, null, 2));
      setCursosData(data);
    } catch (err: any) {
      console.error('Error al obtener quizzes y evaluaciones:', err);
      setError(err.message || 'Error al cargar los quizzes y evaluaciones');
    } finally {
      setLoading(false);
    }
  };

  const toggleCurso = (cursoId: string) => {
    const newExpanded = new Set(expandedCursos);
    if (newExpanded.has(cursoId)) {
      newExpanded.delete(cursoId);
    } else {
      newExpanded.add(cursoId);
    }
    setExpandedCursos(newExpanded);
  };

  const toggleMateria = (materiaId: string) => {
    const newExpanded = new Set(expandedMaterias);
    if (newExpanded.has(materiaId)) {
      newExpanded.delete(materiaId);
    } else {
      newExpanded.add(materiaId);
    }
    setExpandedMaterias(newExpanded);
  };

  const togglePeriodo = (periodoId: string) => {
    const newExpanded = new Set(expandedPeriodos);
    if (newExpanded.has(periodoId)) {
      newExpanded.delete(periodoId);
    } else {
      newExpanded.add(periodoId);
    }
    setExpandedPeriodos(newExpanded);
  };

  const downloadEvaluacionPDF = async (evaluacionId: string, nombre: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('No hay sesión activa');
        return;
      }

      const response = await fetch(`/api/evaluaciones/download-pdf?evaluacion_id=${evaluacionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'text/html',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al generar el PDF');
      }

      // Obtener el HTML directamente
      const htmlContent = await response.text();

      // Crear una ventana nueva con el HTML y usar window.print() para generar PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Esperar a que se cargue el contenido y luego imprimir
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }
    } catch (error: any) {
      console.error('Error al descargar PDF:', error);
      alert('Error al generar el PDF: ' + (error.message || 'Error desconocido'));
    }
  };

  const downloadQuizPDF = async (quizId: string, nombre: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('No hay sesión activa');
        return;
      }

      const response = await fetch(`/api/quizzes/download-pdf?quiz_id=${quizId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'text/html',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al generar el PDF');
      }

      // Obtener el HTML directamente
      const htmlContent = await response.text();

      // Crear una ventana nueva con el HTML y usar window.print() para generar PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Esperar a que se cargue el contenido y luego imprimir
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }
    } catch (error: any) {
      console.error('Error al descargar PDF del quiz:', error);
      alert('Error al generar el PDF: ' + (error.message || 'Error desconocido'));
    }
  };

  if (loading) {
    return (
      <div className={`teacher-right-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          background: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#1f2937',
            margin: 0,
          }}>Quizzes y Evaluaciones</h3>
          {onClose && (
            <button onClick={onClose} className="teacher-sidebar-close-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="sidebar-content" style={{
          padding: '1.5rem',
          flex: 1,
          overflowY: 'auto',
        }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`teacher-right-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          background: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#1f2937',
            margin: 0,
          }}>Quizzes y Evaluaciones</h3>
          {onClose && (
            <button onClick={onClose} className="teacher-sidebar-close-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="sidebar-content" style={{
          padding: '1.5rem',
          flex: 1,
          overflowY: 'auto',
        }}>
          <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0 }}>{error}</p>
          <button onClick={fetchQuizzesEvaluaciones} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {isOpen && onClose && (
        <div
          onClick={onClose}
          className={`teacher-sidebar-overlay ${isOpen ? 'show' : ''}`}
        />
      )}
      <div className={`teacher-right-sidebar ${isOpen ? 'open' : ''}`}>
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
              Quizzes y Evaluaciones
            </h2>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: 0,
            }}>
              {cursosData.length} curso{cursosData.length !== 1 ? 's' : ''} asignado{cursosData.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={fetchQuizzesEvaluaciones}
              disabled={loading}
              style={{
                padding: '0.5rem',
                background: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: '#6b7280',
                transition: 'all 0.2s',
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }
              }}
              title="Actualizar"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
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
        </div>

        {/* Lista de Cursos */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.5rem',
        }}>
          {cursosData.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#6b7280',
            }}>
              <p>No hay quizzes o evaluaciones creados</p>
            </div>
          ) : (
            cursosData.map((cursoData) => {
              const isCursoExpanded = expandedCursos.has(cursoData.curso.id);
              const totalQuizzes = cursoData.materias.reduce((sum, m) => sum + m.quizzes.length, 0);
              const totalEvaluaciones = cursoData.materias.reduce((sum, m) => sum + m.evaluaciones.length, 0);

              return (
                <div key={cursoData.curso.id} style={{ marginBottom: '0.5rem' }}>
                  {/* Botón del Curso */}
                  <button
                    onClick={() => toggleCurso(cursoData.curso.id)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: isCursoExpanded ? '#eff6ff' : 'white',
                      border: `1px solid ${isCursoExpanded ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCursoExpanded) {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCursoExpanded) {
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
                        {cursoData.curso.nombre}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginBottom: '0.25rem',
                      }}>
                        {cursoData.curso.nivel}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                      }}>
                        {totalQuizzes} quiz{totalQuizzes !== 1 ? 'es' : ''} • {totalEvaluaciones} evaluación{totalEvaluaciones !== 1 ? 'es' : ''}
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
                        transform: isCursoExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Lista de Materias del Curso */}
                  {isCursoExpanded && (
                    <div style={{
                      marginTop: '0.5rem',
                      marginLeft: '1rem',
                      paddingLeft: '1rem',
                      borderLeft: '2px solid #e5e7eb',
                    }}>
                      {cursoData.materias.map((materia) => {
                        const isMateriaExpanded = expandedMaterias.has(materia.id);
                        const materiaQuizzes = materia.quizzes.length;
                        const materiaEvaluaciones = materia.evaluaciones.length;

                        return (
                          <div key={materia.id} style={{ marginBottom: '0.5rem' }}>
                            <button
                              onClick={() => toggleMateria(materia.id)}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                background: isMateriaExpanded ? '#eff6ff' : 'white',
                                border: `1px solid ${isMateriaExpanded ? '#3b82f6' : '#e5e7eb'}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                if (!isMateriaExpanded) {
                                  e.currentTarget.style.background = '#f9fafb';
                                  e.currentTarget.style.borderColor = '#d1d5db';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isMateriaExpanded) {
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
                                  {materia.nombre}
                                </div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280',
                                }}>
                                  {materiaQuizzes} quiz{materiaQuizzes !== 1 ? 'es' : ''} • {materiaEvaluaciones} evaluación{materiaEvaluaciones !== 1 ? 'es' : ''}
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
                                  transform: isMateriaExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s',
                                }}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {/* Lista de Periodos de la Materia */}
                            {isMateriaExpanded && (
                              <div style={{
                                marginTop: '0.5rem',
                                marginLeft: '1rem',
                                paddingLeft: '1rem',
                                borderLeft: '2px solid #e5e7eb',
                              }}>
                                {materia.periodos.map((periodo) => {
                                  const isPeriodoExpanded = expandedPeriodos.has(periodo.id);
                                  const periodoQuizzes = periodo.quizzes?.length || 0;
                                  const periodoEvaluaciones = periodo.evaluaciones?.length || 0;

                                  // Mostrar todos los periodos, incluso si no tienen quizzes o evaluaciones
                                  // para que el usuario pueda ver qué periodos existen

                                  return (
                                    <div key={periodo.id} style={{ marginBottom: '0.5rem' }}>
                                      <button
                                        onClick={() => togglePeriodo(periodo.id)}
                                        style={{
                                          width: '100%',
                                          padding: '0.75rem 1rem',
                                          background: isPeriodoExpanded ? '#eff6ff' : 'white',
                                          border: `1px solid ${isPeriodoExpanded ? '#3b82f6' : '#e5e7eb'}`,
                                          borderRadius: '8px',
                                          cursor: 'pointer',
                                          textAlign: 'left',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!isPeriodoExpanded) {
                                            e.currentTarget.style.background = '#f9fafb';
                                            e.currentTarget.style.borderColor = '#d1d5db';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!isPeriodoExpanded) {
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
                                            {periodo.nombre}
                                          </div>
                                          <div style={{
                                            fontSize: '0.75rem',
                                            color: '#6b7280',
                                          }}>
                                            {periodoQuizzes} quiz{periodoQuizzes !== 1 ? 'es' : ''} • {periodoEvaluaciones} evaluación{periodoEvaluaciones !== 1 ? 'es' : ''}
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
                                            transform: isPeriodoExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s',
                                          }}
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>

                                      {/* Lista de Quizzes y Evaluaciones del Periodo */}
                                      {isPeriodoExpanded && (
                                        <div style={{
                                          marginTop: '0.5rem',
                                          marginLeft: '1rem',
                                          paddingLeft: '1rem',
                                          borderLeft: '2px solid #e5e7eb',
                                        }}>
                                          {/* Quizzes del periodo */}
                                          {(periodo.quizzes?.length || 0) > 0 && (
                                            <div style={{ marginBottom: '0.5rem' }}>
                                              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>
                                                Quizzes:
                                              </div>
                                              {periodo.quizzes.map((quiz: any) => {
                                                return (
                                                  <div
                                                    key={quiz.id}
                                                    style={{
                                                      padding: '0.75rem',
                                                      marginBottom: '0.5rem',
                                                      background: 'white',
                                                      borderRadius: '6px',
                                                      border: '1px solid #e5e7eb',
                                                      fontSize: '0.875rem',
                                                      color: '#1f2937',
                                                      transition: 'all 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                      e.currentTarget.style.background = '#f9fafb';
                                                      e.currentTarget.style.borderColor = '#d1d5db';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                      e.currentTarget.style.background = 'white';
                                                      e.currentTarget.style.borderColor = '#e5e7eb';
                                                    }}
                                                  >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                      <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{quiz.nombre}</div>
                                                        {quiz.descripcion && (
                                                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                                            {quiz.descripcion.length > 60 ? `${quiz.descripcion.substring(0, 60)}...` : quiz.descripcion}
                                                          </div>
                                                        )}
                                                      </div>
                                                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        {/* Toggle de activar/desactivar */}
                                                        <button
                                                          onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const newState = !(quiz.is_active ?? true);
                                                            try {
                                                              const { data: { session } } = await supabase.auth.getSession();
                                                              if (!session) {
                                                                showNotification('No hay sesión activa', 'error');
                                                                return;
                                                              }

                                                              const response = await fetch('/api/quizzes/toggle-active', {
                                                                method: 'PUT',
                                                                headers: {
                                                                  'Content-Type': 'application/json',
                                                                  'Authorization': `Bearer ${session.access_token}`,
                                                                },
                                                                body: JSON.stringify({
                                                                  quiz_id: quiz.id,
                                                                  is_active: newState,
                                                                }),
                                                              });

                                                              const result = await response.json();
                                                              if (!response.ok) {
                                                                throw new Error(result.error || 'Error al actualizar el estado');
                                                              }

                                                              // Actualizar el estado local
                                                              fetchQuizzesEvaluaciones();
                                                              showNotification(
                                                                newState ? 'Quiz activado exitosamente' : 'Quiz desactivado exitosamente',
                                                                'success'
                                                              );
                                                            } catch (error: any) {
                                                              console.error('Error al cambiar estado:', error);
                                                              showNotification('Error al cambiar el estado: ' + (error.message || 'Error desconocido'), 'error');
                                                            }
                                                          }}
                                                          style={{
                                                            padding: '0.375rem',
                                                            background: (quiz.is_active ?? true) ? '#10b981' : '#6b7280',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s',
                                                            flexShrink: 0,
                                                            width: '28px',
                                                            height: '28px',
                                                          }}
                                                          title={(quiz.is_active ?? true) ? 'Desactivar quiz' : 'Activar quiz'}
                                                          onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'scale(1.1)';
                                                            e.currentTarget.style.opacity = '0.9';
                                                          }}
                                                          onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                            e.currentTarget.style.opacity = '1';
                                                          }}
                                                        >
                                                          {(quiz.is_active ?? true) ? (
                                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                          ) : (
                                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                          )}
                                                        </button>
                                                        {/* Botón de descargar PDF */}
                                                        <button
                                                          onClick={async (e) => {
                                                            e.stopPropagation();
                                                            await downloadQuizPDF(quiz.id, quiz.nombre);
                                                          }}
                                                          style={{
                                                            padding: '0.5rem',
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s',
                                                            flexShrink: 0,
                                                          }}
                                                          onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#dc2626';
                                                            e.currentTarget.style.transform = 'scale(1.05)';
                                                          }}
                                                          onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = '#ef4444';
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                          }}
                                                          title="Descargar PDF"
                                                        >
                                                          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                          </svg>
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}

                                          {/* Evaluaciones del periodo */}
                                          {(periodo.evaluaciones?.length || 0) > 0 && (
                                            <div>
                                              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>
                                                Evaluaciones:
                                              </div>
                                              {periodo.evaluaciones.map((evaluacion: any) => {
                                                return (
                                                  <div
                                                    key={evaluacion.id}
                                                    style={{
                                                      padding: '0.75rem',
                                                      marginBottom: '0.5rem',
                                                      background: 'white',
                                                      borderRadius: '6px',
                                                      border: '1px solid #e5e7eb',
                                                      fontSize: '0.875rem',
                                                      color: '#1f2937',
                                                      transition: 'all 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                      e.currentTarget.style.background = '#f9fafb';
                                                      e.currentTarget.style.borderColor = '#d1d5db';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                      e.currentTarget.style.background = 'white';
                                                      e.currentTarget.style.borderColor = '#e5e7eb';
                                                    }}
                                                  >
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                    <div style={{ flex: 1 }}>
                                                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{evaluacion.nombre}</div>
                                                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                                        Periodo: {periodo.nombre}
                                                      </div>
                                                      {evaluacion.descripcion && (
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                          {evaluacion.descripcion.length > 60 ? `${evaluacion.descripcion.substring(0, 60)}...` : evaluacion.descripcion}
                                                        </div>
                                                      )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                      {/* Toggle de activar/desactivar */}
                                                      <button
                                                        onClick={async (e) => {
                                                          e.stopPropagation();
                                                          const newState = !(evaluacion.is_active ?? true);
                                                          try {
                                                            const { data: { session } } = await supabase.auth.getSession();
                                                            if (!session) {
                                                              showNotification('No hay sesión activa', 'error');
                                                              return;
                                                            }

                                                            const response = await fetch('/api/evaluaciones/toggle-active', {
                                                              method: 'PUT',
                                                              headers: {
                                                                'Content-Type': 'application/json',
                                                                'Authorization': `Bearer ${session.access_token}`,
                                                              },
                                                              body: JSON.stringify({
                                                                evaluacion_id: evaluacion.id,
                                                                is_active: newState,
                                                              }),
                                                            });

                                                            const result = await response.json();
                                                            if (!response.ok) {
                                                              throw new Error(result.error || 'Error al actualizar el estado');
                                                            }

                                                            // Actualizar el estado local
                                                            fetchQuizzesEvaluaciones();
                                                            showNotification(
                                                              newState ? 'Evaluación activada exitosamente' : 'Evaluación desactivada exitosamente',
                                                              'success'
                                                            );
                                                          } catch (error: any) {
                                                            console.error('Error al cambiar estado:', error);
                                                            showNotification('Error al cambiar el estado: ' + (error.message || 'Error desconocido'), 'error');
                                                          }
                                                        }}
                                                        style={{
                                                          padding: '0.375rem',
                                                          background: (evaluacion.is_active ?? true) ? '#10b981' : '#6b7280',
                                                          color: 'white',
                                                          border: 'none',
                                                          borderRadius: '6px',
                                                          cursor: 'pointer',
                                                          display: 'flex',
                                                          alignItems: 'center',
                                                          justifyContent: 'center',
                                                          transition: 'all 0.2s',
                                                          flexShrink: 0,
                                                          width: '28px',
                                                          height: '28px',
                                                        }}
                                                        title={(evaluacion.is_active ?? true) ? 'Desactivar evaluación' : 'Activar evaluación'}
                                                        onMouseEnter={(e) => {
                                                          e.currentTarget.style.transform = 'scale(1.1)';
                                                          e.currentTarget.style.opacity = '0.9';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                          e.currentTarget.style.transform = 'scale(1)';
                                                          e.currentTarget.style.opacity = '1';
                                                        }}
                                                      >
                                                        {(evaluacion.is_active ?? true) ? (
                                                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                          </svg>
                                                        ) : (
                                                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                          </svg>
                                                        )}
                                                      </button>
                                                      {/* Botón de descargar PDF */}
                                                      <button
                                                        onClick={async (e) => {
                                                          e.stopPropagation();
                                                          await downloadEvaluacionPDF(evaluacion.id, evaluacion.nombre);
                                                        }}
                                                        style={{
                                                          padding: '0.5rem',
                                                          background: '#ef4444',
                                                          color: 'white',
                                                          border: 'none',
                                                          borderRadius: '6px',
                                                          cursor: 'pointer',
                                                          display: 'flex',
                                                          alignItems: 'center',
                                                          justifyContent: 'center',
                                                          transition: 'all 0.2s',
                                                          flexShrink: 0,
                                                        }}
                                                        onMouseEnter={(e) => {
                                                          e.currentTarget.style.background = '#dc2626';
                                                          e.currentTarget.style.transform = 'scale(1.05)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                          e.currentTarget.style.background = '#ef4444';
                                                          e.currentTarget.style.transform = 'scale(1)';
                                                        }}
                                                        title="Descargar PDF"
                                                      >
                                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                          
                                          {/* Mensaje si no hay quizzes ni evaluaciones */}
                                          {(periodo.quizzes?.length || 0) === 0 && (periodo.evaluaciones?.length || 0) === 0 && (
                                            <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>
                                              No hay quizzes ni evaluaciones en este periodo
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Notificación Toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            background: notification.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            minWidth: '300px',
            maxWidth: '400px',
            animation: 'slideIn 0.3s ease-out',
          }}
          className="notification-toast"
        >
          {notification.type === 'success' ? (
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span style={{ flex: 1, fontWeight: 500 }}>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

