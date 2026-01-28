'use client';

// Página pública para acudientes: consulta de calificaciones de sus hijos
// usando correo + últimos 4 dígitos de la cédula. No crea sesión en Supabase,
// solo muestra información de lectura.

import { useState } from 'react';

interface CalificacionQuiz {
  id: string;
  nombre: string;
  calificacion: number;
  fecha_fin: string;
  tipo: 'quiz';
}

interface CalificacionEvaluacion {
  id: string;
  nombre: string;
  calificacion: number;
  fecha_fin: string;
  tipo: 'evaluacion';
}

interface CalificacionesMateria {
  materia_id: string;
  materia_nombre: string;
  quizzes: CalificacionQuiz[];
  evaluaciones: CalificacionEvaluacion[];
  promedio: number;
}

interface CalificacionesPeriodo {
  periodo_id: string;
  periodo_nombre: string;
  numero_periodo: number | null;
  materias: CalificacionesMateria[];
}

interface EstudianteConCalificaciones {
  estudiante: {
    id: string;
    nombre: string;
    apellido: string;
    correo_electronico: string;
    tarjeta_identidad: string;
  };
  calificaciones: CalificacionesPeriodo[];
}

export default function AcudientePage() {
  const [correo, setCorreo] = useState('');
  const [ultimos4, setUltimos4] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acudienteNombre, setAcudienteNombre] = useState<string | null>(null);
  const [resultados, setResultados] = useState<EstudianteConCalificaciones[]>([]);
  const [periodosAbiertos, setPeriodosAbiertos] = useState<Record<string, boolean>>({});

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const getColorByCalificacion = (calificacion: number) => {
    if (calificacion >= 3.7) return '#10b981'; // Verde (aprueba)
    if (calificacion >= 3.0) return '#f59e0b'; // Amarillo (en riesgo)
    return '#ef4444'; // Rojo (reprueba)
  };

  const handleCerrarVista = () => {
    // Limpia todos los datos mostrados, como si se cerrara la sesión de consulta
    setResultados([]);
    setAcudienteNombre(null);
    setCorreo('');
    setUltimos4('');
    setError(null);
    setPeriodosAbiertos({});
  };

  const togglePeriodo = (periodoId: string) => {
    setPeriodosAbiertos((prev) => ({
      ...prev,
      [periodoId]: !prev[periodoId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultados([]);
    setAcudienteNombre(null);

    const ultimos4Limpio = ultimos4.trim();
    if (ultimos4Limpio.length !== 4 || !/^\d{4}$/.test(ultimos4Limpio)) {
      setError('Por favor ingresa exactamente los últimos 4 dígitos de la cédula.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/acudientes/get-calificaciones-hijos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo_electronico: correo.trim(),
          ultimos4_cedula: ultimos4Limpio,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'No se pudieron cargar las calificaciones. Verifica los datos.');
        return;
      }

      const data = result.data;
      setAcudienteNombre(`${data.acudiente.nombre} ${data.acudiente.apellido}`);
      setResultados(data.estudiantes || []);
    } catch (err: any) {
      console.error('Error al consultar calificaciones de hijos:', err);
      setError(err.message || 'Error al consultar las calificaciones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        color: '#111827',
        padding: '2.5rem 1rem 3rem',
      }}
    >
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      {/* Encabezado tipo dashboard */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <h1
          style={{
            fontSize: '1.9rem',
            fontWeight: 800,
            color: '#111827',
            marginBottom: '0.5rem',
          }}
        >
          Portal para Acudientes
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#4b5563',
            maxWidth: '620px',
            margin: '0 auto',
          }}
        >
          Consulta de forma segura las <strong>calificaciones</strong> de tu hijo usando tu
          correo electrónico y los últimos 4 dígitos de tu cédula.
        </p>
      </div>

      {/* Tarjeta de acceso tipo dashboard */}
      <div
        style={{
          maxWidth: '520px',
          margin: '0 auto 2rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
          border: '1px solid #e5e7eb',
          padding: '1.75rem 1.75rem 1.5rem',
        }}
      >
        <h2
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '0.5rem',
          }}
        >
          Acceso del acudiente
        </h2>
        <p
          style={{
            fontSize: '0.85rem',
            color: '#6b7280',
            marginBottom: '1.25rem',
          }}
        >
          Estos datos solo se usan para validar tu identidad y mostrarte las calificaciones
          de tu hijo. No se crea una cuenta ni se guarda una sesión.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="correo"
              style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: 600,
                marginBottom: '0.25rem',
                color: '#374151',
              }}
            >
              Correo electrónico del acudiente
            </label>
            <input
              id="correo"
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="acudiente@correo.com"
              style={{
                width: '100%',
                padding: '0.7rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontSize: '0.9rem',
                backgroundColor: '#ffffff',
                color: '#111827',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="ultimos4"
              style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: 600,
                marginBottom: '0.25rem',
                color: '#374151',
              }}
            >
              Últimos 4 dígitos de la cédula del acudiente
            </label>
            <input
              id="ultimos4"
              type="password"
              maxLength={4}
              required
              value={ultimos4}
              onChange={(e) => setUltimos4(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              style={{
                width: '100%',
                padding: '0.7rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontSize: '0.9rem',
                letterSpacing: '0.3em',
                textAlign: 'center',
                backgroundColor: '#ffffff',
                color: '#111827',
              }}
            />
          </div>

          {error && (
            <p
              style={{
                color: '#b91c1c',
                background: '#fee2e2',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem',
                fontSize: '0.85rem',
                marginBottom: '0.75rem',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.8rem 1rem',
              background: loading ? '#9ca3af' : 'linear-gradient(90deg, #ec4899, #6366f1)',
              color: 'white',
              border: 'none',
              borderRadius: '9999px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: 700,
              marginTop: '0.25rem',
            }}
          >
            {loading ? 'Consultando...' : 'Ver calificaciones'}
          </button>
        </form>
      </div>

      {acudienteNombre && (
        <div
          style={{
            marginBottom: '1.5rem',
            textAlign: 'center',
            color: '#4b5563',
            fontSize: '0.95rem',
          }}
        >
          Mostrando calificaciones para los hijos de{' '}
          <strong>{acudienteNombre}</strong>.
        </div>
      )}

      {/* Resultados: tarjetas similares al dashboard */}
      {resultados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Botón para cerrar la vista de calificaciones */}
          <div style={{ alignSelf: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCerrarVista}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#111827',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cerrar vista de calificaciones
            </button>
          </div>

          {resultados.map(({ estudiante, calificaciones }) => (
            <div
              key={estudiante.id}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb',
              }}
            >
              {/* Header del estudiante */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#111827',
                      margin: 0,
                    }}
                  >
                    {estudiante.nombre} {estudiante.apellido}
                  </h2>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: '#6b7280',
                      margin: 0,
                    }}
                  >
                    Documento: {estudiante.tarjeta_identidad} • Correo:{' '}
                    {estudiante.correo_electronico}
                  </p>
                </div>
              </div>

              {calificaciones.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Aún no hay calificaciones registradas para este estudiante.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {calificaciones.map((periodo) => {
                    const isOpen = periodosAbiertos[periodo.periodo_id] ?? true;
                    const etiquetaPeriodo =
                      periodo.numero_periodo != null
                        ? `Periodo ${periodo.numero_periodo} - ${periodo.periodo_nombre}`
                        : periodo.periodo_nombre;

                    return (
                      <div
                        key={periodo.periodo_id}
                        style={{
                          background: '#f9fafb',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Encabezado del periodo (acordeón) */}
                        <button
                          type="button"
                          onClick={() => togglePeriodo(periodo.periodo_id)}
                          style={{
                            width: '100%',
                            background: '#ffffff',
                            padding: '0.9rem 1rem',
                            border: 'none',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '1rem',
                              fontWeight: 700,
                              color: '#111827',
                            }}
                          >
                            {etiquetaPeriodo}
                          </span>
                          <span
                            aria-hidden="true"
                            style={{
                              fontSize: '1.1rem',
                              color: '#6b7280',
                            }}
                          >
                            {isOpen ? '▴' : '▾'}
                          </span>
                        </button>

                        {/* Contenido del periodo: materias y sus notas */}
                        {isOpen && (
                          <div
                            style={{
                              padding: '0.9rem 1rem 1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '1rem',
                            }}
                          >
                            {periodo.materias.map((materia) => (
                              <div
                                key={materia.materia_id}
                                style={{
                                  background: '#f9fafb',
                                  borderRadius: '10px',
                                  padding: '0.9rem',
                                  border: '1px solid #e5e7eb',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '0.6rem',
                                    paddingBottom: '0.4rem',
                                    borderBottom: '1px solid #e5e7eb',
                                  }}
                                >
                                  <h3
                                    style={{
                                      fontSize: '0.98rem',
                                      fontWeight: 600,
                                      color: '#111827',
                                      margin: 0,
                                    }}
                                  >
                                    {materia.materia_nombre}
                                  </h3>
                                  <div>
                                    <span
                                      style={{
                                        fontSize: '0.78rem',
                                        color: '#6b7280',
                                        marginRight: '0.25rem',
                                      }}
                                    >
                                      Nota final:
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '1.15rem',
                                        fontWeight: 700,
                                        color: getColorByCalificacion(materia.promedio),
                                      }}
                                    >
                                      {materia.promedio.toFixed(2)} / 5.0
                                    </span>
                                  </div>
                                </div>

                                {/* Quizzes */}
                                {materia.quizzes.length > 0 && (
                                  <div style={{ marginBottom: '0.6rem' }}>
                                    <h4
                                      style={{
                                        fontSize: '0.88rem',
                                        fontWeight: 600,
                                        color: '#374151',
                                        marginBottom: '0.3rem',
                                      }}
                                    >
                                      Quizzes
                                    </h4>
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}
                                    >
                                      {materia.quizzes.map((quiz) => (
                                        <div
                                          key={quiz.id}
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.5rem 0.6rem',
                                            background: 'white',
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                          }}
                                        >
                                          <div>
                                            <div
                                              style={{
                                                fontSize: '0.82rem',
                                                fontWeight: 500,
                                                color: '#111827',
                                              }}
                                            >
                                              {quiz.nombre}
                                            </div>
                                            <div
                                              style={{
                                                fontSize: '0.72rem',
                                                color: '#6b7280',
                                              }}
                                            >
                                              {formatDate(quiz.fecha_fin)}
                                            </div>
                                          </div>
                                          <span
                                            style={{
                                              fontSize: '0.9rem',
                                              fontWeight: 600,
                                              color: getColorByCalificacion(quiz.calificacion),
                                              minWidth: '56px',
                                              textAlign: 'right',
                                            }}
                                          >
                                            {quiz.calificacion.toFixed(2)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Evaluaciones */}
                                {materia.evaluaciones.length > 0 && (
                                  <div>
                                    <h4
                                      style={{
                                        fontSize: '0.88rem',
                                        fontWeight: 600,
                                        color: '#374151',
                                        marginBottom: '0.3rem',
                                      }}
                                    >
                                      Evaluaciones
                                    </h4>
                                    <div
                                      style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}
                                    >
                                      {materia.evaluaciones.map((evaluacion) => (
                                        <div
                                          key={evaluacion.id}
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.5rem 0.6rem',
                                            background: 'white',
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                          }}
                                        >
                                          <div>
                                            <div
                                              style={{
                                                fontSize: '0.82rem',
                                                fontWeight: 500,
                                                color: '#111827',
                                              }}
                                            >
                                              {evaluacion.nombre}
                                            </div>
                                            <div
                                              style={{
                                                fontSize: '0.72rem',
                                                color: '#6b7280',
                                              }}
                                            >
                                              {formatDate(evaluacion.fecha_fin)}
                                            </div>
                                          </div>
                                          <span
                                            style={{
                                              fontSize: '0.9rem',
                                              fontWeight: 600,
                                              color: getColorByCalificacion(evaluacion.calificacion),
                                              minWidth: '56px',
                                              textAlign: 'right',
                                            }}
                                          >
                                            {evaluacion.calificacion.toFixed(2)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}


