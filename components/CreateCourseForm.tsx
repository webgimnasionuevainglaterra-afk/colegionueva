'use client';

import { useState, useEffect } from 'react';
import '../app/css/create-admin.css';
import '../app/css/create-course.css';

interface CreateCourseFormProps {
  onClose: () => void;
  onCourseCreated?: () => void;
}

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

export default function CreateCourseForm({ onClose, onCourseCreated }: CreateCourseFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    nivel: 'Primaria' as 'Primaria' | 'Bachillerato' | 'Técnico' | 'Profesional',
    profesores_ids: [] as string[],
    estudiantes_ids: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loadingProfesores, setLoadingProfesores] = useState(false);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);
  const [searchProfesores, setSearchProfesores] = useState('');
  const [searchEstudiantes, setSearchEstudiantes] = useState('');

  useEffect(() => {
    fetchProfesores();
    fetchEstudiantes();
  }, []);

  const fetchProfesores = async () => {
    try {
      setLoadingProfesores(true);
      const response = await fetch('/api/teachers/get-teachers');
      if (response.ok) {
        const result = await response.json();
        setProfesores(result.data || []);
      }
    } catch (err) {
      console.error('Error al cargar profesores:', err);
    } finally {
      setLoadingProfesores(false);
    }
  };

  const fetchEstudiantes = async () => {
    try {
      setLoadingEstudiantes(true);
      const response = await fetch('/api/estudiantes/get-estudiantes');
      if (response.ok) {
        const result = await response.json();
        setEstudiantes(result.data || []);
      }
    } catch (err) {
      console.error('Error al cargar estudiantes:', err);
    } finally {
      setLoadingEstudiantes(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfesorToggle = (profesorId: string) => {
    setFormData(prev => ({
      ...prev,
      profesores_ids: prev.profesores_ids.includes(profesorId)
        ? prev.profesores_ids.filter(id => id !== profesorId)
        : [...prev.profesores_ids, profesorId],
    }));
  };

  const handleEstudianteToggle = (estudianteUserId: string) => {
    setFormData(prev => ({
      ...prev,
      estudiantes_ids: prev.estudiantes_ids.includes(estudianteUserId)
        ? prev.estudiantes_ids.filter(id => id !== estudianteUserId)
        : [...prev.estudiantes_ids, estudianteUserId],
    }));
  };

  const profesoresFiltrados = profesores.filter(p =>
    `${p.nombre} ${p.apellido}`.toLowerCase().includes(searchProfesores.toLowerCase()) ||
    p.email.toLowerCase().includes(searchProfesores.toLowerCase())
  );

  const estudiantesFiltrados = estudiantes.filter(e =>
    `${e.nombre} ${e.apellido}`.toLowerCase().includes(searchEstudiantes.toLowerCase()) ||
    e.correo_electronico.toLowerCase().includes(searchEstudiantes.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/courses/create-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          nivel: formData.nivel,
          profesores_ids: formData.profesores_ids,
          estudiantes_ids: formData.estudiantes_ids,
        }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Respuesta no JSON:', text);
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el curso');
      }

      setSuccess(true);
      
      if (onCourseCreated) {
        onCourseCreated();
      }

      // Limpiar formulario
      setFormData({
        nombre: '',
        nivel: 'Primaria',
        profesores_ids: [],
        estudiantes_ids: [],
      });
      setSearchProfesores('');
      setSearchEstudiantes('');

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error al crear curso:', err);
      setError(err.message || 'Error al crear el curso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">Crear Curso</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
          <form onSubmit={handleSubmit} className="create-course-form">
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
              <span>Curso creado exitosamente</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="nombre">Nombre del Curso *</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              required
              placeholder="Ej: Matemáticas, Español, Ciencias..."
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="nivel">Nivel *</label>
            <select
              id="nivel"
              name="nivel"
              value={formData.nivel}
              onChange={handleInputChange}
              required
              disabled={loading}
            >
              <option value="Primaria">Primaria</option>
              <option value="Bachillerato">Bachillerato</option>
              <option value="Técnico">Técnico</option>
              <option value="Profesional">Profesional</option>
            </select>
          </div>

          {/* Sección de Profesores */}
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>
              Asignar Profesores (Opcional)
            </label>
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
              }}
              disabled={loading || loadingProfesores}
            />
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '0.5rem',
              background: '#f9fafb',
            }}>
              {loadingProfesores ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                  Cargando profesores...
                </div>
              ) : profesoresFiltrados.length === 0 ? (
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
                      checked={formData.profesores_ids.includes(profesor.id)}
                      onChange={() => handleProfesorToggle(profesor.id)}
                      disabled={loading}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span style={{ fontSize: '0.875rem' }}>
                      {profesor.nombre} {profesor.apellido} ({profesor.email})
                    </span>
                  </label>
                ))
              )}
            </div>
            {formData.profesores_ids.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                {formData.profesores_ids.length} profesor{formData.profesores_ids.length !== 1 ? 'es' : ''} seleccionado{formData.profesores_ids.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Sección de Estudiantes */}
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>
              Asignar Estudiantes (Opcional)
            </label>
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
              }}
              disabled={loading || loadingEstudiantes}
            />
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '0.5rem',
              background: '#f9fafb',
            }}>
              {loadingEstudiantes ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                  Cargando estudiantes...
                </div>
              ) : estudiantesFiltrados.length === 0 ? (
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
                      checked={formData.estudiantes_ids.includes(estudiante.user_id)}
                      onChange={() => handleEstudianteToggle(estudiante.user_id)}
                      disabled={loading}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span style={{ fontSize: '0.875rem' }}>
                      {estudiante.nombre} {estudiante.apellido} ({estudiante.correo_electronico})
                    </span>
                  </label>
                ))
              )}
            </div>
            {formData.estudiantes_ids.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                {formData.estudiantes_ids.length} estudiante{formData.estudiantes_ids.length !== 1 ? 's' : ''} seleccionado{formData.estudiantes_ids.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

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
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

