'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import CreatePeriodForm from './CreatePeriodForm';
import EditPeriodForm from './EditPeriodForm';
import PeriodContentManager from './PeriodContentManager';
import '../app/css/create-admin.css';
import '../app/css/course-subjects.css';

interface Period {
  id: string;
  materia_id: string;
  numero_periodo: number;
  nombre: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
  updated_at: string;
  materias?: {
    nombre: string;
    horas_totales: number;
  };
}

interface SubjectPeriodsManagerProps {
  subjectId: string;
  subjectName: string;
  onClose: () => void;
}

export default function SubjectPeriodsManager({ 
  subjectId, 
  subjectName, 
  onClose 
}: SubjectPeriodsManagerProps) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [managingContentPeriod, setManagingContentPeriod] = useState<Period | null>(null);
  const [isCreateEvaluacionModalOpen, setIsCreateEvaluacionModalOpen] = useState(false);
  const [selectedPeriodForEvaluacion, setSelectedPeriodForEvaluacion] = useState<Period | null>(null);
  const [evaluacionToEdit, setEvaluacionToEdit] = useState<any | null>(null);
  const [isViewEvaluacionesModalOpen, setIsViewEvaluacionesModalOpen] = useState(false);
  const [selectedPeriodForViewEvaluaciones, setSelectedPeriodForViewEvaluaciones] = useState<Period | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [loadingEvaluaciones, setLoadingEvaluaciones] = useState(false);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/periods/get-periods?materia_id=${subjectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar los periodos');
      }

      setPeriods(result.data || []);
    } catch (err: any) {
      console.error('Error al obtener periodos:', err);
      setError(err.message || 'Error al cargar los periodos');
    } finally {
      setLoading(false);
    }
  };

  // Cargar evaluaciones de un periodo
  const fetchEvaluaciones = async (periodoId: string, materiaId: string) => {
    setLoadingEvaluaciones(true);
    try {
      const response = await fetch(`/api/evaluaciones/get-evaluacion?periodo_id=${periodoId}&materia_id=${materiaId}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar evaluaciones');
      }
      setEvaluaciones(result.data || []);
    } catch (err: any) {
      console.error('Error al cargar evaluaciones:', err);
      setEvaluaciones([]);
    } finally {
      setLoadingEvaluaciones(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, [subjectId, refreshKey]);

  const handleDelete = async (periodId: string, periodName: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el "${periodName}"?\n\nEsta acción eliminará también todos los temas, subtemas y contenido asociados a este periodo.`)) {
      try {
        setLoading(true);
        const response = await fetch(`/api/periods/delete-period?id=${periodId}`, {
          method: 'DELETE',
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (response.ok) {
          setRefreshKey(prev => prev + 1);
        } else {
          alert(result.error || 'Error al eliminar el periodo');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error al eliminar periodo:', err);
        alert(err.message || 'Error al eliminar el periodo');
        setLoading(false);
      }
    }
  };

  const getPeriodNumberName = (numero: number) => {
    const names = ['', 'Primer', 'Segundo', 'Tercer', 'Cuarto'];
    return names[numero] || `Periodo ${numero}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container course-subjects-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Periodos de la Materia</h2>
            <p className="modal-subtitle">{subjectName}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="subjects-header">
            <button
              className="create-subject-btn"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar Periodo
            </button>
          </div>

          {loading && periods.length === 0 ? (
            <div className="loading-state">
              <p>Cargando periodos...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{error}</p>
            </div>
          ) : periods.length === 0 ? (
            <div className="empty-state">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>No hay periodos creados aún</p>
              <span>Agrega periodos usando el botón "Agregar Periodo"</span>
            </div>
          ) : (
            <div className="subjects-list">
              {periods.map((period) => (
                <div key={period.id} className="subject-card">
                  <div className="subject-info">
                    <div className="subject-header">
                      <h3 className="subject-name">{period.nombre}</h3>
                      <span className="period-number-badge">
                        {getPeriodNumberName(period.numero_periodo)} Periodo
                      </span>
                    </div>
                    {(period.fecha_inicio || period.fecha_fin) && (
                      <div className="period-dates">
                        {period.fecha_inicio && (
                          <span className="date-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Inicio: {new Date(period.fecha_inicio).toLocaleDateString('es-ES')}
                          </span>
                        )}
                        {period.fecha_fin && (
                          <span className="date-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Fin: {new Date(period.fecha_fin).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="subject-actions">
                    <button
                      className="action-btn subjects-btn"
                      title="Gestionar contenido"
                      onClick={() => setManagingContentPeriod(period)}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Contenido
                    </button>
                    <button
                      className="action-btn subjects-btn"
                      title="Crear/Editar evaluación del periodo"
                      onClick={() => {
                        setSelectedPeriodForEvaluacion(period);
                        setEvaluacionToEdit(null);
                        setIsCreateEvaluacionModalOpen(true);
                      }}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4h10a1 1 0 011 1v15l-4-2-4 2-4-2-4 2V5a1 1 0 011-1h4" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6M9 12h3" />
                      </svg>
                    </button>
                    <button
                      className="action-btn subjects-btn"
                      title="Ver evaluaciones del periodo"
                      onClick={async () => {
                        setSelectedPeriodForViewEvaluaciones(period);
                        setIsViewEvaluacionesModalOpen(true);
                        await fetchEvaluaciones(period.id, subjectId);
                      }}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      className="action-btn edit-btn"
                      title="Editar periodo"
                      onClick={() => setEditingPeriod(period)}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      className="action-btn delete-btn"
                      title="Eliminar periodo"
                      onClick={() => handleDelete(period.id, period.nombre)}
                      disabled={loading}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <CreatePeriodForm
          subjectId={subjectId}
          subjectName={subjectName}
          onClose={() => setIsCreateModalOpen(false)}
          onPeriodCreated={() => {
            setIsCreateModalOpen(false);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {editingPeriod && (
        <EditPeriodForm
          period={editingPeriod}
          subjectName={subjectName}
          onClose={() => setEditingPeriod(null)}
          onPeriodUpdated={() => {
            setEditingPeriod(null);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {managingContentPeriod && (
        <PeriodContentManager
          periodId={managingContentPeriod.id}
          periodName={managingContentPeriod.nombre}
          subjectName={subjectName}
          onClose={() => setManagingContentPeriod(null)}
        />
      )}

      {/* Modal crear/editar evaluación */}
      {isCreateEvaluacionModalOpen && selectedPeriodForEvaluacion && (
        <CreateEvaluacionModal
          onClose={() => {
            setIsCreateEvaluacionModalOpen(false);
            setSelectedPeriodForEvaluacion(null);
            setEvaluacionToEdit(null);
          }}
          periodoId={selectedPeriodForEvaluacion.id}
          materiaId={subjectId}
          evaluacionToEdit={evaluacionToEdit}
          onSuccess={() => {
            setRefreshKey(prev => prev + 1);
            if (selectedPeriodForViewEvaluaciones) {
              fetchEvaluaciones(selectedPeriodForViewEvaluaciones.id, subjectId);
            }
            setEvaluacionToEdit(null);
          }}
        />
      )}

      {/* Modal para ver evaluaciones creadas */}
      {isViewEvaluacionesModalOpen && selectedPeriodForViewEvaluaciones && (
        <div className="modal-overlay" onClick={() => {
          setIsViewEvaluacionesModalOpen(false);
          setSelectedPeriodForViewEvaluaciones(null);
          setEvaluaciones([]);
        }} style={{ zIndex: 2000 }}>
          <div className="modal-container" style={{ maxWidth: '800px', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Evaluaciones del Periodo</h2>
              <button className="modal-close-btn" onClick={() => {
                setIsViewEvaluacionesModalOpen(false);
                setSelectedPeriodForViewEvaluaciones(null);
                setEvaluaciones([]);
              }}>×</button>
            </div>
            <div className="modal-body">
              {loadingEvaluaciones ? (
                <p style={{ textAlign: 'center', color: '#6b7280' }}>Cargando evaluaciones...</p>
              ) : evaluaciones.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280' }}>No hay evaluaciones creadas para este periodo.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {evaluaciones.map((evaluacion) => (
                    <div key={evaluacion.id} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '1rem',
                      background: '#f9fafb',
                      color: '#1f2937',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
                            {evaluacion.nombre}
                          </h3>
                          {evaluacion.descripcion && (
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                              {evaluacion.descripcion}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/evaluaciones/get-evaluacion?evaluacion_id=${evaluacion.id}`);
                                const result = await response.json();
                                if (result.data) {
                                  setEvaluacionToEdit(result.data);
                                  setSelectedPeriodForEvaluacion(selectedPeriodForViewEvaluaciones);
                                  setIsViewEvaluacionesModalOpen(false);
                                  setIsCreateEvaluacionModalOpen(true);
                                }
                              } catch (err) {
                                console.error('Error al cargar evaluación:', err);
                                alert('Error al cargar la evaluación para editar');
                              }
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('¿Estás seguro de que deseas eliminar esta evaluación?')) {
                                try {
                                  const response = await fetch(`/api/evaluaciones/delete-evaluacion?id=${evaluacion.id}`, {
                                    method: 'DELETE',
                                  });
                                  if (response.ok) {
                                    await fetchEvaluaciones(selectedPeriodForViewEvaluaciones.id, subjectId);
                                  } else {
                                    const result = await response.json();
                                    alert(result.error || 'Error al eliminar la evaluación');
                                  }
                                } catch (err) {
                                  console.error('Error al eliminar evaluación:', err);
                                  alert('Error al eliminar la evaluación');
                                }
                              }
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        <div>
                          <strong>Inicio:</strong> {new Date(evaluacion.fecha_inicio).toLocaleString('es-ES')}
                        </div>
                        <div>
                          <strong>Fin:</strong> {new Date(evaluacion.fecha_fin).toLocaleString('es-ES')}
                        </div>
                        <div>
                          <strong>Tiempo por pregunta:</strong> {evaluacion.tiempo_por_pregunta_segundos}s
                        </div>
                      </div>
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

// Modal para crear/editar evaluación del periodo (similar a CreateQuizModal)
function CreateEvaluacionModal({
  onClose,
  periodoId,
  materiaId,
  onSuccess,
  evaluacionToEdit,
}: {
  onClose: () => void;
  periodoId: string;
  materiaId: string;
  onSuccess: () => void;
  evaluacionToEdit?: any;
}) {
  const [nombre, setNombre] = useState(evaluacionToEdit?.nombre || '');
  const [descripcion, setDescripcion] = useState(evaluacionToEdit?.descripcion || '');
  const [fechaInicio, setFechaInicio] = useState(evaluacionToEdit?.fecha_inicio ? new Date(evaluacionToEdit.fecha_inicio).toISOString().slice(0, 16) : '');
  const [fechaFin, setFechaFin] = useState(evaluacionToEdit?.fecha_fin ? new Date(evaluacionToEdit.fecha_fin).toISOString().slice(0, 16) : '');
  // Calcular isActive inicial basado en fechas si no hay evaluación para editar
  const calcularIsActiveInicial = () => {
    if (evaluacionToEdit?.is_active !== undefined) {
      return evaluacionToEdit.is_active;
    }
    // Si no hay fechas aún, por defecto true
    if (!fechaInicio || !fechaFin) {
      return true;
    }
    // Calcular basado en fechas: activo si la fecha actual está entre inicio y fin
    const ahora = new Date();
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    return ahora >= inicio && ahora <= fin;
  };
  
  const [isActive, setIsActive] = useState(calcularIsActiveInicial());
  const [isManuallySet, setIsManuallySet] = useState(evaluacionToEdit?.is_active !== undefined);
  const [preguntas, setPreguntas] = useState<Array<{
    id?: string;
    pregunta_texto: string;
    tiempo_segundos: number;
    opciones: Array<{
      id?: string;
      texto: string;
      es_correcta: boolean;
      explicacion: string;
    }>;
  }>>(evaluacionToEdit?.preguntas?.map((p: any) => ({
    id: p.id,
    pregunta_texto: p.pregunta_texto,
    tiempo_segundos: p.tiempo_segundos || 30,
    opciones: p.opciones?.map((o: any) => ({
      id: o.id,
      texto: o.texto,
      es_correcta: o.es_correcta,
      explicacion: o.explicacion || '',
    })) || [],
  })) || []);
  const [saving, setSaving] = useState(false);
  const [loadingEvaluacion, setLoadingEvaluacion] = useState(false);

  // Cargar datos de la evaluación si se está editando
  useEffect(() => {
    if (evaluacionToEdit?.id) {
      setLoadingEvaluacion(true);
      fetch(`/api/evaluaciones/get-evaluacion?evaluacion_id=${evaluacionToEdit.id}`)
        .then(res => res.json())
        .then(result => {
          if (result.data) {
            const evaluacion = result.data;
            setNombre(evaluacion.nombre);
            setDescripcion(evaluacion.descripcion || '');
            setFechaInicio(new Date(evaluacion.fecha_inicio).toISOString().slice(0, 16));
            setFechaFin(new Date(evaluacion.fecha_fin).toISOString().slice(0, 16));
            setIsActive(evaluacion.is_active !== undefined ? evaluacion.is_active : true);
            setPreguntas(evaluacion.preguntas?.map((p: any) => ({
              id: p.id,
              pregunta_texto: p.pregunta_texto,
              tiempo_segundos: p.tiempo_segundos || 30,
              opciones: p.opciones?.map((o: any) => ({
                id: o.id,
                texto: o.texto,
                es_correcta: o.es_correcta,
                explicacion: o.explicacion || '',
              })) || [],
            })) || []);
          }
        })
        .catch(err => {
          console.error('Error al cargar evaluación:', err);
        })
        .finally(() => {
          setLoadingEvaluacion(false);
        });
    } else {
      // Establecer fechas por defecto (ahora y 7 días después) solo si no hay evaluación para editar
      const ahora = new Date();
      const en7Dias = new Date();
      en7Dias.setDate(ahora.getDate() + 7);
      
      const formatoFecha = (fecha: Date) => {
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        const horas = String(fecha.getHours()).padStart(2, '0');
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        return `${año}-${mes}-${dia}T${horas}:${minutos}`;
      };

      if (!fechaInicio) setFechaInicio(formatoFecha(ahora));
      if (!fechaFin) setFechaFin(formatoFecha(en7Dias));
    }
  }, [evaluacionToEdit]);

  const agregarPregunta = () => {
    setPreguntas([...preguntas, {
      pregunta_texto: '',
      tiempo_segundos: 30,
      opciones: [
        { texto: '', es_correcta: false, explicacion: '' },
        { texto: '', es_correcta: false, explicacion: '' },
      ],
    }]);
  };

  const eliminarPregunta = (index: number) => {
    setPreguntas(preguntas.filter((_, i) => i !== index));
  };

  const actualizarPregunta = (index: number, campo: string, valor: any) => {
    const nuevasPreguntas = [...preguntas];
    if (campo === 'pregunta_texto') {
      nuevasPreguntas[index].pregunta_texto = valor;
    } else if (campo === 'tiempo_segundos') {
      nuevasPreguntas[index].tiempo_segundos = parseInt(valor) || 30;
    }
    setPreguntas(nuevasPreguntas);
  };

  const agregarOpcion = (preguntaIndex: number) => {
    const nuevasPreguntas = [...preguntas];
    nuevasPreguntas[preguntaIndex].opciones.push({
      texto: '',
      es_correcta: false,
      explicacion: '',
    });
    setPreguntas(nuevasPreguntas);
  };

  const eliminarOpcion = (preguntaIndex: number, opcionIndex: number) => {
    const nuevasPreguntas = [...preguntas];
    if (nuevasPreguntas[preguntaIndex].opciones.length > 2) {
      nuevasPreguntas[preguntaIndex].opciones = nuevasPreguntas[preguntaIndex].opciones.filter((_, i) => i !== opcionIndex);
      setPreguntas(nuevasPreguntas);
    } else {
      alert('Cada pregunta debe tener al menos 2 opciones');
    }
  };

  const actualizarOpcion = (preguntaIndex: number, opcionIndex: number, campo: string, valor: any) => {
    const nuevasPreguntas = [...preguntas];
    if (campo === 'texto') {
      nuevasPreguntas[preguntaIndex].opciones[opcionIndex].texto = valor;
    } else if (campo === 'es_correcta') {
      // Solo una opción puede ser correcta por pregunta
      nuevasPreguntas[preguntaIndex].opciones.forEach((op, i) => {
        op.es_correcta = i === opcionIndex;
      });
    } else if (campo === 'explicacion') {
      nuevasPreguntas[preguntaIndex].opciones[opcionIndex].explicacion = valor;
    }
    setPreguntas(nuevasPreguntas);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      alert('El nombre de la evaluación es requerido');
      return;
    }

    if (preguntas.length === 0) {
      alert('Debes agregar al menos una pregunta');
      return;
    }

    // Validar preguntas
    for (let i = 0; i < preguntas.length; i++) {
      const pregunta = preguntas[i];
      if (!pregunta.pregunta_texto.trim()) {
        alert(`La pregunta ${i + 1} no tiene texto`);
        return;
      }
      if (!pregunta.tiempo_segundos || pregunta.tiempo_segundos < 10) {
        alert(`La pregunta ${i + 1} debe tener al menos 10 segundos`);
        return;
      }
      if (pregunta.opciones.length < 2) {
        alert(`La pregunta ${i + 1} debe tener al menos 2 opciones`);
        return;
      }
      const tieneCorrecta = pregunta.opciones.some(op => op.es_correcta && op.texto.trim());
      if (!tieneCorrecta) {
        alert(`La pregunta ${i + 1} debe tener al menos una opción correcta`);
        return;
      }
      for (let j = 0; j < pregunta.opciones.length; j++) {
        if (!pregunta.opciones[j].texto.trim()) {
          alert(`La opción ${j + 1} de la pregunta ${i + 1} no tiene texto`);
          return;
        }
      }
    }

    if (!fechaInicio || !fechaFin) {
      alert('Debes especificar fecha de inicio y fin de la evaluación');
      return;
    }

    setSaving(true);
    try {
      const isEditing = evaluacionToEdit?.id;
      const url = isEditing ? '/api/evaluaciones/update-evaluacion' : '/api/evaluaciones/create-evaluacion';
      const method = isEditing ? 'PUT' : 'POST';
      
      const body: any = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        is_active: isActive,
        preguntas: preguntas.map(p => ({
          id: p.id,
          pregunta_texto: p.pregunta_texto.trim(),
          tiempo_segundos: p.tiempo_segundos || 30,
          opciones: p.opciones.map(op => ({
            id: op.id,
            texto: op.texto.trim(),
            es_correcta: op.es_correcta,
            explicacion: op.explicacion.trim() || null,
          })),
        })),
      };

      if (isEditing) {
        body.evaluacion_id = evaluacionToEdit.id;
      } else {
        body.periodo_id = periodoId;
        body.materia_id = materiaId;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Error al ${isEditing ? 'actualizar' : 'crear'} la evaluación`);
      }

      alert(`Evaluación ${isEditing ? 'actualizada' : 'creada'} exitosamente`);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || `Error al ${evaluacionToEdit?.id ? 'actualizar' : 'crear'} la evaluación`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-container" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{evaluacionToEdit?.id ? 'Editar Evaluación' : 'Crear Evaluación del Periodo'}</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Nombre de la Evaluación *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: Evaluación del Primer Periodo"
            />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              placeholder="Descripción opcional de la evaluación"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Fecha/Hora de inicio *</label>
              <input
                type="datetime-local"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha/Hora de fin *</label>
              <input
                type="datetime-local"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => {
                  setIsActive(e.target.checked);
                  setIsManuallySet(true);
                }}
                style={{ width: 'auto', cursor: 'pointer' }}
              />
              <span>Activar evaluación (visible para estudiantes)</span>
            </label>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              {isManuallySet 
                ? 'Estado establecido manualmente. La evaluación se activará/desactivará según tu selección.'
                : `Estado automático: ${isActive ? 'Activo' : 'Inactivo'} (basado en las fechas de inicio y fin). Puedes cambiarlo manualmente si es necesario.`
              }
            </p>
            {!isManuallySet && (
              <p style={{ fontSize: '0.75rem', color: '#3b82f6', margin: '0.25rem 0 0 0', fontStyle: 'italic' }}>
                💡 La evaluación se activará automáticamente cuando la fecha actual esté entre la fecha de inicio y fin.
              </p>
            )}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label style={{ margin: 0 }}>Preguntas *</label>
              <button
                type="button"
                onClick={agregarPregunta}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                + Agregar Pregunta
              </button>
            </div>

            {preguntas.length === 0 && (
              <p style={{ color: '#6b7280', fontSize: '0.875rem', fontStyle: 'italic' }}>
                No hay preguntas. Haz clic en "Agregar Pregunta" para comenzar.
              </p>
            )}

            {preguntas.map((pregunta, preguntaIndex) => (
              <div key={preguntaIndex} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                background: '#f9fafb',
                color: '#1f2937',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>Pregunta {preguntaIndex + 1}</h4>
                  <button
                    type="button"
                    onClick={() => eliminarPregunta(preguntaIndex)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    Eliminar
                  </button>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Texto de la pregunta *</label>
                  <textarea
                    value={pregunta.pregunta_texto}
                    onChange={(e) => actualizarPregunta(preguntaIndex, 'pregunta_texto', e.target.value)}
                    rows={2}
                    required
                    placeholder="Ej: ¿Cuál es la función principal de las mitocondrias?"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Tiempo para responder (segundos) *
                  </label>
                  <input
                    type="number"
                    value={pregunta.tiempo_segundos || 30}
                    onChange={(e) => actualizarPregunta(preguntaIndex, 'tiempo_segundos', e.target.value)}
                    min="10"
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>Opciones de respuesta *</label>
                    <button
                      type="button"
                      onClick={() => agregarOpcion(preguntaIndex)}
                      style={{
                        padding: '0.25rem 0.75rem',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      + Opción
                    </button>
                  </div>
                  {pregunta.opciones.map((opcion, opcionIndex) => (
                    <div key={opcionIndex} style={{
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      background: opcion.es_correcta ? '#dcfce7' : 'white',
                    }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="radio"
                          checked={opcion.es_correcta}
                          onChange={() => actualizarOpcion(preguntaIndex, opcionIndex, 'es_correcta', true)}
                          style={{ marginTop: '0.25rem' }}
                        />
                        <label style={{ flex: 1, margin: 0, fontSize: '0.875rem', fontWeight: opcion.es_correcta ? 600 : 400 }}>
                          {opcion.es_correcta ? '✓ Respuesta correcta' : 'Marcar como correcta'}
                        </label>
                        {pregunta.opciones.length > 2 && (
                          <button
                            type="button"
                            onClick={() => eliminarOpcion(preguntaIndex, opcionIndex)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          value={opcion.texto}
                          onChange={(e) => actualizarOpcion(preguntaIndex, opcionIndex, 'texto', e.target.value)}
                          placeholder="Texto de la opción"
                          required
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Explicación (opcional)</label>
                        <textarea
                          value={opcion.explicacion}
                          onChange={(e) => actualizarOpcion(preguntaIndex, opcionIndex, 'explicacion', e.target.value)}
                          rows={2}
                          placeholder="Explicación de por qué esta respuesta es correcta o incorrecta"
                          style={{ fontSize: '0.875rem' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={saving || loadingEvaluacion}>Cancelar</button>
            <button type="submit" disabled={saving || loadingEvaluacion || preguntas.length === 0}>
              {loadingEvaluacion ? 'Cargando...' : saving ? 'Guardando...' : evaluacionToEdit?.id ? 'Actualizar Evaluación' : 'Crear Evaluación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

