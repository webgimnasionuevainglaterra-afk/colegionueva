'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import AdminCalendar from './AdminCalendar';
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
          <div className="stat-card">
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
          <div className="stat-card">
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
          <div className="stat-card">
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
          <div className="stat-card">
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
          <div className="stat-card">
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

      {/* Sección 2: Calendario Académico */}
      <div className="calendar-section">
        <AdminCalendar />
      </div>
    </div>
  );
}

