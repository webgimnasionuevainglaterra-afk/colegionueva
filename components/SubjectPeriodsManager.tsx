'use client';

import { useEffect, useState } from 'react';
import CreatePeriodForm from './CreatePeriodForm';
import EditPeriodForm from './EditPeriodForm';
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
                      className="action-btn edit-btn"
                      title="Editar periodo"
                      onClick={() => setEditingPeriod(period)}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
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
    </div>
  );
}

