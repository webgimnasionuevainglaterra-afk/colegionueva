'use client';

import { useState, useEffect } from 'react';
import '../app/css/create-admin.css';
import '../app/css/course-subjects.css';

interface Course {
  id: string;
  nombre: string;
  nivel: string;
}

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  edad?: number;
  correo_electronico: string;
  numero_telefono?: string;
  tarjeta_identidad: string;
  foto_url?: string;
  acudientes?: {
    nombre: string;
    apellido: string;
    correo_electronico: string;
    numero_cedula: string;
    numero_telefono?: string;
  };
}

export default function StudentsManager() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchEstudiantes(selectedCourse.id);
    } else {
      setEstudiantes([]);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/courses/get-courses');
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Error al cargar cursos';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      setCourses(result.data || []);
    } catch (err: any) {
      console.error('Error al cargar cursos:', err);
      setError(err.message || 'Error al cargar cursos');
    } finally {
      setLoading(false);
    }
  };

  const fetchEstudiantes = async (cursoId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/estudiantes/get-estudiantes?curso_id=${cursoId}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar estudiantes');
      }
      setEstudiantes(result.data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const handleQuitarCurso = async (estudianteId: string) => {
    if (!selectedCourse) return;
    
    if (!confirm('¿Estás seguro de que deseas quitar este estudiante del curso?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/estudiantes/quitar-curso?estudiante_id=${estudianteId}&curso_id=${selectedCourse.id}`,
        { method: 'DELETE' }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al quitar estudiante del curso');
      }
      await fetchEstudiantes(selectedCourse.id);
    } catch (err: any) {
      alert(err.message || 'Error al quitar estudiante del curso');
    }
  };

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // 'grid' para vista de cursos, 'list' para vista de estudiantes

  return (
    <div className="administrators-section">
      <div className="administrators-actions">
        <h2 className="section-title">Gestionar Estudiantes</h2>
        {viewMode === 'list' && (
          <button
            className="create-button"
            onClick={() => setViewMode('grid')}
            style={{ background: '#6b7280', marginRight: '0.5rem' }}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Ver Todos los Cursos
          </button>
        )}
        {viewMode === 'list' && selectedCourse && (
          <button
            className="create-button"
            onClick={() => setIsImportModalOpen(true)}
            style={{ background: '#10b981', marginLeft: '0.5rem' }}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Importar desde Excel
          </button>
        )}
      </div>

      {error && (
        <div className="error-state">
          <p>{error}</p>
        </div>
      )}

      {viewMode === 'grid' ? (
        /* Vista de Grid: Todos los cursos con botón para crear alumnos */
        <div style={{ marginTop: '2rem', background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', fontFamily: 'var(--font-bitter), serif' }}>
            Cursos Disponibles
          </h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#1f2937' }}>
              <p>Cargando cursos...</p>
            </div>
          ) : courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <p>No hay cursos disponibles. Crea un curso primero desde "Gestionar Cursos".</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {courses.map((course) => (
                <div
                  key={course.id}
                  style={{
                    padding: '1.5rem',
                    background: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>
                      {course.nombre}
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{course.nivel}</p>
                  </div>
                  <button
                    className="create-button"
                    onClick={() => {
                      setSelectedCourse(course);
                      setIsCreateModalOpen(true);
                    }}
                    style={{ width: '100%', marginTop: '1rem' }}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear Alumno
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCourse(course);
                      setViewMode('list');
                      fetchEstudiantes(course.id);
                    }}
                    style={{
                      width: '100%',
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      background: 'transparent',
                      color: '#2563eb',
                      border: '1px solid #2563eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#eff6ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Ver Estudiantes
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Vista de Lista: Cursos a la izquierda, estudiantes a la derecha */
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', marginTop: '2rem' }}>
          {/* Lista de cursos */}
          <div>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600 }}>Cursos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => {
                    setSelectedCourse(course);
                    fetchEstudiantes(course.id);
                  }}
                  style={{
                    padding: '1rem',
                    background: selectedCourse?.id === course.id ? '#2563eb' : 'white',
                    color: selectedCourse?.id === course.id ? 'white' : '#1f2937',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: selectedCourse?.id === course.id ? 600 : 400,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCourse?.id !== course.id) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCourse?.id !== course.id) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{course.nombre}</div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.25rem' }}>{course.nivel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Lista de estudiantes del curso seleccionado */}
          <div>
            {!selectedCourse ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <p>Selecciona un curso para ver sus estudiantes</p>
              </div>
            ) : loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p>Cargando estudiantes...</p>
              </div>
            ) : estudiantes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <p>No hay estudiantes asignados a este curso</p>
                <button
                  className="create-button"
                  onClick={() => setIsCreateModalOpen(true)}
                  style={{ marginTop: '1rem' }}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear Primer Estudiante
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    Estudiantes de {selectedCourse.nombre}
                  </h3>
                  <button
                    className="create-button"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear Estudiante
                  </button>
                </div>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {estudiantes.map((estudiante) => (
                    <div
                      key={estudiante.id}
                      style={{
                        padding: '1rem',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                      }}
                    >
                      {estudiante.foto_url ? (
                        <img
                          src={estudiante.foto_url}
                          alt={`${estudiante.nombre} ${estudiante.apellido}`}
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280',
                            fontSize: '1.5rem',
                            fontWeight: 600,
                          }}
                        >
                          {estudiante.nombre[0]}{estudiante.apellido[0]}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                          {estudiante.nombre} {estudiante.apellido}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          {estudiante.correo_electronico}
                        </div>
                        {estudiante.acudientes && (
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            Acudiente: {estudiante.acudientes.nombre} {estudiante.acudientes.apellido}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleQuitarCurso(estudiante.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                        }}
                      >
                        Quitar del curso
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal crear estudiante */}
      {isCreateModalOpen && courses.length > 0 && (
        <CreateEstudianteModal
          cursoId={selectedCourse?.id || null}
          cursoNombre={selectedCourse?.nombre || ''}
          cursos={courses}
          onClose={() => {
            setIsCreateModalOpen(false);
          }}
          onEstudianteCreated={(cursoId) => {
            setIsCreateModalOpen(false);
            if (cursoId) {
              // Seleccionar el curso donde se creó el estudiante y cargar estudiantes
              const curso = courses.find(c => c.id === cursoId);
              if (curso) {
                setSelectedCourse(curso);
                setViewMode('list');
                fetchEstudiantes(curso.id);
              }
            }
          }}
        />
      )}
      {isCreateModalOpen && courses.length === 0 && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)} style={{ zIndex: 2000 }}>
          <div className="modal-container" style={{ maxWidth: '500px', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Crear Estudiante</h2>
              <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                No hay cursos disponibles. Por favor crea un curso primero desde "Gestionar Cursos".
              </p>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} style={{ width: '100%' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal importar estudiantes */}
      {isImportModalOpen && selectedCourse && (
        <ImportEstudiantesModal
          cursoId={selectedCourse.id}
          cursoNombre={selectedCourse.nombre}
          onClose={() => setIsImportModalOpen(false)}
          onEstudiantesImported={() => {
            setIsImportModalOpen(false);
            fetchEstudiantes(selectedCourse.id);
          }}
        />
      )}
    </div>
  );
}

// Modal para crear estudiante
function CreateEstudianteModal({
  cursoId,
  cursoNombre,
  cursos,
  onClose,
  onEstudianteCreated,
}: {
  cursoId: string | null;
  cursoNombre: string;
  cursos: Course[];
  onClose: () => void;
  onEstudianteCreated: (cursoId: string) => void;
}) {
  const [cursoSeleccionado, setCursoSeleccionado] = useState<string>(cursoId || '');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [edad, setEdad] = useState('');
  const [sexo, setSexo] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cedula, setCedula] = useState('');
  const [acudienteNombre, setAcudienteNombre] = useState('');
  const [acudienteApellido, setAcudienteApellido] = useState('');
  const [acudienteCorreo, setAcudienteCorreo] = useState('');
  const [acudienteCedula, setAcudienteCedula] = useState('');
  const [acudienteTelefono, setAcudienteTelefono] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFoto = async (): Promise<string | null> => {
    if (!foto) return null;

    try {
      setUploadingFoto(true);
      const formData = new FormData();
      formData.append('file', foto);

      const response = await fetch('/api/upload-foto', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al subir foto');
      }

      return result.url;
    } catch (error: any) {
      console.error('Error al subir foto:', error);
      return null;
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !apellido || !correo || !cedula || !sexo) {
      alert('Nombre, apellido, correo electrónico, cédula y sexo son requeridos');
      return;
    }

    setSaving(true);
    try {
      // Subir foto si existe
      const fotoUrl = await uploadFoto();

      // Crear estudiante
      const response = await fetch('/api/estudiantes/create-estudiante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foto_url: fotoUrl,
          nombre,
          apellido,
          edad: edad ? parseInt(edad) : null,
          sexo: sexo,
          correo_electronico: correo,
          numero_telefono: telefono || null,
          indicativo_pais: '+57',
          tarjeta_identidad: cedula,
          acudiente_nombre: acudienteNombre || null,
          acudiente_apellido: acudienteApellido || null,
          acudiente_correo_electronico: acudienteCorreo || null,
          acudiente_numero_cedula: acudienteCedula || null,
          acudiente_numero_telefono: acudienteTelefono || null,
          curso_id: cursoSeleccionado && cursoSeleccionado.trim() !== '' ? cursoSeleccionado : null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al crear estudiante');
      }

      alert('Estudiante creado exitosamente');
      onEstudianteCreated(cursoSeleccionado);
    } catch (err: any) {
      alert(err.message || 'Error al crear estudiante');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-container" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Crear Estudiante</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Curso *</label>
            <select
              value={cursoSeleccionado}
              onChange={(e) => setCursoSeleccionado(e.target.value)}
              required
            >
              <option value="">Selecciona un curso</option>
              {cursos.map((curso) => (
                <option key={curso.id} value={curso.id}>
                  {curso.nombre} - {curso.nivel}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Foto (opcional)</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFotoChange}
                id="foto-input"
                style={{ 
                  position: 'absolute',
                  opacity: 0,
                  width: '0.1px',
                  height: '0.1px',
                  overflow: 'hidden',
                  zIndex: -1
                }}
              />
              <label
                htmlFor="foto-input"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-nunito-sans), sans-serif',
                  fontSize: '0.95rem',
                  color: '#1f2937',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                }}
              >
                Seleccionar Foto
              </label>
            </div>
            {fotoPreview && (
              <div style={{ marginTop: '1rem' }}>
                <img src={fotoPreview} alt="Preview" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }} />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Nombre *</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Apellido *</label>
              <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Edad</label>
              <input type="number" value={edad} onChange={(e) => setEdad(e.target.value)} min="1" />
            </div>
            <div className="form-group">
              <label>Sexo *</label>
              <select value={sexo} onChange={(e) => setSexo(e.target.value)} required>
                <option value="">Selecciona un sexo</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Correo Electrónico *</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Tarjeta de Identidad / Cédula *</label>
              <input type="text" value={cedula} onChange={(e) => setCedula(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" value="+57" readOnly style={{ width: '60px' }} />
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} style={{ flex: 1 }} />
            </div>
          </div>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>Datos del Acudiente (opcional)</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Nombre del Acudiente</label>
              <input type="text" value={acudienteNombre} onChange={(e) => setAcudienteNombre(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Apellido del Acudiente</label>
              <input type="text" value={acudienteApellido} onChange={(e) => setAcudienteApellido(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Correo Electrónico del Acudiente</label>
              <input type="email" value={acudienteCorreo} onChange={(e) => setAcudienteCorreo(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Cédula del Acudiente</label>
              <input type="text" value={acudienteCedula} onChange={(e) => setAcudienteCedula(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Teléfono del Acudiente</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" value="+57" readOnly style={{ width: '60px' }} />
              <input type="tel" value={acudienteTelefono} onChange={(e) => setAcudienteTelefono(e.target.value)} style={{ flex: 1 }} />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={saving || uploadingFoto}>Cancelar</button>
            <button type="submit" disabled={saving || uploadingFoto}>
              {uploadingFoto ? 'Subiendo foto...' : saving ? 'Creando...' : 'Crear Estudiante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para importar estudiantes desde Excel
function ImportEstudiantesModal({
  cursoId,
  cursoNombre,
  onClose,
  onEstudiantesImported,
}: {
  cursoId: string;
  cursoNombre: string;
  onClose: () => void;
  onEstudiantesImported: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      setResultado(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!archivo) {
      alert('Por favor selecciona un archivo');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('curso_id', cursoId);

      const response = await fetch('/api/estudiantes/importar-estudiantes', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al importar estudiantes');
      }

      setResultado(result);
      if (result.totalCreados > 0) {
        alert(`Se importaron ${result.totalCreados} estudiantes exitosamente`);
        onEstudiantesImported();
      }
    } catch (err: any) {
      alert(err.message || 'Error al importar estudiantes');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-container" style={{ maxWidth: '600px', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Importar Estudiantes - {cursoNombre}</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Archivo CSV/Excel *</label>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} required />
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              El archivo debe tener las columnas: nombre, apellido, edad, correo, telefono, cedula, acudiente_nombre, acudiente_apellido, acudiente_correo, acudiente_cedula, acudiente_telefono
            </p>
          </div>

          {resultado && (
            <div style={{ padding: '1rem', background: resultado.totalErrores > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Resultado de la importación:</p>
              <p>Estudiantes procesados: {resultado.totalCreados}</p>
              {resultado.totalErrores > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontWeight: 600, color: '#dc2626' }}>Errores: {resultado.totalErrores}</p>
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                    {resultado.errores?.map((error: string, index: number) => (
                      <li key={index} style={{ fontSize: '0.875rem', color: '#dc2626' }}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={importing}>Cancelar</button>
            <button type="submit" disabled={importing || !archivo}>
              {importing ? 'Importando...' : 'Importar Estudiantes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

