'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase-client';
import Image from 'next/image';
import '../app/css/teacher-detail-view.css';

interface TeacherDetailViewProps {
  teacherId: string;
  onClose: () => void;
}

interface Profesor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  foto_url: string | null;
  numero_celular: string | null;
  indicativo_pais: string;
  is_active: boolean;
  created_at: string;
}

interface Curso {
  id: string;
  nombre: string;
  nivel: string;
}

interface ContenidoPorMateria {
  materia: {
    id: string;
    nombre: string;
    curso: {
      id: string;
      nombre: string;
      nivel: string;
    };
  };
  total: number;
  porTipo: {
    [tipo: string]: number;
  };
}

interface Quiz {
  id: string;
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  is_active: boolean;
  creado_en: string;
  subtemas: {
    temas: {
      periodos: {
        materias: {
          cursos: {
            id: string;
            nombre: string;
            nivel: string;
          };
        };
        nombre: string;
      };
    };
  };
}

interface Evaluacion {
  id: string;
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  is_active: boolean;
  creado_en: string;
  periodos: {
    materias: {
      cursos: {
        id: string;
        nombre: string;
        nivel: string;
      };
    };
    nombre: string;
  };
  materias: {
    nombre: string;
  };
}

interface TeacherDetailData {
  profesor: Profesor;
  cursos: Curso[];
  contenidoPorMateria: ContenidoPorMateria[];
  quizzes: Quiz[];
  evaluaciones: Evaluacion[];
  estadisticas: {
    totalCursos: number;
    totalQuizzes: number;
    totalEvaluaciones: number;
    totalContenido: number;
  };
}

export default function TeacherDetailView({ teacherId, onClose }: TeacherDetailViewProps) {
  const [data, setData] = useState<TeacherDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('info');
  const [expandedMaterias, setExpandedMaterias] = useState<Set<string>>(new Set());
  const [expandedPeriodos, setExpandedPeriodos] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTeacherDetail();
  }, [teacherId]);

  const fetchTeacherDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`/api/admin/get-teacher-detail?teacherId=${teacherId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar el detalle del profesor');
      }

      if (result.success) {
        setData(result.data);
      }
    } catch (err: any) {
      console.error('Error al obtener detalle del profesor:', err);
      setError(err.message || 'Error al cargar el detalle del profesor');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQuiz = async (quizId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`/api/quizzes/download-pdf?quiz_id=${quizId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al descargar el quiz');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz-${quizId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error al descargar quiz:', err);
      alert('Error al descargar el quiz: ' + err.message);
    }
  };

  const handleDownloadEvaluacion = async (evaluacionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`/api/evaluaciones/download-pdf?evaluacion_id=${evaluacionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al descargar la evaluación');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluacion-${evaluacionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error al descargar evaluación:', err);
      alert('Error al descargar la evaluación: ' + err.message);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
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

  // Organizar quizzes por materia
  const quizzesPorMateria = useMemo(() => {
    if (!data?.quizzes) return {};
    
    const grouped: { [materiaId: string]: { materia: { id: string; nombre: string; curso: { id: string; nombre: string; nivel: string } }, quizzes: Quiz[] } } = {};
    
    data.quizzes.forEach((quiz) => {
      const materiaId = quiz.subtemas?.temas?.periodos?.materias?.id;
      const materiaNombre = quiz.subtemas?.temas?.periodos?.materias?.nombre;
      const cursoId = quiz.subtemas?.temas?.periodos?.materias?.cursos?.id;
      const cursoNombre = quiz.subtemas?.temas?.periodos?.materias?.cursos?.nombre;
      const cursoNivel = quiz.subtemas?.temas?.periodos?.materias?.cursos?.nivel;
      
      if (materiaId && materiaNombre) {
        if (!grouped[materiaId]) {
          grouped[materiaId] = {
            materia: {
              id: materiaId,
              nombre: materiaNombre,
              curso: {
                id: cursoId || '',
                nombre: cursoNombre || 'N/A',
                nivel: cursoNivel || 'N/A',
              },
            },
            quizzes: [],
          };
        }
        grouped[materiaId].quizzes.push(quiz);
      }
    });
    
    return grouped;
  }, [data?.quizzes]);

  // Organizar evaluaciones por periodo
  const evaluacionesPorPeriodo = useMemo(() => {
    if (!data?.evaluaciones) return {};
    
    const grouped: { [periodoId: string]: { periodo: { id: string; nombre: string; materia: { id: string; nombre: string; curso: { id: string; nombre: string; nivel: string } } }, evaluaciones: Evaluacion[] } } = {};
    
    data.evaluaciones.forEach((evaluacion) => {
      const periodoId = evaluacion.periodos?.id;
      const periodoNombre = evaluacion.periodos?.nombre;
      const materiaId = evaluacion.materias?.id || evaluacion.periodos?.materias?.id;
      const materiaNombre = evaluacion.materias?.nombre || evaluacion.periodos?.materias?.nombre;
      const cursoId = evaluacion.periodos?.materias?.cursos?.id || evaluacion.materias?.cursos?.id;
      const cursoNombre = evaluacion.periodos?.materias?.cursos?.nombre || evaluacion.materias?.cursos?.nombre;
      const cursoNivel = evaluacion.periodos?.materias?.cursos?.nivel || evaluacion.materias?.cursos?.nivel;
      
      if (periodoId && periodoNombre) {
        if (!grouped[periodoId]) {
          grouped[periodoId] = {
            periodo: {
              id: periodoId,
              nombre: periodoNombre,
              materia: {
                id: materiaId || '',
                nombre: materiaNombre || 'N/A',
                curso: {
                  id: cursoId || '',
                  nombre: cursoNombre || 'N/A',
                  nivel: cursoNivel || 'N/A',
                },
              },
            },
            evaluaciones: [],
          };
        }
        grouped[periodoId].evaluaciones.push(evaluacion);
      }
    });
    
    return grouped;
  }, [data?.evaluaciones]);

  if (loading) {
    return (
      <div className="teacher-detail-container">
        <div className="teacher-detail-loading">
          <p>Cargando información del profesor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-detail-container">
        <div className="teacher-detail-error">
          <p>Error: {error}</p>
          <button onClick={fetchTeacherDetail}>Reintentar</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="teacher-detail-container">
        <div className="teacher-detail-error">
          <p>No se encontró información del profesor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-detail-container">
      <div className="teacher-detail-header">
        <button onClick={onClose} className="teacher-detail-close-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="teacher-detail-title">Ficha Técnica del Profesor</h1>
      </div>

      {/* Información Personal */}
      <div className="teacher-detail-section">
        <div className="section-header" onClick={() => toggleSection('info')}>
          <h2 className="section-title">Información Personal</h2>
          <svg 
            className={`section-arrow ${expandedSection === 'info' ? 'expanded' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {expandedSection === 'info' && data.profesor && (
          <div className="section-content">
            <div className="teacher-info-card">
              <div className="teacher-photo-container">
                {data.profesor.foto_url ? (
                  <Image
                    src={data.profesor.foto_url}
                    alt={`${data.profesor.nombre} ${data.profesor.apellido}`}
                    width={120}
                    height={120}
                    style={{
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                    unoptimized
                  />
                ) : (
                  <div className="teacher-photo-placeholder">
                    {data.profesor.nombre.charAt(0)}
                    {data.profesor.apellido.charAt(0)}
                  </div>
                )}
              </div>
              <div className="teacher-info-details">
                <h3 className="teacher-name">{data.profesor.nombre} {data.profesor.apellido}</h3>
                <p className="teacher-email">{data.profesor.email}</p>
                {data.profesor.numero_celular && (
                  <p className="teacher-phone">
                    {data.profesor.indicativo_pais} {data.profesor.numero_celular}
                  </p>
                )}
                <div className="teacher-status">
                  <span className={`status-badge ${data.profesor.is_active ? 'active' : 'inactive'}`}>
                    {data.profesor.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Estadísticas Generales */}
      <div className="teacher-detail-section">
        <div className="section-header" onClick={() => toggleSection('stats')}>
          <h2 className="section-title">Estadísticas Generales</h2>
          <svg 
            className={`section-arrow ${expandedSection === 'stats' ? 'expanded' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {expandedSection === 'stats' && data.estadisticas && (
          <div className="section-content">
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-icon blue">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="stat-info">
                  <p className="stat-label">Cursos Asignados</p>
                  <p className="stat-value">{data.estadisticas.totalCursos}</p>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-icon green">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div className="stat-info">
                  <p className="stat-label">Quizzes Creados</p>
                  <p className="stat-value">{data.estadisticas.totalQuizzes}</p>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-icon orange">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="stat-info">
                  <p className="stat-label">Evaluaciones Creadas</p>
                  <p className="stat-value">{data.estadisticas.totalEvaluaciones}</p>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-icon purple">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="stat-info">
                  <p className="stat-label">Contenido Subido</p>
                  <p className="stat-value">{data.estadisticas.totalContenido}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cursos Asignados */}
      <div className="teacher-detail-section">
        <div className="section-header" onClick={() => toggleSection('cursos')}>
          <h2 className="section-title">Cursos Asignados ({data.cursos.length})</h2>
          <svg 
            className={`section-arrow ${expandedSection === 'cursos' ? 'expanded' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {expandedSection === 'cursos' && (
          <div className="section-content">
            <div className="cursos-list">
              {data.cursos.map((curso) => (
                <div key={curso.id} className="curso-item">
                  <div className="curso-info">
                    <h4 className="curso-nombre">{curso.nombre}</h4>
                    <p className="curso-nivel">{curso.nivel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contenido por Materia */}
      <div className="teacher-detail-section">
        <div className="section-header" onClick={() => toggleSection('contenido')}>
          <h2 className="section-title">Contenido por Materia</h2>
          <svg 
            className={`section-arrow ${expandedSection === 'contenido' ? 'expanded' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {expandedSection === 'contenido' && (
          <div className="section-content">
            {data.contenidoPorMateria.length > 0 ? (
              <div className="contenido-table-wrapper">
                <table className="contenido-table">
                  <thead>
                    <tr>
                      <th>Curso</th>
                      <th>Materia</th>
                      <th>Total Contenido</th>
                      <th>Por Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.contenidoPorMateria.map((item) => (
                      <tr key={item.materia.id}>
                        <td>{item.materia.curso.nombre} ({item.materia.curso.nivel})</td>
                        <td>{item.materia.nombre}</td>
                        <td className="text-center">{item.total}</td>
                        <td>
                          <div className="tipo-tags">
                            {Object.entries(item.porTipo).map(([tipo, count]) => (
                              <span key={tipo} className="tipo-tag">
                                {tipo}: {count}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-message">No hay contenido registrado</p>
            )}
          </div>
        )}
      </div>

      {/* Quizzes */}
      <div className="teacher-detail-section">
        <div className="section-header" onClick={() => toggleSection('quizzes')}>
          <h2 className="section-title">Quizzes Creados ({data.quizzes.length})</h2>
          <svg 
            className={`section-arrow ${expandedSection === 'quizzes' ? 'expanded' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {expandedSection === 'quizzes' && (
          <div className="section-content">
            {Object.keys(quizzesPorMateria).length > 0 ? (
              <div className="quizzes-grouped">
                {Object.entries(quizzesPorMateria).map(([materiaId, grupo]) => (
                  <div key={materiaId} className="quiz-group">
                    <div className="quiz-group-header" onClick={() => toggleMateria(materiaId)}>
                      <h3 className="quiz-group-title">
                        {grupo.materia.nombre} - {grupo.materia.curso.nombre} ({grupo.materia.curso.nivel})
                      </h3>
                      <svg 
                        className={`quiz-group-arrow ${expandedMaterias.has(materiaId) ? 'expanded' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {expandedMaterias.has(materiaId) && (
                      <div className="quizzes-list">
                        {grupo.quizzes.map((quiz) => (
                          <div key={quiz.id} className="quiz-item">
                            <div className="quiz-header">
                              <div className="quiz-info">
                                <h4 className="quiz-nombre">{quiz.nombre}</h4>
                                <p className="quiz-periodo">
                                  Periodo: {quiz.subtemas?.temas?.periodos?.nombre || 'N/A'}
                                </p>
                                {quiz.descripcion && (
                                  <p className="quiz-descripcion">{quiz.descripcion}</p>
                                )}
                                <p className="quiz-fechas">
                                  Desde: {new Date(quiz.fecha_inicio).toLocaleDateString()} - 
                                  Hasta: {new Date(quiz.fecha_fin).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="quiz-actions">
                                <button
                                  onClick={() => handleDownloadQuiz(quiz.id)}
                                  className="action-btn download-btn"
                                  title="Descargar PDF"
                                >
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-message">No hay quizzes creados</p>
            )}
          </div>
        )}
      </div>

      {/* Evaluaciones */}
      <div className="teacher-detail-section">
        <div className="section-header" onClick={() => toggleSection('evaluaciones')}>
          <h2 className="section-title">Evaluaciones Creadas ({data.evaluaciones.length})</h2>
          <svg 
            className={`section-arrow ${expandedSection === 'evaluaciones' ? 'expanded' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {expandedSection === 'evaluaciones' && (
          <div className="section-content">
            {Object.keys(evaluacionesPorPeriodo).length > 0 ? (
              <div className="evaluaciones-grouped">
                {Object.entries(evaluacionesPorPeriodo).map(([periodoId, grupo]) => (
                  <div key={periodoId} className="evaluacion-group">
                    <div className="evaluacion-group-header" onClick={() => togglePeriodo(periodoId)}>
                      <h3 className="evaluacion-group-title">
                        {grupo.periodo.nombre} - {grupo.periodo.materia.nombre} ({grupo.periodo.materia.curso.nombre} - {grupo.periodo.materia.curso.nivel})
                      </h3>
                      <svg 
                        className={`evaluacion-group-arrow ${expandedPeriodos.has(periodoId) ? 'expanded' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {expandedPeriodos.has(periodoId) && (
                      <div className="evaluaciones-list">
                        {grupo.evaluaciones.map((evaluacion) => (
                          <div key={evaluacion.id} className="evaluacion-item">
                            <div className="evaluacion-header">
                              <div className="evaluacion-info">
                                <h4 className="evaluacion-titulo">{evaluacion.nombre}</h4>
                                {evaluacion.descripcion && (
                                  <p className="evaluacion-descripcion">{evaluacion.descripcion}</p>
                                )}
                                <p className="evaluacion-fechas">
                                  Desde: {new Date(evaluacion.fecha_inicio).toLocaleDateString()} - 
                                  Hasta: {new Date(evaluacion.fecha_fin).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="evaluacion-actions">
                                <button
                                  onClick={() => handleDownloadEvaluacion(evaluacion.id)}
                                  className="action-btn download-btn"
                                  title="Descargar PDF"
                                >
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-message">No hay evaluaciones creadas</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

