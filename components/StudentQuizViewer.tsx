'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Opcion {
  id: string;
  texto: string;
  es_correcta: boolean;
  explicacion?: string | null;
  orden: number;
}

interface Pregunta {
  id: string;
  pregunta_texto: string;
  tiempo_segundos: number;
  orden: number;
  archivo_url?: string | null;
  opciones: Opcion[];
}

interface Quiz {
  id: string;
  nombre: string;
  descripcion?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  preguntas: Pregunta[];
}

interface StudentQuizViewerProps {
  quizId: string;
  onClose: () => void;
  onComplete?: (calificacion: number) => void;
}

export default function StudentQuizViewer({ quizId, onClose, onComplete }: StudentQuizViewerProps) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [intentoId, setIntentoId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0); // Tiempo total restante en segundos
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(0); // Tiempo restante de la pregunta actual
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [calificacion, setCalificacion] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false); // Indica si el tiempo se agotó
  const [respuestasDetalladas, setRespuestasDetalladas] = useState<any[]>([]); // Resumen detallado de respuestas
  const [showResumen, setShowResumen] = useState(false); // Mostrar resumen detallado
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);

  // Calcular tiempo total del quiz (suma de todos los tiempo_segundos de las preguntas)
  const calcularTiempoTotal = useCallback((preguntas: Pregunta[]): number => {
    return preguntas.reduce((total, pregunta) => total + pregunta.tiempo_segundos, 0);
  }, []);

  // Cargar el quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/quizzes/get-quiz?quiz_id=${quizId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error al cargar el quiz');
        }

        const quizData = result.data;

        // Validar fechas
        const ahora = new Date();
        const fechaInicio = new Date(quizData.fecha_inicio);
        const fechaFin = new Date(quizData.fecha_fin);

        if (ahora < fechaInicio) {
          throw new Error('El quiz aún no está disponible');
        }

        if (ahora > fechaFin) {
          throw new Error('El quiz ya no está disponible');
        }

        // Validar que tenga preguntas
        if (!quizData.preguntas || quizData.preguntas.length === 0) {
          throw new Error('El quiz no tiene preguntas');
        }

        setQuiz(quizData);
      } catch (err: any) {
        console.error('Error al cargar quiz:', err);
        setError(err.message || 'Error al cargar el quiz');
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  // Timer principal del quiz (tiempo total)
  useEffect(() => {
    if (!quizStarted || !quiz || timeRemaining <= 0 || timeUp) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Tiempo agotado - finalizar automáticamente
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quizStarted, quiz, timeUp]);

  // Timer de la pregunta actual
  useEffect(() => {
    if (!quizStarted || !quiz || currentQuestionIndex >= quiz.preguntas.length) return;

    const preguntaActual = quiz.preguntas[currentQuestionIndex];
    if (!preguntaActual) return;

    // Reiniciar timer de pregunta cuando cambia
    setQuestionTimeRemaining(preguntaActual.tiempo_segundos);

    const interval = setInterval(() => {
      setQuestionTimeRemaining((prev) => {
        if (prev <= 1) {
          // Tiempo de pregunta agotado - avanzar automáticamente
          handleQuestionTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quizStarted, quiz, currentQuestionIndex]);

  // Iniciar el quiz
  const handleStartQuiz = async () => {
    if (!user || !quiz) return;

    try {
      // Iniciar intento
      const response = await fetch('/api/quizzes/iniciar-intento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quiz_id: quizId,
          estudiante_id: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Si el quiz ya fue completado, obtener el intento completado y mostrar resultados
        if (result.ya_completado && result.intento_id) {
          // Obtener el intento completado usando finalizar-intento (que devuelve los detalles si ya está completado)
          try {
            const intentoResponse = await fetch(`/api/quizzes/finalizar-intento`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                intento_id: result.intento_id,
              }),
            });
            
            if (intentoResponse.ok) {
              const intentoResult = await intentoResponse.json();
              setCalificacion(intentoResult.resumen?.calificacion || 0);
              setQuizCompleted(true);
              setQuizStarted(false);
              setShowConfirmModal(false);
              
              // Guardar respuestas detalladas si están disponibles
              if (intentoResult.respuestas_detalladas) {
                setRespuestasDetalladas(intentoResult.respuestas_detalladas);
                setShowResumen(true);
              }
              
              if (onComplete) {
                onComplete(intentoResult.resumen?.calificacion || 0);
              }
              return; // Salir sin mostrar error
            }
          } catch (fetchError) {
            console.error('Error al obtener intento completado:', fetchError);
          }
        }
        throw new Error(result.error || 'Error al iniciar el quiz');
      }

      setIntentoId(result.data.id);
      setShowConfirmModal(false);
      setQuizStarted(true);

      // Calcular y establecer tiempo total
      const tiempoTotal = calcularTiempoTotal(quiz.preguntas);
      setTimeRemaining(tiempoTotal);
    } catch (err: any) {
      console.error('Error al iniciar quiz:', err);
      setError(err.message || 'Error al iniciar el quiz');
    }
  };

  // Guardar respuesta
  const handleAnswerSelect = async (preguntaId: string, opcionId: string) => {
    if (!intentoId) return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [preguntaId]: opcionId,
    }));

    try {
      const pregunta = quiz?.preguntas.find((p) => p.id === preguntaId);
      const tiempoTomado = pregunta ? pregunta.tiempo_segundos - questionTimeRemaining : null;

      await fetch('/api/quizzes/guardar-respuesta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intento_id: intentoId,
          pregunta_id: preguntaId,
          opcion_seleccionada_id: opcionId,
          tiempo_tomado_segundos: tiempoTomado,
        }),
      });
    } catch (err) {
      console.error('Error al guardar respuesta:', err);
    }
  };

  // Tiempo de pregunta agotado - avanzar automáticamente
  const handleQuestionTimeUp = () => {
    if (!quiz) return;

    // Si no hay respuesta seleccionada, guardar como sin respuesta
    const preguntaActual = quiz.preguntas[currentQuestionIndex];
    if (preguntaActual && !selectedAnswers[preguntaActual.id]) {
      // No guardar respuesta si no se seleccionó ninguna
    }

    // Avanzar a la siguiente pregunta
    if (currentQuestionIndex < quiz.preguntas.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Última pregunta - finalizar quiz
      handleFinishQuiz();
    }
  };

  // Tiempo total agotado
  const handleTimeUp = async () => {
    if (!intentoId || quizCompleted || timeUp) return;

    setTimeUp(true);
    setQuizStarted(false);

    // Guardar todas las respuestas pendientes
    await saveAllPendingAnswers();

    // Finalizar el quiz
    await handleFinishQuiz(true);
  };

  // Guardar todas las respuestas pendientes
  const saveAllPendingAnswers = async () => {
    if (!intentoId || !quiz) return;

    const promises = quiz.preguntas.map(async (pregunta) => {
      const opcionId = selectedAnswers[pregunta.id];
      if (opcionId) {
        try {
          await fetch('/api/quizzes/guardar-respuesta', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              intento_id: intentoId,
              pregunta_id: pregunta.id,
              opcion_seleccionada_id: opcionId,
              tiempo_tomado_segundos: null,
            }),
          });
        } catch (err) {
          console.error(`Error al guardar respuesta de pregunta ${pregunta.id}:`, err);
        }
      }
    });

    await Promise.all(promises);
  };

  // Finalizar quiz
  const handleFinishQuiz = async (timeUp: boolean = false) => {
    if (!intentoId || quizCompleted) return;

    try {
      setQuizCompleted(true);

      // Guardar respuestas pendientes
      await saveAllPendingAnswers();

      // Finalizar intento
      const response = await fetch('/api/quizzes/finalizar-intento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intento_id: intentoId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al finalizar el quiz');
      }

      // Si el intento ya estaba completado, mostrar mensaje informativo
      if (result.ya_completado) {
        setCalificacion(result.resumen?.calificacion || result.data?.calificacion || 0);
        setQuizCompleted(true);
        setQuizStarted(false);
        
        // Guardar respuestas detalladas si están disponibles
        if (result.respuestas_detalladas) {
          setRespuestasDetalladas(result.respuestas_detalladas);
          setShowResumen(true);
        }
        
        if (onComplete) {
          onComplete(result.resumen?.calificacion || result.data?.calificacion || 0);
        }
        return; // Salir sin mostrar error
      }

      setCalificacion(result.resumen?.calificacion || result.data?.calificacion);
      
      // Guardar respuestas detalladas si están disponibles
      if (result.respuestas_detalladas) {
        setRespuestasDetalladas(result.respuestas_detalladas);
        setShowResumen(true);
      }

      if (onComplete) {
        onComplete(result.resumen?.calificacion || result.data?.calificacion);
      }
    } catch (err: any) {
      console.error('Error al finalizar quiz:', err);
      setError(err.message || 'Error al finalizar el quiz');
    }
  };

  // Formatear tiempo (segundos a MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Cargando quiz...</p>
      </div>
    );
  }

  if (error && !showConfirmModal) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>{error}</p>
        <button
          onClick={onClose}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Cerrar
        </button>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Quiz no encontrado</p>
        <button
          onClick={onClose}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            marginTop: '1rem',
          }}
        >
          Cerrar
        </button>
      </div>
    );
  }

  // Modal de confirmación
  if (showConfirmModal) {
    const tiempoTotal = calcularTiempoTotal(quiz.preguntas);
    const minutos = Math.floor(tiempoTotal / 60);
    const segundos = tiempoTotal % 60;
    const tiempoTexto = minutos > 0 
      ? `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}${segundos > 0 ? ` y ${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}` : ''}`
      : `${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          }}
        >
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '1rem',
            }}
          >
            ¿Estás listo para presentar el quiz?
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: '#4b5563',
              marginBottom: '1.5rem',
              lineHeight: '1.6',
            }}
          >
            Tienes <strong>{tiempoTexto}</strong> para completar este quiz.
          </p>
          {quiz.descripcion && (
            <p
              style={{
                fontSize: '0.95rem',
                color: '#6b7280',
                marginBottom: '1.5rem',
                lineHeight: '1.6',
              }}
            >
              {quiz.descripcion}
            </p>
          )}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 500,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleStartQuiz}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 500,
              }}
            >
              Comenzar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tiempo agotado - mostrar mensaje (antes de calcular calificación)
  if (timeUp && !quizCompleted) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <div
          style={{
            fontSize: '4rem',
            marginBottom: '1rem',
          }}
        >
          ⏰
        </div>
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#ef4444',
            marginBottom: '1rem',
          }}
        >
          Lo siento, el tiempo ha terminado
        </h2>
        <p
          style={{
            fontSize: '1.125rem',
            color: '#4b5563',
            marginBottom: '2rem',
          }}
        >
          Se han guardado automáticamente las respuestas que habías seleccionado.
        </p>
        <button
          onClick={async () => {
            // Finalizar el quiz para calcular la calificación
            await handleFinishQuiz(true);
          }}
          style={{
            padding: '0.75rem 2rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          Ver Calificación
        </button>
      </div>
    );
  }

  // Quiz completado - mostrar calificación y resumen
  if (quizCompleted && calificacion !== null) {
    return (
      <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '1rem',
            }}
          >
            {timeUp ? 'Quiz Finalizado' : 'Quiz Completado'}
          </h2>
          {timeUp && (
            <p
              style={{
                fontSize: '1rem',
                color: '#ef4444',
                marginBottom: '1rem',
              }}
            >
              El tiempo se agotó, pero tus respuestas fueron guardadas.
            </p>
          )}
          <div
            style={{
              fontSize: '3rem',
              fontWeight: 700,
              color: calificacion >= 3.7 ? '#10b981' : '#ef4444',
              marginBottom: '1.5rem',
            }}
          >
            {calificacion.toFixed(2)} / 5.0
          </div>
          <p
            style={{
              fontSize: '1.125rem',
              color: '#4b5563',
              marginBottom: '2rem',
            }}
          >
            Has completado el quiz "{quiz.nombre}"
          </p>
        </div>

        {/* Resumen detallado de respuestas */}
        {showResumen && respuestasDetalladas.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #e5e7eb',
                paddingBottom: '0.75rem',
              }}
            >
              Resumen de Respuestas
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {respuestasDetalladas.map((respuesta, index) => (
                <div
                  key={respuesta.pregunta_id}
                  style={{
                    border: `2px solid ${respuesta.es_correcta ? '#10b981' : '#ef4444'}`,
                    borderRadius: '12px',
                    padding: '1.5rem',
                    background: respuesta.es_correcta ? '#f0fdf4' : '#fef2f2',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: '1rem', marginBottom: '1rem' }}>
                    <div
                      style={{
                        minWidth: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        background: respuesta.es_correcta ? '#10b981' : '#ef4444',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '1rem',
                      }}
                    >
                      {respuesta.es_correcta ? '✓' : '✗'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4
                        style={{
                          fontSize: '1.125rem',
                          fontWeight: 600,
                          color: '#111827',
                          marginBottom: '0.5rem',
                        }}
                      >
                        Pregunta {index + 1}: {respuesta.pregunta_texto}
                      </h4>
                      
                      {/* Respuesta del estudiante */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <p
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#6b7280',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Tu respuesta:
                        </p>
                        <div
                          style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            background: respuesta.es_correcta ? '#dcfce7' : '#fee2e2',
                            border: `1px solid ${respuesta.es_correcta ? '#86efac' : '#fca5a5'}`,
                          }}
                        >
                          <p
                            style={{
                              fontSize: '0.95rem',
                              color: '#111827',
                              margin: 0,
                              fontWeight: respuesta.es_correcta ? 500 : 400,
                            }}
                          >
                            {respuesta.respuesta_estudiante?.texto || 'No respondida'}
                          </p>
                          {/* Mostrar explicación si la respuesta es correcta */}
                          {respuesta.es_correcta && respuesta.respuesta_estudiante?.explicacion && (
                            <p
                              style={{
                                fontSize: '0.875rem',
                                color: '#059669',
                                marginTop: '0.5rem',
                                marginBottom: 0,
                                fontStyle: 'italic',
                                fontWeight: 500,
                              }}
                            >
                              ✓ {respuesta.respuesta_estudiante.explicacion}
                            </p>
                          )}
                          {/* Mostrar explicación si la respuesta es incorrecta (explicación de por qué está mal) */}
                          {!respuesta.es_correcta && respuesta.respuesta_estudiante?.explicacion && (
                            <p
                              style={{
                                fontSize: '0.875rem',
                                color: '#dc2626',
                                marginTop: '0.5rem',
                                marginBottom: 0,
                                fontStyle: 'italic',
                              }}
                            >
                              {respuesta.respuesta_estudiante.explicacion}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Respuesta correcta (mostrar siempre si está incorrecta o no respondida) */}
                      {(!respuesta.es_correcta || respuesta.no_respondida) && respuesta.respuesta_correcta && (
                        <div>
                          <p
                            style={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: '#6b7280',
                              marginBottom: '0.25rem',
                            }}
                          >
                            Respuesta correcta:
                          </p>
                          <div
                            style={{
                              padding: '0.75rem',
                              borderRadius: '8px',
                              background: '#dcfce7',
                              border: '1px solid #86efac',
                            }}
                          >
                            <p
                              style={{
                                fontSize: '0.95rem',
                                color: '#111827',
                                margin: 0,
                                fontWeight: 500,
                              }}
                            >
                              {respuesta.respuesta_correcta.texto}
                            </p>
                            {respuesta.respuesta_correcta.explicacion && (
                              <p
                                style={{
                                  fontSize: '0.875rem',
                                  color: '#059669',
                                  marginTop: '0.5rem',
                                  marginBottom: 0,
                                  fontStyle: 'italic',
                                  fontWeight: 500,
                                }}
                              >
                                ✓ {respuesta.respuesta_correcta.explicacion}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 2rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // Quiz en progreso
  const preguntaActual = quiz.preguntas[currentQuestionIndex];
  const totalPreguntas = quiz.preguntas.length;
  const progreso = ((currentQuestionIndex + 1) / totalPreguntas) * 100;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header con timer y progreso */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '0.5rem',
            }}
          >
            {quiz.nombre}
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#6b7280',
            }}
          >
            Pregunta {currentQuestionIndex + 1} de {totalPreguntas}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: timeRemaining <= 60 ? '#ef4444' : '#111827',
              marginBottom: '0.25rem',
            }}
          >
            ⏱️ {formatTime(timeRemaining)}
          </div>
          <div
            style={{
              fontSize: '0.875rem',
              color: '#6b7280',
            }}
          >
            Tiempo restante
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div
        style={{
          width: '100%',
          height: '8px',
          background: '#e5e7eb',
          borderRadius: '4px',
          marginBottom: '2rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progreso}%`,
            height: '100%',
            background: '#2563eb',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Pregunta actual */}
      {preguntaActual && (
        <div
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#111827',
                  margin: 0,
                }}
              >
                {preguntaActual.pregunta_texto}
              </h3>
              {/* Icono de archivo si existe */}
              {preguntaActual.archivo_url && (
                <button
                  onClick={() => {
                    setSelectedFileUrl(preguntaActual.archivo_url || null);
                    setShowFileModal(true);
                  }}
                  style={{
                    padding: '0.5rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#3b82f6';
                  }}
                  title="Ver archivo adjunto"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Ver archivo
                </button>
              )}
            </div>
            <div
              style={{
                fontSize: '0.875rem',
                color: questionTimeRemaining <= 10 ? '#ef4444' : '#6b7280',
                fontWeight: 500,
              }}
            >
              ⏱️ {formatTime(questionTimeRemaining)}
            </div>
          </div>

          {/* Opciones de respuesta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {preguntaActual.opciones.map((opcion) => (
              <button
                key={opcion.id}
                onClick={() => handleAnswerSelect(preguntaActual.id, opcion.id)}
                style={{
                  padding: '1rem',
                  border: '2px solid',
                  borderColor:
                    selectedAnswers[preguntaActual.id] === opcion.id
                      ? '#2563eb'
                      : '#e5e7eb',
                  borderRadius: '8px',
                  background:
                    selectedAnswers[preguntaActual.id] === opcion.id
                      ? '#eff6ff'
                      : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '1rem',
                  color: '#111827',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (selectedAnswers[preguntaActual.id] !== opcion.id) {
                    e.currentTarget.style.borderColor = '#93c5fd';
                    e.currentTarget.style.background = '#f0f9ff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedAnswers[preguntaActual.id] !== opcion.id) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                {opcion.texto}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Botones de navegación */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <button
          onClick={() => {
            if (currentQuestionIndex > 0) {
              setCurrentQuestionIndex((prev) => prev - 1);
            }
          }}
          disabled={currentQuestionIndex === 0}
          style={{
            padding: '0.75rem 1.5rem',
            background: currentQuestionIndex === 0 ? '#f3f4f6' : '#2563eb',
            color: currentQuestionIndex === 0 ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          ← Anterior
        </button>
        <button
          onClick={() => {
            if (currentQuestionIndex < totalPreguntas - 1) {
              setCurrentQuestionIndex((prev) => prev + 1);
            } else {
              handleFinishQuiz();
            }
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          {currentQuestionIndex < totalPreguntas - 1 ? 'Siguiente →' : 'Finalizar Quiz'}
        </button>
      </div>

      {/* Modal para mostrar archivo/imagen */}
      {showFileModal && selectedFileUrl && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '2rem',
          }}
          onClick={() => {
            setShowFileModal(false);
            setSelectedFileUrl(null);
          }}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              padding: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>
                Archivo adjunto
              </h3>
              <button
                onClick={() => {
                  setShowFileModal(false);
                  setSelectedFileUrl(null);
                }}
                style={{
                  padding: '0.5rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              {selectedFileUrl.toLowerCase().endsWith('.pdf') || selectedFileUrl.includes('pdf') ? (
                <iframe
                  src={selectedFileUrl}
                  style={{
                    width: '100%',
                    minHeight: '600px',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                  title="Archivo PDF"
                />
              ) : (
                <img
                  src={selectedFileUrl}
                  alt="Archivo adjunto"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    borderRadius: '8px',
                    objectFit: 'contain',
                  }}
                />
              )}
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <a
                href={selectedFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#3b82f6',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  display: 'inline-block',
                }}
              >
                Abrir en nueva pestaña
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

