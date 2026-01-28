'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import Image from 'next/image';
import '../app/css/evaluations-results.css';

interface EstudianteResultado {
  estudiante: {
    id: string;
    nombre: string;
    apellido: string;
    foto_url?: string;
  };
  intento: {
    id: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    calificacion: number | null;
    completado: boolean;
  } | null;
  estado: 'completado' | 'en_progreso' | 'pendiente';
}

interface Estadisticas {
  total: number;
  completados: number;
  pendientes: number;
  promedio: number;
}

interface ResultadoEvaluacion {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: 'quiz' | 'evaluacion';
  fecha_inicio: string;
  fecha_fin: string;
  curso: {
    id: string;
    nombre: string;
    nivel: string;
  };
  materia: {
    id: string;
    nombre: string;
  };
  periodo: {
    id: string;
    nombre: string;
  };
  subtema?: {
    id: string;
    nombre: string;
  };
  estudiantes: EstudianteResultado[];
  estadisticas: Estadisticas;
}

export default function EvaluationsResultsView() {
  const [resultados, setResultados] = useState<ResultadoEvaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filtros, setFiltros] = useState({
    curso: '',
    materia: '',
    periodo: '',
    tipo: 'all' as 'all' | 'quiz' | 'evaluacion',
  });

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch('/api/teachers/get-evaluations-results', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar los resultados');
      }

      setResultados(result.data || []);
    } catch (err: any) {
      console.error('Error al obtener resultados:', err);
      setError(err.message || 'Error al cargar los resultados');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Obtener opciones únicas para los filtros
  const cursosUnicos = Array.from(new Set(resultados.map(r => r.curso.id)))
    .map(id => resultados.find(r => r.curso.id === id)?.curso)
    .filter(Boolean) as Array<{ id: string; nombre: string; nivel: string }>;

  const materiasUnicas = Array.from(new Set(
    resultados
      .filter(r => !filtros.curso || r.curso.id === filtros.curso)
      .map(r => r.materia.id)
    ))
    .map(id => resultados.find(r => r.materia.id === id)?.materia)
    .filter(Boolean) as Array<{ id: string; nombre: string }>;

  const periodosUnicos = Array.from(new Set(
    resultados
      .filter(r => {
        if (filtros.curso && r.curso.id !== filtros.curso) return false;
        if (filtros.materia && r.materia.id !== filtros.materia) return false;
        return true;
      })
      .map(r => r.periodo.id)
    ))
    .map(id => resultados.find(r => r.periodo.id === id)?.periodo)
    .filter(Boolean) as Array<{ id: string; nombre: string }>;

  // Filtrar resultados
  const resultadosFiltrados = resultados.filter(r => {
    if (filtros.curso && r.curso.id !== filtros.curso) return false;
    if (filtros.materia && r.materia.id !== filtros.materia) return false;
    if (filtros.periodo && r.periodo.id !== filtros.periodo) return false;
    if (filtros.tipo !== 'all' && r.tipo !== filtros.tipo) return false;
    return true;
  });

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completado':
        return '#10b981'; // Verde
      case 'en_progreso':
        return '#f59e0b'; // Naranja
      case 'pendiente':
        return '#ef4444'; // Rojo
      default:
        return '#6b7280';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'completado':
        return 'Completado';
      case 'en_progreso':
        return 'En Progreso';
      case 'pendiente':
        return 'Pendiente';
      default:
        return estado;
    }
  };

  if (loading) {
    return (
      <div className="evaluations-results-container">
        <div className="loading-state">
          <p>Cargando resultados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="evaluations-results-container">
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchResults} className="retry-btn">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="evaluations-results-container">
      <div className="results-header">
        <div>
          <h1 className="results-title">Resultados de Evaluaciones</h1>
          <p className="results-subtitle">
            Revisa los resultados de tus estudiantes en quizzes y evaluaciones de periodo
          </p>
        </div>
        <button onClick={fetchResults} className="refresh-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="filtro-curso">Curso:</label>
          <select
            id="filtro-curso"
            value={filtros.curso}
            onChange={(e) => {
              setFiltros(prev => ({ ...prev, curso: e.target.value, materia: '', periodo: '' }));
            }}
            className="filter-select"
          >
            <option value="">Todos los cursos</option>
            {cursosUnicos.map(curso => (
              <option key={curso.id} value={curso.id}>
                {curso.nombre} ({curso.nivel})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filtro-materia">Materia:</label>
          <select
            id="filtro-materia"
            value={filtros.materia}
            onChange={(e) => {
              setFiltros(prev => ({ ...prev, materia: e.target.value, periodo: '' }));
            }}
            className="filter-select"
            disabled={!filtros.curso}
          >
            <option value="">Todas las materias</option>
            {materiasUnicas.map(materia => (
              <option key={materia.id} value={materia.id}>
                {materia.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filtro-periodo">Periodo:</label>
          <select
            id="filtro-periodo"
            value={filtros.periodo}
            onChange={(e) => setFiltros(prev => ({ ...prev, periodo: e.target.value }))}
            className="filter-select"
            disabled={!filtros.materia}
          >
            <option value="">Todos los periodos</option>
            {periodosUnicos.map(periodo => (
              <option key={periodo.id} value={periodo.id}>
                {periodo.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filtro-tipo">Tipo:</label>
          <select
            id="filtro-tipo"
            value={filtros.tipo}
            onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value as any }))}
            className="filter-select"
          >
            <option value="all">Todos</option>
            <option value="quiz">Quizzes</option>
            <option value="evaluacion">Evaluaciones</option>
          </select>
        </div>

        <button
          onClick={() => setFiltros({ curso: '', materia: '', periodo: '', tipo: 'all' })}
          className="clear-filters-btn"
        >
          Limpiar Filtros
        </button>
      </div>

      {/* Lista de Resultados */}
      {resultadosFiltrados.length === 0 ? (
        <div className="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No hay resultados disponibles con los filtros seleccionados</p>
        </div>
      ) : (
        <div className="results-list">
          {resultadosFiltrados.map((resultado) => {
            const isExpanded = expandedItems.has(resultado.id);
            const tipoColor = resultado.tipo === 'quiz' ? '#10b981' : '#f59e0b';
            const tipoLabel = resultado.tipo === 'quiz' ? 'Quiz' : 'Evaluación';

            return (
              <div key={resultado.id} className="result-card">
                <div
                  className="result-card-header"
                  onClick={() => toggleExpand(resultado.id)}
                >
                  <div className="result-card-info">
                    <div className="result-title-row">
                      <span
                        className="result-type-badge"
                        style={{ backgroundColor: tipoColor }}
                      >
                        {tipoLabel}
                      </span>
                      <h3 className="result-name">{resultado.nombre}</h3>
                    </div>
                    <div className="result-meta">
                      <span className="result-meta-item">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {resultado.curso.nombre} - {resultado.materia.nombre}
                      </span>
                      <span className="result-meta-item">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {resultado.periodo.nombre}
                      </span>
                      {resultado.subtema && (
                        <span className="result-meta-item">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {resultado.subtema.nombre}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="result-stats-summary">
                    <div className="stat-summary-item">
                      <span className="stat-label">Promedio:</span>
                      <span className="stat-value">{resultado.estadisticas.promedio.toFixed(2)}</span>
                    </div>
                    <div className="stat-summary-item">
                      <span className="stat-label">Completados:</span>
                      <span className="stat-value" style={{ color: '#10b981' }}>
                        {resultado.estadisticas.completados}/{resultado.estadisticas.total}
                      </span>
                    </div>
                    <svg
                      className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="result-card-body">
                    <div className="result-stats-detail">
                      <div className="stat-detail-card">
                        <div className="stat-detail-value">{resultado.estadisticas.total}</div>
                        <div className="stat-detail-label">Total Estudiantes</div>
                      </div>
                      <div className="stat-detail-card">
                        <div className="stat-detail-value" style={{ color: '#10b981' }}>
                          {resultado.estadisticas.completados}
                        </div>
                        <div className="stat-detail-label">Completados</div>
                      </div>
                      <div className="stat-detail-card">
                        <div className="stat-detail-value" style={{ color: '#ef4444' }}>
                          {resultado.estadisticas.pendientes}
                        </div>
                        <div className="stat-detail-label">Pendientes</div>
                      </div>
                      <div className="stat-detail-card">
                        <div className="stat-detail-value" style={{ color: '#3b82f6' }}>
                          {resultado.estadisticas.promedio.toFixed(2)}
                        </div>
                        <div className="stat-detail-label">Promedio</div>
                      </div>
                    </div>

                    <div className="students-table-wrapper">
                      <table className="students-table">
                        <thead>
                          <tr>
                            <th>Estudiante</th>
                            <th>Estado</th>
                            <th>Calificación</th>
                            <th>Fecha de Realización</th>
                            <th>Tiempo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultado.estudiantes.map((item) => (
                            <tr key={item.estudiante.id}>
                              <td>
                                <div className="student-cell">
                                  {item.estudiante.foto_url ? (
                                    <Image
                                      src={item.estudiante.foto_url}
                                      alt={`${item.estudiante.nombre} ${item.estudiante.apellido}`}
                                      width={32}
                                      height={32}
                                      className="student-avatar"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="student-avatar-placeholder">
                                      {item.estudiante.nombre.charAt(0)}{item.estudiante.apellido.charAt(0)}
                                    </div>
                                  )}
                                  <span className="student-name">
                                    {item.estudiante.nombre} {item.estudiante.apellido}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span
                                  className="status-badge"
                                  style={{ backgroundColor: getEstadoColor(item.estado) }}
                                >
                                  {getEstadoLabel(item.estado)}
                                </span>
                              </td>
                              <td>
                                {item.intento?.calificacion !== null && item.intento?.calificacion !== undefined ? (
                                  <span
                                    className={`calificacion ${
                                      parseFloat(item.intento.calificacion) >= 3.7 ? 'aprobado' : 'reprobado'
                                    }`}
                                  >
                                    {parseFloat(item.intento.calificacion).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="calificacion-sin-dato">-</span>
                                )}
                              </td>
                              <td>
                                {item.intento?.fecha_fin ? (
                                  <span className="fecha-text">
                                    {new Date(item.intento.fecha_fin).toLocaleString('es-ES', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                ) : item.intento?.fecha_inicio ? (
                                  <span className="fecha-text" style={{ color: '#f59e0b' }}>
                                    En progreso desde {new Date(item.intento.fecha_inicio).toLocaleString('es-ES', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                ) : (
                                  <span className="fecha-text" style={{ color: '#ef4444' }}>
                                    No iniciado
                                  </span>
                                )}
                              </td>
                              <td>
                                {item.intento?.fecha_inicio && item.intento?.fecha_fin ? (
                                  <span className="tiempo-text">
                                    {Math.round(
                                      (new Date(item.intento.fecha_fin).getTime() - new Date(item.intento.fecha_inicio).getTime()) / 1000 / 60
                                    )} min
                                  </span>
                                ) : (
                                  <span className="tiempo-text">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}




