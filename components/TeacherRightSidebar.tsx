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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'quiz' | 'evaluacion' | null>(null);
  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const [modalItemName, setModalItemName] = useState<string>('');
  const [modalItemFechas, setModalItemFechas] = useState<{ fecha_inicio?: string; fecha_fin?: string } | null>(null);
  const [modalCursoId, setModalCursoId] = useState<string | null>(null);
  const [estudiantes, setEstudiantes] = useState<Array<{id: string; nombre: string; apellido: string; is_active?: boolean}>>([]);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);

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

  // Función helper para determinar el estado automático basado en fechas
  const getStatusFromDates = (fechaInicio: string, fechaFin: string, isActive?: boolean) => {
    if (isActive === false) {
      return { isAutomaticActive: false, status: 'Desactivado manualmente', color: '#6b7280' };
    }
    
    const ahora = new Date();
    let inicio: Date;
    let fin: Date;
    
    try {
      inicio = new Date(fechaInicio);
      fin = new Date(fechaFin);
      
      if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        return { isAutomaticActive: false, status: 'Fechas inválidas', color: '#ef4444' };
      }
      
      const finDelDia = new Date(fin);
      finDelDia.setHours(23, 59, 59, 999);
      
      if (ahora < inicio) {
        return { isAutomaticActive: false, status: 'Aún no disponible', color: '#f59e0b' };
      } else if (ahora > finDelDia) {
        // Si ya pasó la fecha fin pero is_active es true, está activado manualmente
        if (isActive === true) {
          return { isAutomaticActive: false, status: 'Activado manualmente (vencido)', color: '#10b981' };
        }
        return { isAutomaticActive: false, status: 'Vencido', color: '#ef4444' };
      } else {
        return { isAutomaticActive: true, status: 'Activo', color: '#10b981' };
      }
    } catch (error) {
      return { isAutomaticActive: false, status: 'Error en fechas', color: '#ef4444' };
    }
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
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al generar el PDF');
      }

      // Obtener el HTML directamente (el API retorna HTML, no PDF binario)
      const htmlContent = await response.text();

      // Crear un iframe oculto para evitar problemas con bloqueadores de ventanas emergentes
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      // Escribir el HTML en el iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        alert('No se pudo acceder al documento del iframe');
        return;
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
        
      // Esperar a que se cargue completamente el contenido antes de imprimir
      iframe.onload = () => {
          setTimeout(() => {
          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
            // Limpiar el iframe después de un tiempo
            setTimeout(() => {
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
            }, 1000);
          } catch (printError) {
            console.warn('Error al imprimir:', printError);
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }
        }, 1000);
      };

      // Fallback: si onload no se dispara, intentar después de un tiempo
      setTimeout(() => {
        try {
          if (iframe.contentWindow && iframe.parentNode) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
            }, 1000);
          }
        } catch (printError) {
          console.warn('Error al imprimir en fallback:', printError);
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
      }
        }
      }, 2000);
      
    } catch (error: any) {
      console.error('Error al descargar PDF:', error);
      alert('Error al generar el PDF: ' + (error.message || 'Error desconocido'));
    }
  };

  const openStudentModal = async (type: 'quiz' | 'evaluacion', itemId: string, itemName: string, cursoId: string, fechas?: { fecha_inicio?: string; fecha_fin?: string }) => {
    setModalType(type);
    setModalItemId(itemId);
    setModalItemName(itemName);
    setModalItemFechas(fechas || null);
    setModalCursoId(cursoId);
    setModalOpen(true);
    await fetchEstudiantesForModal(cursoId, itemId, type);
  };

  const fetchEstudiantesForModal = async (cursoId: string, itemId: string, type: 'quiz' | 'evaluacion') => {
    try {
      setLoadingEstudiantes(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showNotification('No hay sesión activa', 'error');
        return;
      }

      // Obtener estudiantes del curso
      const estudiantesResponse = await fetch(`/api/estudiantes/get-estudiantes?curso_id=${cursoId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const estudiantesResult = await estudiantesResponse.json();
      if (!estudiantesResponse.ok) {
        throw new Error(estudiantesResult.error || 'Error al obtener estudiantes');
      }

      const estudiantesList = estudiantesResult.data || [];

      // Obtener estados individuales de los estudiantes con este quiz/evaluación
      const estadosResponse = await fetch(`/api/${type === 'quiz' ? 'quizzes' : 'evaluaciones'}/get-student-statuses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          [`${type}_id`]: itemId,
          estudiante_ids: estudiantesList.map((e: any) => e.user_id).filter(Boolean), // Usar user_id
        }),
      });

      const estadosResult = await estadosResponse.json();
      const estadosMap = new Map<string, boolean>();
      
      if (estadosResponse.ok && estadosResult.data) {
        estadosResult.data.forEach((item: any) => {
          estadosMap.set(item.estudiante_id, item.is_active ?? true);
        });
        
        // Mostrar warning si existe
        if (estadosResult.warning) {
          console.warn(estadosResult.warning);
        }
      } else if (!estadosResponse.ok) {
        // Si hay error pero no es crítico, continuar sin estados individuales
        console.warn('No se pudieron obtener estados individuales:', estadosResult.error);
        // Continuar con estados null para todos los estudiantes
      }

      // Combinar estudiantes con sus estados
      // IMPORTANTE: usar user_id porque las tablas quizzes_estudiantes/evaluaciones_estudiantes
      // referencian auth.users(id), no estudiantes(id)
      const estudiantesConEstados = estudiantesList.map((estudiante: any) => ({
        id: estudiante.id, // Mantener id para referencia interna
        user_id: estudiante.user_id, // user_id es necesario para las APIs
        nombre: estudiante.nombre,
        apellido: estudiante.apellido,
        is_active: estadosMap.get(estudiante.user_id) ?? null, // Buscar por user_id
      }));

      setEstudiantes(estudiantesConEstados);
    } catch (error: any) {
      console.error('Error al obtener estudiantes:', error);
      showNotification('Error al obtener estudiantes: ' + (error.message || 'Error desconocido'), 'error');
    } finally {
      setLoadingEstudiantes(false);
    }
  };

  const toggleStudentStatus = async (estudianteUserId: string, newState: boolean) => {
    if (!modalItemId || !modalType) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showNotification('No hay sesión activa', 'error');
        return;
      }

      const endpoint = `/api/${modalType === 'quiz' ? 'quizzes' : 'evaluaciones'}/toggle-active-student`;
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          [`${modalType === 'quiz' ? 'quiz' : 'evaluacion'}_id`]: modalItemId,
          estudiante_id: estudianteUserId, // Usar user_id (de auth.users)
          is_active: newState,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        const errorMessage = result.error || 'Error al actualizar el estado';
        console.error('Error del servidor:', errorMessage, result);
        
        // Si la tabla no existe, mostrar mensaje más específico
        if (result.table_missing) {
          showNotification(
            '❌ Error: Las tablas de base de datos no existen. Por favor ejecuta el script SQL en Supabase.',
            'error'
          );
        }
        
        throw new Error(errorMessage);
      }

      // Actualizar el estado local
      setEstudiantes(prev => prev.map(e => 
        e.user_id === estudianteUserId ? { ...e, is_active: newState } : e
      ));

      showNotification(
        `${modalType === 'quiz' ? 'Quiz' : 'Evaluación'} ${newState ? 'activado' : 'desactivado'} para el estudiante exitosamente`,
        'success'
      );
    } catch (error: any) {
      console.error('Error al cambiar estado:', error);
      showNotification('Error al cambiar el estado: ' + (error.message || 'Error desconocido'), 'error');
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
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al generar el PDF');
      }

      // Obtener el HTML directamente (el API retorna HTML, no PDF binario)
      const htmlContent = await response.text();

      // Crear un iframe oculto para evitar problemas con bloqueadores de ventanas emergentes
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      // Escribir el HTML en el iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        alert('No se pudo acceder al documento del iframe');
        return;
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
        
      // Esperar a que se cargue completamente el contenido antes de imprimir
      iframe.onload = () => {
          setTimeout(() => {
          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
            // Limpiar el iframe después de un tiempo
            setTimeout(() => {
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
            }, 1000);
          } catch (printError) {
            console.warn('Error al imprimir:', printError);
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }
        }, 1000);
      };

      // Fallback: si onload no se dispara, intentar después de un tiempo
      setTimeout(() => {
        try {
          if (iframe.contentWindow && iframe.parentNode) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
            }, 1000);
          }
        } catch (printError) {
          console.warn('Error al imprimir en fallback:', printError);
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
      }
        }
      }, 2000);
      
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
                                                const statusInfo = getStatusFromDates(
                                                  quiz.fecha_inicio || '',
                                                  quiz.fecha_fin || '',
                                                  quiz.is_active
                                                );
                                                
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
                                                        {/* Información de fechas y estado */}
                                                        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                          {quiz.fecha_inicio && (
                                                            <div>
                                                              📅 Inicio: {new Date(quiz.fecha_inicio).toLocaleString('es-ES', { 
                                                                year: 'numeric', 
                                                                month: 'short', 
                                                                day: 'numeric', 
                                                                hour: '2-digit', 
                                                                minute: '2-digit' 
                                                              })}
                                                            </div>
                                                          )}
                                                          {quiz.fecha_fin && (
                                                            <div>
                                                              🏁 Fin: {new Date(quiz.fecha_fin).toLocaleString('es-ES', { 
                                                                year: 'numeric', 
                                                                month: 'short', 
                                                                day: 'numeric', 
                                                                hour: '2-digit', 
                                                                minute: '2-digit' 
                                                              })}
                                                            </div>
                                                          )}
                                                          <div style={{ color: statusInfo.color, fontWeight: 500, marginTop: '0.25rem' }}>
                                                            Estado: {statusInfo.status}
                                                          </div>
                                                        </div>
                                                      </div>
                                                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        {/* Botón para gestionar activación por estudiante */}
                                                        <button
                                                          onClick={async (e) => {
                                                            e.stopPropagation();
                                                            await openStudentModal('quiz', quiz.id, quiz.nombre, cursoData.curso.id, {
                                                              fecha_inicio: quiz.fecha_inicio,
                                                              fecha_fin: quiz.fecha_fin
                                                            });
                                                          }}
                                                          style={{
                                                            padding: '0.375rem',
                                                            background: statusInfo.color,
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
                                                          title={`Estado: ${statusInfo.status} - Gestionar por estudiante`}
                                                          title="Gestionar activación por estudiante"
                                                          onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'scale(1.1)';
                                                            e.currentTarget.style.opacity = '0.9';
                                                          }}
                                                          onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                            e.currentTarget.style.opacity = '1';
                                                          }}
                                                        >
                                                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                          </svg>
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
                                                const statusInfo = getStatusFromDates(
                                                  evaluacion.fecha_inicio || '',
                                                  evaluacion.fecha_fin || '',
                                                  evaluacion.is_active
                                                );
                                                
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
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                                                          {evaluacion.descripcion.length > 60 ? `${evaluacion.descripcion.substring(0, 60)}...` : evaluacion.descripcion}
                                                        </div>
                                                      )}
                                                      {/* Información de fechas y estado */}
                                                      <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                        {evaluacion.fecha_inicio && (
                                                          <div>
                                                            📅 Inicio: {new Date(evaluacion.fecha_inicio).toLocaleString('es-ES', { 
                                                              year: 'numeric', 
                                                              month: 'short', 
                                                              day: 'numeric', 
                                                              hour: '2-digit', 
                                                              minute: '2-digit' 
                                                            })}
                                                          </div>
                                                        )}
                                                        {evaluacion.fecha_fin && (
                                                          <div>
                                                            🏁 Fin: {new Date(evaluacion.fecha_fin).toLocaleString('es-ES', { 
                                                              year: 'numeric', 
                                                              month: 'short', 
                                                              day: 'numeric', 
                                                              hour: '2-digit', 
                                                              minute: '2-digit' 
                                                            })}
                                                          </div>
                                                        )}
                                                        <div style={{ color: statusInfo.color, fontWeight: 500, marginTop: '0.25rem' }}>
                                                          Estado: {statusInfo.status}
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                      {/* Botón para gestionar activación por estudiante */}
                                                      <button
                                                        onClick={async (e) => {
                                                          e.stopPropagation();
                                                          await openStudentModal('evaluacion', evaluacion.id, evaluacion.nombre, cursoData.curso.id, {
                                                            fecha_inicio: evaluacion.fecha_inicio,
                                                            fecha_fin: evaluacion.fecha_fin
                                                          });
                                                        }}
                                                        style={{
                                                          padding: '0.375rem',
                                                          background: statusInfo.color,
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
                                                        title={`Estado: ${statusInfo.status} - Gestionar por estudiante`}
                                                        onMouseEnter={(e) => {
                                                          e.currentTarget.style.transform = 'scale(1.1)';
                                                          e.currentTarget.style.opacity = '0.9';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                          e.currentTarget.style.transform = 'scale(1)';
                                                          e.currentTarget.style.opacity = '1';
                                                        }}
                                                        >
                                                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                          </svg>
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
      
      {/* Modal de gestión de estudiantes */}
      {modalOpen && modalType && modalItemId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#1f2937',
                  margin: 0,
                  marginBottom: '0.25rem',
                }}>
                  Gestionar {modalType === 'quiz' ? 'Quiz' : 'Evaluación'} por Estudiante
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#1f2937',
                  margin: 0,
                  marginBottom: '0.25rem',
                  fontWeight: 500,
                }}>
                  {modalItemName}
                </p>
                {modalItemFechas && (modalItemFechas.fecha_inicio || modalItemFechas.fecha_fin) && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.125rem',
                  }}>
                    {modalItemFechas.fecha_inicio && (
                      <div>
                        📅 <strong>Inicio:</strong> {new Date(modalItemFechas.fecha_inicio).toLocaleString('es-ES', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    )}
                    {modalItemFechas.fecha_fin && (
                      <div>
                        🏁 <strong>Fin:</strong> {new Date(modalItemFechas.fecha_fin).toLocaleString('es-ES', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del Modal */}
            <div style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1,
            }}>
              {loadingEstudiantes ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  Cargando estudiantes...
                </div>
              ) : estudiantes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No hay estudiantes en este curso
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {estudiantes.map((estudiante) => {
                    // Si is_active es null, significa que no tiene registro individual, mostrar como "Sin definir"
                    const isActive = estudiante.is_active === null ? null : estudiante.is_active;
                    
                    return (
                      <div
                        key={estudiante.id}
                        style={{
                          padding: '1rem',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: 600,
                            color: '#1f2937',
                            marginBottom: '0.25rem',
                          }}>
                            {estudiante.nombre} {estudiante.apellido}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                          }}>
                            {isActive === null 
                              ? 'Estado: Sin definir (usa estado global)'
                              : isActive 
                                ? 'Estado: Activo para este estudiante'
                                : 'Estado: Inactivo para este estudiante'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            onClick={() => toggleStudentStatus(estudiante.user_id, true)}
                            disabled={isActive === true}
                            style={{
                              padding: '0.5rem 1rem',
                              background: isActive === true ? '#10b981' : '#f3f4f6',
                              color: isActive === true ? 'white' : '#6b7280',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: isActive === true ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              opacity: isActive === true ? 0.7 : 1,
                            }}
                          >
                            Activar
                          </button>
                          <button
                            onClick={() => toggleStudentStatus(estudiante.user_id, false)}
                            disabled={isActive === false}
                            style={{
                              padding: '0.5rem 1rem',
                              background: isActive === false ? '#ef4444' : '#f3f4f6',
                              color: isActive === false ? 'white' : '#6b7280',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: isActive === false ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              opacity: isActive === false ? 0.7 : 1,
                            }}
                          >
                            Desactivar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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

