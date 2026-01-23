'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import CoursesPerformanceView from './CoursesPerformanceView';
import '../app/css/admin-dashboard.css';

interface DashboardStats {
  totalCursos: number;
  totalEstudiantes: number;
  estudiantesActivos: number;
  estudiantesInactivos: number;
  totalProfesores: number;
  profesoresActivos: number;
  profesoresInactivos: number;
  totalAdministradores: number;
  totalMaterias: number;
  totalQuizzes: number;
  totalEvaluaciones: number;
}

interface Alert {
  cursosSinProfesores: Array<{
    id: string;
    nombre: string;
    nivel: string;
  }>;
  estudiantesSinCursos: Array<{
    id: string;
    nombre: string;
    apellido: string;
  }>;
  profesoresSinCursos: Array<{
    id: string;
    nombre: string;
    apellido: string;
  }>;
  totalCursosSinProfesores: number;
  totalEstudiantesSinCursos: number;
  totalProfesoresSinCursos: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para modales
  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

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

      // Obtener estadísticas
      const statsRes = await fetch('/api/admin/get-dashboard-stats', { method: 'GET', headers });

      if (!statsRes.ok) {
        throw new Error('Error al cargar los datos del dashboard');
      }

      const statsData = await statsRes.json();

      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (err: any) {
      console.error('Error al obtener datos del dashboard:', err);
      setError(err.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchModalData = async (type: string) => {
    try {
      setModalLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      };

      let endpoint = '';
      switch (type) {
        case 'cursos':
          endpoint = '/api/courses/get-courses';
          break;
        case 'estudiantes':
          endpoint = '/api/estudiantes/get-estudiantes';
          break;
        case 'profesores':
          endpoint = '/api/teachers/get-teachers';
          break;
        case 'materias':
          endpoint = '/api/subjects/get-subjects';
          break;
        case 'quizzes':
          endpoint = '/api/quizzes/get-all-quizzes';
          break;
        case 'evaluaciones':
          endpoint = '/api/evaluaciones/get-all-evaluaciones';
          break;
        default:
          return;
      }

      const response = await fetch(endpoint, { method: 'GET', headers });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || `Error al cargar ${type}`);
      }

      const result = await response.json();
      setModalData(result.data || []);
    } catch (err: any) {
      console.error(`Error al obtener ${type}:`, err);
      setModalData([]);
      // Mostrar mensaje de error al usuario
      alert(`Error al cargar ${type}: ${err.message || 'Error desconocido'}`);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCardClick = (type: string) => {
    // Verificar si el valor es 0 antes de abrir el modal
    if (!stats) return;
    
    let value = 0;
    switch (type) {
      case 'cursos':
        value = stats.totalCursos;
        break;
      case 'estudiantes':
        value = stats.totalEstudiantes;
        break;
      case 'profesores':
        value = stats.totalProfesores;
        break;
      case 'materias':
        value = stats.totalMaterias;
        break;
      case 'quizzes':
        value = stats.totalQuizzes;
        break;
      case 'evaluaciones':
        value = stats.totalEvaluaciones;
        break;
    }
    
    if (value === 0) {
      alert(`No hay ${type} disponibles para mostrar`);
      return;
    }
    
    setModalOpen(type);
    fetchModalData(type);
  };

  const closeModal = () => {
    setModalOpen(null);
    setModalData([]);
  };

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <div className="dashboard-loading">
          <p>Cargando datos del dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-container">
        <div className="dashboard-error">
          <p>Error: {error}</p>
          <button onClick={fetchDashboardData}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <div className="dashboard-header-section">
        <h1 className="dashboard-title">Panel de Administración</h1>
        <p className="dashboard-subtitle">Resumen general de la plataforma educativa</p>
      </div>

      {/* Sección 1: Tarjetas de Estadísticas */}
      {stats && (
        <div className="stats-cards-section">
          {/* Total de Cursos */}
          <div className="stat-card" onClick={() => handleCardClick('cursos')} style={{ cursor: 'pointer' }}>
            <div className="stat-card-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="stat-card-content">
              <h3 className="stat-card-title">Total de Cursos</h3>
              <p className="stat-card-value">{stats.totalCursos}</p>
            </div>
          </div>

          {/* Total de Estudiantes */}
          <div className="stat-card" onClick={() => handleCardClick('estudiantes')} style={{ cursor: 'pointer' }}>
            <div className="stat-card-icon green">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="stat-card-content">
              <h3 className="stat-card-title">Total de Estudiantes</h3>
              <p className="stat-card-value">{stats.totalEstudiantes}</p>
              <p className="stat-card-subtitle">
                {stats.estudiantesActivos} activos • {stats.estudiantesInactivos} inactivos
              </p>
            </div>
          </div>

          {/* Total de Profesores */}
          <div className="stat-card" onClick={() => handleCardClick('profesores')} style={{ cursor: 'pointer' }}>
            <div className="stat-card-icon purple">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="stat-card-content">
              <h3 className="stat-card-title">Total de Profesores</h3>
              <p className="stat-card-value">{stats.totalProfesores}</p>
              <p className="stat-card-subtitle">
                {stats.profesoresActivos} activos • {stats.profesoresInactivos} inactivos
              </p>
            </div>
          </div>


          {/* Total de Materias */}
          <div className="stat-card" onClick={() => handleCardClick('materias')} style={{ cursor: 'pointer' }}>
            <div className="stat-card-icon teal">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="stat-card-content">
              <h3 className="stat-card-title">Total de Materias</h3>
              <p className="stat-card-value">{stats.totalMaterias}</p>
            </div>
          </div>

          {/* Total de Quizzes */}
          <div 
            className="stat-card" 
            onClick={() => handleCardClick('quizzes')} 
            style={{ 
              cursor: stats.totalQuizzes > 0 ? 'pointer' : 'not-allowed',
              opacity: stats.totalQuizzes > 0 ? 1 : 0.6
            }}
          >
            <div className="stat-card-icon yellow">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="stat-card-content">
              <h3 className="stat-card-title">Quizzes Creados</h3>
              <p className="stat-card-value">{stats.totalQuizzes}</p>
            </div>
          </div>

          {/* Total de Evaluaciones */}
          <div 
            className="stat-card" 
            onClick={() => handleCardClick('evaluaciones')} 
            style={{ 
              cursor: stats.totalEvaluaciones > 0 ? 'pointer' : 'not-allowed',
              opacity: stats.totalEvaluaciones > 0 ? 1 : 0.6
            }}
          >
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

      {/* Sección de Rendimiento por Curso y Materia */}
      <CoursesPerformanceView />

      {/* Modal para mostrar información detallada */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal} style={{ zIndex: 2000 }}>
          <div className="modal-container" style={{ maxWidth: '800px', maxHeight: '90vh', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalOpen === 'cursos' && 'Lista de Cursos'}
                {modalOpen === 'estudiantes' && 'Lista de Estudiantes'}
                {modalOpen === 'profesores' && 'Lista de Profesores'}
                {modalOpen === 'materias' && 'Lista de Materias'}
                {modalOpen === 'quizzes' && 'Lista de Quizzes'}
                {modalOpen === 'evaluaciones' && 'Lista de Evaluaciones'}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
              {modalLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <p>Cargando datos...</p>
                </div>
              ) : modalData.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <p>No hay datos disponibles</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {modalOpen === 'cursos' && modalData.map((curso: any) => (
                    <div key={curso.id} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>{curso.nombre}</h3>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280' }}>Nivel: {curso.nivel || 'N/A'}</p>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280' }}>
                        Profesores: {curso.profesores?.length || 0} | Estudiantes: {curso.estudiantes?.length || 0}
                      </p>
                    </div>
                  ))}
                  {modalOpen === 'estudiantes' && modalData.map((estudiante: any) => (
                    <div key={estudiante.id} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
                        {estudiante.nombre} {estudiante.apellido}
                      </h3>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280' }}>Email: {estudiante.correo_electronico || 'N/A'}</p>
                      <p style={{ margin: '0', color: estudiante.is_active ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                        {estudiante.is_active ? 'Activo' : 'Inactivo'}
                      </p>
                    </div>
                  ))}
                  {modalOpen === 'profesores' && modalData.map((profesor: any) => (
                    <div key={profesor.id} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
                        {profesor.nombre} {profesor.apellido}
                      </h3>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280' }}>Email: {profesor.email || 'N/A'}</p>
                      <p style={{ margin: '0', color: profesor.is_active ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                        {profesor.is_active ? 'Activo' : 'Inactivo'}
                      </p>
                    </div>
                  ))}
                  {modalOpen === 'materias' && modalData.map((materia: any) => (
                    <div key={materia.id} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>{materia.nombre}</h3>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280' }}>
                        Curso: {materia.cursos?.nombre || 'N/A'} {materia.cursos?.nivel ? `(${materia.cursos.nivel})` : ''}
                      </p>
                    </div>
                  ))}
                  {modalOpen === 'quizzes' && modalData.map((quiz: any) => (
                    <div key={quiz.id} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>{quiz.nombre || 'Sin nombre'}</h3>
                      {quiz.descripcion && (
                        <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem' }}>{quiz.descripcion}</p>
                      )}
                      <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280' }}>
                        Subtema: {quiz.subtemas?.nombre || 'N/A'}
                        {quiz.subtemas?.temas?.nombre && ` • Tema: ${quiz.subtemas.temas.nombre}`}
                      </p>
                      <p style={{ margin: '0', color: quiz.is_active ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                        {quiz.is_active ? 'Activo' : 'Inactivo'}
                      </p>
                    </div>
                  ))}
                  {modalOpen === 'evaluaciones' && modalData.map((evaluacion: any) => (
                    <div key={evaluacion.id} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>{evaluacion.titulo || 'Sin título'}</h3>
                      {evaluacion.descripcion && (
                        <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem' }}>{evaluacion.descripcion}</p>
                      )}
                      <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280' }}>
                        Periodo: {evaluacion.periodos?.nombre || 'N/A'}
                        {evaluacion.periodos?.materias?.nombre && ` • Materia: ${evaluacion.periodos.materias.nombre}`}
                      </p>
                      <p style={{ margin: '0', color: evaluacion.is_active ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                        {evaluacion.is_active ? 'Activa' : 'Inactiva'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

