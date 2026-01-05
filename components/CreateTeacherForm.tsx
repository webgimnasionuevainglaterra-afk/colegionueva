'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import Image from 'next/image';
import '../app/css/create-admin.css';

interface Course {
  id: string;
  nombre: string;
  nivel: string;
}

interface CreateTeacherFormProps {
  onClose: () => void;
  onTeacherCreated?: () => void;
}

export default function CreateTeacherForm({ onClose, onTeacherCreated }: CreateTeacherFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    numero_celular: '',
    indicativo_pais: '+57',
    foto: null as File | null,
    cursos_ids: [] as string[],
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Cargar cursos disponibles
    const fetchCourses = async () => {
      try {
        const response = await fetch('/api/courses/get-courses-for-select');
        if (response.ok) {
          const result = await response.json();
          const coursesData = result.data || [];
          
          // Asegurar ordenamiento adicional en el cliente (por si acaso)
          const sortedCourses = [...coursesData].sort((a, b) => {
            const getGradoNumber = (nombre: string): number => {
              const match = nombre.match(/\b(\d+)\b/);
              return match ? parseInt(match[1], 10) : 999;
            };
            
            const gradoA = getGradoNumber(a.nombre);
            const gradoB = getGradoNumber(b.nombre);
            
            if (gradoA !== gradoB) {
              return gradoA - gradoB;
            }
            
            const nivelOrder: { [key: string]: number } = { 
              'Primaria': 1, 
              'Bachillerato': 2, 
              'Técnico': 3, 
              'Profesional': 4 
            };
            const nivelA = nivelOrder[a.nivel] || 99;
            const nivelB = nivelOrder[b.nivel] || 99;
            
            return nivelA - nivelB;
          });
          
          setCourses(sortedCourses);
        }
      } catch (err) {
        console.error('Error al cargar cursos:', err);
      }
    };
    fetchCourses();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        foto: file,
      }));

      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCourseToggle = (cursoId: string) => {
    setFormData(prev => ({
      ...prev,
      cursos_ids: prev.cursos_ids.includes(cursoId)
        ? prev.cursos_ids.filter(id => id !== cursoId)
        : [...prev.cursos_ids, cursoId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Subir foto si hay una nueva
      let fotoUrl = null;
      if (formData.foto) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', formData.foto);

          const uploadResponse = await fetch('/api/admin/upload-photo', {
            method: 'POST',
            body: uploadFormData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            fotoUrl = uploadData.url;
          } else {
            console.warn('Error al subir foto, continuando sin foto');
          }
        } catch (uploadErr) {
          console.warn('Error al subir foto, continuando sin foto:', uploadErr);
        }
      }

      // 2. Obtener sesión para el token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 3. Crear profesor
      const createResponse = await fetch('/api/teachers/create-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          password: formData.password,
          foto_url: fotoUrl,
          numero_celular: formData.numero_celular || null,
          indicativo_pais: formData.indicativo_pais,
          cursos_ids: formData.cursos_ids,
        }),
      });

      const contentType = createResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await createResponse.text();
        console.error('Respuesta no JSON:', text);
        throw new Error(`Error del servidor: ${createResponse.status} ${createResponse.statusText}`);
      }

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createData.error || 'Error al crear el profesor');
      }

      setSuccess(true);
      
      if (onTeacherCreated) {
        onTeacherCreated();
      }

      // Limpiar formulario
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        numero_celular: '',
        indicativo_pais: '+57',
        foto: null,
        cursos_ids: [],
      });
      setPreview(null);

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error al crear profesor:', err);
      setError(err.message || 'Error al crear el profesor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Crear Profesor</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="create-admin-form">
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
                <span>Profesor creado exitosamente</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="foto" className="form-label">Foto del Profesor</label>
              <div className="photo-upload-container">
                <div className="photo-preview">
                  {preview ? (
                    <>
                      <Image
                      src={preview}
                      alt="Preview"
                      width={120}
                      height={120}
                      className="preview-image"
                    />
                    <button
                      type="button"
                      className="remove-photo-btn"
                      onClick={() => {
                        setPreview(null);
                        setFormData(prev => ({ ...prev, foto: null }));
                      }}
                      disabled={loading}
                    >
                      ✕
                    </button>
                    </>
                  ) : (
                    <div className="photo-placeholder">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id="foto"
                  name="foto"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="photo-input"
                />
                <label htmlFor="foto" className="photo-upload-btn">
                  {preview ? 'Cambiar Foto' : 'Subir Foto'}
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombre" className="form-label">Nombre *</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className="form-input"
                  placeholder="Ingrese el nombre"
                />
              </div>

              <div className="form-group">
                <label htmlFor="apellido" className="form-label">Apellido *</label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className="form-input"
                  placeholder="Ingrese el apellido"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Correo Electrónico *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={loading}
                className="form-input"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="numero_celular" className="form-label">Número de Celular</label>
              <div className="phone-input-group">
                <select
                  id="indicativo_pais"
                  name="indicativo_pais"
                  value={formData.indicativo_pais}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="indicativo-select"
                >
                  <option value="+57">+57 (Colombia)</option>
                </select>
                <input
                  type="tel"
                  id="numero_celular"
                  name="numero_celular"
                  value={formData.numero_celular}
                  onChange={handleInputChange}
                  placeholder="300 123 4567"
                  disabled={loading}
                  className="phone-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Contraseña *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
                disabled={loading}
                className="form-input"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cursos Asignados</label>
              <div className="courses-checkbox-list">
                {courses.length === 0 ? (
                  <p className="no-courses">No hay cursos disponibles. Crea cursos primero.</p>
                ) : (
                  courses.map((course) => (
                    <label key={course.id} className="course-checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.cursos_ids.includes(course.id)}
                        onChange={() => handleCourseToggle(course.id)}
                        disabled={loading}
                      />
                      <span>{course.nombre} ({course.nivel})</span>
                    </label>
                  ))
                )}
              </div>
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

