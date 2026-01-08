'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import Image from 'next/image';

interface EstudianteConCurso {
  estudiante: {
    id: string;
    nombre: string;
    apellido: string;
    edad: number;
    correo_electronico: string;
    numero_telefono: string | null;
    tarjeta_identidad: string;
    sexo: string | null;
    foto_url: string | null;
    is_active: boolean;
    is_online?: boolean;
    acudiente: any | null;
  };
  curso: {
    id: string;
    nombre: string;
    nivel: string;
  };
}

interface TrackingData {
  estudiante: any;
  intentosQuiz: any[];
  respuestas: any[];
  intentosEvaluacion: any[];
  estadisticas: {
    totalQuizes: number;
    quizesCompletados: number;
    promedioQuizes: number;
    totalEvaluaciones: number;
    evaluacionesCompletadas: number;
    promedioEvaluaciones: number;
    totalRespuestas: number;
    respuestasCorrectas: number;
    porcentajeAciertos: number;
  };
}

export default function TeacherReportsView() {
  const [estudiantes, setEstudiantes] = useState<EstudianteConCurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEstudiante, setSelectedEstudiante] = useState<EstudianteConCurso | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCurso, setSelectedCurso] = useState<string>('all');

  const fetchMyStudents = async () => {
    try {
      setLoading(true);
      setError(null);

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

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar los estudiantes');
      }

      setEstudiantes(result.data || []);
    } catch (err: any) {
      console.error('Error al obtener estudiantes:', err);
      setError(err.message || 'Error al cargar los estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentTracking = async (studentId: string) => {
    try {
      setLoadingTracking(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`/api/teachers/get-student-tracking?studentId=${studentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar el seguimiento');
      }

      setTrackingData(result.data);
    } catch (err: any) {
      console.error('Error al obtener seguimiento:', err);
      alert(err.message || 'Error al cargar el seguimiento del estudiante');
    } finally {
      setLoadingTracking(false);
    }
  };

  useEffect(() => {
    fetchMyStudents();
  }, []);

  const handleViewTracking = (estudiante: EstudianteConCurso) => {
    setSelectedEstudiante(estudiante);
    fetchStudentTracking(estudiante.estudiante.id);
  };

  const cursosUnicos = Array.from(
    new Set(estudiantes.map((e) => e.curso.id))
  ).map((id) => {
    const estudiante = estudiantes.find((e) => e.curso.id === id);
    return estudiante?.curso;
  });

  const estudiantesFiltrados = estudiantes.filter((e) => {
    const matchSearch =
      e.estudiante.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.estudiante.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.estudiante.tarjeta_identidad.includes(searchTerm);
    const matchCurso = selectedCurso === 'all' || e.curso.id === selectedCurso;
    return matchSearch && matchCurso;
  });

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Cargando estudiantes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>{error}</p>
        <button
          onClick={fetchMyStudents}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (trackingData && selectedEstudiante) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => {
              setTrackingData(null);
              setSelectedEstudiante(null);
            }}
            style={{
              padding: '0.5rem 1rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ← Volver
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937' }}>
            Seguimiento: {selectedEstudiante.estudiante.nombre} {selectedEstudiante.estudiante.apellido}
          </h2>
        </div>

        {loadingTracking ? (
          <p>Cargando seguimiento...</p>
        ) : (
          <div>
            {/* Estadísticas Generales */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Quizes</div>
                <div style={{ fontSize: '2rem', fontWeight: 600, color: '#1f2937' }}>
                  {trackingData.estadisticas.totalQuizes}
                </div>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Promedio Quizes</div>
                <div style={{ fontSize: '2rem', fontWeight: 600, color: '#2563eb' }}>
                  {trackingData.estadisticas.promedioQuizes.toFixed(2)}
                </div>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Evaluaciones</div>
                <div style={{ fontSize: '2rem', fontWeight: 600, color: '#1f2937' }}>
                  {trackingData.estadisticas.totalEvaluaciones}
                </div>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Promedio Evaluaciones</div>
                <div style={{ fontSize: '2rem', fontWeight: 600, color: '#2563eb' }}>
                  {trackingData.estadisticas.promedioEvaluaciones.toFixed(2)}
                </div>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>% Aciertos</div>
                <div style={{ fontSize: '2rem', fontWeight: 600, color: '#10b981' }}>
                  {trackingData.estadisticas.porcentajeAciertos.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Historial de Intentos de Quiz */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
                Historial de Quizes
              </h3>
              <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                        Quiz
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                        Materia
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                        Fecha
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                        Calificación
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackingData.intentosQuiz.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          No hay intentos de quiz registrados
                        </td>
                      </tr>
                    ) : (
                      trackingData.intentosQuiz.map((intento: any) => (
                        <tr key={intento.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '0.75rem', color: '#1f2937' }}>
                            {intento.quizzes?.titulo || 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem', color: '#1f2937' }}>
                            {intento.quizzes?.subtemas?.temas?.periodos?.materias?.nombre || 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem', color: '#1f2937' }}>
                            {new Date(intento.fecha_inicio).toLocaleDateString('es-CO')}
                          </td>
                          <td style={{ padding: '0.75rem', color: '#1f2937', fontWeight: 600 }}>
                            {intento.calificacion !== null ? `${intento.calificacion.toFixed(2)} / 5.00` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span
                              style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: intento.estado === 'completado' ? '#d1fae5' : '#fee2e2',
                                color: intento.estado === 'completado' ? '#065f46' : '#991b1b',
                              }}
                            >
                              {intento.estado === 'completado' ? 'Completado' : 'En progreso'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Historial de Evaluaciones de Periodo */}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
                Historial de Evaluaciones de Periodo
              </h3>
              <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                        Evaluación
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                        Materia
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                        Fecha
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                        Calificación
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackingData.intentosEvaluacion.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          No hay intentos de evaluación registrados
                        </td>
                      </tr>
                    ) : (
                      trackingData.intentosEvaluacion.map((intento: any) => (
                        <tr key={intento.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '0.75rem', color: '#1f2937' }}>
                            {intento.evaluaciones_periodo?.titulo || 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem', color: '#1f2937' }}>
                            {intento.evaluaciones_periodo?.periodos?.materias?.nombre || 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem', color: '#1f2937' }}>
                            {new Date(intento.fecha_inicio).toLocaleDateString('es-CO')}
                          </td>
                          <td style={{ padding: '0.75rem', color: '#1f2937', fontWeight: 600 }}>
                            {intento.calificacion !== null ? `${intento.calificacion.toFixed(2)} / 5.00` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span
                              style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: intento.estado === 'completado' ? '#d1fae5' : '#fee2e2',
                                color: intento.estado === 'completado' ? '#065f46' : '#991b1b',
                              }}
                            >
                              {intento.estado === 'completado' ? 'Completado' : 'En progreso'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1f2937' }}>
          Reportes de Estudiantes
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Visualiza el seguimiento y rendimiento de tus estudiantes
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Buscar por nombre o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          />
        </div>
        <div style={{ minWidth: '200px' }}>
          <select
            value={selectedCurso}
            onChange={(e) => setSelectedCurso(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            <option value="all">Todos los cursos</option>
            {cursosUnicos.map((curso) => (
              <option key={curso?.id} value={curso?.id}>
                {curso?.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Estudiantes */}
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {estudiantesFiltrados.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            <p>No hay estudiantes que coincidan con los filtros</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                  Estudiante
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                  Curso
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                  Cédula
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                  Estado
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {estudiantesFiltrados.map((item) => (
                <tr key={item.estudiante.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {item.estudiante.foto_url ? (
                        <Image
                          src={item.estudiante.foto_url}
                          alt={`${item.estudiante.nombre} ${item.estudiante.apellido}`}
                          width={40}
                          height={40}
                          style={{ borderRadius: '50%', objectFit: 'cover' }}
                          unoptimized
                        />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280',
                            fontWeight: 600,
                          }}
                        >
                          {item.estudiante.nombre.charAt(0)}
                          {item.estudiante.apellido.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: '#1f2937' }}>
                          {item.estudiante.nombre} {item.estudiante.apellido}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {item.estudiante.correo_electronico}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', color: '#1f2937' }}>
                    {item.curso.nombre} ({item.curso.nivel})
                  </td>
                  <td style={{ padding: '0.75rem', color: '#1f2937' }}>
                    {item.estudiante.tarjeta_identidad}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: item.estudiante.is_active ? '#d1fae5' : '#fee2e2',
                        color: item.estudiante.is_active ? '#065f46' : '#991b1b',
                      }}
                    >
                      {item.estudiante.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      onClick={() => handleViewTracking(item)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Ver Seguimiento
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

