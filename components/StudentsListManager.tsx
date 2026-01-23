'use client';

import { useState, useEffect } from 'react';
import '../app/css/create-admin.css';

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
  is_online?: boolean;
  sexo?: string;
  acudientes?: {
    nombre: string;
    apellido: string;
    correo_electronico: string;
    numero_cedula: string;
    numero_telefono?: string;
  };
}

export default function StudentsListManager() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [estudiantesFiltrados, setEstudiantesFiltrados] = useState<Estudiante[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEstudiante, setSelectedEstudiante] = useState<Estudiante | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchEstudiantes();
    
    // Actualizar el estado online periódicamente (cada 10 segundos)
    const refreshInterval = setInterval(() => {
      fetchEstudiantes();
    }, 10000); // 10 segundos

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

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

  const fetchEstudiantes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/estudiantes/get-estudiantes');
      
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
      setEstudiantes(estudiantesData);
      setEstudiantesFiltrados(estudiantesData);
    } catch (err: any) {
      console.error('Error al cargar estudiantes:', err);
      setError(err.message || 'Error al cargar estudiantes');
    } finally {
      setLoading(false);
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

  const handleDeleteEstudiante = async (estudianteId: string) => {
    if (!confirm('¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE este estudiante? Esta acción NO se puede deshacer y eliminará todos sus datos, incluyendo su cuenta de usuario.')) {
      return;
    }

    // Confirmación adicional
    if (!confirm('⚠️ ADVERTENCIA: Esta acción eliminará permanentemente al estudiante y todos sus datos. ¿Estás completamente seguro?')) {
      return;
    }

    try {
      const response = await fetch(`/api/estudiantes/delete-estudiante?estudiante_id=${estudianteId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar el estudiante');
      }

      // Actualizar la lista
      await fetchEstudiantes();
      alert('Estudiante eliminado permanentemente');
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el estudiante');
    }
  };

  return (
    <div className="administrators-section">
      <div className="administrators-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="section-title" style={{ color: '#1f2937', margin: 0 }}>Gestionar Alumnos</h2>
        <button
          className="create-button"
          onClick={fetchEstudiantes}
          disabled={loading}
          style={{ 
            background: '#e5e7eb',
            color: '#1f2937',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
          }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar Lista
        </button>
      </div>

      {error && (
        <div className="error-state">
          <p>{error}</p>
        </div>
      )}

      {/* Barra de búsqueda */}
      <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Buscar por nombre, apellido, cédula o correo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#1f2937',
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>Cargando estudiantes...</p>
        </div>
      ) : estudiantesFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>No hay estudiantes registrados.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {estudiantesFiltrados.map((estudiante) => (
            <div
              key={estudiante.id}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  {estudiante.foto_url ? (
                    <img
                      src={estudiante.foto_url}
                      alt={`${estudiante.nombre} ${estudiante.apellido}`}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #e5e7eb',
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
                        fontSize: '1.5rem',
                        color: '#6b7280',
                      }}
                    >
                      {estudiante.nombre.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Indicador de estado online */}
                  <span 
                    className={`online-status-indicator ${estudiante.is_online ? 'online' : 'offline'}`}
                    title={estudiante.is_online ? 'En línea' : 'Desconectado'}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: '2px solid white',
                      zIndex: 10,
                      background: estudiante.is_online ? '#10b981' : '#ef4444',
                      boxShadow: estudiante.is_online 
                        ? '0 0 0 2px white, 0 0 4px rgba(16, 185, 129, 0.5)' 
                        : '0 0 0 2px white, 0 0 4px rgba(239, 68, 68, 0.5)',
                    }}
                  ></span>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', margin: 0, marginBottom: '0.25rem' }}>
                    {estudiante.nombre} {estudiante.apellido}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                    Cédula: {estudiante.tarjeta_identidad}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                    {estudiante.correo_electronico}
                  </p>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: estudiante.is_active !== false ? '#10b981' : '#ef4444',
                      marginTop: '0.25rem',
                      display: 'inline-block',
                    }}
                  >
                    {estudiante.is_active !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                    setSelectedEstudiante(estudiante);
                    setIsEditModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#3b82f6';
                  }}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleToggleActivo(estudiante.id, estudiante.is_active !== false)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: estudiante.is_active !== false ? '#f59e0b' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = estudiante.is_active !== false ? '#d97706' : '#059669';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = estudiante.is_active !== false ? '#f59e0b' : '#10b981';
                    }}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }}>
                      {estudiante.is_active !== false ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                    {estudiante.is_active !== false ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleDeleteEstudiante(estudiante.id)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ef4444';
                    }}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edición - reutilizar el modal de StudentsManager */}
      {isEditModalOpen && selectedEstudiante && (
        <EditEstudianteModal
          estudiante={selectedEstudiante}
          cursos={[]}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEstudiante(null);
            fetchEstudiantes();
          }}
        />
      )}
    </div>
  );
}

// Modal para editar estudiante (copiado de StudentsManager)
function EditEstudianteModal({
  estudiante,
  cursos,
  onClose,
}: {
  estudiante: Estudiante;
  cursos: any[];
  onClose: () => void;
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
    if (!fotoFile) return null;
    setUploadingFoto(true);
    try {
      const formData = new FormData();
      formData.append('file', fotoFile);
      const response = await fetch('/api/upload-foto', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al subir la foto');
      }
      return result.url;
    } catch (error: any) {
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
      let fotoUrl: string | null = null;
      if (fotoFile) {
        fotoUrl = await uploadFoto();
        if (!fotoUrl) {
          if (!confirm('Error al subir la foto. ¿Deseas continuar actualizando el estudiante sin cambiar la foto?')) {
            setSaving(false);
            return;
          }
          fotoUrl = estudiante.foto_url || null;
        }
      } else {
        fotoUrl = estudiante.foto_url || null;
      }
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
        throw new Error(result.error || 'Error al actualizar estudiante');
      }
      alert('Estudiante actualizado exitosamente');
      onClose();
    } catch (err: any) {
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
            <div className="form-group">
              <label>Edad</label>
              <input type="number" value={edad} onChange={(e) => setEdad(e.target.value)} min="0" max="120" />
            </div>
            <div className="form-group">
              <label>Sexo *</label>
              <select value={sexo} onChange={(e) => setSexo(e.target.value)} required>
                <option value="">Seleccionar...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </div>
            <div className="form-group">
              <label>Correo Electrónico *</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Cédula *</label>
              <input type="text" value={cedula} onChange={(e) => setCedula(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Datos del Acudiente</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Nombre del Acudiente</label>
                <input type="text" value={acudienteNombre} onChange={(e) => setAcudienteNombre(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Apellido del Acudiente</label>
                <input type="text" value={acudienteApellido} onChange={(e) => setAcudienteApellido(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Correo del Acudiente</label>
                <input type="email" value={acudienteCorreo} onChange={(e) => setAcudienteCorreo(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Cédula del Acudiente</label>
                <input type="text" value={acudienteCedula} onChange={(e) => setAcudienteCedula(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Teléfono del Acudiente</label>
                <input type="tel" value={acudienteTelefono} onChange={(e) => setAcudienteTelefono(e.target.value)} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} disabled={saving || uploadingFoto}>
              Cancelar
            </button>
            <button type="submit" disabled={saving || uploadingFoto}>
              {saving || uploadingFoto ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

