'use client';

import { useState } from 'react';
import '../app/css/create-admin.css';
import '../app/css/create-course.css';

interface CreateSubjectFormProps {
  courseId: string;
  courseName: string;
  onClose: () => void;
  onSubjectCreated?: () => void;
}

export default function CreateSubjectForm({ 
  courseId, 
  courseName, 
  onClose, 
  onSubjectCreated 
}: CreateSubjectFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    horas_totales: '' as string | number,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'horas_totales' ? (value === '' ? '' : parseInt(value) || '') : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subjects/create-subject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          curso_id: courseId,
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || null,
          horas_totales: formData.horas_totales === '' ? 0 : (typeof formData.horas_totales === 'string' ? parseInt(formData.horas_totales) || 0 : formData.horas_totales),
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
        throw new Error(data.error || 'Error al crear la materia');
      }

      setSuccess(true);
      
      if (onSubjectCreated) {
        onSubjectCreated();
      }

      // Limpiar formulario
      setFormData({
        nombre: '',
        descripcion: '',
        horas_totales: '',
      });

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error al crear materia:', err);
      setError(err.message || 'Error al crear la materia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Crear Materia</h2>
            <p className="modal-subtitle">{courseName}</p>
          </div>
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
                <span>Materia creada exitosamente</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="nombre">Nombre de la Materia *</label>
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
              <label htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                placeholder="Descripción de la materia..."
                rows={3}
                disabled={loading}
                className="create-course-form textarea"
              />
            </div>

            <div className="form-group">
              <label htmlFor="horas_totales">Horas Totales de Estudio</label>
              <input
                type="number"
                id="horas_totales"
                name="horas_totales"
                value={formData.horas_totales === '' ? '' : formData.horas_totales}
                onChange={handleInputChange}
                min="0"
                placeholder="0"
                disabled={loading}
                className="number-input-no-spinner"
              />
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

