'use client';

import { useState, useEffect } from 'react';
import '../app/css/create-admin.css';
import '../app/css/create-course.css';

interface Course {
  id: string;
  nombre: string;
  nivel: string;
}

interface EditCourseFormProps {
  course: Course;
  onClose: () => void;
  onCourseUpdated?: () => void;
}

export default function EditCourseForm({ 
  course, 
  onClose, 
  onCourseUpdated 
}: EditCourseFormProps) {
  const [formData, setFormData] = useState({
    nombre: course.nombre,
    nivel: course.nivel as 'Primaria' | 'Bachillerato' | 'Técnico' | 'Profesional',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setFormData({
      nombre: course.nombre,
      nivel: course.nivel as 'Primaria' | 'Bachillerato' | 'Técnico' | 'Profesional',
    });
  }, [course]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/courses/update-course', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: course.id,
          nombre: formData.nombre.trim(),
          nivel: formData.nivel,
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
        throw new Error(data.error || 'Error al actualizar el curso');
      }

      setSuccess(true);
      
      if (onCourseUpdated) {
        onCourseUpdated();
      }

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error al actualizar curso:', err);
      setError(err.message || 'Error al actualizar el curso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Editar Curso</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
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
                <span>Curso actualizado exitosamente</span>
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
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}









