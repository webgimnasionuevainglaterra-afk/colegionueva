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

export default function StudentDetailView({ studentId, onClose }: StudentDetailViewProps) {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Agrupar quizes por materia
  const quizesPorMateria = trackingData?.intentosQuiz.reduce((acc: any, intento: any) => {
    const materiaNombre = intento.quizzes?.subtemas?.temas?.periodos?.materias?.nombre || 'Sin materia';
    if (!acc[materiaNombre]) {
      acc[materiaNombre] = [];
    }
    acc[materiaNombre].push(intento);
    return acc;
  }, {}) || {};

  // Agrupar evaluaciones por materia
  const evaluacionesPorMateria = trackingData?.intentosEvaluacion.reduce((acc: any, intento: any) => {
    const materiaNombre = intento.evaluaciones_periodo?.periodos?.materias?.nombre || 'Sin materia';
    if (!acc[materiaNombre]) {
      acc[materiaNombre] = [];
    }
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
              const promedioGeneral = (promedioQuizes + promedioEvaluaciones) / 2 || (promedioQuizes || promedioEvaluaciones);

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
                          }}>
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937' }}>
                                {intento.quizzes?.titulo || 'Sin título'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {new Date(intento.fecha_inicio).toLocaleDateString('es-CO')}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: intento.calificacion !== null ? '#1f2937' : '#6b7280',
                              }}>
                                {intento.calificacion !== null ? `${intento.calificacion.toFixed(2)} / 5.00` : 'En progreso'}
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: intento.estado === 'completado' ? '#10b981' : '#f59e0b',
                              }}>
                                {intento.estado === 'completado' ? 'Completado' : 'En progreso'}
                              </div>
                            </div>
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
                          }}>
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937' }}>
                                {intento.evaluaciones_periodo?.titulo || 'Sin título'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {new Date(intento.fecha_inicio).toLocaleDateString('es-CO')}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: intento.calificacion !== null ? '#1f2937' : '#6b7280',
                              }}>
                                {intento.calificacion !== null ? `${intento.calificacion.toFixed(2)} / 5.00` : 'En progreso'}
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: intento.estado === 'completado' ? '#10b981' : '#f59e0b',
                              }}>
                                {intento.estado === 'completado' ? 'Completado' : 'En progreso'}
                              </div>
                            </div>
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
    </div>
  );
}

