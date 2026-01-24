'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '../css/matriculas-presenciales.css';

interface Curso {
  id: string;
  nombre: string;
}

export default function MatriculasPresenciales() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombreAcudiente: '',
    nombreEstudiante: '',
    cursoId: '',
    telefonoEstudiante: '',
  });
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    cargarCursos();
  }, []);

  const cargarCursos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/courses/get-courses-for-select');
      if (!response.ok) {
        throw new Error('Error al cargar los cursos');
      }
      const result = await response.json();
      // La API devuelve { data: [...] }
      setCursos(result.data || []);
    } catch (err: any) {
      setError('Error al cargar los cursos. Por favor, intenta más tarde.');
      console.error('Error al cargar cursos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validaciones
    if (!formData.nombreAcudiente.trim()) {
      setError('El nombre del acudiente es requerido');
      return;
    }

    if (!formData.nombreEstudiante.trim()) {
      setError('El nombre del estudiante es requerido');
      return;
    }

    if (!formData.cursoId) {
      setError('Debes seleccionar un curso');
      return;
    }

    if (!formData.telefonoEstudiante.trim()) {
      setError('El teléfono del estudiante es requerido');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/matriculas-presenciales/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre_acudiente: formData.nombreAcudiente.trim(),
          nombre_estudiante: formData.nombreEstudiante.trim(),
          curso_id: formData.cursoId,
          telefono_estudiante: formData.telefonoEstudiante.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar la matrícula');
      }

      setSuccess(true);
      setFormData({
        nombreAcudiente: '',
        nombreEstudiante: '',
        cursoId: '',
        telefonoEstudiante: '',
      });

      // Redirigir después de 3 segundos
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al enviar la matrícula. Por favor, intenta más tarde.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="matriculas-presenciales-main">
      <div className="matriculas-container">
        <div className="matriculas-header">
          <Link href="/" className="back-link">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </Link>
          <h1 className="matriculas-title">Matrículas Presenciales 2026</h1>
          <p className="matriculas-subtitle">
            Completa el formulario para solicitar la matrícula de tu estudiante
          </p>
        </div>

        <div className="matriculas-form-container">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <strong>¡Matrícula enviada exitosamente!</strong>
                <p>Tu solicitud ha sido recibida. Te contactaremos pronto.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="matriculas-form">
            <div className="form-group">
              <label htmlFor="nombreAcudiente" className="form-label">
                Nombre del Acudiente <span className="required">*</span>
              </label>
              <input
                type="text"
                id="nombreAcudiente"
                name="nombreAcudiente"
                className="form-input"
                placeholder="Ingresa el nombre completo del acudiente"
                value={formData.nombreAcudiente}
                onChange={handleChange}
                required
                disabled={submitting || success}
              />
            </div>

            <div className="form-group">
              <label htmlFor="nombreEstudiante" className="form-label">
                Nombre del Estudiante <span className="required">*</span>
              </label>
              <input
                type="text"
                id="nombreEstudiante"
                name="nombreEstudiante"
                className="form-input"
                placeholder="Ingresa el nombre completo del estudiante"
                value={formData.nombreEstudiante}
                onChange={handleChange}
                required
                disabled={submitting || success}
              />
            </div>

            <div className="form-group">
              <label htmlFor="cursoId" className="form-label">
                Curso al que Aspira <span className="required">*</span>
              </label>
              <select
                id="cursoId"
                name="cursoId"
                className="form-select"
                value={formData.cursoId}
                onChange={handleChange}
                required
                disabled={loading || submitting || success}
              >
                <option value="">Selecciona un curso</option>
                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.nombre}
                  </option>
                ))}
              </select>
              {loading && (
                <p className="form-help">Cargando cursos...</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="telefonoEstudiante" className="form-label">
                Teléfono del Estudiante <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="telefonoEstudiante"
                name="telefonoEstudiante"
                className="form-input"
                placeholder="Ej: 320 254 9534"
                value={formData.telefonoEstudiante}
                onChange={handleChange}
                required
                disabled={submitting || success}
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="submit-button"
                disabled={loading || submitting || success}
              >
                {submitting ? 'Enviando...' : success ? 'Enviado ✓' : 'Enviar Solicitud'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

