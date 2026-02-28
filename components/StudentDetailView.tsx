'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import Image from 'next/image';
import '../app/css/teacher-sidebar.css';

interface Estudiante {
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
}

interface TrackingData {
  estudiante: Estudiante;
  intentosQuiz: any[];
  respuestas: any[];
  intentosEvaluacion: any[];
  notasMateriasPeriodos?: Array<{
    materiaId: string;
    periodoId: string;
    materiaNombre?: string;
    periodoNombre?: string;
    promedioQuizzes: number;
    notaEvaluacion: number;
    notaFinal: number;
    aprueba: boolean;
  }>;
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

interface StudentDetailViewProps {
  studentId: string;
  onClose: () => void;
}

interface RespuestaDetalle {
  pregunta: string;
  orden: number;
  es_correcta: boolean;
  opcionSeleccionada: string | null;
  opciones: Array<{ id: string; texto: string; es_correcta: boolean }>;
}

export default function StudentDetailView({ studentId, onClose }: StudentDetailViewProps) {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalRespuestas, setModalRespuestas] = useState<{
    quizEval: string;
    tipo: 'quiz' | 'evaluacion';
    respuestas: RespuestaDetalle[];
    loading: boolean;
  } | null>(null);

  useEffect(() => {
    fetchStudentTracking();
  }, [studentId]);

  const fetchStudentTracking = async () => {
    try {
      setLoading(true);
      setError(null);
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
      setError(err.message || 'Error al cargar el seguimiento del estudiante');
    } finally {
      setLoading(false);
    }
  };

  const verRespuestas = async (intentoId: string, nombre: string, tipo: 'quiz' | 'evaluacion') => {
    setModalRespuestas({ quizEval: nombre, tipo, respuestas: [], loading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setModalRespuestas((m) => m ? { ...m, loading: false, respuestas: [] } : null);
        return;
      }
      const res = await fetch(
        `/api/teachers/get-intento-respuestas?intento_id=${intentoId}&tipo=${tipo}`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar');
      setModalRespuestas((m) => m ? { ...m, respuestas: json.data || [], loading: false } : null);
    } catch {
      setModalRespuestas((m) => m ? { ...m, respuestas: [], loading: false } : null);
    }
  };

  // Agrupar quizes por materia (manejar arrays en relaciones anidadas)
  const quizesPorMateria = trackingData?.intentosQuiz.reduce((acc: any, intento: any) => {
    const quiz = intento.quizzes;
    const subtema = quiz?.subtemas ? (Array.isArray(quiz.subtemas) ? quiz.subtemas[0] : quiz.subtemas) : null;
    const tema = subtema?.temas ? (Array.isArray(subtema.temas) ? subtema.temas[0] : subtema.temas) : null;
    const periodo = tema?.periodos ? (Array.isArray(tema.periodos) ? tema.periodos[0] : tema.periodos) : null;
    const materia = periodo?.materias ? (Array.isArray(periodo.materias) ? periodo.materias[0] : periodo.materias) : null;
    const materiaNombre = materia?.nombre || 'Sin materia';
    if (!acc[materiaNombre]) acc[materiaNombre] = [];
    acc[materiaNombre].push(intento);
    return acc;
  }, {}) || {};

  // Agrupar evaluaciones por materia
  const evaluacionesPorMateria = trackingData?.intentosEvaluacion.reduce((acc: any, intento: any) => {
    const ep = intento.evaluaciones_periodo;
    const materia = ep?.materias ? (Array.isArray(ep.materias) ? ep.materias[0] : ep.materias) : null;
    const periodo = ep?.periodos ? (Array.isArray(ep.periodos) ? ep.periodos[0] : ep.periodos) : null;
    const matFromPeriodo = periodo?.materias ? (Array.isArray(periodo.materias) ? periodo.materias[0] : periodo.materias) : null;
    const materiaNombre = materia?.nombre || matFromPeriodo?.nombre || 'Sin materia';
    if (!acc[materiaNombre]) acc[materiaNombre] = [];
    acc[materiaNombre].push(intento);
    return acc;
  }, {}) || {};

  // Calcular promedio por materia
  const calcularPromedioPorMateria = (intentos: any[]) => {
    if (intentos.length === 0) return 0;
    const completados = intentos.filter((i: any) => i.estado === 'completado' && i.calificacion !== null);
    if (completados.length === 0) return 0;
    const suma = completados.reduce((sum: number, i: any) => sum + i.calificacion, 0);
    return suma / completados.length;
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Cargando información del estudiante...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>{error}</p>
        <button
          onClick={fetchStudentTracking}
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

  if (!trackingData) {
    return null;
  }

  const estudiante = trackingData.estudiante;
  const notasMateriasPeriodos = trackingData.notasMateriasPeriodos || [];

  return (
    <div className="student-detail-container">
      {/* Botón de cerrar */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={onClose}
          style={{
            padding: '0.5rem 1rem',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver
        </button>
      </div>

      {/* Tarjeta de Información del Estudiante */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div className="student-info-card">
          {/* Foto del Estudiante */}
          <div style={{ position: 'relative' }}>
            {estudiante.foto_url ? (
              <Image
                src={estudiante.foto_url}
                alt={`${estudiante.nombre} ${estudiante.apellido}`}
                width={120}
                height={120}
                style={{
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '3px solid #e5e7eb',
                }}
                unoptimized
              />
            ) : (
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '12px',
                background: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280',
                fontWeight: 600,
                fontSize: '2rem',
                border: '3px solid #e5e7eb',
              }}>
                {estudiante.nombre.charAt(0)}
                {estudiante.apellido.charAt(0)}
              </div>
            )}
            {/* Indicador de estado online */}
            <span 
              className={`online-status-indicator ${estudiante.is_online ? 'online' : 'offline'}`}
              title={estudiante.is_online ? 'En línea' : 'Desconectado'}
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: '3px solid white',
                zIndex: 10,
                background: estudiante.is_online ? '#10b981' : '#ef4444',
                boxShadow: estudiante.is_online 
                  ? '0 0 0 2px white, 0 0 4px rgba(16, 185, 129, 0.5)' 
                  : '0 0 0 2px white, 0 0 4px rgba(239, 68, 68, 0.5)',
              }}
            ></span>
          </div>

          {/* Información del Estudiante */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                {estudiante.nombre} {estudiante.apellido}
              </h2>
            </div>

            <div className="student-info-grid">
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Cédula</div>
                <div style={{ fontSize: '1rem', fontWeight: 500, color: '#1f2937' }}>{estudiante.tarjeta_identidad}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Edad</div>
                <div style={{ fontSize: '1rem', fontWeight: 500, color: '#1f2937' }}>{estudiante.edad} años</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Sexo</div>
                <div style={{ fontSize: '1rem', fontWeight: 500, color: '#1f2937' }}>
                  {estudiante.sexo === 'masculino' ? 'Masculino' : estudiante.sexo === 'femenino' ? 'Femenino' : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Correo Electrónico</div>
                <div style={{ fontSize: '1rem', fontWeight: 500, color: '#1f2937' }}>{estudiante.correo_electronico}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Teléfono</div>
                <div style={{ fontSize: '1rem', fontWeight: 500, color: '#1f2937' }}>
                  {estudiante.numero_telefono ? `🇨🇴 +57 ${estudiante.numero_telefono}` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Información del Acudiente */}
            {estudiante.acudiente && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.75rem' }}>
                  Datos del Acudiente
                </h3>
                <div className="student-info-grid">
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Nombre</div>
                    <div style={{ fontSize: '1rem', fontWeight: 500, color: '#1f2937' }}>
                      {estudiante.acudiente.nombre} {estudiante.acudiente.apellido}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Correo</div>
                    <div style={{ fontSize: '1rem', fontWeight: 500, color: '#1f2937' }}>
                      {estudiante.acudiente.correo_electronico || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Teléfono</div>
                    <div style={{ fontSize: '1rem', fontWeight: 500, color: '#1f2937' }}>
                      {estudiante.acudiente.numero_telefono ? `🇨🇴 +57 ${estudiante.acudiente.numero_telefono}` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen de notas por materia y periodo */}
      {notasMateriasPeriodos.length > 0 && (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '1rem',
              color: '#111827',
            }}
          >
            Rendimiento por materia y periodo
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                    Materia
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                    Periodo
                  </th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                    Prom. Quizes
                  </th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                    Eval. Periodo
                  </th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                    Nota final
                  </th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {notasMateriasPeriodos.map((n) => (
                  <tr key={`${n.materiaId}-${n.periodoId}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                      {n.materiaNombre || n.materiaId}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#111827' }}>
                      {n.periodoNombre || n.periodoId}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'center', color: '#4b5563' }}>
                      {n.promedioQuizzes.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'center', color: '#4b5563' }}>
                      {n.notaEvaluacion.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'center', fontWeight: 600, color: n.aprueba ? '#16a34a' : '#b91c1c' }}>
                      {n.notaFinal.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: n.aprueba ? '#dcfce7' : '#fee2e2',
                          color: n.aprueba ? '#166534' : '#b91c1c',
                        }}
                      >
                        {n.aprueba ? 'Aprueba' : 'No aprueba'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estadísticas Generales */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
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

      {/* Rendimiento por Materia */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1f2937' }}>
          Rendimiento por Materia
        </h3>

        {Object.keys(quizesPorMateria).length === 0 && Object.keys(evaluacionesPorMateria).length === 0 ? (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#6b7280',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <p>No hay registros de quizes o evaluaciones para este estudiante</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[...new Set([...Object.keys(quizesPorMateria), ...Object.keys(evaluacionesPorMateria)])].map((materia) => {
              const quizes = quizesPorMateria[materia] || [];
              const evaluaciones = evaluacionesPorMateria[materia] || [];
              const promedioQuizes = calcularPromedioPorMateria(quizes);
              const promedioEvaluaciones = calcularPromedioPorMateria(evaluaciones);
              // Promedio general ponderado: 70% quizes, 30% evaluaciones.
              const promedioGeneral = (promedioQuizes * 0.7) + (promedioEvaluaciones * 0.3);

              return (
                <div key={materia} style={{
                  background: 'white',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
                      {materia}
                    </h4>
                    <div style={{
                      padding: '0.5rem 1rem',
                      background: promedioGeneral >= 4 ? '#d1fae5' : promedioGeneral >= 3 ? '#fef3c7' : '#fee2e2',
                      color: promedioGeneral >= 4 ? '#065f46' : promedioGeneral >= 3 ? '#92400e' : '#991b1b',
                      borderRadius: '8px',
                      fontWeight: 600,
                    }}>
                      Promedio: {promedioGeneral.toFixed(2)}
                    </div>
                  </div>

                  <div className="materia-stats-grid">
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Quizes: {quizes.length} ({quizes.filter((q: any) => q.estado === 'completado').length} completados)
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2563eb' }}>
                        Promedio: {promedioQuizes.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Evaluaciones: {evaluaciones.length} ({evaluaciones.filter((e: any) => e.estado === 'completado').length} completadas)
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2563eb' }}>
                        Promedio: {promedioEvaluaciones.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Detalle de Quizes */}
                  {quizes.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem' }}>
                        Quizes Realizados:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {quizes.map((intento: any) => (
                          <div key={intento.id} style={{
                            padding: '0.75rem',
                            background: '#f9fafb',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.75rem',
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937' }}>
                                {intento.quizzes?.nombre || intento.quizzes?.titulo || 'Sin título'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {intento.completado && intento.fecha_fin
                                  ? new Date(intento.fecha_fin).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : new Date(intento.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: intento.calificacion != null ? '#1f2937' : '#6b7280',
                              }}>
                                {intento.calificacion != null ? `${Number(intento.calificacion).toFixed(2)} / 5.00` : 'En progreso'}
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: intento.estado === 'completado' ? '#10b981' : '#f59e0b',
                              }}>
                                {intento.estado === 'completado' ? 'Completado' : 'En progreso'}
                              </div>
                            </div>
                            {intento.estado === 'completado' && (
                              <button
                                type="button"
                                onClick={() => verRespuestas(intento.id, intento.quizzes?.nombre || intento.quizzes?.titulo || 'Quiz', 'quiz')}
                                style={{
                                  padding: '0.375rem 0.75rem',
                                  fontSize: '0.8125rem',
                                  fontWeight: 500,
                                  background: '#dbeafe',
                                  color: '#1d4ed8',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Ver respuestas
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detalle de Evaluaciones */}
                  {evaluaciones.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem' }}>
                        Evaluaciones Realizadas:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {evaluaciones.map((intento: any) => (
                          <div key={intento.id} style={{
                            padding: '0.75rem',
                            background: '#f9fafb',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.75rem',
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937' }}>
                                {intento.evaluaciones_periodo?.nombre || intento.evaluaciones_periodo?.titulo || 'Sin título'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {intento.completado && intento.fecha_fin
                                  ? new Date(intento.fecha_fin).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : new Date(intento.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: intento.calificacion != null ? '#1f2937' : '#6b7280',
                              }}>
                                {intento.calificacion != null ? `${Number(intento.calificacion).toFixed(2)} / 5.00` : 'En progreso'}
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: intento.estado === 'completado' ? '#10b981' : '#f59e0b',
                              }}>
                                {intento.estado === 'completado' ? 'Completado' : 'En progreso'}
                              </div>
                            </div>
                            {intento.estado === 'completado' && (
                              <button
                                type="button"
                                onClick={() => verRespuestas(intento.id, intento.evaluaciones_periodo?.nombre || intento.evaluaciones_periodo?.titulo || 'Evaluación', 'evaluacion')}
                                style={{
                                  padding: '0.375rem 0.75rem',
                                  fontSize: '0.8125rem',
                                  fontWeight: 500,
                                  background: '#dbeafe',
                                  color: '#1d4ed8',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Ver respuestas
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de respuestas (bien/mal) */}
      {modalRespuestas && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setModalRespuestas(null)}
        >
          <div
            style={{
              background: 'white',
              color: '#1f2937',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '560px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1f2937' }}>
                Respuestas: {modalRespuestas.quizEval}
              </h3>
              <button
                type="button"
                onClick={() => setModalRespuestas(null)}
                style={{
                  background: '#e5e7eb',
                  color: '#1f2937',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                }}
              >
                ×
              </button>
            </div>
            {modalRespuestas.loading ? (
              <p style={{ color: '#1f2937' }}>Cargando respuestas...</p>
            ) : modalRespuestas.respuestas.length === 0 ? (
              <p style={{ color: '#374151' }}>No hay respuestas registradas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {modalRespuestas.respuestas
                  .sort((a, b) => a.orden - b.orden)
                  .map((r, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: r.es_correcta ? '#d1fae5' : '#fee2e2',
                        border: `1px solid ${r.es_correcta ? '#10b981' : '#ef4444'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>{r.es_correcta ? '✓' : '✗'}</span>
                        <span style={{ fontWeight: 600, color: r.es_correcta ? '#065f46' : '#991b1b' }}>
                          {r.es_correcta ? 'Correcta' : 'Incorrecta'}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#1f2937' }}>{r.pregunta}</p>
                      {r.opciones?.length > 0 && (
                        <div style={{ fontSize: '0.85rem', color: '#374151' }}>
                          {r.opciones.map((o: any) => (
                            <div
                              key={o.id}
                              style={{
                                marginLeft: '0.5rem',
                                color: o.id === r.opcionSeleccionada ? '#1f2937' : '#374151',
                                fontWeight: o.id === r.opcionSeleccionada ? 600 : 400,
                              }}
                            >
                              {o.es_correcta ? '✓ ' : ''}{o.texto}
                              {o.id === r.opcionSeleccionada && ' (seleccionada)'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

