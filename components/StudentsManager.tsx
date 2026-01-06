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
  is_active?: boolean;
  sexo?: string;
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
  const [estudiantesFiltrados, setEstudiantesFiltrados] = useState<Estudiante[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedEstudiante, setSelectedEstudiante] = useState<Estudiante | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchEstudiantes(selectedCourse.id);
    } else {
      setEstudiantes([]);
      setEstudiantesFiltrados([]);
      setSearchTerm('');
    }
  }, [selectedCourse]);

  // Filtrar estudiantes por búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setEstudiantesFiltrados(estudiantes);
    } else {
      const term = searchTerm.toLowerCase().trim();
      const filtrados = estudiantes.filter(est => 
        est.nombre.toLowerCase().includes(term) ||
        est.apellido.toLowerCase().includes(term) ||
        est.correo_electronico.toLowerCase().includes(term) ||
        est.tarjeta_identidad.toLowerCase().includes(term) ||
        `${est.nombre} ${est.apellido}`.toLowerCase().includes(term)
      );
      setEstudiantesFiltrados(filtrados);
    }
  }, [searchTerm, estudiantes]);

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
      setError(null);
      const response = await fetch(`/api/estudiantes/get-estudiantes?curso_id=${cursoId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Error al cargar estudiantes';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      const estudiantesData = result.data || [];
      // Debug: verificar que foto_url esté presente
      console.log('📸 Estudiantes cargados:', estudiantesData.map((e: Estudiante) => ({
        nombre: `${e.nombre} ${e.apellido}`,
        foto_url: e.foto_url,
        tiene_foto: !!e.foto_url
      })));
      setEstudiantes(estudiantesData);
      setEstudiantesFiltrados(estudiantesData);
      setSearchTerm(''); // Limpiar búsqueda al cargar nuevos estudiantes
    } catch (err: any) {
      console.error('Error al cargar estudiantes:', err);
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

  const handleToggleActivo = async (estudianteId: string, currentStatus: boolean) => {
    const nuevoEstado = !currentStatus;
    const mensaje = nuevoEstado 
      ? '¿Estás seguro de que deseas activar este estudiante? Podrá ingresar a la plataforma.'
      : '¿Estás seguro de que deseas desactivar este estudiante? No podrá ingresar a la plataforma.';

    if (!confirm(mensaje)) {
      return;
    }

    try {
      const response = await fetch('/api/estudiantes/toggle-activo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estudiante_id: estudianteId, is_active: nuevoEstado })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar el estado del estudiante');
      }

      // Actualizar el estado local
      setEstudiantes(prev => prev.map(est => 
        est.id === estudianteId ? { ...est, is_active: nuevoEstado } : est
      ));
      setEstudiantesFiltrados(prev => prev.map(est => 
        est.id === estudianteId ? { ...est, is_active: nuevoEstado } : est
      ));

      alert(result.message || (nuevoEstado ? 'Estudiante activado correctamente' : 'Estudiante desactivado correctamente'));
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el estado del estudiante');
    }
  };

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // 'grid' para vista de cursos, 'list' para vista de estudiantes

  return (
    <div className="administrators-section">
      <div className="administrators-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="section-title" style={{ color: '#1f2937', margin: 0 }}>Gestionar Estudiantes</h2>
        {viewMode === 'list' && (
          <button
            className="create-button"
            onClick={() => setViewMode('grid')}
            style={{ 
              background: '#e5e7eb',
              color: '#1f2937',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#d1d5db';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#e5e7eb';
            }}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px', color: '#1f2937' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Ver Todos los Cursos
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
            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>Cursos</h3>
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
              <div style={{ textAlign: 'center', padding: '3rem', color: '#1f2937' }}>
                <p>Cargando estudiantes...</p>
              </div>
            ) : (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                    Estudiantes de {selectedCourse.nombre}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      className="create-button"
                      onClick={() => setIsCreateModalOpen(true)}
                      style={{ background: '#2563eb' }}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Crear Estudiante
                    </button>
                    <button
                      className="create-button"
                      onClick={() => setIsImportModalOpen(true)}
                      style={{ background: '#10b981' }}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Importar Excel
                    </button>
                  </div>
                </div>
                
                {/* Buscador de estudiantes */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Buscar por nombre, apellido, cédula o correo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        color: '#1f2937',
                        background: 'white',
                        fontFamily: 'var(--font-nunito-sans), sans-serif'
                      }}
                    />
                    <svg
                      style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '20px',
                        height: '20px',
                        color: '#6b7280'
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6b7280',
                          padding: '0.25rem'
                        }}
                      >
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {searchTerm && (
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {estudiantesFiltrados.length} estudiante{estudiantesFiltrados.length !== 1 ? 's' : ''} encontrado{estudiantesFiltrados.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {estudiantesFiltrados.length === 0 && searchTerm ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      <p>No se encontraron estudiantes que coincidan con "{searchTerm}"</p>
                    </div>
                  ) : estudiantesFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      <p>No hay estudiantes en este curso</p>
                    </div>
                  ) : (
                    estudiantesFiltrados.map((estudiante) => (
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
                        <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                          {(() => {
                            const tieneFoto = estudiante.foto_url && estudiante.foto_url.trim() !== '';
                            const fotoUrl = estudiante.foto_url;
                            
                            console.log(`🖼️ Renderizando foto para ${estudiante.nombre} ${estudiante.apellido}:`);
                            console.log('  - tieneFoto:', tieneFoto);
                            console.log('  - foto_url:', fotoUrl);
                            console.log('  - foto_url type:', typeof fotoUrl);
                            console.log('  - foto_url length:', fotoUrl?.length || 0);
                            console.log('  - foto_url trimmed:', fotoUrl?.trim() || 'N/A');
                            console.log('  - foto_url empty check:', !fotoUrl || fotoUrl.trim() === '');
                            
                            if (fotoUrl) {
                              console.log('  - URL completa:', fotoUrl);
                              // Intentar validar que sea una URL válida
                              try {
                                const url = new URL(fotoUrl);
                                console.log('  - URL válida, dominio:', url.hostname);
                              } catch (e) {
                                console.error('  - ❌ URL inválida:', e);
                              }
                            }
                            
                            return tieneFoto ? (
                              <img
                                key={`foto-${estudiante.id}-${estudiante.foto_url}`}
                                src={estudiante.foto_url}
                                alt={`${estudiante.nombre} ${estudiante.apellido}`}
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '2px solid #e5e7eb',
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  zIndex: 1,
                                  backgroundColor: '#f3f4f6', // Color de fondo mientras carga
                                }}
                                onError={(e) => {
                                  console.error('❌ Error al cargar imagen del estudiante:', estudiante.nombre, estudiante.apellido);
                                  console.error('URL de la imagen:', estudiante.foto_url);
                                  console.error('Tipo de error:', e.type);
                                  // Ocultar imagen y mostrar placeholder
                                  e.currentTarget.style.display = 'none';
                                  const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (placeholder) {
                                    placeholder.style.display = 'flex';
                                  }
                                }}
                                onLoad={(e) => {
                                  console.log('✅ Imagen cargada correctamente para:', estudiante.nombre, estudiante.apellido);
                                  console.log('📸 URL:', estudiante.foto_url);
                                  console.log('📐 Dimensiones:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
                                  // Ocultar placeholder si la imagen carga correctamente
                                  const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (placeholder) {
                                    placeholder.style.display = 'none';
                                  }
                                }}
                              />
                            ) : null;
                          })()}
                          <div
                            className="foto-placeholder"
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '50%',
                              background: '#e5e7eb',
                              display: estudiante.foto_url && estudiante.foto_url.trim() !== '' ? 'none' : 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#6b7280',
                              fontSize: '1.5rem',
                              fontWeight: 600,
                              border: '2px solid #e5e7eb',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              zIndex: 0,
                            }}
                          >
                            {estudiante.nombre[0]}{estudiante.apellido[0]}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '1rem', color: '#1f2937' }}>
                            {estudiante.nombre} {estudiante.apellido}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {estudiante.correo_electronico}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            Cédula: {estudiante.tarjeta_identidad}
                          </div>
                          {estudiante.acudientes && (
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              Acudiente: {estudiante.acudientes.nombre} {estudiante.acudientes.apellido}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          {/* Iconos de acción */}
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                              onClick={() => {
                                setSelectedEstudiante(estudiante);
                                setIsViewModalOpen(true);
                              }}
                              style={{
                                padding: '0.5rem',
                                background: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#1d4ed8';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#2563eb';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="Ver información"
                            >
                              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEstudiante(estudiante);
                                setIsEditModalOpen(true);
                              }}
                              style={{
                                padding: '0.5rem',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#059669';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#10b981';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="Editar información"
                            >
                              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleQuitarCurso(estudiante.id)}
                              style={{
                                padding: '0.5rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#dc2626';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ef4444';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="Quitar del curso"
                            >
                              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          {/* Toggle Switch */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            <label
                              style={{
                                position: 'relative',
                                display: 'inline-block',
                                width: '60px',
                                height: '32px',
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={estudiante.is_active !== false}
                                onChange={() => handleToggleActivo(estudiante.id, estudiante.is_active !== false)}
                                style={{
                                  opacity: 0,
                                  width: 0,
                                  height: 0,
                                }}
                              />
                              <span
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  backgroundColor: estudiante.is_active !== false ? '#10b981' : '#ef4444',
                                  borderRadius: '34px',
                                  transition: 'all 0.3s',
                                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                                }}
                              >
                                <span
                                  style={{
                                    position: 'absolute',
                                    content: '""',
                                    height: '24px',
                                    width: '24px',
                                    left: estudiante.is_active !== false ? '32px' : '4px',
                                    bottom: '4px',
                                    backgroundColor: 'white',
                                    borderRadius: '50%',
                                    transition: 'all 0.3s',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                                  }}
                                />
                              </span>
                            </label>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: estudiante.is_active !== false ? '#10b981' : '#ef4444',
                                marginTop: '0.25rem',
                              }}
                            >
                              {estudiante.is_active !== false ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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

      {/* Modal ver información del estudiante */}
      {isViewModalOpen && selectedEstudiante && (
        <ViewEstudianteModal
          estudiante={selectedEstudiante}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedEstudiante(null);
          }}
        />
      )}

      {/* Modal editar estudiante */}
      {isEditModalOpen && selectedEstudiante && (
        <EditEstudianteModal
          estudiante={selectedEstudiante}
          cursos={courses}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEstudiante(null);
          }}
          onEstudianteUpdated={() => {
            setIsEditModalOpen(false);
            setSelectedEstudiante(null);
            if (selectedCourse) {
              fetchEstudiantes(selectedCourse.id);
            }
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
    if (!foto) {
      console.log('⚠️ No hay foto para subir');
      return null;
    }

    try {
      setUploadingFoto(true);
      const formData = new FormData();
      formData.append('file', foto);

      console.log('📤 Subiendo foto...', { nombre: foto.name, tipo: foto.type, tamaño: foto.size });

      const response = await fetch('/api/upload-foto', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('❌ Error en respuesta de upload-foto:', result);
        throw new Error(result.error || 'Error al subir foto');
      }

      console.log('✅ Foto subida exitosamente, URL:', result.url);
      return result.url;
    } catch (error: any) {
      console.error('❌ Error al subir foto:', error);
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
      console.log('📸 Foto URL obtenida antes de crear estudiante:', fotoUrl);

      const estudianteData = {
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
      };

      console.log('📝 Datos del estudiante a crear:', { ...estudianteData, foto_url: fotoUrl });

      // Crear estudiante
      const response = await fetch('/api/estudiantes/create-estudiante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estudianteData),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('❌ Error al crear estudiante:', result);
        throw new Error(result.error || 'Error al crear estudiante');
      }

      console.log('✅ Estudiante creado exitosamente');
      console.log('📸 Foto URL en respuesta:', result.data?.foto_url);
      console.log('📸 Foto URL enviada:', fotoUrl);
      console.log('📸 ¿Coinciden?:', result.data?.foto_url === fotoUrl);
      
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
              <input type="text" value="🇨🇴 +57" readOnly style={{ width: '80px', textAlign: 'center' }} />
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
              <input type="text" value="🇨🇴 +57" readOnly style={{ width: '80px', textAlign: 'center' }} />
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

// Modal para ver información del estudiante
function ViewEstudianteModal({
  estudiante,
  onClose,
}: {
  estudiante: Estudiante;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-container" style={{ maxWidth: '700px', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Información del Estudiante</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
            {estudiante.foto_url ? (
              <img
                src={estudiante.foto_url}
                alt={`${estudiante.nombre} ${estudiante.apellido}`}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #e5e7eb',
                }}
              />
            ) : (
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: '2.5rem',
                  fontWeight: 600,
                  border: '3px solid #e5e7eb',
                }}
              >
                {estudiante.nombre[0]}{estudiante.apellido[0]}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>
                {estudiante.nombre} {estudiante.apellido}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: estudiante.is_active !== false ? '#10b981' : '#ef4444',
                    color: 'white',
                  }}
                >
                  {estudiante.is_active !== false ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>Datos Personales</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Nombre:</span>
                  <p style={{ fontSize: '1rem', color: '#1f2937', marginTop: '0.25rem' }}>{estudiante.nombre}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Apellido:</span>
                  <p style={{ fontSize: '1rem', color: '#1f2937', marginTop: '0.25rem' }}>{estudiante.apellido}</p>
                </div>
                {estudiante.edad && (
                  <div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Edad:</span>
                    <p style={{ fontSize: '1rem', color: '#1f2937', marginTop: '0.25rem' }}>{estudiante.edad} años</p>
                  </div>
                )}
                {estudiante.sexo && (
                  <div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Sexo:</span>
                    <p style={{ fontSize: '1rem', color: '#1f2937', marginTop: '0.25rem', textTransform: 'capitalize' }}>{estudiante.sexo}</p>
                  </div>
                )}
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Cédula:</span>
                  <p style={{ fontSize: '1rem', color: '#1f2937', marginTop: '0.25rem' }}>{estudiante.tarjeta_identidad}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>Contacto</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Correo Electrónico:</span>
                  <p style={{ fontSize: '1rem', color: '#1f2937', marginTop: '0.25rem' }}>{estudiante.correo_electronico}</p>
                </div>
                {estudiante.numero_telefono && (
                  <div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Teléfono:</span>
                    <p style={{ fontSize: '1rem', color: '#1f2937', marginTop: '0.25rem' }}>{estudiante.numero_telefono}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {estudiante.acudientes && (
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>Datos del Acudiente</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Nombre:</span>
                  <p style={{ fontSize: '1rem', color: '#1f2937', marginTop: '0.25rem' }}>{estudiante.acudientes.nombre} {estudiante.acudientes.apellido}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Cédula:</span>
                  <p style={{ fontSize: '1rem', color: '#1f2937', marginTop: '0.25rem' }}>{estudiante.acudientes.numero_cedula}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Correo Electrónico:</span>
                  <p style={{ fontSize: '1rem', color: '#1f2937', marginTop: '0.25rem' }}>{estudiante.acudientes.correo_electronico}</p>
                </div>
                {estudiante.acudientes.numero_telefono && (
                  <div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Teléfono:</span>
                    <p style={{ fontSize: '1rem', color: '#1f2937', marginTop: '0.25rem' }}>{estudiante.acudientes.numero_telefono}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '2rem' }}>
            <button type="button" onClick={onClose} style={{ width: '100%' }}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal para editar estudiante
function EditEstudianteModal({
  estudiante,
  cursos,
  onClose,
  onEstudianteUpdated,
}: {
  estudiante: Estudiante;
  cursos: Course[];
  onClose: () => void;
  onEstudianteUpdated: () => void;
}) {
  const [nombre, setNombre] = useState(estudiante.nombre);
  const [apellido, setApellido] = useState(estudiante.apellido);
  const [edad, setEdad] = useState(estudiante.edad?.toString() || '');
  const [correo, setCorreo] = useState(estudiante.correo_electronico);
  const [telefono, setTelefono] = useState(estudiante.numero_telefono || '');
  const [cedula, setCedula] = useState(estudiante.tarjeta_identidad);
  const [sexo, setSexo] = useState((estudiante as any).sexo || '');
  const [fotoPreview, setFotoPreview] = useState<string | null>(estudiante.foto_url || null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [acudienteNombre, setAcudienteNombre] = useState(estudiante.acudientes?.nombre || '');
  const [acudienteApellido, setAcudienteApellido] = useState(estudiante.acudientes?.apellido || '');
  const [acudienteCorreo, setAcudienteCorreo] = useState(estudiante.acudientes?.correo_electronico || '');
  const [acudienteCedula, setAcudienteCedula] = useState(estudiante.acudientes?.numero_cedula || '');
  const [acudienteTelefono, setAcudienteTelefono] = useState(estudiante.acudientes?.numero_telefono || '');
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFoto = async () => {
    if (!fotoFile) {
      console.log('⚠️ No hay foto nueva para subir');
      return null;
    }

    setUploadingFoto(true);
    try {
      console.log('📤 Subiendo foto nueva...', { name: fotoFile.name, type: fotoFile.type, size: fotoFile.size });
      
      const formData = new FormData();
      formData.append('file', fotoFile);

      const response = await fetch('/api/upload-foto', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Error en respuesta de upload-foto:', result);
        throw new Error(result.error || 'Error al subir la foto');
      }

      console.log('✅ Foto subida exitosamente, URL:', result.url);
      return result.url;
    } catch (error: any) {
      console.error('❌ Error al subir foto:', error);
      alert(`Error al subir la foto: ${error.message || 'Error desconocido'}`);
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
      // Subir foto si existe una nueva
      let fotoUrl: string | null = null;
      if (fotoFile) {
        console.log('📤 Hay foto nueva, subiendo...');
        fotoUrl = await uploadFoto();
        if (!fotoUrl) {
          // Si falla la subida de la foto, preguntar si quiere continuar sin foto
          if (!confirm('Error al subir la foto. ¿Deseas continuar actualizando el estudiante sin cambiar la foto?')) {
            setSaving(false);
            return;
          }
          // Continuar con la foto actual
          fotoUrl = estudiante.foto_url || null;
        }
      } else {
        // No hay foto nueva, mantener la actual
        fotoUrl = estudiante.foto_url || null;
        console.log('📸 Manteniendo foto actual:', fotoUrl);
      }

      console.log('💾 Actualizando estudiante con foto_url:', fotoUrl);

      // Actualizar estudiante
      const response = await fetch('/api/estudiantes/update-estudiante', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: estudiante.id,
          foto_url: fotoUrl,
          nombre,
          apellido,
          edad: edad ? parseInt(edad) : null,
          sexo: sexo,
          correo_electronico: correo,
          numero_telefono: telefono || null,
          tarjeta_identidad: cedula,
          acudiente_nombre: acudienteNombre || null,
          acudiente_apellido: acudienteApellido || null,
          acudiente_correo_electronico: acudienteCorreo || null,
          acudiente_numero_cedula: acudienteCedula || null,
          acudiente_numero_telefono: acudienteTelefono || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('❌ Error al actualizar estudiante:', result);
        throw new Error(result.error || 'Error al actualizar estudiante');
      }

      console.log('✅ Estudiante actualizado exitosamente');
      console.log('📸 Foto URL en respuesta:', result.data?.foto_url);
      alert('Estudiante actualizado exitosamente');
      onEstudianteUpdated();
    } catch (err: any) {
      console.error('❌ Error en handleSubmit:', err);
      alert(err.message || 'Error al actualizar estudiante');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-container" style={{ maxWidth: '800px', zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Editar Estudiante</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {/* Foto */}
          <div className="form-group">
            <label>Foto</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {fotoPreview && (
                <img
                  src={fotoPreview}
                  alt="Preview"
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #e5e7eb',
                  }}
                />
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ marginBottom: '0.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setFotoPreview(null);
                    setFotoFile(null);
                  }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Eliminar foto
                </button>
              </div>
            </div>
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
              <label>Teléfono</label>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Cédula *</label>
            <input type="text" value={cedula} onChange={(e) => setCedula(e.target.value)} required />
          </div>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem', color: '#1f2937' }}>Datos del Acudiente (opcional)</h3>

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
              <label>Correo del Acudiente</label>
              <input type="email" value={acudienteCorreo} onChange={(e) => setAcudienteCorreo(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Cédula del Acudiente</label>
              <input type="text" value={acudienteCedula} onChange={(e) => setAcudienteCedula(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Teléfono del Acudiente</label>
            <input type="tel" value={acudienteTelefono} onChange={(e) => setAcudienteTelefono(e.target.value)} />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={saving || uploadingFoto}>Cancelar</button>
            <button type="submit" disabled={saving || uploadingFoto}>
              {saving || uploadingFoto ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

