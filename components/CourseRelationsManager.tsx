'use client';

import { useState, useEffect } from 'react';
import '../app/css/create-admin.css';
import '../app/css/create-course.css';

interface Profesor {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

interface Estudiante {
  id: string;
  user_id: string;
  nombre: string;
  apellido: string;
  correo_electronico: string;
}

interface Course {
  id: string;
  nombre: string;
  profesores?: Profesor[];
  estudiantes?: Estudiante[];
}

interface CourseRelationsManagerProps {
  course: Course;
  onClose: () => void;
  onRelationsUpdated?: () => void;
}

export default function CourseRelationsManager({
  course,
  onClose,
  onRelationsUpdated,
}: CourseRelationsManagerProps) {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [profesoresAsignados, setProfesoresAsignados] = useState<string[]>([]);
  const [estudiantesAsignados, setEstudiantesAsignados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [searchProfesores, setSearchProfesores] = useState('');
  const [searchEstudiantes, setSearchEstudiantes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      
      // Cargar profesores
      const profesoresResponse = await fetch('/api/teachers/get-teachers');
      if (profesoresResponse.ok) {
        const profesoresResult = await profesoresResponse.json();
        setProfesores(profesoresResult.data || []);
      }

      // Cargar estudiantes
      const estudiantesResponse = await fetch('/api/estudiantes/get-estudiantes');
      if (estudiantesResponse.ok) {
        const estudiantesResult = await estudiantesResponse.json();
        setEstudiantes(estudiantesResult.data || []);
      }

      // Establecer profesores y estudiantes ya asignados
      if (course.profesores) {
        setProfesoresAsignados(course.profesores.map(p => p.id));
      }
      if (course.estudiantes) {
        setEstudiantesAsignados(course.estudiantes.map(e => e.user_id));
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoadingData(false);
    }
  };

  const handleProfesorToggle = (profesorId: string) => {
    setProfesoresAsignados(prev =>
      prev.includes(profesorId)
        ? prev.filter(id => id !== profesorId)
        : [...prev, profesorId]
    );
  };

  const handleEstudianteToggle = (estudianteUserId: string) => {
    setEstudiantesAsignados(prev =>
      prev.includes(estudianteUserId)
        ? prev.filter(id => id !== estudianteUserId)
        : [...prev, estudianteUserId]
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Obtener profesores actuales
      const response = await fetch(`/api/courses/get-courses`);
      if (!response.ok) {
        throw new Error('Error al obtener información del curso');
      }
      const result = await response.json();
      const cursoActual = result.data.find((c: Course) => c.id === course.id);
      const profesoresActuales = cursoActual?.profesores?.map((p: Profesor) => p.id) || [];
      const estudiantesActuales = cursoActual?.estudiantes?.map((e: Estudiante) => e.user_id) || [];

      // Profesores a agregar
      const profesoresAAgregar = profesoresAsignados.filter(id => !profesoresActuales.includes(id));
      // Profesores a quitar
      const profesoresAQuitar = profesoresActuales.filter(id => !profesoresAsignados.includes(id));

      // Estudiantes a agregar
      const estudiantesAAgregar = estudiantesAsignados.filter(id => !estudiantesActuales.includes(id));
      // Estudiantes a quitar
      const estudiantesAQuitar = estudiantesActuales.filter(id => !estudiantesAsignados.includes(id));

      // Agregar profesores
      for (const profesorId of profesoresAAgregar) {
        const response = await fetch('/api/courses/assign-teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ curso_id: course.id, profesor_id: profesorId }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          console.warn(`Error al agregar profesor ${profesorId}:`, errorData.error);
        }
      }

      // Quitar profesores
      for (const profesorId of profesoresAQuitar) {
        const response = await fetch('/api/courses/remove-teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ curso_id: course.id, profesor_id: profesorId }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          console.warn(`Error al quitar profesor ${profesorId}:`, errorData.error);
        }
      }

      // Agregar estudiantes
      for (const estudianteUserId of estudiantesAAgregar) {
        // Buscar el estudiante por user_id para obtener su id
        const estudiante = estudiantes.find(e => e.user_id === estudianteUserId);
        if (estudiante) {
          const response = await fetch('/api/estudiantes/asignar-curso', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ curso_id: course.id, estudiante_id: estudiante.id }),
          });
          if (!response.ok) {
            console.warn(`Error al asignar estudiante ${estudiante.id}`);
          }
        }
      }

      // Quitar estudiantes
      for (const estudianteUserId of estudiantesAQuitar) {
        const estudiante = estudiantes.find(e => e.user_id === estudianteUserId);
        if (estudiante) {
          const response = await fetch(
            `/api/estudiantes/quitar-curso?estudiante_id=${estudiante.id}&curso_id=${course.id}`,
            { method: 'DELETE' }
          );
          if (!response.ok) {
            const errorData = await response.json();
            console.warn(`Error al quitar estudiante ${estudiante.id}:`, errorData.error);
          }
        }
      }

      setSuccess(true);
      if (onRelationsUpdated) {
        onRelationsUpdated();
      }

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error al guardar relaciones:', err);
      setError(err.message || 'Error al guardar las relaciones');
    } finally {
      setLoading(false);
    }
  };

  const profesoresFiltrados = profesores.filter(p =>
    `${p.nombre} ${p.apellido}`.toLowerCase().includes(searchProfesores.toLowerCase()) ||
    p.email.toLowerCase().includes(searchProfesores.toLowerCase())
  );

  const estudiantesFiltrados = estudiantes.filter(e =>
    `${e.nombre} ${e.apellido}`.toLowerCase().includes(searchEstudiantes.toLowerCase()) ||
    e.correo_electronico.toLowerCase().includes(searchEstudiantes.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">Gestionar Relaciones - {course.nombre}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-error">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Relaciones actualizadas exitosamente</span>
            </div>
          )}

          {loadingData ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: '#1f2937' }}>Cargando datos...</p>
            </div>
          ) : (
            <>
              {/* Sección de Profesores */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
                  Profesores
                </h3>
                <input
                  type="text"
                  placeholder="Buscar profesores..."
                  value={searchProfesores}
                  onChange={(e) => setSearchProfesores(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    marginBottom: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    color: '#1f2937',
                    backgroundColor: '#ffffff',
                  }}
                  disabled={loading}
                />
                <div style={{
                  maxHeight: '250px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  background: '#f9fafb',
                }}>
                  {profesoresFiltrados.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                      {searchProfesores ? 'No se encontraron profesores' : 'No hay profesores disponibles'}
                    </div>
                  ) : (
                    profesoresFiltrados.map((profesor) => (
                      <label
                        key={profesor.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.5rem',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          marginBottom: '0.25rem',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={profesoresAsignados.includes(profesor.id)}
                          onChange={() => handleProfesorToggle(profesor.id)}
                          disabled={loading}
                          style={{ marginRight: '0.5rem' }}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                          {profesor.nombre} {profesor.apellido} ({profesor.email})
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                  {profesoresAsignados.length} profesor{profesoresAsignados.length !== 1 ? 'es' : ''} seleccionado{profesoresAsignados.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Sección de Estudiantes */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
                  Estudiantes
                </h3>
                <input
                  type="text"
                  placeholder="Buscar estudiantes..."
                  value={searchEstudiantes}
                  onChange={(e) => setSearchEstudiantes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    marginBottom: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    color: '#1f2937',
                    backgroundColor: '#ffffff',
                  }}
                  disabled={loading}
                />
                <div style={{
                  maxHeight: '250px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  background: '#f9fafb',
                }}>
                  {estudiantesFiltrados.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                      {searchEstudiantes ? 'No se encontraron estudiantes' : 'No hay estudiantes disponibles'}
                    </div>
                  ) : (
                    estudiantesFiltrados.map((estudiante) => (
                      <label
                        key={estudiante.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.5rem',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          marginBottom: '0.25rem',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={estudiantesAsignados.includes(estudiante.user_id)}
                          onChange={() => handleEstudianteToggle(estudiante.user_id)}
                          disabled={loading}
                          style={{ marginRight: '0.5rem' }}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                          {estudiante.nombre} {estudiante.apellido} ({estudiante.correo_electronico})
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                  {estudiantesAsignados.length} estudiante{estudiantesAsignados.length !== 1 ? 's' : ''} seleccionado{estudiantesAsignados.length !== 1 ? 's' : ''}
                </div>
              </div>
            </>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading || loadingData}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

