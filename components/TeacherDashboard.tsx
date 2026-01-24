'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PreguntasPendientes from './PreguntasPendientes';
import '../app/css/teacher-dashboard.css';

interface DashboardStats {
  totalAlumnos: number;
  totalCursos: number;
  totalQuizzes: number;
  totalEvaluaciones: number;
}

interface ParticipationData {
  curso: {
    id: string;
    nombre: string;
    nivel: string;
  };
  totalAlumnos: number;
  alumnosConQuizzes: number;
  alumnosConEvaluaciones: number;
  alumnosPendientes: number;
  porcentajeQuizzes: number;
  porcentajeEvaluaciones: number;
}

interface PerformanceAlert {
  estudiante: {
    id: string;
    nombre: string;
    apellido: string;
    foto_url?: string;
  };
  curso: {
    id: string;
    nombre: string;
    nivel: string;
  } | null;
  materia: {
    id: string;
    nombre: string;
  };
  promedio: number;
  totalCalificaciones: number;
}

interface AlumnoSinIntentos {
  estudiante: {
    id: string;
    nombre: string;
    apellido: string;
    foto_url?: string;
  };
  curso: {
    id: string;
    nombre: string;
    nivel: string;
  } | null;
}

interface StudentQuickView {
  estudiante: {
    id: string;
    nombre: string;
    apellido: string;
    foto_url?: string;
    promedio: number;
    estado: 'presentado' | 'pendiente';
  };
  curso: {
    id: string;
    nombre: string;
    nivel: string;
  };
}

interface TeacherDashboardProps {
  onContenidoSelect?: (contenidoId: string) => void;
}

export default function TeacherDashboard({ onContenidoSelect }: TeacherDashboardProps = {}) {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [participation, setParticipation] = useState<ParticipationData[]>([]);
  const [alerts, setAlerts] = useState<{
    alumnosConPromedioBajo: PerformanceAlert[];
    alumnosSinIntentos: AlumnoSinIntentos[];
  }>({ alumnosConPromedioBajo: [], alumnosSinIntentos: [] });
  const [quickView, setQuickView] = useState<{ [cursoId: string]: StudentQuickView[] }>({});
  const [expandedCursos, setExpandedCursos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
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

      // Obtener estadísticas generales
      const [statsRes, participationRes, alertsRes] = await Promise.all([
        fetch('/api/teachers/get-dashboard-stats', { method: 'GET', headers }),
        fetch('/api/teachers/get-course-participation', { method: 'GET', headers }),
        fetch('/api/teachers/get-performance-alerts', { method: 'GET', headers }),
      ]);

      if (!statsRes.ok || !participationRes.ok || !alertsRes.ok) {
        throw new Error('Error al cargar los datos del dashboard');
      }

      const statsData = await statsRes.json();
      const participationData = await participationRes.json();
      const alertsData = await alertsRes.json();

      if (statsData.success) {
        setStats(statsData.data);
      }

      if (participationData.success) {
        setParticipation(participationData.data);
        
        // Construir vista rápida por curso
        const quickViewData: { [cursoId: string]: StudentQuickView[] } = {};
        for (const part of participationData.data) {
          // Aquí necesitaríamos obtener los estudiantes del curso
          // Por ahora, usaremos los datos de participación
          quickViewData[part.curso.id] = []; // Se llenará más abajo
        }
        setQuickView(quickViewData);
      }

      if (alertsData.success) {
        setAlerts(alertsData.data);
      }
    } catch (err: any) {
      console.error('Error al obtener datos del dashboard:', err);
      setError(err.message || 'Error al cargar los datos del dashboard');
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

  if (loading) {
    return (
      <div className="teacher-dashboard-container">
        <div className="dashboard-loading">
          <p>Cargando datos del dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-dashboard-container">
        <div className="dashboard-error">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard-container">
      <div className="dashboard-header-section">
        <h1 className="dashboard-title">Panel del Profesor</h1>
        <p className="dashboard-subtitle">Resumen de actividades y rendimiento académico</p>
      </div>

      {/* Sección 1: Resumen General */}
      {stats && (
        <div className="stats-cards-section">
          <div className="stat-card">
            <div className="stat-card-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="stat-card-content">
              <h3 className="stat-card-title">Total de Alumnos</h3>
              <p className="stat-card-value">{stats.totalAlumnos}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon green">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="stat-card-content">
              <h3 className="stat-card-title">Cursos Asignados</h3>
              <p className="stat-card-value">{stats.totalCursos}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon orange">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="stat-card-content">
              <h3 className="stat-card-title">Quizzes Creados</h3>
              <p className="stat-card-value">{stats.totalQuizzes}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon red">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="stat-card-content">
              <h3 className="stat-card-title">Evaluaciones Creadas</h3>
              <p className="stat-card-value">{stats.totalEvaluaciones}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sección 2: Preguntas Pendientes */}
      <div style={{ marginBottom: '2rem' }}>
        <PreguntasPendientes 
          onContenidoSelect={onContenidoSelect || ((contenidoId: string) => {
            // Si no hay callback del padre, usar router
            router.push(`/dashboard?contenido_id=${contenidoId}`);
          })}
        />
      </div>

      {/* Sección 3: Participación por Curso */}
      {participation.length > 0 && (
        <div className="participation-section">
          <h2 className="section-title">Participación por Curso</h2>
          <div className="participation-table-wrapper">
            <table className="participation-table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Total Alumnos</th>
                  <th>Con Quizzes</th>
                  <th>Con Evaluaciones</th>
                  <th>Pendientes</th>
                  <th>% Participación</th>
                </tr>
              </thead>
              <tbody>
                {participation.map((part) => (
                  <tr key={part.curso.id}>
                    <td>
                      <div className="course-info-cell">
                        <strong>{part.curso.nombre}</strong>
                        <span className="nivel-badge">{part.curso.nivel}</span>
                      </div>
                    </td>
                    <td>{part.totalAlumnos}</td>
                    <td>
                      <span className="participation-badge quiz">
                        {part.alumnosConQuizzes} ({part.porcentajeQuizzes.toFixed(1)}%)
                      </span>
                    </td>
                    <td>
                      <span className="participation-badge evaluation">
                        {part.alumnosConEvaluaciones} ({part.porcentajeEvaluaciones.toFixed(1)}%)
                      </span>
                    </td>
                    <td>
                      <span className="participation-badge pending">
                        {part.alumnosPendientes}
                      </span>
                    </td>
                    <td>
                      <div className="participation-bar">
                        <div 
                          className="participation-fill"
                          style={{ 
                            width: `${Math.max(part.porcentajeQuizzes, part.porcentajeEvaluaciones)}%`,
                            backgroundColor: Math.max(part.porcentajeQuizzes, part.porcentajeEvaluaciones) >= 70 
                              ? '#10b981' 
                              : Math.max(part.porcentajeQuizzes, part.porcentajeEvaluaciones) >= 50 
                              ? '#f59e0b' 
                              : '#ef4444'
                          }}
                        ></div>
                        <span className="participation-percentage">
                          {Math.max(part.porcentajeQuizzes, part.porcentajeEvaluaciones).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sección 3: Alertas de Rendimiento */}
      {(alerts.alumnosConPromedioBajo.length > 0 || alerts.alumnosSinIntentos.length > 0) && (
        <div className="alerts-section">
          <h2 className="section-title">Alertas de Rendimiento</h2>
          
          {alerts.alumnosConPromedioBajo.length > 0 && (
            <div className="alert-card low-performance">
              <div className="alert-header">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3>Alumnos con Promedio Bajo (&lt; 3.0)</h3>
                <span className="alert-count">{alerts.alumnosConPromedioBajo.length}</span>
              </div>
              <div className="alert-items">
                {alerts.alumnosConPromedioBajo.map((alert, index) => (
                  <div key={index} className="alert-item">
                    <div className="alert-student-info">
                      {alert.estudiante.foto_url ? (
                        <Image
                          src={alert.estudiante.foto_url}
                          alt={`${alert.estudiante.nombre} ${alert.estudiante.apellido}`}
                          width={40}
                          height={40}
                          className="student-avatar"
                          unoptimized
                        />
                      ) : (
                        <div className="student-avatar-placeholder">
                          {alert.estudiante.nombre[0]}{alert.estudiante.apellido[0]}
                        </div>
                      )}
                      <div>
                        <strong>{alert.estudiante.nombre} {alert.estudiante.apellido}</strong>
                        <span className="alert-detail">
                          {alert.curso?.nombre || 'Sin curso'} • {alert.materia.nombre}
                        </span>
                      </div>
                    </div>
                    <div className="alert-metrics">
                      <span className="alert-average">Promedio: {alert.promedio.toFixed(2)}</span>
                      <span className="alert-count">({alert.totalCalificaciones} calificaciones)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alerts.alumnosSinIntentos.length > 0 && (
            <div className="alert-card no-attempts">
              <div className="alert-header">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3>Alumnos Sin Intentos</h3>
                <span className="alert-count">{alerts.alumnosSinIntentos.length}</span>
              </div>
              <div className="alert-items">
                {alerts.alumnosSinIntentos.map((alert, index) => (
                  <div key={index} className="alert-item">
                    <div className="alert-student-info">
                      {alert.estudiante.foto_url ? (
                        <Image
                          src={alert.estudiante.foto_url}
                          alt={`${alert.estudiante.nombre} ${alert.estudiante.apellido}`}
                          width={40}
                          height={40}
                          className="student-avatar"
                          unoptimized
                        />
                      ) : (
                        <div className="student-avatar-placeholder">
                          {alert.estudiante.nombre[0]}{alert.estudiante.apellido[0]}
                        </div>
                      )}
                      <div>
                        <strong>{alert.estudiante.nombre} {alert.estudiante.apellido}</strong>
                        <span className="alert-detail">
                          {alert.curso?.nombre || 'Sin curso'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sección 4: Vista Rápida por Curso */}
      {participation.length > 0 && (
        <div className="quick-view-section">
          <h2 className="section-title">Vista Rápida por Curso</h2>
          <div className="quick-view-cards">
            {participation.map((part) => (
              <div key={part.curso.id} className="quick-view-card">
                <div 
                  className="quick-view-header"
                  onClick={() => toggleCurso(part.curso.id)}
                >
                  <div>
                    <h3>{part.curso.nombre}</h3>
                    <span className="nivel-badge">{part.curso.nivel}</span>
                  </div>
                  <div className="quick-view-stats">
                    <span>{part.totalAlumnos} alumnos</span>
                    <svg 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      className={`expand-icon ${expandedCursos.has(part.curso.id) ? 'expanded' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {expandedCursos.has(part.curso.id) && (
                  <div className="quick-view-content">
                    <p className="quick-view-placeholder">
                      Lista de alumnos con estado y promedio general
                      <br />
                      <small>(Esta funcionalidad se completará en la siguiente iteración)</small>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

