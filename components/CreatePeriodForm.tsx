'use client';

import { useState } from 'react';
import '../app/css/create-admin.css';
import '../app/css/create-course.css';

interface CreatePeriodFormProps {
  subjectId: string;
  subjectName: string;
  onClose: () => void;
  onPeriodCreated?: () => void;
}

export default function CreatePeriodForm({ 
  subjectId, 
  subjectName, 
  onClose, 
  onPeriodCreated 
}: CreatePeriodFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const getPeriodNumber = (nombre: string): number => {
    const nombreLower = nombre.toLowerCase();
    if (nombreLower.includes('primer') || nombreLower.includes('primero') || nombreLower.includes('1')) {
      return 1;
    }
    if (nombreLower.includes('segundo') || nombreLower.includes('2')) {
      return 2;
    }
    if (nombreLower.includes('tercer') || nombreLower.includes('tercero') || nombreLower.includes('3')) {
      return 3;
    }
    if (nombreLower.includes('cuarto') || nombreLower.includes('4')) {
      return 4;
    }
    return 1; // Por defecto
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const numero_periodo = getPeriodNumber(formData.nombre);
      
      const response = await fetch('/api/periods/create-period', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materia_id: subjectId,
          numero_periodo: numero_periodo,
          nombre: formData.nombre.trim(),
          fecha_inicio: formData.fecha_inicio || null,
          fecha_fin: formData.fecha_fin || null,
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
        throw new Error(data.error || 'Error al crear el periodo');
      }

      setSuccess(true);
      
      if (onPeriodCreated) {
        onPeriodCreated();
      }

      // Limpiar formulario
      setFormData({
        nombre: '',
        fecha_inicio: '',
        fecha_fin: '',
      });

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error al crear periodo:', err);
      setError(err.message || 'Error al crear el periodo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Crear Periodo</h2>
            <p className="modal-subtitle">{subjectName}</p>
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
                <span>Periodo creado exitosamente</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="nombre">Nombre del Periodo *</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                required
                placeholder="Ej: Primer Periodo, Segundo Periodo, Tercer Periodo, Cuarto Periodo"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="fecha_inicio">Fecha de Inicio</label>
              <input
                type="date"
                id="fecha_inicio"
                name="fecha_inicio"
                value={formData.fecha_inicio}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="fecha_fin">Fecha de Fin</label>
              <input
                type="date"
                id="fecha_fin"
                name="fecha_fin"
                value={formData.fecha_fin}
                onChange={handleInputChange}
                disabled={loading}
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

