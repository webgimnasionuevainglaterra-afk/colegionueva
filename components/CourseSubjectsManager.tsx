'use client';

import { useEffect, useState } from 'react';
import CreateSubjectForm from './CreateSubjectForm';
import EditSubjectForm from './EditSubjectForm';
import SubjectPeriodsManager from './SubjectPeriodsManager';
import '../app/css/create-admin.css';
import '../app/css/course-subjects.css';

interface Subject {
  id: string;
  curso_id: string;
  nombre: string;
  descripcion: string | null;
  horas_totales: number;
  created_at: string;
  updated_at: string;
  cursos?: {
    nombre: string;
    nivel: string;
  };
}

interface CourseSubjectsManagerProps {
  courseId: string;
  courseName: string;
  onClose: () => void;
}

export default function CourseSubjectsManager({ 
  courseId, 
  courseName, 
  onClose 
}: CourseSubjectsManagerProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [managingPeriods, setManagingPeriods] = useState<Subject | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/subjects/get-subjects?curso_id=${courseId}`, {
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
        throw new Error(result.error || 'Error al cargar las materias');
      }

      setSubjects(result.data || []);
    } catch (err: any) {
      console.error('Error al obtener materias:', err);
      setError(err.message || 'Error al cargar las materias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [courseId, refreshKey]);

  const handleDelete = async (subjectId: string, subjectName: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar la materia "${subjectName}"?`)) {
      try {
        setLoading(true);
        const response = await fetch(`/api/subjects/delete-subject?id=${subjectId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setRefreshKey(prev => prev + 1);
        } else {
          const result = await response.json();
          alert(result.error || 'Error al eliminar la materia');
        }
      } catch (err) {
        console.error('Error al eliminar materia:', err);
        alert('Error al eliminar la materia');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container course-subjects-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Materias del Curso</h2>
            <p className="modal-subtitle">{courseName}</p>
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
              Agregar Materia
            </button>
          </div>

          {loading && subjects.length === 0 ? (
            <div className="loading-state">
              <p>Cargando materias...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{error}</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="empty-state">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p>No hay materias creadas aún</p>
              <span>Agrega materias usando el botón "Agregar Materia"</span>
            </div>
          ) : (
            <div className="subjects-list">
              {subjects.map((subject) => (
                <div key={subject.id} className="subject-card">
                  <div className="subject-info">
                    <div className="subject-header">
                      <h3 className="subject-name">{subject.nombre}</h3>
                    </div>
                    {subject.descripcion && (
                      <p className="subject-description">{subject.descripcion}</p>
                    )}
                    <div className="subject-meta">
                      <span className="subject-hours">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {subject.horas_totales} horas totales
                      </span>
                    </div>
                  </div>
                  <div className="subject-actions">
                    <button
                      className="action-btn periods-btn"
                      title="Gestionar periodos"
                      onClick={() => setManagingPeriods(subject)}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      className="action-btn edit-btn"
                      title="Editar materia"
                      onClick={() => setEditingSubject(subject)}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      className="action-btn delete-btn"
                      title="Eliminar materia"
                      onClick={() => handleDelete(subject.id, subject.nombre)}
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
        <CreateSubjectForm
          courseId={courseId}
          courseName={courseName}
          onClose={() => setIsCreateModalOpen(false)}
          onSubjectCreated={() => {
            setIsCreateModalOpen(false);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {editingSubject && (
        <EditSubjectForm
          subject={editingSubject}
          courseName={courseName}
          onClose={() => setEditingSubject(null)}
          onSubjectUpdated={() => {
            setEditingSubject(null);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {managingPeriods && (
        <SubjectPeriodsManager
          subjectId={managingPeriods.id}
          subjectName={managingPeriods.nombre}
          onClose={() => setManagingPeriods(null)}
        />
      )}
    </div>
  );
}

